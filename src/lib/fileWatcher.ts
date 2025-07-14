import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs/promises';
import chalk from 'chalk';
import ignore from 'ignore';
import { CodeIndexer } from './codeIndexer';
import { isPathSafe, validateFilePath } from './pathValidator';

export class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private codeIndexer: CodeIndexer;
  private projectRoot: string;
  private isWatching: boolean = false;
  private ignorePatterns: string[] = [
    'node_modules/**',
    '.git/**',
    '.grok-memory/**',
    'dist/**',
    'build/**',
    '*.log',
    '*.lock',
    '.DS_Store'
  ];

  constructor(codeIndexer: CodeIndexer, projectRoot?: string) {
    this.codeIndexer = codeIndexer;
    this.projectRoot = projectRoot || process.cwd();
  }

  async start(): Promise<void> {
    if (this.isWatching) {
      return;
    }

    // Load gitignore patterns
    const gitignorePatterns = await this.loadGitignore();
    const allIgnorePatterns = [...this.ignorePatterns, ...gitignorePatterns];

    // Create watcher
    this.watcher = chokidar.watch(this.projectRoot, {
      ignored: (filePath: string) => {
        // Handle edge cases
        if (!filePath || typeof filePath !== 'string') {
          return false;
        }
        
        const relativePath = path.relative(this.projectRoot, filePath);
        
        // If relative path is empty (same as root) or starts with .., ignore it
        if (!relativePath || relativePath.startsWith('..')) {
          return false;
        }
        
        const ig = ignore().add(allIgnorePatterns);
        return ig.ignores(relativePath);
      },
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });

    // Set up event handlers
    this.watcher
      .on('add', async (filePath) => {
        await this.handleFileAdd(filePath);
      })
      .on('change', async (filePath) => {
        await this.handleFileChange(filePath);
      })
      .on('unlink', async (filePath) => {
        await this.handleFileDelete(filePath);
      })
      .on('ready', () => {
        this.isWatching = true;
        console.log(chalk.green('\n📡 File watcher active - changes will auto-update the index'));
      })
      .on('error', (error) => {
        console.error(chalk.red('File watcher error:'), error);
      });
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.isWatching = false;
    }
  }

  private async loadGitignore(): Promise<string[]> {
    const gitignorePath = path.join(this.projectRoot, '.gitignore');
    try {
      const content = await fs.readFile(gitignorePath, 'utf-8');
      return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
    } catch {
      return [];
    }
  }

  private async handleFileAdd(filePath: string): Promise<void> {
    try {
      // Validate path safety
      if (!isPathSafe(this.projectRoot, filePath)) {
        console.warn(chalk.yellow(`Skipping unsafe path: ${filePath}`));
        return;
      }
      
      const relativePath = path.relative(this.projectRoot, filePath);
      
      // Additional validation
      if (!relativePath || !validateFilePath(relativePath)) {
        return;
      }
      
      const stats = await fs.stat(filePath);

      // Skip large files (> 1MB)
      if (stats.size > 1024 * 1024) return;

      // Skip binary files
      const content = await fs.readFile(filePath, 'utf-8');
      if (content.includes('\0')) return;

      // Add to index
      await this.codeIndexer.addOrUpdateFile(relativePath);
      
      // Store the update message to show after prompt
      process.stdout.write(`\r${' '.repeat(80)}\r`); // Clear current line
      console.log(chalk.dim(`✓ Indexed new file: ${relativePath}`));
    } catch (error) {
      // Silently skip files that can't be processed
    }
  }

  private async handleFileChange(filePath: string): Promise<void> {
    try {
      // Validate path safety
      if (!isPathSafe(this.projectRoot, filePath)) {
        return;
      }
      
      const relativePath = path.relative(this.projectRoot, filePath);
      
      if (!relativePath || !validateFilePath(relativePath)) {
        return;
      }
      
      // Update in index
      await this.codeIndexer.addOrUpdateFile(relativePath);
      
      process.stdout.write(`\r${' '.repeat(80)}\r`); // Clear current line
      console.log(chalk.dim(`↻ Updated: ${relativePath}`));
    } catch (error) {
      // Silently skip files that can't be processed
    }
  }

  private async handleFileDelete(filePath: string): Promise<void> {
    try {
      // Validate path safety
      if (!isPathSafe(this.projectRoot, filePath)) {
        return;
      }
      
      const relativePath = path.relative(this.projectRoot, filePath);
      
      if (!relativePath || !validateFilePath(relativePath)) {
        return;
      }
      
      // Remove from index
      await this.codeIndexer.removeFile(relativePath);
      
      process.stdout.write(`\r${' '.repeat(80)}\r`); // Clear current line
      console.log(chalk.dim(`✗ Removed: ${relativePath}`));
    } catch (error) {
      // Silently skip
    }
  }

  isActive(): boolean {
    return this.isWatching;
  }
}