import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { AIService } from './aiService';
import { ContextSnapshotCollector } from './snapshotCollector';
import { GitService } from './gitService';
import { FileService } from './fileService';
import { PRManager } from './prManager';

export interface LoopConfig {
  maxIterations?: number; // 0 for unlimited
  maxDuration?: number; // in seconds, 0 for unlimited
  maxCost?: number; // in USD, 0 for unlimited
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

  constructor(
    private workspaceRoot: string,
    private aiService: AIService,
    private snapshotCollector: ContextSnapshotCollector,
    private gitService: GitService,
    private fileService: FileService,
    private prManager: PRManager
  ) {
    this.config = {
      maxIterations: 5,
      maxDuration: 0,
      maxCost: 0,
      mergeStrategy: 'squash',
      completionSignal: 'ITERATION_COMPLETE',
      completionThreshold: 1,
    };
  }

  /**
   * Main continuous loop executor
   */
  async run(prompt: string, userConfig: LoopConfig): Promise<void> {
    // Merge user config with defaults
    Object.assign(this.config, userConfig);

    // Validate configuration
    if (this.config.maxIterations === 0 && this.config.maxDuration === 0 && this.config.maxCost === 0) {
      throw new Error('Must specify at least one limit: maxIterations, maxDuration, or maxCost');
    }

    this.isRunning = true;
    this.startTime = Date.now();
    this.totalCost = 0;
    this.iterations = 0;
    this.consecutiveCompletionSignals = 0;

    console.log(`\n🔄 Starting Continuous Loop`);
    console.log(`   Prompt: ${prompt.substring(0, 60)}...`);
    console.log(`   Max iterations: ${this.config.maxIterations || '∞'}`);
    console.log(`   Max cost: $${this.config.maxCost || '∞'}`);
    console.log(`   Max duration: ${this.config.maxDuration ? `${this.config.maxDuration}s` : '∞'}`);
    console.log('');

    try {
      while (this.shouldContinue()) {
        this.iterations++;
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Iteration ${this.iterations}/${this.config.maxIterations || '∞'}`);
        console.log(`${'='.repeat(60)}`);

        try {
          const result = await this.executeIteration(prompt);

          if (result.success) {
            console.log(`✅ Iteration ${this.iterations} completed`);
            this.totalCost += result.cost;

            // Check for completion signal
            if (result.summary.includes(this.config.completionSignal)) {
              this.consecutiveCompletionSignals++;
              console.log(`🏁 Completion signal detected (${this.consecutiveCompletionSignals}/${this.config.completionThreshold})`);

              if (this.consecutiveCompletionSignals >= this.config.completionThreshold) {
                console.log(`\n✨ Task completed! All iterations finished successfully.`);
                break;
              }
            } else {
              this.consecutiveCompletionSignals = 0;
            }
          } else {
            console.error(`❌ Iteration ${this.iterations} failed: ${result.error}`);
          }
        } catch (error) {
          console.error(`❌ Iteration ${this.iterations} error:`, error);
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
      console.log(`🌿 Created branch: ${branchName}`);

      // Step 2: Collect context and build enhanced prompt
      const snapshot = await this.snapshotCollector.collect();
      const previousNotes = this.loadPreviousIterationNotes();
      const enhancedPrompt = this.buildEnhancedPrompt(basePrompt, snapshot, previousNotes);

      // Step 3: Run Claude
      console.log(`🤖 Running AI with Claude...`);
      const aiSummary = await this.aiService.summarize(snapshot);

      if (!aiSummary) {
        console.warn(`⚠️ AI provider unavailable, using placeholder summary`);
        result.summary = 'Completed iteration without AI summary';
      } else {
        result.summary = aiSummary;
      }

      result.cost = 0.05; // Rough estimate (would need to parse from AI response)

      console.log(`💰 Cost: $${result.cost.toFixed(2)}`);
      console.log(`📝 Summary: ${result.summary.substring(0, 100)}...`);

      // Step 4: Get changed files
      result.changedFiles = this.gitService.getChangedFiles();
      console.log(`📂 Changed files: ${result.changedFiles.length}`);

      // Step 5: Commit changes
      if (result.changedFiles.length > 0) {
        const commitMessage = `[Iteration ${this.iterations}] ${result.summary.split('\n')[0].substring(0, 50)}`;
        // Use git directly with proper escaping
        const escapedMsg = commitMessage.replace(/"/g, '\\"');
        execSync(`git add -A && git commit -m "${escapedMsg}"`, {
          cwd: this.workspaceRoot,
        });
        console.log(`💬 Committed: ${commitMessage}`);

        // Step 6: Push branch
        execSync(`git push -u origin ${branchName}`, { cwd: this.workspaceRoot });
        console.log(`📤 Pushed to origin`);

        // Step 7: Create PR
        const prNumber = await this.prManager.createPR(branchName, commitMessage, result.summary);
        result.prNumber = prNumber;
        console.log(`🔀 Created PR #${prNumber}`);

        // Step 8: Wait for checks
        const checksPass = await this.prManager.waitForChecks(prNumber);

        if (checksPass) {
          // Step 9: Merge PR
          await this.prManager.mergePR(prNumber, this.config.mergeStrategy);

          // Step 10: Clean up and pull latest
          execSync(`git checkout main`, { cwd: this.workspaceRoot });
          execSync(`git pull origin main`, { cwd: this.workspaceRoot });
          console.log(`📥 Pulled latest from main`);
        } else {
          // If checks failed, close the PR
          await this.prManager.closePR(prNumber, 'Checks failed');
          result.success = false;
          result.error = 'PR checks failed';
          return result;
        }
      } else {
        console.log(`⚠️  No changes detected, skipping PR creation`);
      }

      // Step 11: Save iteration notes
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
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const randomHash = Math.random().toString(16).substring(2, 10);
    const branchName = `continuous-loop/iteration-${this.iterations}/${timestamp}-${randomHash}`;

    execSync(`git checkout -b ${branchName}`, { cwd: this.workspaceRoot });
    return branchName;
  }

  /**
   * Builds enhanced prompt with context injection
   */
  private buildEnhancedPrompt(
    basePrompt: string,
    snapshot: any,
    previousNotes: string
  ): string {
    return `You are part of an autonomous development loop iteration.

${previousNotes ? `## Context from Previous Iterations\n${previousNotes}\n` : ''}

## Current Project State
**Workspace:** ${snapshot.workspaceMetadata.name}
**Language:** ${snapshot.workspaceMetadata.mainLanguage}
**Branch:** ${snapshot.git.branch}
**Modified Files:** ${snapshot.git.modifiedFiles.length}

## Project Structure
\`\`\`
${snapshot.projectStructure.directories.slice(0, 5).join('\n')}
\`\`\`

## Recent Commits
${snapshot.git.recentCommits
  .slice(0, 3)
  .map((c: any) => `- ${c.hash.substring(0, 7)}: ${c.message}`)
  .join('\n')}

## Your Task
${basePrompt}

## Instructions
1. Make focused changes to accomplish the task
2. When done with this iteration, output exactly: ${this.config.completionSignal}
3. Provide a brief summary of what you did`;
  }

  /**
   * Loads notes from previous iteration
   */
  private loadPreviousIterationNotes(): string {
    const notesFile = path.join(this.fileService['contextDir'] || '', 'SHARED_TASK_NOTES.md');
    if (fs.existsSync(notesFile)) {
      const content = fs.readFileSync(notesFile, 'utf-8');
      // Return last 1000 chars (recent iteration info)
      return content.substring(Math.max(0, content.length - 1000));
    }
    return '';
  }

  /**
   * Saves current iteration notes
   */
  private async saveIterationNotes(result: IterationResult): Promise<void> {
    const notes = `
## Iteration ${this.iterations}
**Timestamp:** ${new Date().toLocaleString()}
**Status:** ${result.success ? '✅ Success' : '❌ Failed'}
**Cost:** $${result.cost.toFixed(2)}
**PR:** #${result.prNumber || 'N/A'}
**Summary:** ${result.summary.split('\n')[0]}
**Changed Files:** ${result.changedFiles.join(', ') || 'None'}

---`;

    // Append to contextDir's contextDir property - we'll need access to FileService
    // For now, write directly to workspace storage
    const notesPath = path.join(this.workspaceRoot, '.vscode-loop-notes.md');
    if (fs.existsSync(notesPath)) {
      fs.appendFileSync(notesPath, notes);
    } else {
      fs.writeFileSync(notesPath, `# Continuous Loop Notes\n${notes}`);
    }
  }

  /**
   * Checks if loop should continue
   */
  private shouldContinue(): boolean {
    // Check max iterations
    if (this.config.maxIterations > 0 && this.iterations >= this.config.maxIterations) {
      console.log(`\n⏸️ Reached max iterations (${this.config.maxIterations})`);
      return false;
    }

    // Check max duration
    if (this.config.maxDuration > 0) {
      const elapsedSeconds = (Date.now() - this.startTime) / 1000;
      if (elapsedSeconds >= this.config.maxDuration) {
        console.log(`\n⏸️ Reached max duration (${this.config.maxDuration}s)`);
        return false;
      }
    }

    // Check max cost
    if (this.config.maxCost > 0 && this.totalCost >= this.config.maxCost) {
      console.log(`\n⏸️ Reached max cost ($${this.config.maxCost})`);
      return false;
    }

    return this.isRunning;
  }

  /**
   * Prints summary of the loop execution
   */
  private printSummary(): void {
    const elapsedSeconds = (Date.now() - this.startTime) / 1000;
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = Math.floor(elapsedSeconds % 60);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 Continuous Loop Complete`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total Iterations: ${this.iterations}`);
    console.log(`Total Cost: $${this.totalCost.toFixed(2)}`);
    console.log(`Total Time: ${minutes}m ${seconds}s`);
    console.log(`${'='.repeat(60)}\n`);
  }
}
