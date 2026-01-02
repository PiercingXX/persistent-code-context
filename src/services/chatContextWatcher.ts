import * as vscode from 'vscode';

/**
 * ChatContextWatcher monitors for chat-related activities and extracts context
 * to update the active context with user instructions and AI interactions.
 */
export class ChatContextWatcher {
  private lastChatContext: string = '';
  private disposables: vscode.Disposable[] = [];

  constructor(private onContextExtracted: (context: string) => void) {
    this.setupWatchers();
  }

  private setupWatchers() {
    // Monitor visible text editors for chat content (only if API available)
    if (vscode.window.onDidChangeVisibleTextEditors) {
      this.disposables.push(
        vscode.window.onDidChangeVisibleTextEditors((editors) => {
          this.checkForChatContent(editors);
        })
      );

      // Also check current editors on initialization
      this.checkForChatContent(vscode.window.visibleTextEditors || []);
    }
  }

  private checkForChatContent(editors: readonly vscode.TextEditor[]) {
    for (const editor of editors) {
      const doc = editor.document;
      
      // Check if this is a chat document (VS Code chat uses specific schemes)
      if (this.isChatDocument(doc)) {
        this.extractChatContext(doc);
      }
    }
  }

  private isChatDocument(doc: vscode.TextDocument): boolean {
    // VS Code chat documents use these schemes
    return (
      doc.uri.scheme === 'vscode-chat-session' ||
      doc.uri.scheme === 'vscode-chat' ||
      doc.uri.scheme === 'chat-editing-snapshot-text-model' ||
      doc.languageId === 'markdown' && doc.uri.path.includes('chat')
    );
  }

  private extractChatContext(doc: vscode.TextDocument) {
    const content = doc.getText();
    
    // Skip if content hasn't changed
    if (content === this.lastChatContext) {
      return;
    }

    // Extract user prompts and key context
    const userMessages = this.extractUserMessages(content);
    
    if (userMessages.length > 0) {
      const contextSummary = this.buildContextSummary(userMessages);
      this.lastChatContext = content;
      this.onContextExtracted(contextSummary);
    }
  }

  private extractUserMessages(content: string): string[] {
    const messages: string[] = [];
    
    // Look for common patterns in chat content
    // User messages often start with "User:" or are in specific markdown formats
    const lines = content.split('\n');
    let currentMessage = '';
    
    for (const line of lines) {
      // Detect user message indicators
      if (line.trim().startsWith('#') && (line.includes('User') || line.includes('user'))) {
        if (currentMessage.trim()) {
          messages.push(currentMessage.trim());
        }
        currentMessage = '';
      } else if (line.trim().length > 0 && !line.trim().startsWith('```')) {
        currentMessage += line + '\n';
      }
    }
    
    if (currentMessage.trim()) {
      messages.push(currentMessage.trim());
    }
    
    // Also try to extract from the last few substantial lines
    if (messages.length === 0) {
      const substantialLines = lines
        .filter(l => l.trim().length > 20)
        .slice(-5);
      
      if (substantialLines.length > 0) {
        messages.push(substantialLines.join('\n'));
      }
    }
    
    return messages;
  }

  private buildContextSummary(messages: string[]): string {
    const timestamp = new Date().toLocaleString();
    const latest = messages[messages.length - 1];
    
    return `**[${timestamp}] User Instruction from Chat:**\n${latest}\n`;
  }

  /**
   * Manually extract context from the currently active editor
   */
  extractFromActiveEditor(): string | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return null;
    }

    if (this.isChatDocument(editor.document)) {
      const content = editor.document.getText();
      const messages = this.extractUserMessages(content);
      
      if (messages.length > 0) {
        return this.buildContextSummary(messages);
      }
    }

    return null;
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
}
