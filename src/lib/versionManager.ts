import fs from 'fs/promises';
import path from 'path';
import { readFileSync } from 'fs';
import { join } from 'path';

type VersionBump = 'major' | 'minor' | 'patch';

// Get default version from package.json
const DEFAULT_VERSION = (() => {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
})();

export interface VersionFile {
  path: string;
  type: 'json' | 'toml' | 'yaml' | 'text';
  versionKey?: string | string[]; // Path to version in structured files
  versionPattern?: RegExp; // Pattern for text files
}

export class VersionManager {
  private versionFile: VersionFile | null = null;

  constructor() {
    // Auto-detect version file on construction
    this.detectVersionFile();
  }

  private async detectVersionFile(): Promise<void> {
    const cwd = process.cwd();
    
    // Check for common version files in order of preference
    const versionFiles: VersionFile[] = [
      // Node.js
      { path: path.join(cwd, 'package.json'), type: 'json', versionKey: 'version' },
      // Python
      { path: path.join(cwd, 'setup.py'), type: 'text', versionPattern: /version\s*=\s*['"]([^'"]+)['"]/ },
      { path: path.join(cwd, 'pyproject.toml'), type: 'toml', versionKey: ['project', 'version'] },
      { path: path.join(cwd, '__init__.py'), type: 'text', versionPattern: /__version__\s*=\s*['"]([^'"]+)['"]/ },
      // Rust
      { path: path.join(cwd, 'Cargo.toml'), type: 'toml', versionKey: ['package', 'version'] },
      // Go
      { path: path.join(cwd, 'go.mod'), type: 'text', versionPattern: /module\s+[^\s]+\s+v([\d\.]+)/ },
      // Ruby
      { path: path.join(cwd, 'version.rb'), type: 'text', versionPattern: /VERSION\s*=\s*['"]([^'"]+)['"]/ },
      // Generic
      { path: path.join(cwd, 'VERSION'), type: 'text', versionPattern: /^([\d\.]+)/ },
      { path: path.join(cwd, 'version.txt'), type: 'text', versionPattern: /^([\d\.]+)/ }
    ];
    
    for (const vf of versionFiles) {
      try {
        await fs.access(vf.path);
        this.versionFile = vf;
        break;
      } catch {
        // File doesn't exist, try next
      }
    }
  }

  async getCurrentVersion(): Promise<string> {
    if (!this.versionFile) {
      await this.detectVersionFile();
    }
    
    if (!this.versionFile) {
      return DEFAULT_VERSION; // Default if no version file found
    }
    
    try {
      const content = await fs.readFile(this.versionFile.path, 'utf-8');
      
      switch (this.versionFile.type) {
        case 'json': {
          const data = JSON.parse(content);
          return this.getNestedValue(data, this.versionFile.versionKey as string) || DEFAULT_VERSION;
        }
        case 'toml': {
          // Simple TOML parsing for version
          const versionMatch = content.match(/version\s*=\s*['"]([^'"]+)['"]/m);
          return versionMatch ? versionMatch[1] : DEFAULT_VERSION;
        }
        case 'yaml': {
          // Simple YAML parsing for version
          const versionMatch = content.match(/version:\s*['"]?([\d\.]+)['"]?/m);
          return versionMatch ? versionMatch[1] : DEFAULT_VERSION;
        }
        case 'text': {
          if (this.versionFile.versionPattern) {
            const match = content.match(this.versionFile.versionPattern);
            return match ? match[1] : DEFAULT_VERSION;
          }
          return content.trim() || DEFAULT_VERSION;
        }
        default:
          return DEFAULT_VERSION;
      }
    } catch {
      return '1.0.0';
    }
  }

  private getNestedValue(obj: any, path: string | string[]): any {
    const keys = Array.isArray(path) ? path : [path];
    return keys.reduce((current, key) => current?.[key], obj);
  }

  async bumpVersion(type: VersionBump): Promise<string> {
    const currentVersion = await this.getCurrentVersion();
    const [major, minor, patch] = currentVersion.split('.').map(Number);

    let newVersion: string;
    switch (type) {
      case 'major':
        newVersion = `${major + 1}.0.0`;
        break;
      case 'minor':
        newVersion = `${major}.${minor + 1}.0`;
        break;
      case 'patch':
        newVersion = `${major}.${minor}.${patch + 1}`;
        break;
    }

    await this.updateVersionFile(newVersion);
    return newVersion;
  }

  private async updateVersionFile(newVersion: string): Promise<void> {
    if (!this.versionFile) {
      console.error('No version file detected');
      return;
    }
    
    try {
      const content = await fs.readFile(this.versionFile.path, 'utf-8');
      let newContent: string;
      
      switch (this.versionFile.type) {
        case 'json': {
          const data = JSON.parse(content);
          this.setNestedValue(data, this.versionFile.versionKey as string, newVersion);
          newContent = JSON.stringify(data, null, 2) + '\n';
          break;
        }
        case 'toml': {
          // Simple TOML version replacement
          newContent = content.replace(
            /version\s*=\s*['"][^'"]+['"]/m,
            `version = "${newVersion}"`
          );
          break;
        }
        case 'yaml': {
          // Simple YAML version replacement
          newContent = content.replace(
            /version:\s*['"]?[\d\.]+['"]?/m,
            `version: "${newVersion}"`
          );
          break;
        }
        case 'text': {
          if (this.versionFile.versionPattern) {
            const fullPattern = new RegExp(
              this.versionFile.versionPattern.source.replace(/\([^)]+\)/, '[^\'"]+')
            );
            newContent = content.replace(fullPattern, (match) => {
              return match.replace(/[\d\.]+/, newVersion);
            });
          } else {
            newContent = newVersion + '\n';
          }
          break;
        }
        default:
          throw new Error('Unknown version file type');
      }
      
      await fs.writeFile(this.versionFile.path, newContent);
    } catch (error) {
      console.error(`Failed to update version in ${this.versionFile.path}:`, error);
    }
  }

  private setNestedValue(obj: any, path: string | string[], value: any): void {
    const keys = Array.isArray(path) ? path : [path];
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  determineVersionBump(changeDescription: string): VersionBump {
    const lowerDesc = changeDescription.toLowerCase();
    
    // Major version: breaking changes, major features
    if (lowerDesc.includes('breaking') || lowerDesc.includes('major')) {
      return 'major';
    }
    
    // Minor version: new features, significant improvements
    if (lowerDesc.includes('feature') || lowerDesc.includes('add') || 
        lowerDesc.includes('new') || lowerDesc.includes('implement')) {
      return 'minor';
    }
    
    // Patch version: bug fixes, small improvements
    return 'patch';
  }
}