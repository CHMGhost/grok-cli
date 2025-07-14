import { marked } from 'marked';
import chalk from 'chalk';

// @ts-ignore - marked-terminal doesn't have types
import TerminalRenderer from 'marked-terminal';

// Configure marked with terminal renderer
marked.setOptions({
  renderer: new TerminalRenderer({
    // Colors
    code: chalk.yellow,
    blockquote: chalk.gray.italic,
    html: chalk.gray,
    heading: chalk.bold.cyan,
    firstHeading: chalk.bold.blue,
    hr: chalk.gray,
    listitem: chalk.gray,
    list: (body: string) => body,
    paragraph: chalk.reset,
    table: chalk.gray,
    tablerow: chalk.gray,
    tablecell: chalk.gray,
    strong: chalk.bold,
    em: chalk.italic,
    codespan: chalk.yellow,
    del: chalk.strikethrough,
    link: chalk.blue.underline,
    href: chalk.blue.underline,
    
    // Settings
    showSectionPrefix: false,
    width: process.stdout.columns || 80,
    reflowText: true,
    tab: 2,
    unescape: true
  }) as any
});

export function renderMarkdown(text: string): string {
  try {
    // Pre-process to handle common patterns
    let processed = text;
    
    // Ensure proper spacing around headings
    processed = processed.replace(/\n?(#{1,6}\s+[^\n]+)\n?/g, '\n\n$1\n\n');
    
    // Ensure proper spacing around code blocks
    processed = processed.replace(/\n?```/g, '\n```');
    
    // Render with marked
    const rendered = marked(processed) as string;
    
    // Post-process to clean up extra newlines
    return rendered
      .replace(/\n{3,}/g, '\n\n')  // Replace multiple newlines with double
      .trim();
  } catch (error) {
    // If rendering fails, return original text
    return text;
  }
}

// Utility to render code blocks with syntax highlighting
export function renderCodeBlock(code: string, language?: string): string {
  const header = language ? chalk.dim(`[${language}]`) : '';
  const border = chalk.dim('─'.repeat(50));
  
  return `${header}\n${border}\n${chalk.yellow(code)}\n${border}`;
}

// Utility to render inline elements
export function renderInline(text: string): string {
  // Bold
  text = text.replace(/\*\*([^*]+)\*\*/g, (_, content) => chalk.bold(content));
  
  // Italic
  text = text.replace(/\*([^*]+)\*/g, (_, content) => chalk.italic(content));
  
  // Code
  text = text.replace(/`([^`]+)`/g, (_, content) => chalk.yellow(content));
  
  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => 
    chalk.blue.underline(text) + chalk.dim(` (${url})`)
  );
  
  return text;
}