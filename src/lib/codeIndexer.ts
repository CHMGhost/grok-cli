import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import ignore from 'ignore';
import { languageExtensions, defaultIgnorePatterns } from './languageConfig';
import { loadConfig } from './config';
import { isPathSafe, validateFilePath, isFileSizeValid } from './pathValidator';
import { isRegexSafe } from './regexValidator';

export interface CodeFile {
  path: string;
  relativePath: string;
  content: string;
  language: string;
  size: number;
  lastModified: Date;
}

export interface SearchResult {
  file: CodeFile;
  matches: Array<{
    line: number;
    content: string;
    startIndex: number;
    endIndex: number;
  }>;
}

export class CodeIndexer {
  private projectRoot: string;
  private indexedFiles: Map<string, CodeFile> = new Map();
  private memoryPath: string;
  private codebasePath: string;
  private indexPath: string;
  private ignorePatterns: string[] = defaultIgnorePatterns;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.memoryPath = path.join(this.projectRoot, '.grok-memory');
    this.codebasePath = path.join(this.memoryPath, 'codebase');
    this.indexPath = path.join(this.memoryPath, 'codebase-index.json');
  }

  async initialize(): Promise<void> {
    await this.loadPersistedIndex();
  }

  private getLanguageFromExtension(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    return languageExtensions[ext] || 'text';
  }

  private async loadGitignore(): Promise<string[]> {
    const gitignorePath = path.join(this.projectRoot, '.gitignore');
    try {
      const content = await fs.readFile(gitignorePath, 'utf-8');
      return content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    } catch {
      return [];
    }
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.codebasePath, { recursive: true });
  }

  private async loadPersistedIndex(): Promise<void> {
    try {
      const indexContent = await fs.readFile(this.indexPath, 'utf-8');
      const index = JSON.parse(indexContent);
      
      // Load each file from the persisted storage
      for (const [relativePath, metadata] of Object.entries(index)) {
        const filePath = path.join(this.codebasePath, relativePath + '.grok');
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const fileData = metadata as Omit<CodeFile, 'content'>;
          this.indexedFiles.set(relativePath, {
            ...fileData,
            content,
            lastModified: new Date(fileData.lastModified)
          });
        } catch {
          // File doesn't exist in storage, skip
        }
      }
    } catch {
      // No index file yet, start fresh
    }
  }

  private async saveFileToMemory(relativePath: string, file: CodeFile): Promise<void> {
    const filePath = path.join(this.codebasePath, relativePath + '.grok');
    const fileDir = path.dirname(filePath);
    
    await fs.mkdir(fileDir, { recursive: true });
    await fs.writeFile(filePath, file.content, 'utf-8');
  }

  private async saveIndex(): Promise<void> {
    const index: Record<string, Omit<CodeFile, 'content'>> = {};
    
    for (const [relativePath, file] of this.indexedFiles) {
      const { content, ...metadata } = file;
      index[relativePath] = metadata;
    }
    
    await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }

  private async clearPersistedFiles(): Promise<void> {
    try {
      // Remove all files in the codebase directory
      const files = await fs.readdir(this.codebasePath);
      for (const file of files) {
        if (file.endsWith('.grok')) {
          await fs.unlink(path.join(this.codebasePath, file));
        }
      }
      
      // Clear the index file
      await fs.writeFile(this.indexPath, '{}', 'utf-8');
    } catch (error) {
      // Directory might not exist yet, that's okay
    }
  }

  async indexProject(patterns: string[] = ['**/*']): Promise<number> {
    console.log('Indexing project files...');
    
    await this.ensureDirectories();
    
    // Clear existing index for fresh start
    this.indexedFiles.clear();
    await this.clearPersistedFiles();
    
    // Load gitignore patterns
    const gitignorePatterns = await this.loadGitignore();
    
    // Load custom ignore patterns from config
    const config = await loadConfig();
    const customIgnorePatterns = config?.ignorePatterns || [];
    
    // Combine all ignore patterns
    const allIgnorePatterns = [...this.ignorePatterns, ...gitignorePatterns, ...customIgnorePatterns];
    
    const ig = ignore().add(allIgnorePatterns);

    // Find all files matching patterns
    const files = await glob(patterns, {
      cwd: this.projectRoot,
      nodir: true,
      dot: true
    });

    // Filter out ignored files
    const filesToIndex = files.filter(file => !ig.ignores(file));

    let indexedCount = 0;

    for (const file of filesToIndex) {
      try {
        const fullPath = path.join(this.projectRoot, file);
        const stats = await fs.stat(fullPath);
        
        // Skip large files
        if (!isFileSizeValid(stats.size)) continue;
        
        // Skip binary files
        const content = await fs.readFile(fullPath, 'utf-8');
        if (content.includes('\0')) continue;

        const codeFile: CodeFile = {
          path: fullPath,
          relativePath: file,
          content,
          language: this.getLanguageFromExtension(file),
          size: stats.size,
          lastModified: stats.mtime
        };

        this.indexedFiles.set(file, codeFile);
        await this.saveFileToMemory(file, codeFile);
        indexedCount++;
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    // Save the index
    await this.saveIndex();

    return indexedCount;
  }

  async searchCode(query: string, options: {
    regex?: boolean;
    caseSensitive?: boolean;
    wholeWord?: boolean;
    filePattern?: string;
    language?: string;
    maxResults?: number;
  } = {}): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const { 
      regex = false, 
      caseSensitive = false, 
      wholeWord = false,
      filePattern,
      language,
      maxResults = 50
    } = options;

    let searchRegex: RegExp;
    if (regex) {
      // Validate regex safety
      if (!isRegexSafe(query)) {
        throw new Error('Potentially unsafe regex pattern');
      }
      searchRegex = new RegExp(query, caseSensitive ? 'g' : 'gi');
    } else {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = wholeWord ? `\\b${escapedQuery}\\b` : escapedQuery;
      searchRegex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
    }

    for (const [filePath, codeFile] of this.indexedFiles) {
      // Filter by file pattern if specified
      if (filePattern && !filePath.includes(filePattern)) continue;
      
      // Filter by language if specified
      if (language && codeFile.language !== language) continue;

      const lines = codeFile.content.split('\n');
      const fileMatches: SearchResult['matches'] = [];

      lines.forEach((line, index) => {
        const matches = Array.from(line.matchAll(searchRegex));
        matches.forEach(match => {
          if (match.index !== undefined) {
            fileMatches.push({
              line: index + 1,
              content: line.trim(),
              startIndex: match.index,
              endIndex: match.index + match[0].length
            });
          }
        });
      });

      if (fileMatches.length > 0) {
        results.push({ file: codeFile, matches: fileMatches });
        if (results.length >= maxResults) break;
      }
    }

    return results;
  }

  async getFileContent(filePath: string): Promise<CodeFile | null> {
    const relativePath = path.relative(this.projectRoot, filePath);
    return this.indexedFiles.get(relativePath) || null;
  }

  async findSimilarFiles(filePath: string, limit: number = 5): Promise<CodeFile[]> {
    const targetFile = await this.getFileContent(filePath);
    if (!targetFile) return [];

    const similar: CodeFile[] = [];
    const targetExt = path.extname(targetFile.relativePath);
    const targetDir = path.dirname(targetFile.relativePath);

    for (const codeFile of this.indexedFiles.values()) {
      if (codeFile.path === targetFile.path) continue;
      
      // Prioritize files in the same directory or with same extension
      const sameDir = path.dirname(codeFile.relativePath) === targetDir;
      const sameExt = path.extname(codeFile.relativePath) === targetExt;
      
      if (sameDir || sameExt) {
        similar.push(codeFile);
        if (similar.length >= limit) break;
      }
    }

    return similar;
  }

  getIndexedFiles(): CodeFile[] {
    return Array.from(this.indexedFiles.values());
  }

  getFilesByLanguage(language: string): CodeFile[] {
    return Array.from(this.indexedFiles.values()).filter(
      file => file.language === language
    );
  }

  getProjectStructure(): string {
    const tree: Record<string, string[]> = {};
    
    for (const file of this.indexedFiles.values()) {
      const dir = path.dirname(file.relativePath);
      if (!tree[dir]) tree[dir] = [];
      tree[dir].push(path.basename(file.relativePath));
    }

    let output = '';
    const sortedDirs = Object.keys(tree).sort();
    
    for (const dir of sortedDirs) {
      output += `\n${dir}/\n`;
      tree[dir].sort().forEach(file => {
        output += `  ${file}\n`;
      });
    }

    return output;
  }

  async getCodeContext(query: string, maxFiles: number = 5, maxContextLength: number = 10000): Promise<string> {
    // First check if the query is asking about a specific file
    const filePatterns = [
      /(?:what['']?s in|show me|display|read)\s+(?:the\s+)?([^\s?]+\.[a-zA-Z]+)/i,
      /([^\s?]+\.[a-zA-Z]+)/
    ];
    
    // Also check for common project overview queries
    if (query.toLowerCase().includes('package.json') || 
        query.toLowerCase().includes('dependencies') ||
        query.toLowerCase().includes('what is this project')) {
      const packageJson = this.indexedFiles.get('package.json');
      if (packageJson) {
        return `File: package.json\nFull content:\n\`\`\`json\n${packageJson.content}\n\`\`\`\n`;
      }
    }
    
    // Check for README queries
    if (query.toLowerCase().includes('readme')) {
      const readme = this.indexedFiles.get('README.md');
      if (readme) {
        return `File: README.md\nFull content:\n\`\`\`markdown\n${readme.content}\n\`\`\`\n`;
      }
    }
    
    // Check if asking about .grok files (stored in memory)
    if (query.includes('.grok')) {
      // Extract filename
      const match = query.match(/([\w.-]+)\.grok/i);
      if (match) {
        const originalName = match[1];
        // Look for the original file
        for (const [relativePath, file] of this.indexedFiles) {
          if (relativePath.endsWith(originalName) || relativePath === originalName) {
            return `File: ${relativePath} (stored as ${relativePath}.grok in .grok-memory)\nFull content:\n\`\`\`${file.language}\n${file.content}\n\`\`\`\n`;
          }
        }
      }
    }
    
    for (const pattern of filePatterns) {
      const match = query.match(pattern);
      if (match) {
        const filename = match[1];
        // Try to find exact file match
        for (const [relativePath, file] of this.indexedFiles) {
          if (relativePath.endsWith(filename) || relativePath === filename) {
            return `File: ${relativePath}\nFull content:\n\`\`\`${file.language}\n${file.content}\n\`\`\`\n`;
          }
        }
      }
    }
    
    // For general analysis queries, provide a project overview instead of all files
    if (query.toLowerCase().includes('analysis') || 
        query.toLowerCase().includes('improve') ||
        query.toLowerCase().includes('ux') ||
        query.toLowerCase().includes('codebase')) {
      return this.getProjectOverview(maxContextLength);
    }
    
    // Otherwise do regular search
    const searchResults = await this.searchCode(query, { maxResults: maxFiles });
    
    if (searchResults.length === 0) {
      return '';
    }

    let context = 'Relevant code from the project:\n\n';
    let currentLength = context.length;
    
    for (const result of searchResults) {
      const fileHeader = `File: ${result.file.relativePath}\nLanguage: ${result.file.language}\n`;
      
      // Check if adding this would exceed max length
      if (currentLength + fileHeader.length + 500 > maxContextLength) {
        break;
      }
      
      context += fileHeader;
      context += 'Matches:\n';
      
      result.matches.slice(0, 3).forEach(match => {
        const matchLine = `  Line ${match.line}: ${match.content}\n`;
        if (currentLength + matchLine.length < maxContextLength) {
          context += matchLine;
          currentLength += matchLine.length;
        }
      });
      
      context += '\n';
      currentLength = context.length;
    }

    return context;
  }

  async addOrUpdateFile(relativePath: string): Promise<void> {
    try {
      // Validate path
      if (!validateFilePath(relativePath)) {
        console.warn(`Invalid path: ${relativePath}`);
        return;
      }
      
      const fullPath = path.join(this.projectRoot, relativePath);
      
      // Ensure path is safe
      if (!isPathSafe(this.projectRoot, fullPath)) {
        console.warn(`Unsafe path: ${fullPath}`);
        return;
      }
      
      const stats = await fs.stat(fullPath);
      
      // Skip large files (> 1MB)
      if (stats.size > 1024 * 1024) return;
      
      // Read file content
      const content = await fs.readFile(fullPath, 'utf-8');
      if (content.includes('\0')) return; // Skip binary files

      const codeFile: CodeFile = {
        path: fullPath,
        relativePath: relativePath,
        content,
        language: this.getLanguageFromExtension(relativePath),
        size: stats.size,
        lastModified: stats.mtime
      };

      // Update in memory
      this.indexedFiles.set(relativePath, codeFile);
      
      // Save to disk
      await this.saveFileToMemory(relativePath, codeFile);
      await this.saveIndex();
    } catch (error) {
      // File couldn't be processed
    }
  }

  async removeFile(relativePath: string): Promise<void> {
    // Remove from memory
    this.indexedFiles.delete(relativePath);
    
    // Remove from disk
    const filePath = path.join(this.codebasePath, relativePath + '.grok');
    try {
      await fs.unlink(filePath);
    } catch {
      // File might not exist
    }
    
    // Update index
    await this.saveIndex();
  }

  async verifyIndex(): Promise<{
    valid: boolean;
    issues: string[];
    stats: {
      indexCount: number;
      memoryCount: number;
      diskCount: number;
      missingFromDisk: string[];
      missingFromMemory: string[];
      orphanedFiles: string[];
    };
  }> {
    const issues: string[] = [];
    const stats = {
      indexCount: 0,
      memoryCount: this.indexedFiles.size,
      diskCount: 0,
      missingFromDisk: [] as string[],
      missingFromMemory: [] as string[],
      orphanedFiles: [] as string[]
    };

    try {
      // Read the index file
      const indexContent = await fs.readFile(this.indexPath, 'utf-8');
      const index = JSON.parse(indexContent);
      stats.indexCount = Object.keys(index).length;

      // Check for files in index but not in memory
      for (const relativePath of Object.keys(index)) {
        if (!this.indexedFiles.has(relativePath)) {
          stats.missingFromMemory.push(relativePath);
          issues.push(`File in index but not in memory: ${relativePath}`);
        }
      }

      // Check for files in memory but not in index
      for (const relativePath of this.indexedFiles.keys()) {
        if (!index[relativePath]) {
          issues.push(`File in memory but not in index: ${relativePath}`);
        }
      }

      // Check disk files
      const diskFiles = await fs.readdir(this.codebasePath);
      const grokFiles = diskFiles.filter(f => f.endsWith('.grok'));
      stats.diskCount = grokFiles.length;

      // Check for missing disk files
      for (const [relativePath] of this.indexedFiles) {
        const diskPath = path.join(this.codebasePath, relativePath + '.grok');
        try {
          await fs.access(diskPath);
        } catch {
          stats.missingFromDisk.push(relativePath);
          issues.push(`File in memory but not on disk: ${relativePath}`);
        }
      }

      // Check for orphaned disk files
      for (const grokFile of grokFiles) {
        const relativePath = grokFile.slice(0, -5); // Remove .grok extension
        if (!this.indexedFiles.has(relativePath)) {
          stats.orphanedFiles.push(grokFile);
          issues.push(`Orphaned file on disk: ${grokFile}`);
        }
      }

    } catch (error) {
      issues.push(`Failed to read index: ${error}`);
    }

    return {
      valid: issues.length === 0,
      issues,
      stats
    };
  }

  async repairIndex(): Promise<string> {
    const verification = await this.verifyIndex();
    let repairLog = '';

    if (verification.valid) {
      return 'Index is already valid, no repair needed.';
    }

    repairLog += `Found ${verification.issues.length} issues:\n`;
    verification.issues.forEach(issue => {
      repairLog += `  - ${issue}\n`;
    });
    repairLog += '\nRepairing...\n';

    // Remove orphaned disk files
    for (const orphanedFile of verification.stats.orphanedFiles) {
      try {
        await fs.unlink(path.join(this.codebasePath, orphanedFile));
        repairLog += `  ✓ Removed orphaned file: ${orphanedFile}\n`;
      } catch (error) {
        repairLog += `  ✗ Failed to remove orphaned file ${orphanedFile}: ${error}\n`;
      }
    }

    // Save missing files to disk
    for (const [relativePath, file] of this.indexedFiles) {
      if (verification.stats.missingFromDisk.includes(relativePath)) {
        try {
          await this.saveFileToMemory(relativePath, file);
          repairLog += `  ✓ Saved missing file to disk: ${relativePath}\n`;
        } catch (error) {
          repairLog += `  ✗ Failed to save ${relativePath}: ${error}\n`;
        }
      }
    }

    // Update the index to match memory
    await this.saveIndex();
    repairLog += '\n✓ Index file updated to match memory state\n';

    // Final verification
    const finalCheck = await this.verifyIndex();
    if (finalCheck.valid) {
      repairLog += '\n✅ Index repair completed successfully!';
    } else {
      repairLog += `\n⚠️ Some issues remain after repair:\n`;
      finalCheck.issues.forEach(issue => {
        repairLog += `  - ${issue}\n`;
      });
    }

    return repairLog;
  }

  private getProjectOverview(maxLength: number = 10000): string {
    const files = this.getIndexedFiles();
    
    // Group files by type
    const filesByType: Record<string, string[]> = {};
    files.forEach(f => {
      const ext = path.extname(f.relativePath);
      if (!filesByType[ext]) filesByType[ext] = [];
      filesByType[ext].push(f.relativePath);
    });
    
    // Build overview
    let overview = `Project Overview:\n\n`;
    overview += `Total files: ${files.length}\n\n`;
    
    // File type summary
    overview += `File types:\n`;
    Object.entries(filesByType)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10)
      .forEach(([ext, files]) => {
        overview += `  ${ext}: ${files.length} files\n`;
      });
    
    overview += `\nKey files:\n`;
    
    // Add important files
    const importantFiles = [
      'package.json',
      'README.md',
      'src/index.ts',
      'src/lib/interactive.ts',
      'src/lib/commandHandler.ts'
    ];
    
    for (const fileName of importantFiles) {
      const file = files.find(f => f.relativePath === fileName);
      if (file && overview.length + file.content.length < maxLength) {
        overview += `\n### ${fileName}\n\`\`\`${file.language}\n`;
        // Add first 50 lines or until max length
        const lines = file.content.split('\n').slice(0, 50);
        for (const line of lines) {
          if (overview.length + line.length + 10 > maxLength) break;
          overview += line + '\n';
        }
        overview += `\`\`\`\n`;
      }
    }
    
    // Add project structure
    if (overview.length < maxLength - 1000) {
      overview += `\nProject Structure:\n${this.getProjectStructure()}`;
    }
    
    return overview;
  }
}