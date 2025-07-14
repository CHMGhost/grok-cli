# Grok CLI

A command-line interface for interacting with Grok AI, featuring markdown-based knowledge storage and custom commands.

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

## Installation

```bash
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

### Interactive Chat Mode

```bash
grok chat
```

### Single Question

```bash
grok ask "How do I implement a binary search?"
```

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

### General Commands
- `/clear` - Clear terminal
- `/exit` - Exit chat

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