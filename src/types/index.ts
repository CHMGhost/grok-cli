export interface GrokConfig {
  apiKey: string;
  apiUrl?: string;
  model?: string;
  ignorePatterns?: string[];
}

export interface KnowledgeEntry {
  title: string;
  tags: string[];
  category: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface Command {
  name: string;
  description: string;
  pattern: RegExp;
  handler: (args: string[]) => Promise<string>;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}