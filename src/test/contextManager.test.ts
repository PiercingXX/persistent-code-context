import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import { ContextManager } from '../services/contextManager';
import * as crypto from 'crypto';
import * as vscode from 'vscode';

describe('ContextManager', () => {
  const tempRoot = path.join(process.cwd(), '.test-temp', 'cm');

  // Mirror the ContextManager hashing logic to find the actual context directory
  const contextDirFor = (workspaceRoot: string) => {
    const workspaceHash = crypto.createHash('md5').update(workspaceRoot).digest('hex').substring(0, 8);
    const workspaceName = path.basename(workspaceRoot);
    return path.join(tempRoot, `${workspaceName}-${workspaceHash}`);
  };

  // Force the mock vscode config to use our tempRoot as storageDirectory
  (vscode.workspace as any).getConfiguration = () => ({
    get: (key: string, defaultValue?: any) => (key === 'storageDirectory' ? tempRoot : defaultValue),
  });

  before(() => {
    // ensure clean temp directory
    if (fs.existsSync(tempRoot)) fs.rmSync(tempRoot, { recursive: true, force: true });
    fs.mkdirSync(tempRoot, { recursive: true });
  });

  after(() => {
    if (fs.existsSync(tempRoot)) fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('getSessionNames parses session titles from progress.md', () => {
    const progress = `\n## Session: Alpha\n- ID: 1\n\n## Session: Beta\n- ID: 2\n`;
    const ctxDir = contextDirFor(tempRoot);
    fs.mkdirSync(ctxDir, { recursive: true });
    fs.writeFileSync(path.join(ctxDir, 'progress.md'), progress, 'utf-8');

    const cm = new ContextManager(tempRoot);
    try {
      const names = cm.getSessionNames();
      expect(names).to.be.an('array').that.includes('Alpha');
      expect(names).to.include('Beta');
    } finally {
      cm.dispose();
    }
  });

  it('mergeSessions merges all sessions into a single merged entry and starts session', () => {
    const ctxDir = contextDirFor(tempRoot);
    const progress = `\n## Session: A\n- ID: 111\n\n## Session: B\n- ID: 222\n`;
    fs.mkdirSync(ctxDir, { recursive: true });
    fs.writeFileSync(path.join(ctxDir, 'progress.md'), progress, 'utf-8');

    const cm = new ContextManager(tempRoot);
    try {
      const mergedName = cm.mergeSessions();
      expect(mergedName).to.match(/Merged:/);

      const updated = fs.readFileSync(path.join(ctxDir, 'progress.md'), 'utf-8');
      // There should be exactly one '## Session:' in the file (the merged one)
      const occurrences = (updated.match(/## Session:/g) || []).length;
      expect(occurrences).to.equal(1);

      // active session should be set to mergedName
      expect(cm.isSessionActive()).to.equal(true);
      expect(cm.getCurrentSessionName()).to.equal(mergedName);
    } finally {
      cm.dispose();
    }
  });
});
