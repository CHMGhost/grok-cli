import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import path from 'path';
import ora from 'ora';
import { initializeConfig } from './config';
import { KnowledgeBase } from './knowledgeBase';
import { CodeIndexer } from './codeIndexer';

export async function runSetup(): Promise<void> {
  console.log(chalk.bold.blue('\n🚀 Welcome to Grok CLI Setup!\n'));
  console.log('This wizard will help you configure Grok CLI and set up your knowledge base.\n');

  // Step 1: Configure API
  console.log(chalk.bold('Step 1: API Configuration'));
  await initializeConfig(true);

  // Step 2: Set up knowledge base
  console.log(chalk.bold('\nStep 2: Knowledge Base Setup'));
  
  const { setupKnowledge } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'setupKnowledge',
      message: 'Would you like to set up the knowledge base directory?',
      default: true
    }
  ]);

  if (setupKnowledge) {
    const knowledgeBase = new KnowledgeBase();
    await knowledgeBase.ensureKnowledgeDirectory();

    // Create some example files
    const { createExamples } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'createExamples',
        message: 'Would you like to create example knowledge entries?',
        default: true
      }
    ]);

    if (createExamples) {
      await createExampleEntries();
    }

    console.log(chalk.green('\n✅ Memory directory created at: ./.grok-memory'));
  }

  // Step 3: Index codebase
  console.log(chalk.bold('\nStep 3: Codebase Indexing'));
  
  const { indexCodebase } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'indexCodebase',
      message: 'Would you like to index the current project codebase?',
      default: true
    }
  ]);

  if (indexCodebase) {
    const spinner = ora('Indexing project files...').start();
    const codeIndexer = new CodeIndexer();
    
    try {
      const count = await codeIndexer.indexProject();
      spinner.succeed(`Indexed ${count} files from the project`);
    } catch (error) {
      spinner.fail('Failed to index project');
      console.error(chalk.red('Error:', error));
    }
  }

  // Step 4: Show next steps
  console.log(chalk.bold('\n📝 Setup Complete!\n'));
  console.log('Next steps:');
  console.log('1. Add your code snippets to the .grok-memory/ directory as markdown files');
  console.log('2. Run ' + chalk.cyan('grok') + ' to start chatting');
  console.log('3. Use ' + chalk.cyan('/help') + ' in chat mode to see available commands');
  console.log('\nExample knowledge file format:');
  console.log(chalk.dim(`
---
title: Your Code Snippet
tags: [tag1, tag2]
category: Category Name
---

# Your content here
`));
}

async function createExampleEntries(): Promise<void> {
  const knowledgePath = path.join(process.cwd(), '.grok-memory');
  const examples = [
    {
      filename: 'javascript-arrays.md',
      content: `---
title: JavaScript Array Methods
tags: [javascript, arrays, methods]
category: JavaScript
---

# JavaScript Array Methods

Common array methods for data manipulation:

## map()
Transforms each element in an array:
\`\`\`javascript
const doubled = numbers.map(n => n * 2);
\`\`\`

## filter()
Creates a new array with elements that pass a test:
\`\`\`javascript
const evens = numbers.filter(n => n % 2 === 0);
\`\`\`

## reduce()
Reduces an array to a single value:
\`\`\`javascript
const sum = numbers.reduce((acc, n) => acc + n, 0);
\`\`\`

## forEach()
Executes a function for each array element:
\`\`\`javascript
numbers.forEach(n => console.log(n));
\`\`\`

## find()
Returns the first element that matches a condition:
\`\`\`javascript
const found = users.find(user => user.id === targetId);
\`\`\``
    },
    {
      filename: 'python-decorators.md',
      content: `---
title: Python Decorators
tags: [python, decorators, functions]
category: Python
---

# Python Decorators

Decorators are a way to modify or enhance functions without changing their code.

## Basic Decorator
\`\`\`python
def timer(func):
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        print(f"{func.__name__} took {end - start} seconds")
        return result
    return wrapper

@timer
def slow_function():
    time.sleep(1)
\`\`\`

## Decorator with Arguments
\`\`\`python
def repeat(times):
    def decorator(func):
        def wrapper(*args, **kwargs):
            for _ in range(times):
                result = func(*args, **kwargs)
            return result
        return wrapper
    return decorator

@repeat(3)
def greet(name):
    print(f"Hello, {name}!")
\`\`\``
    },
    {
      filename: 'git-commands.md',
      content: `---
title: Essential Git Commands
tags: [git, version-control, commands]
category: Tools
---

# Essential Git Commands

## Basic Commands

### Initialize Repository
\`\`\`bash
git init
\`\`\`

### Clone Repository
\`\`\`bash
git clone <repository-url>
\`\`\`

### Stage Changes
\`\`\`bash
git add .  # Stage all changes
git add <file>  # Stage specific file
\`\`\`

### Commit Changes
\`\`\`bash
git commit -m "Commit message"
git commit -am "Stage and commit"  # For tracked files only
\`\`\`

## Branching

### Create and Switch Branch
\`\`\`bash
git checkout -b <branch-name>
\`\`\`

### Merge Branch
\`\`\`bash
git merge <branch-name>
\`\`\`

### Delete Branch
\`\`\`bash
git branch -d <branch-name>  # Safe delete
git branch -D <branch-name>  # Force delete
\`\`\``
    }
  ];

  for (const example of examples) {
    const filePath = path.join(knowledgePath, example.filename);
    await fs.writeFile(filePath, example.content, 'utf-8');
  }

  console.log(chalk.green('\n✅ Created example knowledge entries:'));
  examples.forEach(ex => console.log(chalk.dim(`   - ${ex.filename}`)));
}