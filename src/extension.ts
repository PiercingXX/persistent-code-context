import * as vscode from 'vscode';
import { ContextManager } from './services/contextManager';
import { StatusBarManager } from './ui/statusBar';

let contextManager: ContextManager;
let statusBar: StatusBarManager;

export function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  
  if (!workspaceRoot) {
    // Silently skip activation when no workspace is open
    return;
  }

  contextManager = new ContextManager(workspaceRoot);
  statusBar = new StatusBarManager();

  // On activation, if there are previous sessions in this workspace, prompt to resume or merge.
  const sessions = contextManager.getSessionNames();
  if (sessions.length > 0 && !contextManager.isSessionActive()) {
    if (sessions.length === 1) {
      const only = sessions[0];
      vscode.window
        .showInformationMessage(`Previous session found: ${only}. Resume?`, 'Resume', 'No')
        .then(choice => {
          if (choice === 'Resume') {
            contextManager.resumeSession(only);
            statusBar.updateSession(only);
            vscode.window.showInformationMessage(`Resumed session: ${only}`);
          }
        });
    } else {
      const pickItems = [...sessions, 'Merge all sessions'];
      vscode.window.showQuickPick(pickItems, { placeHolder: 'Select a session to resume or merge all' }).then(choice => {
        if (!choice) return;
        if (choice === 'Merge all sessions') {
          const mergedName = contextManager.mergeSessions(sessions);
          if (mergedName) {
            statusBar.updateSession(mergedName);
            vscode.window.showInformationMessage(`Merged and resumed session: ${mergedName}`);
          }
        } else {
          contextManager.resumeSession(choice);
          statusBar.updateSession(choice);
          vscode.window.showInformationMessage(`Resumed session: ${choice}`);
        }
      });
    }
  }

  // If workspace folders change (we enter a workspace), check for previous sessions again.
  const folderWatcher = vscode.workspace.onDidChangeWorkspaceFolders(e => {
    // Only act when folders are added
    if (e.added && e.added.length > 0) {
      const last2 = contextManager.peekLastSessionName();
      if (!contextManager.isSessionActive()) {
        const sessions2 = contextManager.getSessionNames();
        if (!sessions2 || sessions2.length === 0) return;
        if (sessions2.length === 1) {
          const only = sessions2[0];
          vscode.window
            .showInformationMessage(`Previous session found: ${only}. Resume?`, 'Resume', 'No')
            .then(choice => {
              if (choice === 'Resume') {
                contextManager.resumeSession(only);
                statusBar.updateSession(only);
                vscode.window.showInformationMessage(`Resumed session: ${only}`);
              }
            });
        } else {
          const pickItems = [...sessions2, 'Merge all sessions'];
          vscode.window.showQuickPick(pickItems, { placeHolder: 'Select a session to resume or merge all' }).then(choice => {
            if (!choice) return;
            if (choice === 'Merge all sessions') {
              const mergedName = contextManager.mergeSessions(sessions2);
              if (mergedName) {
                statusBar.updateSession(mergedName);
                vscode.window.showInformationMessage(`Merged and resumed session: ${mergedName}`);
              }
            } else {
              contextManager.resumeSession(choice);
              statusBar.updateSession(choice);
              vscode.window.showInformationMessage(`Resumed session: ${choice}`);
            }
          });
        }
      }
    }
  });
  context.subscriptions.push(folderWatcher);

  // Watch progress.md for external changes (e.g., sessions merged externally)
  try {
    const progressPattern = new vscode.RelativePattern(workspaceRoot, '.vscode-context/progress.md');
    const progressWatcher = vscode.workspace.createFileSystemWatcher(progressPattern);

    const promptForSessions = async () => {
      if (contextManager.isSessionActive()) return;
      const sessions = contextManager.getSessionNames();
      if (!sessions || sessions.length === 0) return;
      if (sessions.length === 1) {
        const only = sessions[0];
        const choice = await vscode.window.showInformationMessage(`Previous session found: ${only}. Resume?`, 'Resume', 'No');
        if (choice === 'Resume') {
          contextManager.resumeSession(only);
          statusBar.updateSession(only);
          vscode.window.showInformationMessage(`Resumed session: ${only}`);
        }
      } else {
        const pickItems = [...sessions, 'Merge all sessions'];
        const choice = await vscode.window.showQuickPick(pickItems, { placeHolder: 'Select a session to view or merge all' });
        if (!choice) return;
        if (choice === 'Merge all sessions') {
          const mergedName = contextManager.mergeSessions(sessions);
          if (mergedName) {
            statusBar.updateSession(mergedName);
            vscode.window.showInformationMessage(`Merged and resumed session: ${mergedName}`);
          }
        } else {
          contextManager.resumeSession(choice);
          statusBar.updateSession(choice);
          vscode.window.showInformationMessage(`Resumed session: ${choice}`);
        }
      }
    };

    progressWatcher.onDidCreate(promptForSessions, undefined, context.subscriptions);
    progressWatcher.onDidChange(promptForSessions, undefined, context.subscriptions);
    context.subscriptions.push(progressWatcher);
  } catch (e) {
    console.error('persistent-context: failed to create progress watcher', e);
  }

  // Register commands
  const startSession = vscode.commands.registerCommand(
    'persistent-context.startSession',
    async () => {
      const name = await vscode.window.showInputBox({
        prompt: 'Enter session name',
        placeHolder: 'e.g., Building payment API',
      });
      
      if (name) {
        contextManager.startSession(name);
        statusBar.updateSession(name);
        vscode.window.showInformationMessage(`✓ Session started: ${name}`);
      }
    }
  );

  const endSession = vscode.commands.registerCommand(
    'persistent-context.endSession',
    async () => {
      const notes = await vscode.window.showInputBox({
        prompt: 'Session notes (optional)',
        placeHolder: 'e.g., Completed endpoints, next: webhooks',
      });
      
      contextManager.endSession(notes);
      statusBar.clearSession();
      vscode.window.showInformationMessage('✓ Session ended');
    }
  );

  const copyContext = vscode.commands.registerCommand(
    'persistent-context.copyContext',
    () => {
      contextManager.copyContextToClipboard();
    }
  );

  const viewContext = vscode.commands.registerCommand(
    'persistent-context.viewContext',
    () => {
      contextManager.viewContext();
    }
  );

  const viewSession = vscode.commands.registerCommand(
    'persistent-context.viewSession',
    () => {
      contextManager.viewSession();
    }
  );

  const viewHistory = vscode.commands.registerCommand(
    'persistent-context.viewHistory',
    () => {
      contextManager.viewHistory();
    }
  );

  const viewDecisions = vscode.commands.registerCommand(
    'persistent-context.viewDecisions',
    () => {
      contextManager.viewDecisions();
    }
  );

  const settingsCmd = vscode.commands.registerCommand(
    'persistent-context.settings',
    () => {
      vscode.commands.executeCommand('workbench.action.openSettings', 'persistentContext');
    }
  );

  const addNote = vscode.commands.registerCommand(
    'persistent-context.addNote',
    async () => {
      const note = await vscode.window.showInputBox({
        prompt: 'Enter note',
        placeHolder: 'e.g., Blocked on API key',
      });
      
      if (note) {
        contextManager.addNote(note);
      }
    }
  );

  context.subscriptions.push(
    startSession,
    endSession,
    copyContext,
    viewContext,
    addNote,
    viewSession,
    viewHistory,
    viewDecisions,
    settingsCmd
  );
}

export function deactivate() {
  statusBar?.dispose();
  contextManager?.dispose();
}
