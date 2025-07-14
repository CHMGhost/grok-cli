import fs from 'fs/promises';
import path from 'path';
import { ChatMessage } from '../types';
import { KnowledgeBase } from './knowledgeBase';

export class ConversationManager {
  private memoryPath: string;
  private conversationsPath: string;
  private currentConversation: ChatMessage[] = [];
  private conversationId: string;
  private knowledgeBase: KnowledgeBase;

  constructor() {
    this.memoryPath = path.join(process.cwd(), '.grok-memory');
    this.conversationsPath = path.join(this.memoryPath, 'conversations');
    this.conversationId = this.generateConversationId();
    this.knowledgeBase = new KnowledgeBase();
  }

  private generateConversationId(): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
    return `conversation-${dateStr}-${timeStr}`;
  }

  async initialize(): Promise<void> {
    await this.ensureDirectories();
    await this.loadOrCreateConversation();
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.conversationsPath, { recursive: true });
  }

  private async loadOrCreateConversation(): Promise<void> {
    // For now, we'll start fresh each time
    // In the future, we could add a /resume command to continue previous conversations
    this.currentConversation = [];
  }

  addMessage(message: ChatMessage): void {
    this.currentConversation.push(message);
  }

  getConversationHistory(): ChatMessage[] {
    return [...this.currentConversation];
  }

  getRecentContext(maxMessages: number = 10): ChatMessage[] {
    const start = Math.max(0, this.currentConversation.length - maxMessages);
    return this.currentConversation.slice(start);
  }

  async saveConversation(): Promise<void> {
    if (this.currentConversation.length === 0) return;

    const conversationData = {
      id: this.conversationId,
      timestamp: new Date().toISOString(),
      messages: this.currentConversation
    };

    const filePath = path.join(this.conversationsPath, `${this.conversationId}.json`);
    await fs.writeFile(filePath, JSON.stringify(conversationData, null, 2));
  }

  async saveAsKnowledgeEntry(title: string, tags: string[] = []): Promise<void> {
    if (this.currentConversation.length === 0) return;

    // Convert conversation to markdown format
    let content = '';
    for (const msg of this.currentConversation) {
      if (msg.role === 'user') {
        content += `### User:\n${msg.content}\n\n`;
      } else if (msg.role === 'assistant') {
        content += `### Grok:\n${msg.content}\n\n`;
      }
    }

    const entry = {
      title,
      tags: [...tags, 'conversation', 'chat-history'],
      category: 'Conversations',
      content
    };

    const filename = `${this.conversationId}.md`;
    await this.knowledgeBase.saveEntry(filename, entry);
  }

  async listRecentConversations(limit: number = 10): Promise<Array<{id: string, timestamp: string, messageCount: number}>> {
    try {
      const files = await fs.readdir(this.conversationsPath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      const conversations = await Promise.all(
        jsonFiles.map(async (file) => {
          const content = await fs.readFile(path.join(this.conversationsPath, file), 'utf-8');
          const data = JSON.parse(content);
          return {
            id: data.id,
            timestamp: data.timestamp,
            messageCount: data.messages.length
          };
        })
      );

      return conversations
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch {
      return [];
    }
  }

  async loadConversation(conversationId: string): Promise<boolean> {
    try {
      const filePath = path.join(this.conversationsPath, `${conversationId}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      this.currentConversation = data.messages;
      this.conversationId = conversationId;
      
      return true;
    } catch {
      return false;
    }
  }
}