import fetch from 'node-fetch';
import { ChatMessage, GrokConfig } from '../types';
import { loadConfig } from './config';

export class GrokAPI {
  private config: GrokConfig | null = null;
  private currentRequest: AbortController | null = null;

  constructor(config?: GrokConfig) {
    if (config) {
      this.config = config;
    }
  }

  cancelCurrentRequest(): void {
    if (this.currentRequest) {
      this.currentRequest.abort();
      this.currentRequest = null;
    }
  }

  private async ensureConfig(): Promise<GrokConfig> {
    if (!this.config) {
      const loaded = await loadConfig();
      if (!loaded) {
        throw new Error('Grok API key not configured. Run "grok config" to set it up.');
      }
      this.config = loaded;
    }
    return this.config;
  }

  async sendMessage(messages: ChatMessage[]): Promise<string> {
    const config = await this.ensureConfig();
    
    const apiUrl = config.apiUrl || 'https://api.x.ai/v1/chat/completions';
    
    // Cancel any existing request
    this.cancelCurrentRequest();
    
    // Create new AbortController for this request
    this.currentRequest = new AbortController();
    const signal = this.currentRequest.signal;
    
    // Set a timeout of 60 seconds (increased from 30)
    const timeoutId = setTimeout(() => {
      if (this.currentRequest) {
        console.error('Request timed out after 60 seconds');
        this.currentRequest.abort();
      }
    }, 60000);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model || 'grok-beta',
          messages: messages,
          temperature: 0.7,
          max_tokens: 2048
        }),
        signal // Add abort signal
      } as any); // Type assertion for node-fetch compatibility
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Grok API error: ${response.status} - ${error}`);
      }

      const data = await response.json() as any;
      return data.choices[0].message.content;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out or was cancelled');
        }
        console.error('Grok API error:', error.message);
        throw new Error(`Failed to communicate with Grok: ${error.message}`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      this.currentRequest = null;
    }
  }

  async askQuestion(question: string, context?: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are Grok, a helpful AI assistant for coding tasks. You have access to the user\'s code knowledge base through markdown files.'
      }
    ];

    if (context) {
      messages.push({
        role: 'system',
        content: `Context from knowledge base:\n${context}`
      });
    }

    messages.push({
      role: 'user',
      content: question
    });

    return this.sendMessage(messages);
  }

  async askQuestionWithHistory(question: string, context: string, conversationHistory: ChatMessage[]): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are Grok, a helpful AI assistant for coding tasks. You have access to:
1. The user's knowledge base through markdown files in .grok-memory
2. The current project's codebase - files are indexed and stored in .grok-memory/codebase
3. The conversation history

Current working directory: ${process.cwd()}

IMPORTANT: When file content is provided in the context below, you MUST use that exact content in your response. Do not make up or guess file contents. If a file's full content is shown, use it verbatim. The context provided is from the actual indexed files.`
      }
    ];

    if (context) {
      messages.push({
        role: 'system',
        content: `Context from knowledge base and codebase:\n${context}`
      });
    }

    // Add recent conversation history (last 10 messages to avoid token limits)
    const recentHistory = conversationHistory.slice(-10);
    messages.push(...recentHistory);

    // Add the current question
    messages.push({
      role: 'user',
      content: question
    });

    return this.sendMessage(messages);
  }
}