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

  async sendMessage(messages: ChatMessage[], retries: number = 3): Promise<string> {
    const config = await this.ensureConfig();
    
    const apiUrl = config.apiUrl || 'https://api.x.ai/v1/chat/completions';
    
    // Cancel any existing request
    this.cancelCurrentRequest();
    
    // Create new AbortController for this request
    this.currentRequest = new AbortController();
    const signal = this.currentRequest.signal;
    
    // Set a timeout of 120 seconds for network issues
    const timeoutId = setTimeout(() => {
      if (this.currentRequest) {
        console.error('Request timed out after 120 seconds');
        this.currentRequest.abort();
      }
    }, 120000);
    
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
        // Handle network timeouts with retry
        if (error.message.includes('ETIMEDOUT') || error.message.includes('ECONNRESET')) {
          if (retries > 0) {
            console.log(`Network timeout, retrying... (${retries} attempts left)`);
            this.currentRequest = null;
            // Wait a bit before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
            return this.sendMessage(messages, retries - 1);
          }
        }
        
        if (error.name === 'AbortError') {
          throw new Error('Request timed out or was cancelled');
        }
        
        console.error('Grok API error:', error.message);
        
        // Provide more helpful error messages
        if (error.message.includes('ETIMEDOUT')) {
          throw new Error('Network timeout - Grok API is not responding. Please check your internet connection.');
        } else if (error.message.includes('ECONNREFUSED')) {
          throw new Error('Cannot connect to Grok API. Please check if the API is available.');
        } else if (error.message.includes('401')) {
          throw new Error('Invalid API key. Please run "grok config" to update your API key.');
        }
        
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

IMPORTANT: When file content is provided in the context below, you MUST use that exact content in your response. Do not make up or guess file contents.

When the user asks for code changes or improvements:
1. Analyze the code and provide specific suggestions
2. If asked to make changes, format your response with clear file paths and modifications
3. Be specific about what lines or sections to change
4. Explain why each change improves the code

For UX improvements, consider:
- Error handling and user feedback
- Command response times
- Clear and helpful messages
- Intuitive command structure
- Progress indicators for long operations`
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