import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import * as vscode from 'vscode';
import { AIService } from './aiService';
import { ContextSnapshotCollector, ContextSnapshot } from './snapshotCollector';
import { GitService } from './gitService';
import { FileService } from './fileService';
import { PRManager } from './prManager';

export interface LoopConfig {
  maxIterations?: number;
  maxDuration?: number;
  maxCost?: number;
  mergeStrategy?: 'squash' | 'merge' | 'rebase';
  completionSignal?: string;
  completionThreshold?: number;
}

export interface IterationResult {
  iterationNumber: number;
  success: boolean;
  cost: number;
  summary: string;
  prNumber?: string;
  changedFiles: string[];
  error?: string;
}

export class ContinuousLoop {
  private isRunning: boolean = false;
  private iterations: number = 0;
  private startTime: number = 0;
  private totalCost: number = 0;
  private config: Required<LoopConfig>;
  private consecutiveCompletionSignals: number = 0;
  private outputChannel: vscode.OutputChannel;
  private storageDir: string;

  constructor(
    private workspaceRoot: string,
    private aiService: AIService,
    private snapshotCollector: ContextSnapshotCollector,
    private gitService: GitService,
    private fileService: FileService,
    private prManager: PRManager,
    private recentChatContext: string[] = [],
    private deploymentContext: Record<string, any> = {}
  ) {
    this.config = {
      maxIterations: 5,
      maxDuration: 0,
      maxCost: 0,
      mergeStrategy: 'squash',
      completionSignal: 'ITERATION_COMPLETE',
      completionThreshold: 1,
    };

    this.outputChannel = vscode.window.createOutputChannel('Continuous Loop');

    const cfg = vscode.workspace.getConfiguration('persistentContext');
    const storageSetting = cfg.get<string>('storageDirectory');
    const commonDir = (storageSetting && storageSetting.trim())
      ? storageSetting
      : path.join(os.homedir(), '.vscode-persistent-context');

    const workspaceHash = crypto.createHash('md5').update(workspaceRoot).digest('hex').substring(0, 8);
    const workspaceName = path.basename(workspaceRoot);
    this.storageDir = path.join(commonDir, `${workspaceName}-${workspaceHash}`);
  }

  /**
   * Logging utility for both console and output channel
   */
  private log(message: string): void {
    console.log(message);
    this.outputChannel.appendLine(message);
  }

  /**
   * Main continuous loop executor
   */
  async run(prompt: string, userConfig: LoopConfig): Promise<void> {
    Object.assign(this.config, userConfig);

    if (this.config.maxIterations === 0 && this.config.maxDuration === 0 && this.config.maxCost === 0) {
      throw new Error('Must specify at least one limit: maxIterations, maxDuration, or maxCost');
    }

    this.isRunning = true;
    this.startTime = Date.now();
    this.totalCost = 0;
    this.iterations = 0;
    this.consecutiveCompletionSignals = 0;

    this.log(`\n🔄 Starting Continuous Loop`);
    this.log(`   Prompt: ${prompt.substring(0, 60)}...`);
    this.log(`   Max iterations: ${this.config.maxIterations || '∞'}`);
    this.log(`   Max cost: $${this.config.maxCost || '∞'}`);
    this.log(`   Max duration: ${this.config.maxDuration ? `${this.config.maxDuration}s` : '∞'}`);
    this.log('');

    this.outputChannel.show(true);

    try {
      while (this.shouldContinue()) {
        this.iterations++;
        this.log(`\n${'='.repeat(60)}`);
        this.log(`Iteration ${this.iterations}/${this.config.maxIterations || '∞'}`);
        this.log(`${'='.repeat(60)}`);

        try {
          const result = await this.executeIteration(prompt);

          if (result.success) {
            this.log(`✅ Iteration ${this.iterations} completed`);
            this.totalCost += result.cost;

            if (result.summary.includes(this.config.completionSignal)) {
              this.consecutiveCompletionSignals++;
              this.log(
                `🏁 Completion signal detected (${this.consecutiveCompletionSignals}/${this.config.completionThreshold})`
              );

              if (this.consecutiveCompletionSignals >= this.config.completionThreshold) {
                this.log(`\n✨ Task completed! All iterations finished successfully.`);
                break;
              }
            } else {
              this.consecutiveCompletionSignals = 0;
            }
          } else {
            this.log(`❌ Iteration ${this.iterations} failed: ${result.error}`);
          }
        } catch (error) {
          this.log(`❌ Iteration ${this.iterations} error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } finally {
      this.isRunning = false;
      this.printSummary();
    }
  }

  /**
   * Execute a single iteration
   */
  private async executeIteration(basePrompt: string): Promise<IterationResult> {
    const result: IterationResult = {
      iterationNumber: this.iterations,
      success: false,
      cost: 0,
      summary: '',
      changedFiles: [],
    };

    try {
      // Step 1: Create branch
      const branchName = await this.createBranch();
      this.log(`🌿 Created branch: ${branchName}`);

      // Step 2: Collect context and build enhanced prompt
      const snapshot = await this.snapshotCollector.collect();
      const previousNotes = this.loadPreviousIterationNotes();
      const enhancedPrompt = this.buildEnhancedPrompt(basePrompt, snapshot, previousNotes);

      // Step 3: Run AI
      this.log(`🤖 Running AI...`);
      const aiSummary = await this.aiService.summarize(snapshot);

      if (!aiSummary) {
        this.log(`⚠️ AI provider unavailable, using basic summary`);
        result.summary = `Completed iteration ${this.iterations} without AI summary`;
      } else {
        result.summary = aiSummary;
      }

      result.cost = 0.05;
      this.log(`💰 Cost: $${result.cost.toFixed(2)}`);
      this.log(`📝 Summary: ${result.summary.substring(0, 100)}...`);

      // Step 4: Get changed files
      result.changedFiles = this.gitService.getChangedFiles();
      this.log(`📂 Changed files: ${result.changedFiles.length}`);

      // Step 5: Commit if there are changes
      if (result.changedFiles.length > 0) {
        const commitMsg = `[Iteration ${this.iterations}] ${result.summary.split('\n')[0].substring(0, 50)}`;
        const escapedMsg = commitMsg.replace(/"/g, '\\"');

        try {
          execSync(`git add -A && git commit -m "${escapedMsg}"`, {
            cwd: this.workspaceRoot,
          });
          this.log(`💬 Committed: ${commitMsg}`);

          // Step 6: Push
          execSync(`git push -u origin ${branchName}`, { cwd: this.workspaceRoot });
          this.log(`📤 Pushed to origin`);

          // Step 7: Create PR
          const prNumber = await this.prManager.createPR(branchName, commitMsg, result.summary);
          result.prNumber = prNumber;
          this.log(`🔀 Created PR #${prNumber}`);

          // Step 8: Wait for checks
          const checksPass = await this.prManager.waitForChecks(prNumber);

          if (checksPass) {
            // Step 9: Merge
            await this.prManager.mergePR(prNumber, this.config.mergeStrategy);
            this.log(`✅ PR #${prNumber} merged`);

            // Step 10: Cleanup
            execSync(`git checkout main`, { cwd: this.workspaceRoot });
            execSync(`git pull origin main`, { cwd: this.workspaceRoot });
            this.log(`📥 Pulled latest from main`);
          } else {
            await this.prManager.closePR(prNumber, 'Checks failed');
            result.error = 'PR checks failed';
            return result;
          }
        } catch (gitError) {
          result.error = `Git operation failed: ${gitError instanceof Error ? gitError.message : String(gitError)}`;
          return result;
        }
      } else {
        this.log(`⚠️ No changes detected, skipping PR`);
      }

      // Step 11: Save notes
      await this.saveIterationNotes(result);

      result.success = true;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      result.success = false;
    }

    return result;
  }

  /**
   * Creates a new git branch for this iteration
   */
  private async createBranch(): Promise<string> {
    const timestamp = new Date().toISOString().split('T')[0];
    const randomHash = Math.random().toString(16).substring(2, 10);
    const branchName = `continuous-loop/iteration-${this.iterations}/${timestamp}-${randomHash}`;

    try {
      execSync(`git checkout -b ${branchName}`, { cwd: this.workspaceRoot });
      return branchName;
    } catch (error) {
      throw new Error(`Failed to create branch: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Builds enhanced prompt with context
   */
  private buildEnhancedPrompt(basePrompt: string, snapshot: ContextSnapshot, previousNotes: string): string {
    const recentChat = this.recentChatContext.slice(-3).join('\n');

    return `You are part of an autonomous development loop (iteration ${this.iterations}).

${previousNotes ? `## Previous Iteration Context\n${previousNotes}\n---\n` : ''}

## Current Project State
- **Workspace:** ${snapshot.workspaceMetadata.name}
- **Language:** ${snapshot.workspaceMetadata.mainLanguage}
- **Branch:** ${snapshot.git.branch}
- **Modified Files:** ${snapshot.git.modifiedFiles.length}
- **Environment:** ${this.deploymentContext.isProduction ? 'Production' : 'Development'}

## Recent Activity
${snapshot.git.recentCommits
  .slice(0, 3)
  .map((c) => `- ${c.hash.substring(0, 7)}: ${c.message}`)
  .join('\n')}

## User Context
${recentChat || '_No recent chat context_'}

## Task
${basePrompt}

## Instructions
1. Make focused changes to accomplish the task
2. Output exactly "${this.config.completionSignal}" when done
3. Provide a brief summary`;
  }

  /**
   * Loads previous iteration notes
   */
  private loadPreviousIterationNotes(): string {
    const notesFile = path.join(this.storageDir, 'SHARED_TASK_NOTES.md');
    if (fs.existsSync(notesFile)) {
      const content = fs.readFileSync(notesFile, 'utf-8');
      return content.substring(Math.max(0, content.length - 1000));
    }
    return '';
  }

  /**
   * Saves iteration notes
   */
  private async saveIterationNotes(result: IterationResult): Promise<void> {
    const notes = `## Iteration ${this.iterations}
**Time:** ${new Date().toLocaleString()}
**Status:** ${result.success ? '✅' : '❌'}
**PR:** #${result.prNumber || 'N/A'}
**Summary:** ${result.summary.split('\n')[0]}
**Files:** ${result.changedFiles.length}

`;

    const notesFile = path.join(this.storageDir, 'SHARED_TASK_NOTES.md');
    if (fs.existsSync(notesFile)) {
      fs.appendFileSync(notesFile, notes);
    } else {
      fs.writeFileSync(notesFile, `# Continuous Loop Notes\n\n${notes}`);
    }
  }

  /**
   * Checks if loop should continue
   */
  private shouldContinue(): boolean {
    if (this.config.maxIterations > 0 && this.iterations >= this.config.maxIterations) {
      this.log(`\n⏸️ Reached max iterations (${this.config.maxIterations})`);
      return false;
    }

    if (this.config.maxDuration > 0) {
      const elapsedSeconds = (Date.now() - this.startTime) / 1000;
      if (elapsedSeconds >= this.config.maxDuration) {
        this.log(`\n⏸️ Reached max duration`);
        return false;
      }
    }

    if (this.config.maxCost > 0 && this.totalCost >= this.config.maxCost) {
      this.log(`\n⏸️ Reached max cost`);
      return false;
    }

    return this.isRunning;
  }

  /**
   * Prints final summary
   */
  private printSummary(): void {
    const elapsedSeconds = (Date.now() - this.startTime) / 1000;
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = Math.floor(elapsedSeconds % 60);

    this.log(`\n${'='.repeat(60)}`);
    this.log(`🎉 Continuous Loop Complete`);
    this.log(`${'='.repeat(60)}`);
    this.log(`Iterations: ${this.iterations}`);
    this.log(`Cost: $${this.totalCost.toFixed(2)}`);
    this.log(`Time: ${minutes}m ${seconds}s`);
    this.log(`${'='.repeat(60)}\n`);
  }
}
