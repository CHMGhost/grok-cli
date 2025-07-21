import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { isPathSafe, validateFilePath } from './pathValidator';
import { GrokAPI } from './grokApi';
import { CodeIndexer } from './codeIndexer';
import { exec } from 'child_process';
import { promisify } from 'util';
import inquirer from 'inquirer';
import { getActiveReadline } from './interactive';

const execAsync = promisify(exec);

// Helper function to safely use inquirer with an existing readline interface
async function safeInquirerPrompt<T>(questions: any): Promise<T> {
  const rl = getActiveReadline();
  
  if (rl) {
    // Save the current prompt
    const currentPrompt = (rl as any)._prompt || '';
    
    // Clear the current line and move cursor to start
    process.stdout.write('\r\x1b[K');
    
    // Pause the readline interface
    rl.pause();
    
    // Remove readline's keypress listeners temporarily
    const listeners = process.stdin.listeners('keypress');
    process.stdin.removeAllListeners('keypress');
    
    try {
      // Run inquirer prompt
      const result = await inquirer.prompt(questions) as T;
      
      // Restore readline's keypress listeners
      listeners.forEach(listener => {
        process.stdin.on('keypress', listener as any);
      });
      
      // Resume readline
      rl.resume();
      
      // Restore the prompt on next tick
      process.nextTick(() => {
        rl.setPrompt(currentPrompt);
        rl.prompt(true);
      });
      
      return result;
    } catch (error) {
      // Restore listeners even if there's an error
      listeners.forEach(listener => {
        process.stdin.on('keypress', listener as any);
      });
      rl.resume();
      throw error;
    }
  } else {
    // No readline interface, use inquirer normally
    return await inquirer.prompt(questions) as T;
  }
}

export interface GenerateOptions {
  type: 'function' | 'class' | 'component' | 'test' | 'file';
  language?: string;
  framework?: string;
  description: string;
  targetFile?: string;
  context?: string;
}

export interface FileChange {
  filePath: string;
  originalContent: string;
  newContent: string;
  description: string;
}

export interface ModificationPlan {
  prompt: string;
  changes: FileChange[];
  summary: string;
}

export class CodeGenerator {
  private projectRoot: string;
  private grokApi: GrokAPI;
  private codeIndexer: CodeIndexer;

  constructor(grokApi: GrokAPI, codeIndexer: CodeIndexer, projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.grokApi = grokApi;
    this.codeIndexer = codeIndexer;
  }

  async generate(options: GenerateOptions): Promise<string> {
    // Get project context
    const files = this.codeIndexer.getIndexedFiles();
    const projectInfo = this.analyzeProject(files);
    
    // Build prompt
    const prompt = this.buildGenerationPrompt(options, projectInfo);
    
    // Get code from Grok
    const generatedCode = await this.grokApi.askQuestion(prompt, options.context);
    
    // Process the response
    return this.processGeneratedCode(generatedCode);
  }

  async createFile(filePath: string, content: string): Promise<string> {
    if (!validateFilePath(filePath)) {
      throw new Error('Invalid file path');
    }
    
    const fullPath = path.join(this.projectRoot, filePath);
    
    if (!isPathSafe(this.projectRoot, fullPath)) {
      throw new Error('Path traversal detected');
    }
    
    // Create directory if needed
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Check if file exists
    try {
      await fs.access(fullPath);
      throw new Error(`File already exists: ${filePath}`);
    } catch {
      // File doesn't exist, good
    }
    
    // Write file
    await fs.writeFile(fullPath, content);
    
    // Add to index
    const indexer = this.codeIndexer;
    await indexer.addOrUpdateFile(filePath);
    
    return chalk.green(`✓ Created ${filePath}`);
  }

  async updateFile(filePath: string, updater: (content: string) => string): Promise<string> {
    const fullPath = path.join(this.projectRoot, filePath);
    
    // Read current content
    const currentContent = await fs.readFile(fullPath, 'utf-8');
    
    // Apply update
    const newContent = updater(currentContent);
    
    // Write back
    await fs.writeFile(fullPath, newContent);
    
    // Update index
    await this.codeIndexer.addOrUpdateFile(filePath);
    
    return chalk.green(`✓ Updated ${filePath}`);
  }

  private analyzeProject(files: any[]): any {
    const analysis = {
      language: 'typescript',
      framework: 'none',
      testFramework: 'none',
      hasTypeScript: false,
      patterns: {
        componentPattern: '',
        testPattern: '',
        fileNaming: 'camelCase'
      }
    };
    
    // Detect language
    const extensions = files.map(f => path.extname(f.relativePath));
    if (extensions.includes('.ts') || extensions.includes('.tsx')) {
      analysis.hasTypeScript = true;
      analysis.language = 'typescript';
    } else if (extensions.includes('.js') || extensions.includes('.jsx')) {
      analysis.language = 'javascript';
    } else if (extensions.includes('.py')) {
      analysis.language = 'python';
    }
    
    // Detect frameworks
    const packageJson = files.find(f => f.relativePath === 'package.json');
    if (packageJson) {
      const content = packageJson.content.toLowerCase();
      if (content.includes('react')) analysis.framework = 'react';
      else if (content.includes('vue')) analysis.framework = 'vue';
      else if (content.includes('angular')) analysis.framework = 'angular';
      else if (content.includes('express')) analysis.framework = 'express';
      
      if (content.includes('jest')) analysis.testFramework = 'jest';
      else if (content.includes('mocha')) analysis.testFramework = 'mocha';
      else if (content.includes('vitest')) analysis.testFramework = 'vitest';
    }
    
    return analysis;
  }

  private buildGenerationPrompt(options: GenerateOptions, projectInfo: any): string {
    let prompt = `Generate ${options.type} code with the following requirements:\n\n`;
    
    prompt += `Description: ${options.description}\n`;
    prompt += `Language: ${options.language || projectInfo.language}\n`;
    prompt += `Framework: ${options.framework || projectInfo.framework}\n`;
    
    if (options.type === 'test') {
      prompt += `Test Framework: ${projectInfo.testFramework}\n`;
    }
    
    prompt += `\nProject uses TypeScript: ${projectInfo.hasTypeScript}\n`;
    
    prompt += `\nRequirements:
- Generate ONLY the code, no explanations
- Follow the project's coding style
- Include proper imports
- Add appropriate comments
- Make it production-ready\n`;
    
    if (options.type === 'test') {
      prompt += `- Include comprehensive test cases
- Test edge cases
- Mock dependencies appropriately\n`;
    }
    
    return prompt;
  }

  private processGeneratedCode(code: string): string {
    // Extract code blocks from response
    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
    const matches = [...code.matchAll(codeBlockRegex)];
    
    if (matches.length > 0) {
      return matches[0][1].trim();
    }
    
    // If no code blocks, try to extract code pattern
    const lines = code.split('\n');
    const codeLines = lines.filter(line => {
      // Filter out explanation lines
      return !line.startsWith('Here') && 
             !line.startsWith('This') && 
             !line.includes('following') &&
             line.trim().length > 0;
    });
    
    return codeLines.join('\n');
  }

  async generateTests(filePath: string): Promise<string> {
    const file = this.codeIndexer.getIndexedFiles().find(f => f.relativePath === filePath);
    
    if (!file) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const options: GenerateOptions = {
      type: 'test',
      description: `Generate comprehensive tests for ${filePath}`,
      context: `File to test:\n\`\`\`${file.language}\n${file.content}\n\`\`\``
    };
    
    const tests = await this.generate(options);
    
    // Determine test file name
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    const dirName = path.dirname(filePath);
    const testFileName = `${baseName}.test${ext}`;
    const testPath = path.join(dirName, '__tests__', testFileName);
    
    await this.createFile(testPath, tests);
    
    return chalk.green(`✓ Generated tests: ${testPath}`);
  }

  async refactor(filePath: string, instruction: string): Promise<string> {
    const file = this.codeIndexer.getIndexedFiles().find(f => f.relativePath === filePath);
    
    if (!file) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const prompt = `Refactor the following code according to this instruction: ${instruction}

Current code:
\`\`\`${file.language}
${file.content}
\`\`\`

Requirements:
- Return ONLY the refactored code
- Maintain the same functionality
- Improve code quality
- Follow best practices`;
    
    const refactoredCode = await this.grokApi.askQuestion(prompt);
    const processed = this.processGeneratedCode(refactoredCode);
    
    await this.updateFile(filePath, () => processed);
    
    return chalk.green(`✓ Refactored ${filePath}`);
  }

  async proposeChanges(prompt: string): Promise<ModificationPlan> {
    // Get relevant files based on the prompt
    const relevantFiles = await this.findRelevantFiles(prompt);
    
    if (relevantFiles.length === 0) {
      // Check if this might be a follow-up request without file context
      if (prompt.match(/\b(as well|also|too|and|another|more)\b/i)) {
        throw new Error('Please specify which file to modify. For example: "Remove the services section from index.html"');
      }
      throw new Error('No relevant files found. Please specify the file name or provide more context.');
    }
    
    // Build context from relevant files
    const fileContexts = relevantFiles.map(file => `
File: ${file.relativePath}
\`\`\`${file.language}
${file.content}
\`\`\``);
    
    // Ask Grok to analyze and propose changes
    const analysisPrompt = `Based on this request: "${prompt}"

Analyze these files and propose specific changes:
${fileContexts.join('\n')}

Provide a detailed plan with:
1. Which files need to be modified
2. What specific changes to make
3. The exact code changes needed

IMPORTANT: Only include files that were shown above. Do not suggest changes to files that don't exist.

Format your response as JSON with this structure:
{
  "summary": "Brief summary of changes",
  "changes": [
    {
      "filePath": "path/to/file",
      "description": "What this change does",
      "newContent": "Complete new file content"
    }
  ]
}`;
    
    const response = await this.grokApi.askQuestion(analysisPrompt);
    
    // Parse the response
    const plan = this.parseModificationPlan(response, relevantFiles, prompt);
    
    return plan;
  }

  private async findRelevantFiles(prompt: string): Promise<any[]> {
    const allFiles = this.codeIndexer.getIndexedFiles();
    
    // First check for specific file mentions in the prompt
    const mentionedFiles = this.extractFilePathsFromPrompt(prompt);
    
    // If specific files are mentioned, use those
    if (mentionedFiles.length > 0) {
      const relevantFiles = allFiles.filter(file => 
        mentionedFiles.some(mentioned => 
          file.relativePath.includes(mentioned) || mentioned.includes(file.relativePath)
        )
      );
      if (relevantFiles.length > 0) {
        return relevantFiles;
      }
    }
    
    // Try to search for content mentioned in the prompt
    const searchTerms = this.extractSearchTerms(prompt);
    if (searchTerms.length > 0) {
      for (const term of searchTerms) {
        const searchResults = await this.codeIndexer.searchCode(term, { maxResults: 5 });
        if (searchResults.length > 0) {
          return searchResults.map(r => r.file);
        }
      }
    }
    
    // Otherwise, use the full prompt for code search
    const searchResults = await this.codeIndexer.searchCode(prompt, { maxResults: 10 });
    
    // Combine results
    const relevantPaths = new Set<string>();
    
    searchResults.forEach(result => {
      relevantPaths.add(result.file.relativePath);
    });
    
    mentionedFiles.forEach(path => {
      relevantPaths.add(path);
    });
    
    // Get the actual file objects
    return allFiles.filter(file => relevantPaths.has(file.relativePath));
  }

  private extractSearchTerms(prompt: string): string[] {
    const terms: string[] = [];
    
    // Look for quoted terms
    const quotedMatches = prompt.match(/"([^"]+)"/g);
    if (quotedMatches) {
      terms.push(...quotedMatches.map(m => m.replace(/"/g, '')));
    }
    
    // Look for section/component names
    const sectionMatch = prompt.match(/\b(section|component|class|function|method|element|div|header|footer|nav|sidebar)\s+(?:called\s+)?(\w+)/i);
    if (sectionMatch && sectionMatch[2]) {
      terms.push(sectionMatch[2]);
    }
    
    // Look for specific terms after "the"
    const theMatch = prompt.match(/\bthe\s+(\w+)\s+(section|component|element|part|area)/i);
    if (theMatch && theMatch[1]) {
      terms.push(theMatch[1]);
    }
    
    return terms;
  }

  private extractFilePathsFromPrompt(prompt: string): string[] {
    const paths: string[] = [];
    
    // Look for common file patterns
    const patterns = [
      /[\w\-\/]+\.(ts|tsx|js|jsx|css|scss|html|json|py|java|go)/g,
      /src\/[\w\-\/]+/g,
      /components\/[\w\-\/]+/g
    ];
    
    patterns.forEach(pattern => {
      const matches = prompt.match(pattern);
      if (matches) {
        paths.push(...matches);
      }
    });
    
    return [...new Set(paths)];
  }

  private parseModificationPlan(response: string, relevantFiles: any[], prompt: string): ModificationPlan {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);;
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Map the changes with original content, filtering out non-existent files
        const changes: FileChange[] = [];
        const skippedFiles: string[] = [];
        
        for (const change of parsed.changes) {
          const originalFile = relevantFiles.find(f => f.relativePath === change.filePath);
          if (originalFile) {
            changes.push({
              filePath: change.filePath,
              originalContent: originalFile.content,
              newContent: change.newContent,
              description: change.description
            });
          } else {
            skippedFiles.push(change.filePath);
          }
        }
        
        // Update summary if files were skipped
        let summary = parsed.summary;
        if (skippedFiles.length > 0) {
          summary += ` (Note: ${skippedFiles.length} file(s) not found and will be skipped: ${skippedFiles.join(', ')})`;
        }
        
        return {
          prompt,
          changes,
          summary
        };
      }
    } catch (error) {
      // Fallback parsing logic
    }
    
    // Fallback: extract code blocks and infer changes
    const codeBlocks = this.extractCodeBlocks(response);
    const changes: FileChange[] = [];
    
    relevantFiles.forEach((file, index) => {
      if (codeBlocks[index]) {
        changes.push({
          filePath: file.relativePath,
          originalContent: file.content,
          newContent: codeBlocks[index],
          description: `Modified ${file.relativePath}`
        });
      }
    });
    
    return {
      prompt,
      changes,
      summary: 'Proposed changes based on your request'
    };
  }

  private extractCodeBlocks(text: string): string[] {
    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
    const blocks: string[] = [];
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      blocks.push(match[1].trim());
    }
    
    return blocks;
  }

  async showDiff(change: FileChange): Promise<string> {
    // Create temporary files for diff
    const tempDir = path.join(this.projectRoot, '.grok-temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const originalPath = path.join(tempDir, 'original.tmp');
    const newPath = path.join(tempDir, 'new.tmp');
    
    await fs.writeFile(originalPath, change.originalContent);
    await fs.writeFile(newPath, change.newContent);
    
    try {
      // Use git diff for nice colored output
      const { stdout } = await execAsync(
        `git diff --no-index --color ${originalPath} ${newPath}`,
        { cwd: this.projectRoot }
      );
      
      // Clean up temp files
      await fs.unlink(originalPath);
      await fs.unlink(newPath);
      
      return stdout;
    } catch (error: any) {
      // git diff returns non-zero exit code when files differ, which is expected
      if (error.stdout) {
        // Clean up temp files
        await fs.unlink(originalPath).catch(() => {});
        await fs.unlink(newPath).catch(() => {});
        return error.stdout;
      }
      throw error;
    }
  }

  async applyChangesWithConfirmation(plan: ModificationPlan): Promise<string> {
    console.log('\n' + chalk.bold.yellow('✏️  Modification Plan'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log();
    console.log('  ' + chalk.cyan(plan.summary));
    console.log();
    console.log('  ' + chalk.gray(`Files to modify: ${chalk.white.bold(plan.changes.length)}`));
    
    for (const change of plan.changes) {
      console.log();
      console.log('  ' + chalk.yellow('→') + ' ' + chalk.white.bold(change.filePath));
      console.log('    ' + chalk.gray(change.description));
    }
    console.log();
    
    
    // Ask for initial confirmation
    const { viewDiffs } = await safeInquirerPrompt<{ viewDiffs: boolean }>([{
      type: 'confirm',
      name: 'viewDiffs',
      message: 'Would you like to view the detailed diffs?',
      default: true
    }]);
    
    if (viewDiffs) {
      for (const change of plan.changes) {
        console.log('\n' + chalk.bold.magenta('🔍 Diff Preview'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log('  ' + chalk.gray('File: ') + chalk.white.bold(change.filePath));
        console.log();
        const diff = await this.showDiff(change);
        // Indent the diff output
        const diffLines = diff.split('\n');
        diffLines.forEach(line => {
          if (line.startsWith('+') && !line.startsWith('+++')) {
            console.log('  ' + chalk.green(line));
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            console.log('  ' + chalk.red(line));
          } else if (line.startsWith('@')) {
            console.log('  ' + chalk.cyan(line));
          } else {
            console.log('  ' + line);
          }
        });
        console.log();
      }
    }
    
    // Ask for final confirmation
    const { confirm } = await safeInquirerPrompt<{ confirm: boolean }>([{
      type: 'confirm',
      name: 'confirm',
      message: 'Do you want to apply these changes?',
      default: false
    }]);
    
    if (!confirm) {
      return chalk.yellow('Changes cancelled.');
    }
    
    // Apply the changes
    console.log('\n' + chalk.bold.yellow('Applying modifications...'));
    console.log();
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const change of plan.changes) {
      try {
        // Double-check file exists before attempting update
        const fullPath = path.join(this.projectRoot, change.filePath);
        try {
          await fs.access(fullPath);
        } catch {
          throw new Error(`File not found: ${change.filePath}`);
        }
        
        await this.updateFile(change.filePath, () => change.newContent);
        console.log('  ' + chalk.green('✓') + ' ' + chalk.gray('Modified: ') + chalk.white.bold(change.filePath));
        successCount++;
      } catch (error) {
        console.log('  ' + chalk.red('✗') + ' ' + chalk.gray('Failed: ') + chalk.white.bold(change.filePath));
        console.log('    ' + chalk.red(error));
        failureCount++;
      }
    }
    
    console.log();
    console.log(chalk.bold.green('✨ Modifications Complete!'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log();
    console.log('  ' + chalk.green(`${successCount} file(s) successfully modified`));
    if (failureCount > 0) {
      console.log('  ' + chalk.red(`${failureCount} file(s) failed`));
    }
    
    console.log(); // Add spacing before prompt returns
    
    
    // Check if we're in ask mode (no readline) and provide guidance
    const rl = getActiveReadline();
    if (!rl) {
      console.log(chalk.dim('\nTip: Use "grok chat" for interactive mode to continue working with files.'));
    }
    
    // Return a minimal success indicator
    return '✓';
  }

  async handleFileCreation(prompt: string): Promise<string> {
    // Extract basic file info from the prompt first
    let fileName = 'index.html';
    let fileType = 'file';
    
    // Extract filename
    const fileNameMatch = prompt.match(/\b([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)\b/);
    if (fileNameMatch) {
      fileName = fileNameMatch[1];
    }
    
    // Extract file type
    if (prompt.match(/boiler(?:plate)?|template/i)) {
      fileType = 'boilerplate template';
    } else if (prompt.match(/component/i)) {
      fileType = 'component';
    } else if (prompt.match(/config/i)) {
      fileType = 'configuration';
    }
    
    // Determine path
    if (prompt.includes('root directory') || prompt.includes('root folder')) {
      // Keep filename as is
    } else if (prompt.match(/in\s+(?:the\s+)?([^\s]+)\s+(?:directory|folder)/i)) {
      const dirMatch = prompt.match(/in\s+(?:the\s+)?([^\s]+)\s+(?:directory|folder)/i);
      if (dirMatch && dirMatch[1]) {
        fileName = `${dirMatch[1]}/${fileName}`;
      }
    }
    
    // Get file content directly
    const contentPrompt = `Generate the complete content for: ${prompt}

IMPORTANT: Return ONLY the file content - no explanations, no instructions, no markdown code blocks.
Just the raw file content that should be saved to ${fileName}.

If this is an HTML boilerplate, provide a complete, modern HTML5 template.
If this is a component, provide complete, working code.
Use best practices and modern standards.`;

    const response = await this.grokApi.askQuestion(contentPrompt);
    
    try {
      // Clean the response - remove any markdown code blocks or instructions
      let content = response;
      
      // Remove markdown code blocks if present
      const codeBlockMatch = response.match(/```(?:\w*)\n([\s\S]*?)```/);
      if (codeBlockMatch) {
        content = codeBlockMatch[1];
      }
      
      // Remove common instruction patterns
      const instructionPatterns = [
        /Step \d+:.*?\n/gi,
        /You can create.*?\n/gi,
        /Then,? open it.*?\n/gi,
        /touch \w+\.\w+.*?\n/gi,
        /code \w+\.\w+.*?\n/gi,
        /Here'?s? (?:the|a).*?:?\n/gi,
        /Below is.*?:?\n/gi
      ];
      
      for (const pattern of instructionPatterns) {
        content = content.replace(pattern, '');
      }
      
      content = content.trim();
      
      // If content is still empty or looks like instructions, generate a default
      if (!content || content.length < 50 || content.includes('terminal:')) {
        content = await this.generateDefaultContent(fileName, fileType);
      }
      
      // Determine language from extension
      const ext = path.extname(fileName).toLowerCase();
      const languageMap: Record<string, string> = {
        '.html': 'html',
        '.js': 'javascript',
        '.ts': 'typescript',
        '.css': 'css',
        '.json': 'json',
        '.py': 'python',
        '.md': 'markdown'
      };
      const language = languageMap[ext] || 'text';
      
      // Create the plan object
      const plan = {
        files: [{
          path: fileName,
          description: `${fileType} file`,
          content: content,
          language: language
        }],
        summary: `Create ${fileName} - a ${fileType}`
      };
      
      // Show the plan to user with improved styling
      console.log('\n' + chalk.bold.blue('📄 File Creation Plan'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log();
      console.log('  ' + chalk.cyan(plan.summary));
      console.log();
      console.log('  ' + chalk.gray(`Files to create: ${chalk.white.bold(plan.files.length)}`));
      
      for (const file of plan.files) {
        console.log();
        console.log('  ' + chalk.green('→') + ' ' + chalk.white.bold(file.path));
        console.log('    ' + chalk.gray(file.description));
      }
      console.log();
      
      // Ask for confirmation
      const { viewContent } = await safeInquirerPrompt<{ viewContent: boolean }>([{
        type: 'confirm',
        name: 'viewContent',
        message: 'Would you like to preview the file content?',
        default: true
      }]);
      
      if (viewContent) {
        for (const file of plan.files) {
          console.log('\n' + chalk.bold.blue('📝 File Preview'));
          console.log(chalk.gray('─'.repeat(50)));
          console.log('  ' + chalk.gray('File: ') + chalk.white.bold(file.path));
          console.log('  ' + chalk.gray('Language: ') + chalk.yellow(file.language));
          console.log();
          
          // Display content with line numbers
          const lines = file.content.split('\n');
          lines.forEach((line, index) => {
            const lineNum = String(index + 1).padStart(3, ' ');
            console.log(chalk.gray(`  ${lineNum} │`) + ' ' + line);
          });
          console.log();
        }
      }
      
      const { confirm } = await safeInquirerPrompt<{ confirm: boolean }>([{
        type: 'confirm',
        name: 'confirm',
        message: 'Create these files?',
        default: true
      }]);
      
      if (!confirm) {
        return chalk.yellow('File creation cancelled.');
      }
      
      // Create the files
      console.log('\n' + chalk.bold.blue('Creating files...'));
      console.log();
      
      let successCount = 0;
      let failureCount = 0;
      
      for (const file of plan.files) {
        try {
          await this.createFile(file.path, file.content);
          console.log('  ' + chalk.green('✓') + ' ' + chalk.gray('Created: ') + chalk.white.bold(file.path));
          successCount++;
        } catch (error) {
          console.log('  ' + chalk.red('✗') + ' ' + chalk.gray('Failed: ') + chalk.white.bold(file.path));
          console.log('    ' + chalk.red(error));
          failureCount++;
        }
      }
      
      console.log();
      console.log(chalk.bold.green('✨ File Creation Complete!'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log();
      console.log('  ' + chalk.green(`${successCount} file(s) successfully created`));
      if (failureCount > 0) {
        console.log('  ' + chalk.red(`${failureCount} file(s) failed`));
      }
      
      console.log(); // Add spacing before prompt returns
      
      // Check if we're in ask mode (no readline) and provide guidance
      const rl = getActiveReadline();
      if (!rl) {
        console.log(chalk.dim('\nTip: Use "grok chat" for interactive mode to continue working with files.'));
      }
      
      // Return a minimal success indicator
      return '✓';
    } catch (error) {
      return chalk.red(`Error creating files: ${error}`);
    }
  }

  async handleFileDeletion(prompt: string): Promise<string> {
    // Get list of files to potentially delete
    const allFiles = this.codeIndexer.getIndexedFiles();
    
    // Ask Grok to identify files to delete
    const fileList = allFiles.map(f => f.relativePath).join('\n');
    const analysisPrompt = `Based on this request: "${prompt}"

Here are the files in the project:
${fileList}

Identify which files should be deleted. Provide a JSON response with:
{
  "files": [
    {
      "path": "path/to/file.ext",
      "reason": "Why this file should be deleted"
    }
  ],
  "summary": "Brief summary of what will be deleted"
}

Be conservative - only suggest files that clearly match the user's request.`;

    const response = await this.grokApi.askQuestion(analysisPrompt);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse deletion plan');
      }
      
      const plan = JSON.parse(jsonMatch[0]);
      
      if (plan.files.length === 0) {
        return chalk.yellow('No files found matching your deletion request.');
      }
      
      // Show the plan to user with improved styling
      console.log('\n' + chalk.bold.red('🗑️  File Deletion Plan'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log();
      console.log('  ' + chalk.red.bold('⚠️  Warning: ') + chalk.white(plan.summary));
      console.log();
      console.log('  ' + chalk.gray(`Files to delete: ${chalk.red.bold(plan.files.length)}`));
      
      for (const file of plan.files) {
        console.log();
        console.log('  ' + chalk.red('✗') + ' ' + chalk.white.bold(file.path));
        console.log('    ' + chalk.gray(file.reason));
      }
      console.log();
      console.log(chalk.bgRed.white.bold(' ⚠️  WARNING ') + chalk.yellow(' This action cannot be undone (unless using git)'));
      console.log();
      
      // Ask for confirmation
      const { confirm } = await safeInquirerPrompt<{ confirm: boolean }>([{
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to delete these files?',
        default: false
      }]);
      
      if (!confirm) {
        return chalk.yellow('Deletion cancelled.');
      }
      
      // Double confirmation for safety
      const { doubleConfirm } = await safeInquirerPrompt<{ doubleConfirm: boolean }>([{
        type: 'confirm',
        name: 'doubleConfirm',
        message: 'Are you REALLY sure? This will permanently delete the files.',
        default: false
      }]);
      
      if (!doubleConfirm) {
        return chalk.yellow('Deletion cancelled.');
      }
      
      // Delete the files
      console.log('\n' + chalk.bold.red('Deleting files...'));
      console.log();
      
      let successCount = 0;
      let failureCount = 0;
      
      for (const file of plan.files) {
        try {
          const fullPath = path.join(this.projectRoot, file.path);
          await fs.unlink(fullPath);
          
          // Remove from index
          const indexer = this.codeIndexer;
          await indexer.removeFile(file.path);
          
          console.log('  ' + chalk.yellow('✓') + ' ' + chalk.gray('Deleted: ') + chalk.white.bold(file.path));
          successCount++;
        } catch (error) {
          console.log('  ' + chalk.red('✗') + ' ' + chalk.gray('Failed: ') + chalk.white.bold(file.path));
          console.log('    ' + chalk.red(error));
          failureCount++;
        }
      }
      
      console.log();
      console.log(chalk.bold.yellow('🗑️  Deletion Complete'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log();
      console.log('  ' + chalk.yellow(`${successCount} file(s) successfully deleted`));
      if (failureCount > 0) {
        console.log('  ' + chalk.red(`${failureCount} file(s) failed`));
      }
      
      console.log(); // Add spacing before prompt returns
      
      // Check if we're in ask mode (no readline) and provide guidance
      const rl = getActiveReadline();
      if (!rl) {
        console.log(chalk.dim('\nTip: Use "grok chat" for interactive mode to continue working with files.'));
      }
      
      // Return a minimal success indicator
      return '✓';
    } catch (error) {
      return chalk.red(`Error deleting files: ${error}`);
    }
  }

  private async generateDefaultContent(fileName: string, fileType: string): Promise<string> {
    const ext = path.extname(fileName).toLowerCase();
    
    // Provide sensible defaults for common file types
    switch (ext) {
      case '.html':
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <h1>Hello World</h1>
</body>
</html>`;
      
      case '.js':
        return `// ${fileName}
console.log('Hello from ${fileName}');`;
      
      case '.ts':
        return `// ${fileName}
console.log('Hello from ${fileName}');

export {};`;
      
      case '.css':
        return `/* ${fileName} */
body {
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
}`;
      
      case '.json':
        return `{
  "name": "${path.basename(fileName, ext)}",
  "version": "1.0.0"
}`;
      
      case '.md':
        return `# ${path.basename(fileName, ext)}

This is a markdown file.`;
      
      default:
        return `// ${fileName}\n// ${fileType} file`;
    }
  }
}