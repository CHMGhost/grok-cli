import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { isPathSafe, validateFilePath } from './pathValidator';

export interface CodeModification {
  file: string;
  changes: Array<{
    line?: number;
    search?: string;
    replace: string;
    description?: string;
  }>;
}

export class CodeModifier {
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
  }

  async applyModifications(modifications: CodeModification[]): Promise<string> {
    let results = '';
    
    for (const mod of modifications) {
      try {
        const result = await this.modifyFile(mod);
        results += result + '\n';
      } catch (error) {
        results += chalk.red(`Failed to modify ${mod.file}: ${error}\n`);
      }
    }
    
    return results;
  }

  private async modifyFile(modification: CodeModification): Promise<string> {
    // Validate path
    if (!validateFilePath(modification.file)) {
      throw new Error('Invalid file path');
    }
    
    const fullPath = path.join(this.projectRoot, modification.file);
    
    if (!isPathSafe(this.projectRoot, fullPath)) {
      throw new Error('Path traversal detected');
    }
    
    // Read file
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');
    let modified = false;
    let changeLog = `\n${chalk.cyan(modification.file)}:\n`;
    
    for (const change of modification.changes) {
      if (change.line !== undefined) {
        // Line-based replacement
        if (change.line > 0 && change.line <= lines.length) {
          const oldLine = lines[change.line - 1];
          lines[change.line - 1] = change.replace;
          modified = true;
          changeLog += `  Line ${change.line}: ${chalk.red('-')} ${oldLine}\n`;
          changeLog += `  Line ${change.line}: ${chalk.green('+')} ${change.replace}\n`;
          if (change.description) {
            changeLog += `  ${chalk.dim(change.description)}\n`;
          }
        }
      } else if (change.search) {
        // Search and replace
        let found = false;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(change.search)) {
            const oldLine = lines[i];
            lines[i] = lines[i].replace(change.search, change.replace);
            modified = true;
            found = true;
            changeLog += `  Line ${i + 1}: ${chalk.red('-')} ${oldLine}\n`;
            changeLog += `  Line ${i + 1}: ${chalk.green('+')} ${lines[i]}\n`;
            if (change.description) {
              changeLog += `  ${chalk.dim(change.description)}\n`;
            }
            break; // Only replace first occurrence
          }
        }
        if (!found) {
          changeLog += `  ${chalk.yellow('⚠')} Pattern not found: "${change.search}"\n`;
        }
      }
    }
    
    if (modified) {
      // Write back to file
      await fs.writeFile(fullPath, lines.join('\n'));
      changeLog += chalk.green('  ✓ File updated successfully\n');
    } else {
      changeLog += chalk.yellow('  ⚠ No changes made\n');
    }
    
    return changeLog;
  }

  async createBackup(filePath: string): Promise<string> {
    const fullPath = path.join(this.projectRoot, filePath);
    const backupPath = `${fullPath}.backup`;
    
    await fs.copyFile(fullPath, backupPath);
    return backupPath;
  }

  parseModificationInstructions(instructions: string): CodeModification[] {
    // Simple parser for modification instructions
    // Format: file:path/to/file.ts line:10 replace:"new content"
    // Or: file:path/to/file.ts search:"old text" replace:"new text"
    
    const mods: CodeModification[] = [];
    const lines = instructions.split('\n');
    
    let currentMod: CodeModification | null = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('file:')) {
        if (currentMod) {
          mods.push(currentMod);
        }
        const filePath = trimmed.substring(5).trim();
        currentMod = { file: filePath, changes: [] };
      } else if (currentMod && trimmed) {
        const lineMatch = trimmed.match(/line:(\d+)\s+replace:"([^"]+)"/);
        const searchMatch = trimmed.match(/search:"([^"]+)"\s+replace:"([^"]+)"/);
        
        if (lineMatch) {
          currentMod.changes.push({
            line: parseInt(lineMatch[1]),
            replace: lineMatch[2]
          });
        } else if (searchMatch) {
          currentMod.changes.push({
            search: searchMatch[1],
            replace: searchMatch[2]
          });
        }
      }
    }
    
    if (currentMod) {
      mods.push(currentMod);
    }
    
    return mods;
  }
}