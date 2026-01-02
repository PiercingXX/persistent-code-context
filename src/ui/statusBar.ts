import * as vscode from 'vscode';

export class StatusBarManager {
  private statusBar: vscode.StatusBarItem;
  private outputChannel: vscode.OutputChannel;

  constructor() {
    this.statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBar.show();
    this.outputChannel = vscode.window.createOutputChannel('Persistent Code Context');
  }

  updateSession(sessionName: string) {
    this.statusBar.text = `📚 ${sessionName}`;
    this.statusBar.tooltip = 'Persistent code context session active';
    // Log to Output channel and Extension Host for verification
    this.outputChannel.appendLine(`[persistent-context] StatusBar update: ${sessionName}`);
    console.log(`[persistent-context] StatusBar update: ${sessionName}`);
  }

  clearSession() {
    this.statusBar.text = '▶️ Start Session';
    this.statusBar.tooltip = 'No active session';
    this.outputChannel.appendLine('[persistent-context] StatusBar cleared');
    console.log('[persistent-context] StatusBar cleared');
  }

  dispose() {
    this.statusBar.dispose();
    this.outputChannel.dispose();
  }
}
