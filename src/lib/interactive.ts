import readline from 'readline';
import chalk from 'chalk';
import { handleCommand, getFileWatcher, getCommands } from './commandHandler';
import { ChatMessage } from '../types';
import { ConversationManager } from './conversationManager';
import { CodeIndexer } from './codeIndexer';
import { renderMarkdown } from './markdownRenderer';
import { GrokAPI } from './grokApi';

// Export readline interface for external control
let activeReadline: readline.Interface | null = null;

export function getActiveReadline(): readline.Interface | null {
  return activeReadline;
}

export async function startInteractiveMode(): Promise<void> {
  console.clear();
  console.log(chalk.bold.blue('🤖 Grok CLI - Interactive Mode'));
  console.log(chalk.dim('Type /help for available commands or /exit to quit'));
  console.log(chalk.dim('Press Tab to autocomplete commands'));
  console.log(chalk.dim('Press Ctrl+C to cancel a query, twice to exit'));
  console.log(chalk.dim('─'.repeat(process.stdout.columns || 80)));
  
  const grokApi = new GrokAPI();
  let isProcessing = false;
  let lastCtrlCTime = 0;
  
  // Initialize conversation manager early so it's available for SIGINT handler
  const conversationManager = new ConversationManager();
  await conversationManager.initialize();

  // Override default SIGINT behavior BEFORE creating readline
  process.removeAllListeners('SIGINT');
  
  const rl = activeReadline = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green('\n❯ '),
    terminal: true,
    removeHistoryDuplicates: true,
    completer: (line: string) => {
      // Get available commands
      const commands = getCommands();
      const commandNames = commands.map(cmd => `/${cmd.name}`);
      
      // Only suggest commands if the line starts with /
      if (line.startsWith('/')) {
        const matches = commandNames.filter(cmd => cmd.startsWith(line));
        return [matches.length ? matches : commandNames, line];
      }
      
      // No autocomplete for regular text
      return [[], line];
    }
  });
  
  // Prevent readline from installing its own SIGINT handler
  const originalEmit = rl.emit.bind(rl);
  rl.emit = function(event: string, ...args: any[]) {
    if (event === 'SIGINT') {
      // Intercept SIGINT and handle it ourselves
      const now = Date.now();
      
      if (isProcessing) {
        // Cancel the current request
        grokApi.cancelCurrentRequest();
        process.stdout.write('\n' + chalk.yellow('Request cancelled') + '\n');
        isProcessing = false;
        lastCtrlCTime = now;
        // Show prompt again
        rl.prompt();
        return true;
      } else {
        // Check if this is a double Ctrl+C (within 500ms)
        if (now - lastCtrlCTime < 500) {
          // Double Ctrl+C - exit
          console.log(chalk.yellow('\nSaving conversation...\n'));
          conversationManager.saveConversation().then(() => {
            console.log(chalk.yellow('Goodbye! 👋\n'));
            rl.close();
            process.exit(0);
          });
          return true;
        } else {
          // Single Ctrl+C when not processing - show hint
          console.log(chalk.dim('\n(Press Ctrl+C again to exit)'));
          lastCtrlCTime = now;
          rl.prompt();
          return true;
        }
      }
    }
    // For all other events, call the original emit
    return originalEmit(event, ...args);
  };

  // ConversationManager already initialized above

  // Check if project has been indexed
  const codeIndexer = new CodeIndexer();
  await codeIndexer.initialize();
  const indexedFiles = codeIndexer.getIndexedFiles();
  
  if (indexedFiles.length === 0) {
    console.log(chalk.yellow('\n📁 No project files indexed yet.'));
    console.log(chalk.dim('Run /index to enable code analysis, or start chatting!\n'));
  } else {
    console.log(chalk.green(`\n✓ ${indexedFiles.length} files indexed and available for analysis.\n`));
  }

  // Function to handle user input
  const processInput = async (input: string) => {
    const trimmedInput = input.trim();

    if (!trimmedInput) {
      return;
    }

    // Show appropriate status message
    const statusMessage = trimmedInput.startsWith('/index') ? '\nIndexing files...' : '\nThinking...';
    process.stdout.write(chalk.dim(statusMessage));
    isProcessing = true;

    try {
      // Pass conversation context to the command handler
      const context = conversationManager.getRecentContext();
      let response = await handleCommand(trimmedInput, context, grokApi);
      
      // Clear the "Thinking..." message
      process.stdout.write('\r' + ' '.repeat(20) + '\r');

      if (response === 'EXIT_CHAT') {
        console.log(chalk.yellow('\nSaving conversation...\n'));
        await conversationManager.saveConversation();
        console.log(chalk.yellow('Goodbye! 👋\n'));
        rl.close();
        process.exit(0);
      }

      // Handle clear command specially
      if (trimmedInput === '/clear') {
        console.clear();
        console.log(chalk.bold.blue('🤖 Grok CLI - Interactive Mode'));
        console.log(chalk.dim('Type /help for available commands or /exit to quit'));
        console.log(chalk.dim('Press Tab to autocomplete commands'));
        console.log(chalk.dim('─'.repeat(process.stdout.columns || 80)));
        return;
      }

      // Skip ignored inputs
      if (response === '[[IGNORE_INPUT]]') {
        console.log(chalk.dim('(Input ignored - single character confirmation)'));
        return;
      }

      // Skip minimal success indicators (just show prompt again)
      if (response === '✓') {
        return;
      }

      // Skip empty or whitespace-only responses
      if (!response || response.trim() === '') {
        return;
      }

      // Check if this is a file operation error
      const isFileOperationError = response.startsWith('[[FILE_OPERATION_ERROR]]');
      
      // Remove the error marker if present
      if (isFileOperationError) {
        response = response.replace('[[FILE_OPERATION_ERROR]]\n', '');
      }
      
      
      // Add to conversation history if it's a regular question and not a file operation error
      if (!trimmedInput.startsWith('/') && !isFileOperationError) {
        conversationManager.addMessage({ role: 'user', content: trimmedInput });
        conversationManager.addMessage({ role: 'assistant', content: response });
        
        // Auto-save every few messages
        const history = conversationManager.getConversationHistory();
        if (history.length % 4 === 0) {
          await conversationManager.saveConversation();
        }
      }

      // Display response with proper formatting
      // Render markdown for better readability
      let formattedResponse: string;
      
      // Special handling for certain commands
      if (trimmedInput.startsWith('/help') || trimmedInput.startsWith('/memory') || 
          trimmedInput.startsWith('/verify') || trimmedInput.startsWith('/repair')) {
        formattedResponse = renderMarkdown(response);
      } else if (trimmedInput.startsWith('/')) {
        // Other commands keep their original formatting
        formattedResponse = response;
      } else {
        // Regular chat messages get markdown rendering
        formattedResponse = renderMarkdown(response);
      }
      
      console.log('\n' + formattedResponse);
      
    } catch (error) {
      // Clear the "Thinking..." message
      process.stdout.write('\r' + ' '.repeat(20) + '\r');
      if (error instanceof Error && (error.message.includes('cancelled') || error.message.includes('aborted'))) {
        // Don't show error for cancelled requests - already handled by SIGINT
      } else {
        console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
      }
    } finally {
      isProcessing = false;
    }
  };

  // Initial prompt
  rl.prompt();

  rl.on('line', async (input) => {
    await processInput(input);
    rl.prompt();
  });

  rl.on('close', async () => {
    // Only handle close if not processing
    if (!isProcessing) {
      // Stop file watcher if active
      const watcher = await getFileWatcher();
      if (watcher.isActive()) {
        watcher.stop();
      }
    }
  });

  // Handle Ctrl+C gracefully
  rl.on('SIGINT', async () => {
    console.log(chalk.yellow('\n\nSaving conversation...'));
    
    // Stop file watcher if active
    const watcher = await getFileWatcher();
    if (watcher.isActive()) {
      watcher.stop();
    }
    
    await conversationManager.saveConversation();
    console.log(chalk.yellow('Goodbye! 👋\n'));
    process.exit(0);
  });
}