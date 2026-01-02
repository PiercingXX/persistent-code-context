import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import * as vscode from 'vscode';
import { Session, ProjectContext } from '../utils/types';
import { FileService } from './fileService';
import { GitService } from './gitService';
import { AIService } from './aiService';
import { ContextSnapshotCollector, ContextSnapshot } from './snapshotCollector';
import { ChatContextWatcher } from './chatContextWatcher';

export class ContextManager {
  private contextDir: string;
  private workspaceRoot: string;
  private currentSession?: Session;
  private fileService: FileService;
  private gitService: GitService;
  private aiService: AIService;
  private snapshotCollector: ContextSnapshotCollector;
  private chatWatcher: ChatContextWatcher;
  private autosaveIntervalMs = 60000;
  private autosaveTimer?: NodeJS.Timeout;
  private enableAutosave: boolean = true;
  private enableChangeLogging: boolean = true;
  private configWatcher?: vscode.Disposable;
  private prevOpenFiles: string = '';
  private prevGitChanges: string = '';
  private recentChatContext: string[] = [];

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    // Use common directory outside workspace to prevent accidental commits
    const cfg = vscode.workspace.getConfiguration('persistentContext');
    const storageSetting = cfg.get<string>('storageDirectory');
    const commonDir = (storageSetting && storageSetting.trim()) 
      ? storageSetting 
      : path.join(os.homedir(), '.vscode-persistent-context');
    
    // Create a hash of the workspace path for unique identification
    const workspaceHash = crypto.createHash('md5').update(workspaceRoot).digest('hex').substring(0, 8);
    const workspaceName = path.basename(workspaceRoot);
    
    this.contextDir = path.join(commonDir, `${workspaceName}-${workspaceHash}`);
    this.fileService = new FileService(this.contextDir);
    this.gitService = new GitService(workspaceRoot);
    this.aiService = new AIService(workspaceRoot);
    this.snapshotCollector = new ContextSnapshotCollector(workspaceRoot, this.gitService);
    this.chatWatcher = new ChatContextWatcher((context) => this.onChatContextExtracted(context));
    this.ensureContextDir();
    this.initializeWorkspaceInfo(workspaceRoot);
    // Read configuration and start autosave according to settings
    this.loadConfiguration();
    this.configWatcher = vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('persistentContext')) this.loadConfiguration();
    });
  }

  private loadConfiguration() {
    try {
      const cfg = vscode.workspace.getConfiguration('persistentContext');
      const interval = cfg.get<number>('autosaveInterval', 60);
      this.autosaveIntervalMs = Math.max(5, interval) * 1000;
      this.enableAutosave = cfg.get<boolean>('enableAutosave', true);
      this.enableChangeLogging = cfg.get<boolean>('enableChangeLogging', true);
      if (this.enableAutosave) this.startAutosave(); else this.stopAutosave();
    } catch (e) {
      console.error('persistent-context: loadConfiguration error', e);
    }
  }

  private ensureContextDir() {
    this.fileService.ensureDir();
  }

  private initializeWorkspaceInfo(workspaceRoot: string) {
    // Store workspace path for reference
    const infoPath = path.join(this.contextDir, '.workspace-info');
    if (!fs.existsSync(infoPath)) {
      fs.writeFileSync(infoPath, JSON.stringify({
        workspacePath: workspaceRoot,
        created: new Date().toISOString()
      }, null, 2), 'utf-8');
    }
  }

  startSession(name: string) {
    this.currentSession = {
      id: Date.now().toString(),
      name: name,
      startTime: new Date(),
    };
    // Fire and forget - errors are logged internally
    void this.saveActiveContext().catch((err) =>
      console.error('[persistent-context] Failed to save active context:', err.message)
    );
    this.startAutosave();
  }

  endSession(notes?: string) {
    if (this.currentSession) {
      this.currentSession.endTime = new Date();
      this.currentSession.notes = notes;
      this.saveSessionHistory();
      this.currentSession = undefined;
      this.stopAutosave();
    }
  }

  dispose() {
    this.stopAutosave();
    if (this.configWatcher) this.configWatcher.dispose();
    this.chatWatcher.dispose();
  }

  private startAutosave() {
    this.stopAutosave();
    this.autosaveTimer = setInterval(() => {
      // Always save the active context (records idle or active)
      // Fire and forget - errors are logged internally
      void this.saveActiveContext().catch((err) =>
        console.error('[persistent-context] Failed to save active context:', err.message)
      );
      // Detect passive changes (open files / git changes) and log them
      this.detectAndRecordChanges();
    }, this.autosaveIntervalMs);
  }

  private stopAutosave() {
    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer as unknown as number);
      this.autosaveTimer = undefined;
    }
  }

  private detectAndRecordChanges() {
    try {
      const openFiles = vscode.window.visibleTextEditors
        .map(editor => path.basename(editor.document.fileName))
        .join('\n');

      const gitChanges = this.gitService.getChangedFiles().join('\n');

      if (!this.enableChangeLogging) return;

      // If open files changed
      if (openFiles !== this.prevOpenFiles) {
        const entry = `\n[${new Date().toLocaleString()}] Open files changed:\n${openFiles || 'None'}\n`;
        this.fileService.appendFile('changes.md', entry);
        this.prevOpenFiles = openFiles;
      }

      // If git changes changed
      if (gitChanges !== this.prevGitChanges) {
        const entry = `\n[${new Date().toLocaleString()}] Git status changed:\n${gitChanges || 'No changes'}\n`;
        this.fileService.appendFile('changes.md', entry);
        this.prevGitChanges = gitChanges;
      }
    } catch (e) {
      // swallow errors to avoid noisy failures in autosave
      console.error('persistent-context: detectAndRecordChanges error', e);
    }
  }

  private onChatContextExtracted(context: string) {
    // Store recent chat context (keep last 10)
    this.recentChatContext.push(context);
    if (this.recentChatContext.length > 10) {
      this.recentChatContext.shift();
    }

    // Append to changes log
    if (this.enableChangeLogging) {
      this.fileService.appendFile('changes.md', `\n${context}\n`);
    }

    // Trigger immediate activeContext update with chat context
    void this.saveActiveContext().catch((err) =>
      console.error('[persistent-context] Failed to save active context after chat:', err.message)
    );
  }

  private async saveActiveContext() {
    try {
      const snapshot = await this.snapshotCollector.collect();
      const aiSummary = await this.aiService.summarize(snapshot);

      const sessionName = this.currentSession?.name || 'No active session';
      const status = this.currentSession ? 'In progress' : 'Idle';

      const content = `# Project Context - ${sessionName}

**Last Updated:** ${new Date().toLocaleString()}
**Status:** ${status}
**Branch:** ${snapshot.git.branch}
**AI Provider:** ${this.aiService.getProviderName()}

## Project Summary
${aiSummary || this.buildFallbackSummary(snapshot)}

## Current Work
- Session: ${sessionName}
- Open Editors: ${snapshot.openEditors.length}
  ${snapshot.openEditors.map((e) => `  - ${path.basename(e.path)}`).join('\n')}

## Recent Chat Instructions
${this.recentChatContext.length > 0 ? this.recentChatContext.slice(-3).join('\n') : '_No recent chat activity_'}

## Recent Changes
${snapshot.git.modifiedFiles.length > 0 ? snapshot.git.modifiedFiles.map((f) => `- ${f}`).join('\n') : 'No changes'}

## Deployment Context
- Location: ${snapshot.deploymentContext.location || 'Not specified'}
- Access: ${snapshot.deploymentContext.accessMethod || 'Not specified'}
- Method: ${snapshot.deploymentContext.deploymentMethod || 'Not specified'}
- Mode: ${snapshot.deploymentContext.currentMode || 'Feature Development'}
- Production: ${snapshot.deploymentContext.isProduction ? 'Yes' : 'No'}

## Recent Commits
${snapshot.git.recentCommits.map((c) => `- ${c.hash}: ${c.message}`).join('\n')}
`;

      this.fileService.writeFile('activeContext.md', content);
    } catch (error) {
      console.error('[persistent-context] Failed to save active context:', error);
      // Continue with basic logging if AI fails
      this.saveBasicContext();
    }
  }

  private saveBasicContext() {
    const openFiles = vscode.window.visibleTextEditors
      .map(editor => path.basename(editor.document.fileName))
      .join('\n');

    const branch = this.gitService.getCurrentBranch();
    const recentCommits = this.gitService.getRecentCommits(3).join('\n');

    const sessionName = this.currentSession?.name || 'No active session';
    const status = this.currentSession ? 'In progress' : 'Idle';

    const content = `# Session: ${sessionName}

**Date:** ${new Date().toLocaleString()}
**Branch:** ${branch}
**Status:** ${status}

## Open Files
${openFiles || 'No files open'}

## Recent Commits
${recentCommits || 'No commits yet'}
`;

    this.fileService.writeFile('activeContext.md', content);
  }

  private buildFallbackSummary(snapshot: ContextSnapshot): string {
    return `
### Workspace
- **Name:** ${snapshot.workspaceMetadata.name}
- **Language:** ${snapshot.workspaceMetadata.mainLanguage}
- **Root:** ${snapshot.workspaceMetadata.rootPath}

### Project Structure
- **Directories:** ${snapshot.projectStructure.directories.join(', ')}
- **Key Files:** ${snapshot.projectStructure.keyFiles.join(', ')}

### Recent Activity
- **Branch:** ${snapshot.git.branch}
- **Last Commits:** ${snapshot.git.recentCommits.map((c) => c.message).join(', ')}
- **Modified:** ${snapshot.git.modifiedFiles.length} files
`;
  }

  private saveSessionHistory() {
    const historyFile = 'progress.md';
    let content = '';

    if (this.fileService.fileExists(historyFile)) {
      content = this.fileService.readFile(historyFile);
    }

    const sessionEntry = `\n## Session: ${this.currentSession?.name}\n- ID: ${this.currentSession?.id}\n**Date:** ${this.currentSession?.startTime.toLocaleString()}\n**Notes:** ${this.currentSession?.notes || 'No notes'}\n`;

    this.fileService.appendFile(historyFile, sessionEntry);
  }

  /**
   * Return the most recent session name from progress.md, or undefined.
   */
  peekLastSessionName(): string | undefined {
    const history = this.fileService.readFile('progress.md');
    if (!history) return undefined;
    const match = history.match(/## Session:\s*(.+)/m);
    if (match && match[1]) return match[1].trim();
    return undefined;
  }

  /**
   * Resume a previous session by name without prompting the user.
   */
  resumeSession(name: string) {
    this.currentSession = {
      id: Date.now().toString(),
      name: name,
      startTime: new Date(),
    };
    // Fire and forget - errors are logged internally
    void this.saveActiveContext().catch((err) =>
      console.error('[persistent-context] Failed to save active context:', err.message)
    );
    this.startAutosave();
  }

  copyContextToClipboard() {
    if (this.fileService.fileExists('activeContext.md')) {
      const content = this.fileService.readFile('activeContext.md');
      vscode.env.clipboard.writeText(content);
      vscode.window.showInformationMessage('✓ Context copied to clipboard');
    }
  }

  viewContext() {
    const options = ['Active Context', 'Session History'];
    vscode.window.showQuickPick(options, { placeHolder: 'View active context or session history' }).then(choice => {
      if (!choice) return;
      const fileName = choice === 'Active Context' ? 'activeContext.md' : 'progress.md';
      const contextFile = path.join(this.contextDir, fileName);
      if (fs.existsSync(contextFile)) {
        vscode.workspace.openTextDocument(contextFile).then(doc => {
          vscode.window.showTextDocument(doc);
        });
      } else {
        vscode.window.showInformationMessage(`No ${choice === 'Active Context' ? 'active' : 'session'} context found`);
      }
    });
  }

  addNote(note: string) {
    if (!this.currentSession) {
      vscode.window.showInformationMessage('No active session to add a note to');
      return;
    }

    const ts = new Date().toLocaleString();
    const noteLine = `- Note (${ts}): ${note}`;

    // Append to active context
    const active = this.fileService.readFile('activeContext.md') || '';
    const updated = active + '\n' + noteLine + '\n';
    this.fileService.writeFile('activeContext.md', updated);

    // Append a note entry to history
    const historyNote = `\n### Note for session ${this.currentSession.name} (${ts})\n${note}\n`;
    this.fileService.appendFile('progress.md', historyNote);

    vscode.window.showInformationMessage('✓ Note added');
    // Fire and forget - errors are logged internally
    void this.saveActiveContext().catch((err) =>
      console.error('[persistent-context] Failed to save active context:', err.message)
    );
  }

  /**
   * Show a list of past sessions from progress.md and open the selected session.
   */
  viewSession() {
    const history = this.fileService.readFile('progress.md');
    if (!history) {
      vscode.window.showInformationMessage('No session history available');
      return;
    }

    const parts = history.split(/\n## Session:\s*/).filter(p => p.trim().length > 0);
    const items = parts.map(p => {
      const firstLine = p.split('\n')[0].trim();
      const title = firstLine || 'Unnamed session';
      return { label: title, content: '## Session: ' + p };
    });

    vscode.window.showQuickPick(items.map(i => i.label), { placeHolder: 'Select a session to view' }).then(choice => {
      if (!choice) return;
      const picked = items.find(i => i.label === choice);
      if (!picked) return;
      vscode.workspace.openTextDocument({ content: picked.content, language: 'markdown' }).then(doc => {
        vscode.window.showTextDocument(doc);
      });
    });
  }

  /**
   * Open the persisted session history file in the editor.
   */
  viewHistory() {
    const historyPath = path.join(this.contextDir, 'progress.md');
    if (fs.existsSync(historyPath)) {
      vscode.workspace.openTextDocument(historyPath).then(doc => vscode.window.showTextDocument(doc));
    } else {
      vscode.window.showInformationMessage('No session history available');
    }
  }

  /**
   * Open the decision log (create a template if it doesn't exist).
   */
  viewDecisions() {
    const decFile = path.join(this.contextDir, 'decisionLog.md');
    if (!fs.existsSync(decFile)) {
      const template = `# Decision Log\n\n*Date: ${new Date().toLocaleString()}*\n\n## New Decision\n- **Title:**\n- **Context:**\n- **Decision:**\n- **Consequences:**\n\n`;
      this.fileService.writeFile('decisionLog.md', template);
    }
    vscode.workspace.openTextDocument(decFile).then(doc => vscode.window.showTextDocument(doc));
  }

  /**
   * Return an array of session titles parsed from progress.md (most recent first).
   */
  getSessionNames(): string[] {
    const history = this.fileService.readFile('progress.md');
    if (!history) return [];
    const parts = history.split(/\n## Session:\s*/).filter(p => p.trim().length > 0);
    const names = parts.map(p => {
      const firstLine = p.split('\n')[0].trim();
      return firstLine || 'Unnamed session';
    });
    return names;
  }

  /**
   * Merge the specified sessions (by name) into a new merged session entry and resume it.
   * If `names` is empty or undefined, merge all sessions.
   * Returns the new merged session name.
   */
  mergeSessions(names?: string[]): string {
    const history = this.fileService.readFile('progress.md');
    if (!history) return '';

    const parts = history.split(/\n## Session:\s*/).filter(p => p.trim().length > 0);
    const entries = parts.map(p => ({
      title: p.split('\n')[0].trim() || 'Unnamed session',
      content: '## Session: ' + p,
    }));

    const toMerge = names && names.length > 0 ? entries.filter(e => names.includes(e.title)) : entries;
    if (toMerge.length === 0) return '';

    const mergedTitle = `Merged: ${new Date().toLocaleString()}`;
    // Build merged content by stripping nested '## Session:' headers
    const mergedContent = toMerge
      .map(t => t.content.replace(/^## Session:\s*/i, '').trim())
      .join('\n\n');

    const mergedEntry = `\n## Session: ${mergedTitle}\n${mergedContent}\n`;
    // Replace the previous session entries with the merged entry.
    // Preserve any header content before the first '## Session:' if present.
    const headerMatch = history.split(/\n## Session:\s*/)[0];
    const newContent = (headerMatch && headerMatch.trim().length > 0 ? headerMatch + '\n' : '') + mergedEntry + '\n';
    this.fileService.writeFile('progress.md', newContent);

    // Start a new current session with the merged name
    this.currentSession = {
      id: Date.now().toString(),
      name: mergedTitle,
      startTime: new Date(),
    };
    // Fire and forget - errors are logged internally
    void this.saveActiveContext().catch((err) =>
      console.error('[persistent-context] Failed to save active context:', err.message)
    );
    this.startAutosave();
    return mergedTitle;
  }

  getCurrentSessionName(): string {
    return this.currentSession?.name || 'No active session';
  }

  isSessionActive(): boolean {
    return !!this.currentSession;
  }
}
