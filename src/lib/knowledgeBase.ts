import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { KnowledgeEntry } from '../types';

export class KnowledgeBase {
  private knowledgePath: string;

  constructor(knowledgePath?: string) {
    this.knowledgePath = knowledgePath || path.join(process.cwd(), '.grok-memory');
  }

  async ensureKnowledgeDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.knowledgePath, { recursive: true });
    } catch (error) {
      console.error('Failed to create knowledge directory:', error);
    }
  }

  async loadEntry(filename: string): Promise<KnowledgeEntry | null> {
    try {
      const filePath = path.join(this.knowledgePath, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      const { data, content: markdownContent } = matter(content);

      return {
        title: data.title || filename,
        tags: data.tags || [],
        category: data.category || 'general',
        content: markdownContent,
        metadata: data
      };
    } catch (error) {
      return null;
    }
  }

  async loadAllEntries(): Promise<KnowledgeEntry[]> {
    await this.ensureKnowledgeDirectory();
    
    try {
      const files = await fs.readdir(this.knowledgePath);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      
      const entries = await Promise.all(
        mdFiles.map(file => this.loadEntry(file))
      );

      return entries.filter((entry): entry is KnowledgeEntry => entry !== null);
    } catch (error) {
      console.error('Failed to load knowledge entries:', error);
      return [];
    }
  }

  async searchEntries(query: string): Promise<KnowledgeEntry[]> {
    const allEntries = await this.loadAllEntries();
    const queryLower = query.toLowerCase();

    return allEntries.filter(entry => {
      const titleMatch = entry.title.toLowerCase().includes(queryLower);
      const contentMatch = entry.content.toLowerCase().includes(queryLower);
      const tagMatch = entry.tags.some(tag => tag.toLowerCase().includes(queryLower));
      const categoryMatch = entry.category.toLowerCase().includes(queryLower);

      return titleMatch || contentMatch || tagMatch || categoryMatch;
    });
  }

  async getEntriesByTag(tag: string): Promise<KnowledgeEntry[]> {
    const allEntries = await this.loadAllEntries();
    return allEntries.filter(entry => 
      entry.tags.some(t => t.toLowerCase() === tag.toLowerCase())
    );
  }

  async getEntriesByCategory(category: string): Promise<KnowledgeEntry[]> {
    const allEntries = await this.loadAllEntries();
    return allEntries.filter(entry => 
      entry.category.toLowerCase() === category.toLowerCase()
    );
  }

  async saveEntry(filename: string, entry: KnowledgeEntry): Promise<void> {
    await this.ensureKnowledgeDirectory();
    
    const frontMatter = {
      title: entry.title,
      tags: entry.tags,
      category: entry.category,
      ...entry.metadata
    };

    const content = matter.stringify(entry.content, frontMatter);
    const filePath = path.join(this.knowledgePath, filename);
    
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async getContext(query: string, maxEntries: number = 3): Promise<string> {
    const relevantEntries = await this.searchEntries(query);
    const limitedEntries = relevantEntries.slice(0, maxEntries);

    if (limitedEntries.length === 0) {
      return '';
    }

    return limitedEntries.map(entry => 
      `## ${entry.title}\nCategory: ${entry.category}\nTags: ${entry.tags.join(', ')}\n\n${entry.content}`
    ).join('\n\n---\n\n');
  }
}