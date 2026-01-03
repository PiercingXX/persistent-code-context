import { execSync } from 'child_process';
import * as path from 'path';

export interface PRStatus {
  number: string;
  state: 'open' | 'closed' | 'merged';
  checkStates: { pending: number; success: number; failed: number };
  reviewDecision?: string;
  reviewRequests?: string[];
}

export class PRManager {
  constructor(private workspaceRoot: string) {}

  /**
   * Creates a new pull request
   */
  async createPR(branchName: string, title: string, body: string): Promise<string> {
    try {
      const result = execSync(
        `gh pr create --title "${this.escapeShell(title)}" --body "${this.escapeShell(body)}" --base main`,
        { cwd: this.workspaceRoot, encoding: 'utf-8' }
      ).trim();

      // Extract PR number from URL (e.g., "https://github.com/owner/repo/pull/123" -> "123")
      const match = result.match(/\/pull\/(\d+)/);
      if (match) {
        return match[1];
      }
      throw new Error(`Failed to extract PR number from: ${result}`);
    } catch (error) {
      throw new Error(`Failed to create PR: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Waits for all PR checks to pass
   * @param prNumber PR number
   * @param timeoutSeconds Maximum time to wait (default: 30 minutes)
   * @returns true if all checks passed, false if timeout/failed
   */
  async waitForChecks(prNumber: string, timeoutSeconds: number = 1800): Promise<boolean> {
    const pollIntervalMs = 10000; // 10 seconds
    const startTime = Date.now();

    console.log(`[PR #${prNumber}] Waiting for checks to pass (max ${timeoutSeconds}s)...`);

    while (Date.now() - startTime < timeoutSeconds * 1000) {
      try {
        const status = await this.getPRStatus(prNumber);

        // Display status
        const total = status.checkStates.pending + status.checkStates.success + status.checkStates.failed;
        console.log(
          `[PR #${prNumber}] Checks: 🟢 ${status.checkStates.success} / 🟡 ${status.checkStates.pending} / 🔴 ${status.checkStates.failed} (${total} total)`
        );

        // Check if all passed
        if (status.checkStates.failed > 0) {
          console.error(`[PR #${prNumber}] ❌ Checks failed`);
          return false;
        }

        if (status.checkStates.pending === 0 && status.checkStates.success > 0) {
          console.log(`[PR #${prNumber}] ✅ All checks passed`);
          return true;
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      } catch (error) {
        console.error(`[PR #${prNumber}] Error checking status:`, error);
        // Continue polling on error
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      }
    }

    console.error(`[PR #${prNumber}] ⏱️ Timeout waiting for checks`);
    return false;
  }

  /**
   * Gets current PR status
   */
  async getPRStatus(prNumber: string): Promise<PRStatus> {
    try {
      // Get detailed PR info as JSON
      const prInfo = execSync(`gh pr view ${prNumber} --json state,number,checks,reviewDecision,reviewRequests`, {
        cwd: this.workspaceRoot,
        encoding: 'utf-8',
      });

      const parsed = JSON.parse(prInfo);

      // Parse check statuses
      const checkStates = { pending: 0, success: 0, failed: 0 };
      if (parsed.checks && Array.isArray(parsed.checks)) {
        for (const check of parsed.checks) {
          if (check.conclusion === 'success' || check.status === 'completed') {
            checkStates.success++;
          } else if (check.status === 'in_progress' || check.status === 'queued' || !check.conclusion) {
            checkStates.pending++;
          } else {
            checkStates.failed++;
          }
        }
      }

      return {
        number: parsed.number,
        state: parsed.state || 'open',
        checkStates,
        reviewDecision: parsed.reviewDecision,
        reviewRequests: parsed.reviewRequests || [],
      };
    } catch (error) {
      throw new Error(`Failed to get PR status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Merges a PR
   * @param prNumber PR number
   * @param strategy merge strategy: squash, merge, or rebase
   */
  async mergePR(prNumber: string, strategy: 'squash' | 'merge' | 'rebase' = 'squash'): Promise<void> {
    try {
      const strategyFlag = strategy === 'squash' ? '--squash' : strategy === 'rebase' ? '--rebase' : '--merge';
      execSync(`gh pr merge ${prNumber} ${strategyFlag} --auto`, {
        cwd: this.workspaceRoot,
      });
      console.log(`[PR #${prNumber}] ✅ Merged with ${strategy} strategy`);
    } catch (error) {
      throw new Error(`Failed to merge PR: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Closes a PR without merging
   */
  async closePR(prNumber: string, reason?: string): Promise<void> {
    try {
      execSync(`gh pr close ${prNumber}`, { cwd: this.workspaceRoot });
      console.log(`[PR #${prNumber}] Closed${reason ? `: ${reason}` : ''}`);
    } catch (error) {
      throw new Error(`Failed to close PR: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Utility: escape shell string
   */
  private escapeShell(str: string): string {
    return str.replace(/'/g, "'\\''").replace(/"/g, '\\"');
  }
}
