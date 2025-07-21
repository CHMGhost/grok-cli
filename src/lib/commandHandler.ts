import { Command, ChatMessage } from '../types';
import { KnowledgeBase } from './knowledgeBase';
import { GrokAPI } from './grokApi';
import { CodeIndexer } from './codeIndexer';
import { FileWatcher } from './fileWatcher';
import { projectDetectors, detectNodeFramework } from './languageConfig';
import { CodeModifier } from './codeModifier';
import { CodeGenerator } from './codeGenerator';
import { GitIntegration } from './gitIntegration';
import { DebugAssistant } from './debugAssistant';
import chalk from 'chalk';
import path from 'path';

const knowledgeBase = new KnowledgeBase();
let codeIndexer: CodeIndexer | null = null;
let grokApi: GrokAPI | null = null;
let fileWatcher: FileWatcher | null = null;
let codeModifier: CodeModifier | null = null;
let codeGenerator: CodeGenerator | null = null;
let gitIntegration: GitIntegration | null = null;
let debugAssistant: DebugAssistant | null = null;

async function getCodeIndexer(): Promise<CodeIndexer> {
  if (!codeIndexer) {
    codeIndexer = new CodeIndexer();
    await codeIndexer.initialize();
  }
  return codeIndexer;
}

function getGrokApi(): GrokAPI {
  if (!grokApi) {
    grokApi = new GrokAPI();
  }
  return grokApi;
}

export async function getFileWatcher(): Promise<FileWatcher> {
  if (!fileWatcher) {
    const indexer = await getCodeIndexer();
    fileWatcher = new FileWatcher(indexer);
  }
  return fileWatcher;
}

function getCodeModifier(): CodeModifier {
  if (!codeModifier) {
    codeModifier = new CodeModifier();
  }
  return codeModifier;
}

async function getCodeGenerator(): Promise<CodeGenerator> {
  if (!codeGenerator) {
    const indexer = await getCodeIndexer();
    codeGenerator = new CodeGenerator(getGrokApi(), indexer);
  }
  return codeGenerator;
}

function getGitIntegration(): GitIntegration {
  if (!gitIntegration) {
    gitIntegration = new GitIntegration();
  }
  return gitIntegration;
}

async function getDebugAssistant(): Promise<DebugAssistant> {
  if (!debugAssistant) {
    const indexer = await getCodeIndexer();
    debugAssistant = new DebugAssistant(getGrokApi(), indexer);
  }
  return debugAssistant;
}

const commands: Command[] = [
  {
    name: 'search',
    description: 'Search the knowledge base',
    pattern: /^\/search\s+(.+)$/,
    handler: async (args: string[]) => {
      const query = args[0];
      const entries = await knowledgeBase.searchEntries(query);
      
      if (entries.length === 0) {
        return chalk.yellow('No entries found matching your search.');
      }

      return entries.map(entry => 
        `${chalk.bold(entry.title)} (${entry.category})\n${chalk.dim(entry.tags.join(', '))}\n${entry.content.substring(0, 100)}...`
      ).join('\n\n');
    }
  },
  {
    name: 'tag',
    description: 'Find entries by tag',
    pattern: /^\/tag\s+(.+)$/,
    handler: async (args: string[]) => {
      const tag = args[0];
      const entries = await knowledgeBase.getEntriesByTag(tag);
      
      if (entries.length === 0) {
        return chalk.yellow(`No entries found with tag "${tag}".`);
      }

      return entries.map(entry => 
        `${chalk.bold(entry.title)} - ${entry.category}`
      ).join('\n');
    }
  },
  {
    name: 'category',
    description: 'Find entries by category',
    pattern: /^\/category\s+(.+)$/,
    handler: async (args: string[]) => {
      const category = args[0];
      const entries = await knowledgeBase.getEntriesByCategory(category);
      
      if (entries.length === 0) {
        return chalk.yellow(`No entries found in category "${category}".`);
      }

      return entries.map(entry => 
        `${chalk.bold(entry.title)}\n${chalk.dim(entry.tags.join(', '))}`
      ).join('\n\n');
    }
  },
  {
    name: 'list',
    description: 'List all knowledge entries',
    pattern: /^\/list$/,
    handler: async () => {
      const entries = await knowledgeBase.loadAllEntries();
      
      if (entries.length === 0) {
        return chalk.yellow('No knowledge entries found. Add some markdown files to the knowledge folder.');
      }

      const categorized = entries.reduce((acc, entry) => {
        if (!acc[entry.category]) {
          acc[entry.category] = [];
        }
        acc[entry.category].push(entry);
        return acc;
      }, {} as Record<string, typeof entries>);

      let output = '';
      for (const [category, categoryEntries] of Object.entries(categorized)) {
        output += `\n${chalk.bold.underline(category)}:\n`;
        output += categoryEntries.map(entry => 
          `  - ${entry.title} ${chalk.dim(`(${entry.tags.join(', ')})`)}`
        ).join('\n');
      }

      return output;
    }
  },
  {
    name: 'help',
    description: 'Show available commands',
    pattern: /^\/help$/,
    handler: async () => {
      let output = '# Available Commands\n\n';
      
      output += '## Knowledge Base\n';
      output += '- **/search** `<query>` - Search the knowledge base\n';
      output += '- **/tag** `<tag>` - Find entries by tag\n';
      output += '- **/category** `<category>` - Find entries by category\n';
      output += '- **/list** - List all knowledge entries\n\n';
      
      output += '## Codebase\n';
      output += '- **/index** `[pattern]` - Index project files\n';
      output += '- **/codesearch** `<query>` - Search code in indexed files\n';
      output += '- **/structure** - Show project file structure\n';
      output += '- **/files** `[language]` - List files by programming language\n';
      output += '- **/watch** - Start watching for file changes\n';
      output += '- **/unwatch** - Stop watching for file changes\n\n';
      
      output += '## Code Generation\n';
      output += '- **/create** `<file>` `<description>` - Create new file with AI-generated code\n';
      output += '- **/generate** `<type>` `<description>` - Generate code (function/class/component/test)\n';
      output += '- **/test-gen** `<file>` - Generate tests for a file\n';
      output += '- **/refactor** `<file>` `<instruction>` - Refactor code with AI\n';
      output += '- **/modify** `<prompt>` - Modify files based on natural language (shows diffs & asks confirmation)\n\n';
      
      output += '## Git Integration\n';
      output += '- **/git status** - Show git status\n';
      output += '- **/git diff** `[file]` - Show changes\n';
      output += '- **/git log** `[count]` - Show commit history\n';
      output += '- **/git stash** `[save/pop/list]` - Manage stashes\n';
      output += '- **/commit** `"message"` `[files]` - Commit changes\n';
      output += '- **/branch** `[name]` - Create or list branches\n\n';
      
      output += '## Debugging Assistance\n';
      output += '- **/debug-error** `<error>` - Analyze error and suggest fixes\n';
      output += '- **/debug-stack** `<trace>` - Analyze stack trace\n';
      output += '- **/profile** `<file>` - Performance profiling suggestions\n';
      output += '- **/smells** `[file]` - Detect code smells\n\n';
      
      output += '## System\n';
      output += '- **/memory** - Show what\'s stored in Grok\'s memory\n';
      output += '- **/verify** - Verify index consistency\n';
      output += '- **/repair** - Repair index inconsistencies\n';
      output += '- **/test** - Test Grok API connection\n';
      output += '- **/pwd** - Show current working directory\n';
      output += '- **/clear** - Clear terminal\n';
      output += '- **/exit** - Exit chat\n\n';
      
      output += '*You can also ask questions directly without using commands.*';
      
      // Return raw markdown - it will be rendered by the interactive handler
      return output;
    }
  },
  {
    name: 'clear',
    description: 'Clear the terminal',
    pattern: /^\/clear$/,
    handler: async () => {
      // Clear is handled in interactive.ts
      return '';
    }
  },
  {
    name: 'exit',
    description: 'Exit the chat',
    pattern: /^\/exit$/,
    handler: async () => {
      return 'EXIT_CHAT';
    }
  },
  {
    name: 'index',
    description: 'Index the current project codebase',
    pattern: /^\/index(?:\s+(.+))?$/,
    handler: async (args: string[]) => {
      const pattern = args[0] || '**/*';
      
      try {
        const indexer = await getCodeIndexer();
        const count = await indexer.indexProject([pattern]);
        
        // Auto-start watching after indexing
        const watcher = await getFileWatcher();
        if (!watcher.isActive() && count > 0) {
          await watcher.start();
        }
        
        // Verify the count matches what's actually indexed
        const actualCount = indexer.getIndexedFiles().length;
        if (actualCount !== count) {
          console.warn(chalk.yellow(`Warning: Index count mismatch (reported: ${count}, actual: ${actualCount})`));
        }
        
        return chalk.green(`✓ Fresh index complete: ${actualCount} files from the project.`);
      } catch (error) {
        return chalk.red(`✗ Error indexing project: ${error}`);
      }
    }
  },
  {
    name: 'codesearch',
    description: 'Search code in the project',
    pattern: /^\/codesearch\s+(.+)$/,
    handler: async (args: string[]) => {
      const query = args[0];
      const indexer = await getCodeIndexer();
      const results = await indexer.searchCode(query, { maxResults: 10 });
      
      if (results.length === 0) {
        return chalk.yellow('No code matches found.');
      }

      let output = chalk.bold(`Found ${results.length} files with matches:\n\n`);
      
      for (const result of results) {
        output += chalk.cyan(result.file.relativePath) + '\n';
        result.matches.slice(0, 3).forEach(match => {
          output += chalk.dim(`  Line ${match.line}: `) + match.content + '\n';
        });
        if (result.matches.length > 3) {
          output += chalk.dim(`  ... and ${result.matches.length - 3} more matches\n`);
        }
        output += '\n';
      }
      
      return output;
    }
  },
  {
    name: 'structure',
    description: 'Show project structure',
    pattern: /^\/structure$/,
    handler: async () => {
      const indexer = await getCodeIndexer();
      const files = indexer.getIndexedFiles();
      if (files.length === 0) {
        return chalk.yellow('No files indexed. Run /index first.');
      }
      
      const structure = indexer.getProjectStructure();
      return chalk.bold('Project Structure:\n') + structure;
    }
  },
  {
    name: 'files',
    description: 'List files by language',
    pattern: /^\/files(?:\s+(.+))?$/,
    handler: async (args: string[]) => {
      const language = args[0];
      const indexer = await getCodeIndexer();
      
      if (!language) {
        const allFiles = indexer.getIndexedFiles();
        const byLanguage = allFiles.reduce((acc, file) => {
          if (!acc[file.language]) acc[file.language] = 0;
          acc[file.language]++;
          return acc;
        }, {} as Record<string, number>);
        
        let output = chalk.bold('Files by language:\n\n');
        for (const [lang, count] of Object.entries(byLanguage)) {
          output += `${lang}: ${count} files\n`;
        }
        return output;
      }
      
      const files = indexer.getFilesByLanguage(language);
      if (files.length === 0) {
        return chalk.yellow(`No ${language} files found.`);
      }
      
      return chalk.bold(`${language} files (${files.length}):\n`) + 
        files.map(f => `  ${f.relativePath}`).join('\n');
    }
  },
  {
    name: 'pwd',
    description: 'Show current working directory',
    pattern: /^\/pwd$/,
    handler: async () => {
      return chalk.cyan(`Current directory: ${process.cwd()}`);
    }
  },
  {
    name: 'memory',
    description: 'Show what\'s stored in Grok\'s memory',
    pattern: /^\/memory$/,
    handler: async () => {
      const indexer = await getCodeIndexer();
      const indexedFiles = indexer.getIndexedFiles();
      const memoryPath = path.join(process.cwd(), '.grok-memory');
      
      let output = '# Grok Memory Contents\n\n';
      output += `**Memory location:** \`${memoryPath}\`\n\n`;
      
      // Show indexed files
      output += `## Indexed Codebase Files (${indexedFiles.length})\n\n`;
      if (indexedFiles.length > 0) {
        const sample = indexedFiles.slice(0, 5);
        sample.forEach(file => {
          output += `- \`${file.relativePath}\`\n`;
        });
        if (indexedFiles.length > 5) {
          output += `- *... and ${indexedFiles.length - 5} more files*\n`;
        }
      } else {
        output += '*No files indexed yet*\n';
      }
      
      // Show knowledge base entries
      const entries = await knowledgeBase.loadAllEntries();
      output += `\n## Knowledge Base Entries (${entries.length})\n\n`;
      if (entries.length > 0) {
        entries.forEach(entry => {
          output += `- **${entry.title}** *(${entry.category})*\n`;
        });
      } else {
        output += '*No knowledge entries yet*\n';
      }
      
      return output;
    }
  },
  {
    name: 'watch',
    description: 'Start watching for file changes',
    pattern: /^\/watch$/,
    handler: async () => {
      const watcher = await getFileWatcher();
      
      if (watcher.isActive()) {
        return chalk.yellow('File watcher is already active.');
      }
      
      const indexer = await getCodeIndexer();
      const files = indexer.getIndexedFiles();
      
      if (files.length === 0) {
        return chalk.yellow('No files indexed yet. Run /index first.');
      }
      
      await watcher.start();
      return chalk.green('File watcher started. Changes will auto-update the index.');
    }
  },
  {
    name: 'unwatch',
    description: 'Stop watching for file changes',
    pattern: /^\/unwatch$/,
    handler: async () => {
      const watcher = await getFileWatcher();
      
      if (!watcher.isActive()) {
        return chalk.yellow('File watcher is not active.');
      }
      
      watcher.stop();
      return chalk.yellow('File watcher stopped.');
    }
  },
  {
    name: 'verify',
    description: 'Verify index consistency',
    pattern: /^\/verify$/,
    handler: async () => {
      const indexer = await getCodeIndexer();
      const verification = await indexer.verifyIndex();
      
      let output = '# Index Verification Report\n\n';
      
      if (verification.valid) {
        output += '✅ **Index is valid and consistent!**\n\n';
      } else {
        output += '⚠️ **Index has consistency issues:**\n\n';
        verification.issues.forEach(issue => {
          output += `- ${issue}\n`;
        });
        output += '\n';
      }
      
      output += '## Statistics\n\n';
      output += `- Files in index JSON: ${verification.stats.indexCount}\n`;
      output += `- Files in memory: ${verification.stats.memoryCount}\n`;
      output += `- Files on disk: ${verification.stats.diskCount}\n`;
      
      if (verification.stats.missingFromDisk.length > 0) {
        output += `\n### Missing from disk (${verification.stats.missingFromDisk.length}):\n`;
        verification.stats.missingFromDisk.forEach(f => {
          output += `- ${f}\n`;
        });
      }
      
      if (verification.stats.orphanedFiles.length > 0) {
        output += `\n### Orphaned files on disk (${verification.stats.orphanedFiles.length}):\n`;
        verification.stats.orphanedFiles.forEach(f => {
          output += `- ${f}\n`;
        });
      }
      
      if (!verification.valid) {
        output += '\n*Run `/repair` to fix these issues.*';
      }
      
      return output;
    }
  },
  {
    name: 'repair',
    description: 'Repair index inconsistencies',
    pattern: /^\/repair$/,
    handler: async () => {
      const indexer = await getCodeIndexer();
      const repairLog = await indexer.repairIndex();
      return repairLog;
    }
  },
  {
    name: 'test',
    description: 'Test Grok API connection',
    pattern: /^\/test$/,
    handler: async () => {
      try {
        const api = getGrokApi();
        const response = await api.askQuestion('Hello, are you working?');
        return chalk.green('✓ Grok API is working!\n') + response;
      } catch (error) {
        if (error instanceof Error) {
          return chalk.red(`✗ API Test Failed: ${error.message}`);
        }
        return chalk.red('✗ API Test Failed: Unknown error');
      }
    }
  },
  // Code generation commands
  {
    name: 'create',
    description: 'Create a new file with generated code',
    pattern: /^\/create\s+([^\s]+)\s+(.+)$/,
    handler: async (args: string[]) => {
      const [filePath, description] = args;
      const generator = await getCodeGenerator();
      
      try {
        const code = await generator.generate({
          type: 'file',
          description,
          targetFile: filePath
        });
        
        await generator.createFile(filePath, code);
        return chalk.green(`✓ Created ${filePath}`);
      } catch (error) {
        return chalk.red(`Error: ${error}`);
      }
    }
  },
  {
    name: 'generate',
    description: 'Generate code (function, class, component)',
    pattern: /^\/generate\s+(function|class|component|test)\s+(.+)$/,
    handler: async (args: string[]) => {
      const [type, description] = args;
      const generator = await getCodeGenerator();
      
      try {
        const code = await generator.generate({
          type: type as any,
          description
        });
        
        return chalk.cyan('Generated code:\n\n') + code;
      } catch (error) {
        return chalk.red(`Error: ${error}`);
      }
    }
  },
  {
    name: 'test-gen',
    description: 'Generate tests for a file',
    pattern: /^\/test-gen\s+(.+)$/,
    handler: async (args: string[]) => {
      const filePath = args[0];
      const generator = await getCodeGenerator();
      
      try {
        const result = await generator.generateTests(filePath);
        return result;
      } catch (error) {
        return chalk.red(`Error: ${error}`);
      }
    }
  },
  {
    name: 'refactor',
    description: 'Refactor code in a file',
    pattern: /^\/refactor\s+([^\s]+)\s+(.+)$/,
    handler: async (args: string[]) => {
      const [filePath, instruction] = args;
      const generator = await getCodeGenerator();
      
      try {
        const result = await generator.refactor(filePath, instruction);
        return result;
      } catch (error) {
        return chalk.red(`Error: ${error}`);
      }
    }
  },
  // Git commands
  {
    name: 'git',
    description: 'Git operations',
    pattern: /^\/git\s+(status|diff|log|stash)(\s+(.+))?$/,
    handler: async (args: string[]) => {
      const [operation, _, params] = args;
      const git = getGitIntegration();
      
      try {
        switch (operation) {
          case 'status':
            return await git.status();
          case 'diff':
            return await git.diff(params);
          case 'log':
            const limit = params ? parseInt(params) : 10;
            return await git.log(limit);
          case 'stash':
            return await git.stash(params as any || 'save');
          default:
            return chalk.red('Unknown git operation');
        }
      } catch (error) {
        return chalk.red(`Error: ${error}`);
      }
    }
  },
  {
    name: 'commit',
    description: 'Commit changes',
    pattern: /^\/commit\s+"([^"]+)"(\s+(.+))?$/,
    handler: async (args: string[]) => {
      const [message, _, files] = args;
      const git = getGitIntegration();
      
      try {
        const fileList = files ? files.split(' ') : undefined;
        return await git.commit(message, fileList);
      } catch (error) {
        return chalk.red(`Error: ${error}`);
      }
    }
  },
  {
    name: 'branch',
    description: 'Create or list branches',
    pattern: /^\/branch(\s+(.+))?$/,
    handler: async (args: string[]) => {
      const branchName = args[1];
      const git = getGitIntegration();
      
      try {
        return await git.branch(branchName);
      } catch (error) {
        return chalk.red(`Error: ${error}`);
      }
    }
  },
  {
    name: 'modify',
    description: 'Modify files based on natural language prompt',
    pattern: /^\/modify\s+(.+)$/,
    handler: async (args: string[]) => {
      const prompt = args[0];
      const generator = await getCodeGenerator();
      
      try {
        // Propose changes based on the prompt
        const plan = await generator.proposeChanges(prompt);
        
        // Apply changes with user confirmation
        const result = await generator.applyChangesWithConfirmation(plan);
        return result;
      } catch (error) {
        return chalk.red(`Error: ${error}`);
      }
    }
  },
  // Debugging commands
  {
    name: 'debug-error',
    description: 'Analyze error and suggest fixes',
    pattern: /^\/debug-error\s+(.+)$/s,
    handler: async (args: string[]) => {
      const error = args[0];
      const debug = await getDebugAssistant();
      
      try {
        return await debug.analyzeError(error);
      } catch (error) {
        return chalk.red(`Error: ${error}`);
      }
    }
  },
  {
    name: 'debug-stack',
    description: 'Analyze stack trace',
    pattern: /^\/debug-stack\s+([\s\S]+)$/,
    handler: async (args: string[]) => {
      const stackTrace = args[0];
      const debug = await getDebugAssistant();
      
      try {
        return await debug.analyzeStackTrace(stackTrace);
      } catch (error) {
        return chalk.red(`Error: ${error}`);
      }
    }
  },
  {
    name: 'profile',
    description: 'Performance profiling suggestions',
    pattern: /^\/profile\s+(.+)$/,
    handler: async (args: string[]) => {
      const filePath = args[0];
      const debug = await getDebugAssistant();
      
      try {
        return await debug.profilePerformance(filePath);
      } catch (error) {
        return chalk.red(`Error: ${error}`);
      }
    }
  },
  {
    name: 'smells',
    description: 'Detect code smells',
    pattern: /^\/smells(?:\s+(.+))?$/,
    handler: async (args: string[]) => {
      const filePath = args[0];
      const debug = await getDebugAssistant();
      
      try {
        return await debug.detectCodeSmells(filePath);
      } catch (error) {
        return chalk.red(`Error: ${error}`);
      }
    }
  }
];

export async function handleCommand(input: string, conversationHistory?: ChatMessage[], grokApi?: GrokAPI): Promise<string> {
  // Ignore single-character confirmation-like inputs that might be stray
  if (/^[yYnN]$/.test(input.trim())) {
    return '[[IGNORE_INPUT]]';
  }
  
  // Check if input is a command
  for (const command of commands) {
    const match = input.match(command.pattern);
    if (match) {
      const args = match.slice(1);
      return await command.handler(args);
    }
  }

  // Use AI to detect intent for natural language requests
  const intent = await detectUserIntent(input, grokApi);
  
  // Debug logging
  if (process.env.DEBUG) {
    console.log(chalk.dim(`[DEBUG] Detected intent: ${JSON.stringify(intent)}`));
  }
  
  if (intent && intent.type !== 'question') {
    const generator = await getCodeGenerator();
    
    try {
      switch (intent.type) {
        case 'modify':
          const plan = await generator.proposeChanges(input);
          return await generator.applyChangesWithConfirmation(plan);
          
        case 'create':
          return await generator.handleFileCreation(input);
          
        case 'delete':
          return await generator.handleFileDeletion(input);
          
        default:
          // Fall through to regular question handling
          break;
      }
    } catch (error) {
      // Handle specific errors with helpful messages
      if (error instanceof Error) {
        if (error.message.includes('No relevant files found')) {
          // Return a special error format that won't be sent to Grok
          return '[[FILE_OPERATION_ERROR]]\n' +
                 chalk.yellow('⚠️  ' + error.message + '\n\n') + 
                 chalk.gray('Tip: Make sure to specify the file name in your request.\n' +
                          'Examples:\n' +
                          '  • "Remove the services section from index.html"\n' +
                          '  • "Update the header in App.js"\n' +
                          '  • "Change colors in styles.css"');
        }
        return '[[FILE_OPERATION_ERROR]]\n' + chalk.red(`❌ ${error.message}`);
      }
      return '[[FILE_OPERATION_ERROR]]\n' + chalk.red(`❌ An error occurred: ${error}`);
    }
  }

  // If not a command or modification request, treat as a question for Grok
  // Get context from both knowledge base and codebase
  const knowledgeContext = await knowledgeBase.getContext(input);
  const indexer = await getCodeIndexer();
  const codeContext = await indexer.getCodeContext(input);
  
  let combinedContext = '';
  if (knowledgeContext) {
    combinedContext += 'Knowledge Base Context:\n' + knowledgeContext + '\n\n';
  }
  if (codeContext) {
    combinedContext += 'Codebase Context:\n' + codeContext;
  }
  
  // Add project overview to context when asking about the codebase
  if (input.toLowerCase().includes('codebase') || input.toLowerCase().includes('project') || 
      input.toLowerCase().includes('structure') || input.toLowerCase().includes('technical')) {
    const files = indexer.getIndexedFiles();
    
    // Dynamically determine project type based on files
    const filesByLanguage: Record<string, number> = {};
    files.forEach(f => {
      filesByLanguage[f.language] = (filesByLanguage[f.language] || 0) + 1;
    });
    
    // Detect project type using language configuration
    let projectType = 'Unknown';
    let mainTechnology = 'Unknown';
    let packageManager = 'Unknown';
    
    // Convert files to format expected by detectors
    const filesForDetection = files.map(f => ({
      relativePath: f.relativePath,
      content: f.content
    }));
    
    // Find matching project detector
    for (const detector of projectDetectors) {
      if (detector.detect(filesForDetection)) {
        projectType = detector.projectType;
        mainTechnology = detector.mainTechnology;
        if (detector.packageManager) {
          packageManager = detector.packageManager;
        }
        
        // Special handling for Node.js to detect framework
        if (mainTechnology === 'Node.js') {
          const packageJson = files.find(f => f.relativePath === 'package.json');
          if (packageJson) {
            const frameworkType = detectNodeFramework(packageJson.content);
            projectType = frameworkType;
            
            // Check for TypeScript
            if (filesByLanguage['typescript'] > 0) {
              mainTechnology = 'Node.js with TypeScript';
            } else if (filesByLanguage['javascript'] > 0) {
              mainTechnology = 'Node.js with JavaScript';
            }
            
            // Check for specific package managers
            if (files.some(f => f.relativePath === 'yarn.lock')) {
              packageManager = 'yarn';
            } else if (files.some(f => f.relativePath === 'pnpm-lock.yaml')) {
              packageManager = 'pnpm';
            }
          }
        }
        break;
      }
    }
    
    // Fallback detection based on language counts if no detector matched
    if (projectType === 'Unknown' && filesByLanguage) {
      const primaryLanguage = Object.entries(filesByLanguage)
        .sort((a, b) => b[1] - a[1])[0];
      if (primaryLanguage) {
        mainTechnology = primaryLanguage[0];
        projectType = `${primaryLanguage[0]} project`;
      }
    }
    
    // Build language summary
    const languageSummary = Object.entries(filesByLanguage)
      .sort((a, b) => b[1] - a[1])
      .map(([lang, count]) => `${count} ${lang} files`)
      .join(', ');
    
    // Find key files
    const keyFiles = files
      .filter(f => f.relativePath.match(/^(package\.json|tsconfig\.json|README\.md|\.gitignore|requirements\.txt|setup\.py|Makefile|Dockerfile)$/))
      .map(f => f.relativePath);
    
    combinedContext = `Project Overview:
- Main technology: ${mainTechnology}
- Project type: ${projectType}
- Package manager: ${packageManager}
- Languages: ${languageSummary}
- Key files: ${keyFiles.join(', ') || 'None detected'}
- Total files indexed: ${files.length}

${combinedContext}`;
  }
  
  try {
    const api = grokApi || getGrokApi();
    const response = await api.askQuestionWithHistory(input, combinedContext, conversationHistory || []);
    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw error; // Re-throw to allow proper handling in interactive mode
    }
    return chalk.red('An unexpected error occurred.');
  }
}

export function getCommands(): Command[] {
  return commands;
}

interface UserIntent {
  type: 'create' | 'modify' | 'delete' | 'question';
  confidence: number;
  details?: string;
}

async function detectUserIntent(input: string, grokApi?: GrokAPI): Promise<UserIntent> {
  const api = grokApi || getGrokApi();
  
  // Debug logging
  if (process.env.DEBUG) {
    console.log(chalk.dim(`[DEBUG] Analyzing intent for: "${input}"`));
  }
  
  // Quick check for obvious questions (but not if they contain action words)
  if (input.match(/^(what|where|when|who|why|how|is|are|does|do)\s/i) &&
      !input.match(/\b(create|make|generate|delete|remove|change|modify|update|build|write)\b/i)) {
    if (process.env.DEBUG) {
      console.log(chalk.dim(`[DEBUG] Quick match: question`));
    }
    return { type: 'question', confidence: 0.9 };
  }
  
  const intentPrompt = `Analyze this user input and determine their intent: "${input}"

You MUST respond with ONLY a JSON object (no other text) in this format:
{
  "type": "create" | "modify" | "delete" | "question",
  "confidence": 0.0 to 1.0,
  "details": "brief explanation"
}

Intent types:
- "create": User wants to create new files, components, or code
- "modify": User wants to change, update, refactor existing code, or remove/add content within files
- "delete": User wants to remove or delete entire files from the filesystem
- "question": User is asking for information or help

Examples:
Input: "Can you create a boiler template index.html for me?"
Output: {"type": "create", "confidence": 0.95, "details": "User wants to create an HTML boilerplate file"}

Input: "Change all the colors to dark theme"
Output: {"type": "modify", "confidence": 0.9, "details": "User wants to modify colors/theme"}

Input: "Remove the about section from index.html"
Output: {"type": "modify", "confidence": 0.95, "details": "User wants to remove content from within a file"}

Input: "Delete the header component from App.js"
Output: {"type": "modify", "confidence": 0.9, "details": "User wants to remove code from within a file"}

Input: "What is the purpose of this function?"
Output: {"type": "question", "confidence": 0.95, "details": "User asking for information"}

Input: "Delete all the old test files"
Output: {"type": "delete", "confidence": 0.9, "details": "User wants to delete entire files"}

Input: "Remove index.html"
Output: {"type": "delete", "confidence": 0.95, "details": "User wants to delete the file"}`;

  try {
    const response = await api.askQuestion(intentPrompt);
    
    if (process.env.DEBUG) {
      console.log(chalk.dim(`[DEBUG] AI response: ${response.substring(0, 200)}...`));
    }
    
    // Try to parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const intent = JSON.parse(jsonMatch[0]);
      if (process.env.DEBUG) {
        console.log(chalk.dim(`[DEBUG] Parsed intent: ${JSON.stringify(intent)}`));
      }
      return intent;
    }
  } catch (error) {
    if (process.env.DEBUG) {
      console.log(chalk.dim(`[DEBUG] AI intent detection failed, using fallback`));
    }
    // If AI fails, fall back to simple pattern matching as last resort
    if (input.match(/\b(create|make|generate|add|write|new)\b/i) && 
        input.match(/\b(file|component|class|function|page|template|boiler)/i)) {
      return { type: 'create', confidence: 0.7 };
    }
    
    // Check if it's about removing/deleting content FROM a file (modify) vs removing a file entirely (delete)
    if (input.match(/\b(remove|delete|drop|eliminate|clear)\b/i)) {
      // If it mentions "from" or has a specific section/component name, it's likely a modification
      if (input.match(/\bfrom\b/i) || 
          input.match(/\b(section|component|function|class|method|div|element|block|code|part)\b/i)) {
        return { type: 'modify', confidence: 0.7 };
      }
      // If it talks about files/folders as whole units, it's deletion
      if (input.match(/\b(file|files|folder|directory|all|old|unused|deprecated)\b/i)) {
        return { type: 'delete', confidence: 0.7 };
      }
      // Default to modify for safety (less destructive)
      return { type: 'modify', confidence: 0.6 };
    }
    
    if (input.match(/\b(change|modify|update|edit|refactor|fix|improve|add|replace)\b/i)) {
      return { type: 'modify', confidence: 0.7 };
    }
  }
  
  // Default to question
  return { type: 'question', confidence: 0.5 };
}

// Legacy regex functions removed - now using AI-based intent detection