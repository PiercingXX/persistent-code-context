import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { GitService } from './gitService';

export interface ContextSnapshot {
  timestamp: string;
  workspaceMetadata: {
    name: string;
    rootPath: string;
    nodeVersion?: string;
    runtimeVersion?: string;
    mainLanguage: string;
    buildTargets?: string[];
  };
  systemInfo: {
    targetPlatforms: string[];
    deploymentEnvironment?: string;
    externalServices?: string[];
    hardwareRequirements?: string[];
  };
  vscodeContext: {
    requiredExtensions: string[];
    projectSettings: Record<string, any>;
  };
  projectStructure: {
    directories: string[];
    keyFiles: string[];
  };
  git: {
    branch: string;
    recentCommits: Array<{ hash: string; message: string }>;
    stagedFiles: string[];
    modifiedFiles: string[];
  };
  openEditors: Array<{
    path: string;
    language: string;
    lines: number;
  }>;
  deploymentContext: {
    location?: string;
    accessMethod?: string;
    deploymentMethod?: string;
    isProduction?: boolean;
    currentMode?: string;
  };
}

export class ContextSnapshotCollector {
  constructor(
    private workspaceRoot: string,
    private gitService: GitService
  ) {}

  async collect(): Promise<ContextSnapshot> {
    return {
      timestamp: new Date().toISOString(),
      workspaceMetadata: this.collectWorkspaceMetadata(),
      systemInfo: this.collectSystemInfo(),
      vscodeContext: this.collectVSCodeContext(),
      projectStructure: this.collectProjectStructure(),
      git: this.collectGitInfo(),
      openEditors: this.collectOpenEditors(),
      deploymentContext: this.collectDeploymentContext(),
    };
  }

  private collectWorkspaceMetadata() {
    const pkgPath = path.join(this.workspaceRoot, 'package.json');
    const tsConfigPath = path.join(this.workspaceRoot, 'tsconfig.json');

    let nodeVersion: string | undefined;
    let mainLanguage = 'unknown';
    let buildTargets: string[] = [];

    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        nodeVersion = pkg.engines?.node;
        if (pkg.scripts?.['build'] || pkg.scripts?.['compile']) {
          buildTargets.push('build');
        }
        mainLanguage = 'javascript/typescript';
      } catch (e) {
        // ignore parse errors
      }
    }

    if (fs.existsSync(tsConfigPath)) {
      mainLanguage = 'typescript';
    }

    return {
      name: path.basename(this.workspaceRoot),
      rootPath: this.workspaceRoot,
      nodeVersion,
      mainLanguage,
      buildTargets: buildTargets.length > 0 ? buildTargets : undefined,
    };
  }

  private collectSystemInfo() {
    return {
      targetPlatforms: ['linux', 'macos', 'windows'], // defaults, user can override
      deploymentEnvironment: undefined, // user to define via settings
      externalServices: undefined, // user to define via settings
      hardwareRequirements: undefined, // user to define via settings
    };
  }

  private collectVSCodeContext() {
    const requiredExtensions: string[] = [];
    const vscodeConfigPath = path.join(this.workspaceRoot, '.vscode', 'settings.json');

    // Check for common tooling extensions
    if (fs.existsSync(path.join(this.workspaceRoot, '.eslintrc'))) {
      requiredExtensions.push('eslint');
    }
    if (fs.existsSync(path.join(this.workspaceRoot, '.prettierrc'))) {
      requiredExtensions.push('prettier');
    }

    let projectSettings: Record<string, any> = {};
    if (fs.existsSync(vscodeConfigPath)) {
      try {
        projectSettings = JSON.parse(fs.readFileSync(vscodeConfigPath, 'utf-8'));
      } catch (e) {
        // ignore parse errors
      }
    }

    return {
      requiredExtensions,
      projectSettings,
    };
  }

  private collectProjectStructure() {
    const directories: string[] = [];
    const keyFiles: string[] = [];

    try {
      const entries = fs.readdirSync(this.workspaceRoot, { withFileTypes: true });
      entries.forEach((entry) => {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          directories.push(entry.name);
        } else if (entry.isFile() && ['.md', '.json', '.yml', '.yaml'].some((ext) => entry.name.endsWith(ext))) {
          keyFiles.push(entry.name);
        }
      });
    } catch (e) {
      // ignore read errors
    }

    return { directories, keyFiles };
  }

  private collectGitInfo() {
    const branch = this.gitService.getCurrentBranch();
    const recentCommits = this.gitService.getRecentCommits(5).map((commit) => {
      const [hash, ...msgParts] = commit.split(' ');
      return {
        hash: hash.substring(0, 8),
        message: msgParts.join(' '),
      };
    });

    const stagedFiles = this.gitService.getStagedFiles();
    const modifiedFiles = this.gitService.getChangedFiles();

    return {
      branch,
      recentCommits,
      stagedFiles,
      modifiedFiles,
    };
  }

  private collectOpenEditors() {
    return vscode.window.visibleTextEditors.map((editor) => ({
      path: editor.document.fileName,
      language: editor.document.languageId,
      lines: editor.document.lineCount,
    }));
  }

  private collectDeploymentContext() {
    // User can set these via settings or workspace configuration
    const cfg = vscode.workspace.getConfiguration('persistentContext');
    return {
      location: cfg.get<string>('deploymentLocation'),
      accessMethod: cfg.get<string>('deploymentAccessMethod'),
      deploymentMethod: cfg.get<string>('deploymentMethod'),
      isProduction: cfg.get<boolean>('isProduction'),
      currentMode: cfg.get<string>('currentWorkMode'),
    };
  }
}
