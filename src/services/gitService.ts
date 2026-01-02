import { execSync } from 'child_process';

export class GitService {
  constructor(private workspaceRoot: string) {}

  getCurrentBranch(): string {
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: this.workspaceRoot,
        encoding: 'utf-8',
      }).trim();
      return branch;
    } catch {
      return 'unknown';
    }
  }

  getRecentCommits(count: number = 5): string[] {
    try {
      const log = execSync(`git log --oneline -${count}`, {
        cwd: this.workspaceRoot,
        encoding: 'utf-8',
      }).trim();
      return log.split('\n').filter(line => line.length > 0);
    } catch {
      return [];
    }
  }

  getChangedFiles(): string[] {
    try {
      const changes = execSync('git status --short', {
        cwd: this.workspaceRoot,
        encoding: 'utf-8',
      }).trim();
      return changes.split('\n').filter(line => line.length > 0);
    } catch {
      return [];
    }
  }
}
