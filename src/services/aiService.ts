import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import { ContextSnapshot } from './snapshotCollector';

export interface AIProvider {
  name: string;
  summarize(snapshot: ContextSnapshot): Promise<string>;
}

/**
 * AIService attempts to use available LLM providers to summarize context.
 * Tries in order: GitHub Copilot (via VS Code API), Ollama, OpenAI, Anthropic
 * Falls back gracefully if none available.
 */
export class AIService {
  private provider: AIProvider | null = null;
  private lastError: string | null = null;

  constructor(private workspaceRoot: string) {
    this.initializeProvider();
  }

  private initializeProvider() {
    const cfg = vscode.workspace.getConfiguration('persistentContext');
    const providerSetting = cfg.get<string>('aiProvider', 'auto');

    if (providerSetting === 'auto') {
      this.tryInitializeAuto();
    } else {
      this.tryInitializeSpecific(providerSetting);
    }
  }

  private tryInitializeAuto() {
    // Try GitHub Copilot first (via vscode.lm API if available)
    if ((vscode as any).lm) {
      this.provider = new GitHubCopilotProvider();
      return;
    }

    // Try Ollama
    this.provider = new OllamaProvider();
  }

  private tryInitializeSpecific(providerName: string) {
    const cfg = vscode.workspace.getConfiguration('persistentContext');

    switch (providerName.toLowerCase()) {
      case 'github-models':
        this.provider = new GitHubModelsProvider();
        break;
      case 'copilot':
        if ((vscode as any).lm) {
          this.provider = new GitHubCopilotProvider();
        }
        break;
      case 'ollama':
        this.provider = new OllamaProvider(cfg.get<string>('ollamaEndpoint', 'http://localhost:11434'));
        break;
      case 'openai':
        const openaiKey = cfg.get<string>('openaiApiKey');
        if (openaiKey) {
          this.provider = new OpenAIProvider(openaiKey);
        }
        break;
      case 'anthropic':
        const anthropicKey = cfg.get<string>('anthropicApiKey');
        if (anthropicKey) {
          this.provider = new AnthropicProvider(anthropicKey);
        }
        break;
    }
  }

  async summarize(snapshot: ContextSnapshot): Promise<string | null> {
    if (!this.provider) {
      return null; // No AI available, return null to indicate graceful degradation
    }

    try {
      const summary = await this.provider.summarize(snapshot);
      this.lastError = null;
      return summary;
    } catch (error) {
      this.lastError = `AI provider error: ${error}`;
      console.error('[persistent-context] AI error:', this.lastError);
      return null;
    }
  }

  getProviderName(): string {
    return this.provider?.name || 'none';
  }

  hasError(): boolean {
    return this.lastError !== null;
  }

  getLastError(): string | null {
    return this.lastError;
  }
}

/**
 * GitHub Copilot provider using VS Code's LM API (if available)
 */
class GitHubCopilotProvider implements AIProvider {
  name = 'GitHub Copilot';

  async summarize(snapshot: ContextSnapshot): Promise<string> {
    const vscodeLM = (vscode as any).lm;
    if (!vscodeLM) {
      throw new Error('VS Code Language Models API not available. Ensure you have GitHub Copilot extension installed and are signed in.');
    }

    const prompt = this.buildPrompt(snapshot);

    try {
      // Use gpt-4o or gpt-3.5-turbo depending on availability
      const models = await vscodeLM.selectChatModels();
      if (!models || models.length === 0) {
        throw new Error('No chat models available. Ensure GitHub Copilot is installed and you are signed in.');
      }

      const model = models[0]; // Use the first available model
      const messages = [new (vscode as any).LanguageModelChatMessage((vscode as any).LanguageModelChatMessageRole.User, prompt)];

      const chatResponse = await model.sendRequest(messages, {});
      
      let fullResponse = '';
      for await (const fragment of chatResponse.text) {
        fullResponse += fragment;
      }

      return fullResponse.trim() || 'Summary generated but empty response received.';
    } catch (error) {
      throw new Error(`GitHub Copilot summarization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildPrompt(snapshot: ContextSnapshot): string {
    return `You are a technical AI assistant. Analyze this workspace snapshot and provide a concise summary that will help you or another AI quickly understand the project context.

## Workspace Metadata
- Name: ${snapshot.workspaceMetadata.name}
- Language: ${snapshot.workspaceMetadata.mainLanguage}
- Node Version: ${snapshot.workspaceMetadata.nodeVersion || 'N/A'}

## Project Structure
Directories: ${snapshot.projectStructure.directories.join(', ')}
Key Files: ${snapshot.projectStructure.keyFiles.join(', ')}

## Git Status
- Branch: ${snapshot.git.branch}
- Recent Commits: ${snapshot.git.recentCommits.map((c) => c.message).join('\n  - ')}
- Modified Files: ${snapshot.git.modifiedFiles.join(', ') || 'None'}
- Staged Files: ${snapshot.git.stagedFiles.join(', ') || 'None'}

## Open Editors
${snapshot.openEditors.map((e) => `- ${e.path} (${e.language}, ${e.lines} lines)`).join('\n')}

## Deployment Context
- Location: ${snapshot.deploymentContext.location || 'Not specified'}
- Access Method: ${snapshot.deploymentContext.accessMethod || 'Not specified'}
- Deployment Method: ${snapshot.deploymentContext.deploymentMethod || 'Not specified'}
- Current Mode: ${snapshot.deploymentContext.currentMode || 'Not specified'}
- Production: ${snapshot.deploymentContext.isProduction ? 'Yes' : 'No'}

## Required Extensions
${snapshot.vscodeContext.requiredExtensions.join(', ') || 'None'}

## Task
Provide a comprehensive summary covering:
1. What is this project building?
2. What is the tech stack?
3. What is the project structure and architecture?
4. What is currently being worked on?
5. What changed recently?
6. What is the deployment environment?
7. Any important context for continuing development?

Keep the summary concise but complete.`;
  }
}

/**
 * GitHub Models provider
 */
class GitHubModelsProvider implements AIProvider {
  name = 'GitHub Models';
  private endpoint = 'https://models.inference.ai.azure.com/chat/completions';

  async summarize(snapshot: ContextSnapshot): Promise<string> {
    const cfg = vscode.workspace.getConfiguration('persistentContext');
    const token = cfg.get<string>('githubToken') || process.env.GITHUB_TOKEN;

    if (!token) {
      throw new Error(
        'GitHub token not configured. Set persistentContext.githubToken in settings or GITHUB_TOKEN environment variable.'
      );
    }

    const prompt = this.buildPrompt(snapshot);

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      });

      const options = {
        hostname: 'models.inference.ai.azure.com',
        path: '/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          Authorization: `Bearer ${token}`,
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              reject(
                new Error(
                  `GitHub Models API error (${res.statusCode}): ${data}`
                )
              );
              return;
            }

            const parsed = JSON.parse(data);
            const message = parsed.choices?.[0]?.message?.content || '';
            if (!message) {
              reject(new Error('Empty response from GitHub Models API'));
              return;
            }
            resolve(message.trim());
          } catch (e) {
            reject(
              new Error(`Failed to parse GitHub Models response: ${e}`)
            );
          }
        });
      });

      req.on('error', (e) => {
        reject(
          new Error(
            `Failed to reach GitHub Models API: ${e.message}`
          )
        );
      });

      req.write(postData);
      req.end();
    });
  }

  private buildPrompt(snapshot: ContextSnapshot): string {
    return `You are a technical AI assistant. Analyze this workspace snapshot and provide a concise summary that will help you or another AI quickly understand the project context.

## Workspace Metadata
- Name: ${snapshot.workspaceMetadata.name}
- Language: ${snapshot.workspaceMetadata.mainLanguage}
- Node Version: ${snapshot.workspaceMetadata.nodeVersion || 'N/A'}

## Project Structure
Directories: ${snapshot.projectStructure.directories.join(', ')}
Key Files: ${snapshot.projectStructure.keyFiles.join(', ')}

## Git Status
- Branch: ${snapshot.git.branch}
- Recent Commits: ${snapshot.git.recentCommits.map((c) => c.message).join('\n  - ')}
- Modified Files: ${snapshot.git.modifiedFiles.join(', ') || 'None'}
- Staged Files: ${snapshot.git.stagedFiles.join(', ') || 'None'}

## Open Editors
${snapshot.openEditors.map((e) => `- ${e.path} (${e.language}, ${e.lines} lines)`).join('\n')}

## Deployment Context
- Location: ${snapshot.deploymentContext.location || 'Not specified'}
- Access Method: ${snapshot.deploymentContext.accessMethod || 'Not specified'}
- Deployment Method: ${snapshot.deploymentContext.deploymentMethod || 'Not specified'}
- Current Mode: ${snapshot.deploymentContext.currentMode || 'Not specified'}
- Production: ${snapshot.deploymentContext.isProduction ? 'Yes' : 'No'}

## Required Extensions
${snapshot.vscodeContext.requiredExtensions.join(', ') || 'None'}

## Task
Provide a comprehensive summary covering:
1. What is this project building?
2. What is the tech stack?
3. What is the project structure and architecture?
4. What is currently being worked on?
5. What changed recently?
6. What is the deployment environment?
7. Any important context for continuing development?

Keep the summary concise but complete.`;
  }
}

/**
 * Local Ollama provider
 */
class OllamaProvider implements AIProvider {
  name = 'Ollama (Local)';

  constructor(private endpoint: string = 'http://localhost:11434') {}

  async summarize(snapshot: ContextSnapshot): Promise<string> {
    const prompt = this.buildPrompt(snapshot);

    return new Promise((resolve, reject) => {
      const url = new URL(`${this.endpoint}/api/generate`);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const postData = JSON.stringify({
        model: 'neural-chat',
        prompt,
        stream: false,
      });

      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.response || '');
          } catch (e) {
            reject(new Error(`Failed to parse Ollama response: ${e}`));
          }
        });
      });

      req.on('error', (e) => {
        reject(new Error(`Failed to reach Ollama at ${this.endpoint}: ${e.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  private buildPrompt(snapshot: ContextSnapshot): string {
    return `You are a technical AI assistant. Analyze this workspace snapshot and provide a concise summary that will help you or another AI quickly understand the project context.

## Workspace Metadata
- Name: ${snapshot.workspaceMetadata.name}
- Language: ${snapshot.workspaceMetadata.mainLanguage}
- Node Version: ${snapshot.workspaceMetadata.nodeVersion || 'N/A'}

## Project Structure
Directories: ${snapshot.projectStructure.directories.join(', ')}
Key Files: ${snapshot.projectStructure.keyFiles.join(', ')}

## Git Status
- Branch: ${snapshot.git.branch}
- Recent Commits: ${snapshot.git.recentCommits.map((c) => c.message).join('\n  - ')}
- Modified Files: ${snapshot.git.modifiedFiles.join(', ') || 'None'}
- Staged Files: ${snapshot.git.stagedFiles.join(', ') || 'None'}

## Open Editors
${snapshot.openEditors.map((e) => `- ${e.path} (${e.language}, ${e.lines} lines)`).join('\n')}

## Deployment Context
- Location: ${snapshot.deploymentContext.location || 'Not specified'}
- Access Method: ${snapshot.deploymentContext.accessMethod || 'Not specified'}
- Deployment Method: ${snapshot.deploymentContext.deploymentMethod || 'Not specified'}
- Current Mode: ${snapshot.deploymentContext.currentMode || 'Not specified'}
- Production: ${snapshot.deploymentContext.isProduction ? 'Yes' : 'No'}

## Required Extensions
${snapshot.vscodeContext.requiredExtensions.join(', ') || 'None'}

## Task
Provide a comprehensive summary covering:
1. What is this project building?
2. What is the tech stack?
3. What is the project structure and architecture?
4. What is currently being worked on?
5. What changed recently?
6. What is the deployment environment?
7. Any important context for continuing development?

Keep the summary concise but complete.`;
  }
}

/**
 * OpenAI provider
 */
class OpenAIProvider implements AIProvider {
  name = 'OpenAI';

  constructor(private apiKey: string) {}

  async summarize(snapshot: ContextSnapshot): Promise<string> {
    // TODO: Implement OpenAI API call
    throw new Error('OpenAI provider not yet implemented');
  }
}

/**
 * Anthropic provider
 */
class AnthropicProvider implements AIProvider {
  name = 'Anthropic Claude';

  constructor(private apiKey: string) {}

  async summarize(snapshot: ContextSnapshot): Promise<string> {
    // TODO: Implement Anthropic API call
    throw new Error('Anthropic provider not yet implemented');
  }
}
