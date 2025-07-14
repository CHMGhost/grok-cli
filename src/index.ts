#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { config } from 'dotenv';
import { startInteractiveMode } from './lib/interactive';
import { handleCommand } from './lib/commandHandler';
import { initializeConfig } from './lib/config';
import { readFileSync } from 'fs';
import { join } from 'path';

config();

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
);

const program = new Command();

program
  .name('grok')
  .description('A code assistant CLI powered by Grok AI')
  .version(packageJson.version);

program
  .command('chat')
  .description('Start an interactive chat session with Grok')
  .action(async () => {
    await initializeConfig();
    await startInteractiveMode();
  });

program
  .command('ask <question>')
  .description('Ask Grok a single question')
  .action(async (question: string) => {
    await initializeConfig();
    const response = await handleCommand(question);
    console.log(response);
  });

program
  .command('config')
  .description('Configure Grok CLI settings')
  .action(async () => {
    await initializeConfig(true);
  });

program
  .command('setup')
  .description('Initial setup - configure API and create knowledge base')
  .action(async () => {
    const { runSetup } = await import('./lib/setup');
    await runSetup();
  });

// Make chat mode the default action when no command is provided
program
  .action(async () => {
    await initializeConfig();
    await startInteractiveMode();
  });

program.parse();