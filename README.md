# Grok CLI

[![npm version](https://badge.fury.io/js/%40chmghost%2Fgrok-cli.svg)](https://www.npmjs.com/package/@chmghost/grok-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful command-line interface for interacting with Grok AI, featuring natural language file operations, markdown-based knowledge storage, and intelligent code assistance.

## What's New in v1.13.9

- 🆕 **Natural Language File Operations**: Simply describe what you want to change - no commands needed!
- 🔧 **Fixed**: CLI no longer exits after file operations
- 🚫 **Fixed**: Prevents errors when AI suggests non-existent files
- 🛡️ **Improved**: Better validation and error handling

## Features

- 🤖 Interactive chat with Grok AI
- 📚 Markdown-based knowledge base system
- 🔍 Search and organize code snippets
- 🔎 Full codebase indexing and searching
- 💾 Persistent storage of indexed files in `.grok-memory`
- 📁 Automatic context from your project files
- 🔄 Conversation history with context awareness
- 📡 Real-time file watching with auto-update
- ⚡ Custom slash commands
- 🎨 Colorful terminal interface
- 🚀 AI-powered code generation and refactoring
- 🧪 Automatic test generation
- 🔧 Git integration with formatted output
- 🐛 Advanced debugging assistance with error analysis
- 📊 Performance profiling and optimization suggestions
- 🦨 Code smell detection and quality analysis
- ✨ Natural language file operations - no commands needed!

## Installation

### Global Installation (Recommended)

```bash
npm install -g @chmghost/grok-cli
```

### Development Installation

```bash
git clone https://github.com/CHMGhost/grok-cli.git
cd grok-cli
npm install
npm run build
npm link
```

## Quick Start

Run the setup wizard to configure everything at once:

```bash
grok setup
```

This will:
- Configure your Grok API key
- Create the knowledge base directory
- Add example knowledge entries

## Configuration

To update just the API configuration:

```bash
grok config
```

Or create a `.env` file:

```bash
cp .env.example .env
# Edit .env with your API key
```

## Usage

### Interactive Chat Mode (Recommended)

```bash
grok chat
# or just:
grok
```

### Single Question

```bash
grok ask "How do I implement a binary search?"
```

### Natural Language File Operations

In chat mode, you can use natural language to modify, create, or delete files:

```bash
# Modify files
"Change the color scheme to dark theme in my CSS files"
"Update the API endpoint in config.js to use the new server"
"Remove the deprecated functions from utils.js"

# Create files
"Create a new React component called UserProfile"
"Make a boilerplate HTML file in the root directory"
"Generate a test file for my auth module"

# Delete files (with safety confirmations)
"Delete all the temp files"
"Remove the old backup files"
```

Grok will:
- Understand your intent automatically
- Show you what changes will be made
- Display diffs for modifications
- Ask for confirmation before making any changes

## Commands

In chat mode, use these commands:

### Knowledge Base Commands
- `/help` - Show available commands
- `/search <query>` - Search knowledge base
- `/tag <tag>` - Find entries by tag
- `/category <category>` - Find entries by category
- `/list` - List all knowledge entries

### Codebase Commands
- `/index [pattern]` - Index project files (default: all files, auto-starts watching)
- `/codesearch <query>` - Search for code in indexed files
- `/structure` - Show project file structure
- `/files [language]` - List files by programming language
- `/memory` - Show what's stored in Grok's memory
- `/pwd` - Show current working directory
- `/watch` - Start watching for file changes
- `/unwatch` - Stop watching for file changes

### Code Generation Commands
- `/create <file> <description>` - Create new file with AI-generated code
- `/generate <type> <description>` - Generate code (function/class/component/test)
- `/test-gen <file>` - Generate tests for a file
- `/refactor <file> <instruction>` - Refactor code with AI assistance
- `/modify <prompt>` - Modify files based on natural language request

### Git Commands
- `/git status` - Show git status with color formatting
- `/git diff [file]` - Show changes with syntax highlighting
- `/git log [count]` - View commit history
- `/git stash [save/pop/list]` - Manage stashes
- `/commit "message" [files]` - Commit changes
- `/branch [name]` - Create or list branches

### Debugging Commands
- `/debug-error <error>` - Analyze error messages and get fix suggestions
- `/debug-stack <trace>` - Analyze stack traces to find root causes
- `/profile <file>` - Get performance optimization suggestions
- `/smells [file]` - Detect code smells and quality issues

### General Commands
- `/clear` - Clear terminal
- `/exit` - Exit chat

## Code Generation Examples

### Create a new component
```bash
/create src/components/Button.tsx "A reusable button component with primary and secondary variants"
```

### Generate a function
```bash
/generate function "A debounce utility function that delays execution"
```

### Generate tests for existing code
```bash
/test-gen src/utils/helpers.ts
```

### Refactor code
```bash
/refactor src/api/client.ts "Add retry logic with exponential backoff"
```

## Git Integration Examples

### Check repository status
```bash
/git status
```

### Commit changes
```bash
/commit "feat: add user authentication" src/auth/*.ts
```

### Create a new branch
```bash
/branch feature/new-feature
```

## Debugging Examples

### Analyze an error
```bash
/debug-error "TypeError: Cannot read property 'name' of undefined at UserProfile.render (app.js:42:15)"
```

### Analyze a stack trace
```bash
/debug-stack "Error: Connection timeout
  at Socket.onTimeout (net.js:451:8)
  at Socket.emit (events.js:315:20)
  at Socket._onTimeout (net.js:478:8)
  at listOnTimeout (internal/timers.js:549:17)"
```

### Profile performance
```bash
/profile src/utils/dataProcessor.ts
```

### Detect code smells
```bash
/smells  # Analyze entire codebase
/smells src/components/Dashboard.tsx  # Analyze specific file
```

## Knowledge Base

Store code snippets and documentation in markdown files in the `.grok-memory/` directory:

```markdown
---
title: Your Code Snippet
tags: [tag1, tag2]
category: Category Name
---

# Content here

Your code and explanations...
```

## Security Considerations

### API Key Security
- **Never commit your API key**: Always use environment variables or the config command
- The API key is stored locally in `~/.grok-cli/config.json`
- Use `.env` files for development (already in `.gitignore`)

### Data Privacy
- All indexed code is stored locally in `.grok-memory/`
- No code is sent to external services unless you explicitly ask questions about it
- The `.grok-memory/` directory is excluded from git by default

### Ignore Patterns
- Sensitive files are automatically excluded from indexing
- You can add custom ignore patterns during setup or in your config
- The indexer respects `.gitignore` patterns

## Development

```bash
npm run dev    # Run in development mode
npm run build  # Build for production
npm run lint   # Run linter
npm run typecheck  # Type checking
```