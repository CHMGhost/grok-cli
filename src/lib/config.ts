import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { GrokConfig } from '../types';

const CONFIG_DIR = path.join(os.homedir(), '.grok-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

let cachedConfig: GrokConfig | null = null;

export async function ensureConfigDir(): Promise<void> {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create config directory:', error);
  }
}

export async function loadConfig(): Promise<GrokConfig | null> {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const configData = await fs.readFile(CONFIG_FILE, 'utf-8');
    cachedConfig = JSON.parse(configData);
    return cachedConfig;
  } catch (error) {
    return null;
  }
}

export async function saveConfig(config: GrokConfig): Promise<void> {
  await ensureConfigDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
  cachedConfig = config;
}

export async function initializeConfig(force: boolean = false): Promise<void> {
  const existingConfig = await loadConfig();

  if (existingConfig && !force) {
    return;
  }

  console.log(chalk.bold('\n🤖 Grok CLI Configuration\n'));

  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'Enter your Grok API key:',
      mask: '*',
      validate: (input) => input.length > 0 || 'API key is required'
    },
    {
      type: 'input',
      name: 'apiUrl',
      message: 'Grok API URL (press Enter for default):',
      default: 'https://api.x.ai/v1/chat/completions'
    },
    {
      type: 'input',
      name: 'model',
      message: 'Grok model name (press Enter for default):',
      default: 'grok-beta'
    },
    {
      type: 'input',
      name: 'ignorePatterns',
      message: 'Additional file patterns to ignore (comma-separated, optional):',
      default: '',
      filter: (input) => {
        return input ? input.split(',').map((p: string) => p.trim()).filter(Boolean) : [];
      }
    }
  ]);

  const config: GrokConfig = {
    apiKey: answers.apiKey,
    apiUrl: answers.apiUrl || undefined,
    model: answers.model || undefined,
    ignorePatterns: answers.ignorePatterns.length > 0 ? answers.ignorePatterns : undefined
  };

  await saveConfig(config);
  console.log(chalk.green('\n✅ Configuration saved successfully!\n'));
}

export function getConfig(): GrokConfig {
  if (!cachedConfig) {
    throw new Error('Configuration not loaded. Run "grok config" to set up.');
  }
  return cachedConfig;
}