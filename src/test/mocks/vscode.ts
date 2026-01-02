/**
 * Mock implementation of VS Code API for testing.
 * Provides stub implementations for commonly used vscode module exports.
 */

export const workspace = {
  getConfiguration: (section?: string) => ({
    get: (key: string, defaultValue?: any) => defaultValue,
  }),
  onDidChangeConfiguration: (listener: any) => ({
    dispose: () => {},
  }),
  openTextDocument: (arg: any) => Promise.resolve({} as any),
  onDidChangeWorkspaceFolders: (listener: any) => ({
    dispose: () => {},
  }),
};

export const window = {
  visibleTextEditors: [] as any[],
  showQuickPick: (items: any[], options?: any) =>
    Promise.resolve(items && items.length ? items[0] : undefined),
  showTextDocument: (doc: any) => Promise.resolve({} as any),
  showInformationMessage: (message: string) => undefined,
};

export const env = {
  clipboard: {
    writeText: (text: string) => Promise.resolve(),
  },
};

export class Disposable {
  constructor(private dispose: () => void) {}
}
