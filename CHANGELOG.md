# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.13.9] - 2025-07-21

### Fixed
- Fixed error when AI suggests modifying non-existent files (like about.html)
- Added validation to skip files that don't exist in the project
- Updated AI prompts to only suggest changes to existing files
- Added double-check before file modifications to prevent ENOENT errors

### Changed
- Improved error handling in parseModificationPlan to filter out non-existent files
- Enhanced user feedback when files are skipped during modifications

## [1.13.8] - 2025-07-21

### Changed
- Version bump for consistency

## [1.13.7] - 2025-07-21

### Fixed
- **PROPERLY FIXED** CLI exiting after file operations in interactive mode
- Root cause: inquirer prompts were conflicting with readline interface
- Implemented safeInquirerPrompt helper to properly manage readline state
- File operations now correctly return to interactive prompt

### Changed
- All inquirer prompts in file operations now use safe wrapper
- Improved readline state management during confirmation dialogs
- Removed problematic mute/unmute calls

## [1.13.6] - 2025-07-21

### Fixed
- Identified root cause of CLI exiting after file operations
- Issue was due to using `grok ask` command instead of `grok chat`
- `ask` command is designed for single operations and exits after completion

### Changed
- Updated file operation responses to guide users to use interactive mode
- Added helpful message when file operations complete in ask mode

## [1.13.5] - 2025-07-21

### Fixed
- Attempted fix for CLI exiting after file operations
- Changed file operations to return success indicator instead of empty string
- Ensured readline prompt always returns after processing

### Known Issues
- CLI still exits after file operations (investigating root cause)

## [1.13.4] - 2025-07-20

### Fixed
- Improved fix for stray "y" inputs after file operations
- Removed time-based detection in favor of direct filtering

### Changed
- Single character y/n/Y/N inputs are now always ignored as likely stray confirmations
- Simplified input handling without timing dependencies

## [1.13.3] - 2025-07-20

### Fixed
- Fixed issue where typing "y" after file operations would be processed as a new question
- Added protection against accidental confirmation inputs (y/yes/n/no/ok) after operations

### Added
- 2-second cooldown period after file operations to ignore stray confirmation inputs
- User feedback when confirmation inputs are ignored

## [1.13.2] - 2025-07-20

### Fixed
- Fixed file operation errors being sent to Grok API as questions
- Improved intent detection for file content modifications (e.g., "Remove section from file")
- Fixed interactive mode treating file operation errors as conversation messages
- Better error handling with clear guidance when files aren't specified

### Changed
- Enhanced file finding logic to search for mentioned content
- Added special error markers to prevent errors from entering chat flow
- Improved distinction between content removal (modify) vs file deletion (delete)

## [1.13.1] - 2025-07-20

### Fixed
- Fixed prompt breaking after file operations complete
- Improved file creation handling when Grok returns instructions instead of JSON
- Enhanced AI intent detection to not misclassify "Can you create..." as questions

### Changed
- Improved styling for file operation prompts with better visual hierarchy
- Added icons and color coding for different operations (📄 create, ✏️ modify, 🗑️ delete)
- Enhanced diff preview with syntax highlighting
- Better success/failure messaging with counts
- Cleaner output formatting to prevent terminal issues

## [1.13.0] - 2025-07-20

### Added
- Natural language file operations - no commands needed!
  - Automatically detects when users want to modify, create, or delete files
  - Shows diffs and previews before making any changes
  - Requires user confirmation for all operations
  - Double confirmation for file deletions for safety
- File modification features:
  - Natural language requests like "change colors to dark theme"
  - Git-style diff display for reviewing changes
  - Batch modifications across multiple files
- File creation features:
  - Create files with "create a new component called X"
  - Preview file content before creation
  - Automatic language detection
- File deletion features:
  - Safe deletion with "remove unused files"
  - Shows reasons for each file deletion
  - Double confirmation to prevent accidents
- Enhanced `/modify` command (still available but no longer required)
- Comprehensive natural language pattern detection
- Integration with existing indexing and file watching systems

### Changed
- Command handler now intelligently routes natural language requests
- Improved user experience with conversational interactions
- Updated help documentation to reflect natural language capabilities

## [1.12.1] - 2025-07-16

### Fixed
- Updated GitHub repository URLs to correct username (CHMGhost)
- Fixed repository, bugs, and homepage URLs in package.json

## [1.12.0] - 2025-07-16

### Added
- Comprehensive debugging assistance features:
  - `/debug-error <error>` - Analyze errors with AI-powered fix suggestions
  - `/debug-stack <trace>` - Stack trace analysis with root cause identification
  - `/profile <file>` - Performance profiling to find bottlenecks
  - `/smells [file]` - Code smell detection with severity ratings
- DebugAssistant class with intelligent code analysis
- Error context extraction with surrounding code
- Performance issue detection (O(n²) loops, memory leaks, inefficient algorithms)
- Code smell categories: long functions, deep nesting, duplicate code, complex conditionals
- Severity-based reporting (high/medium/low) for issues

### Changed
- Enhanced help command with new Debugging Assistance section

## [1.11.0] - 2025-07-14

### Added
- Code generation capabilities with AI-powered code creation
- `/create <file> <description>` - Create new files with generated code
- `/generate <type> <description>` - Generate code snippets (function/class/component/test)
- `/test-gen <file>` - Generate comprehensive tests for existing files
- `/refactor <file> <instruction>` - AI-powered code refactoring
- Git integration commands:
  - `/git status` - Show git status with color formatting
  - `/git diff [file]` - Show changes with syntax highlighting
  - `/git log [count]` - View commit history
  - `/git stash [save/pop/list]` - Manage stashes
  - `/commit "message" [files]` - Commit changes
  - `/branch [name]` - Create or list branches
- CodeModifier class for future code modification features
- Project analysis for better code generation context

### Changed
- Enhanced help command with categorized command listing
- Improved project type detection for code generation

## [1.10.1] - 2024-07-13

### Added
- Retry logic for network timeouts (3 retries with 2s delay)
- `/test` command to check API connectivity
- Better error messages for network issues
- Support for .grok file queries

### Fixed
- ETIMEDOUT network errors with automatic retry
- Increased timeout to 120 seconds for slow connections
- Improved file detection for stored .grok files

### Changed
- More descriptive error messages for connection issues

## [1.10.0] - 2024-07-13

### Added
- Smart context selection for large codebases to prevent timeouts
- Project overview generation for analysis queries
- Code modification capabilities framework
- Improved prompts for UX and code improvement suggestions

### Fixed
- Timeout issues with large codebases (95+ files)
- Context length limits to stay within API constraints

### Changed
- Analysis queries now provide focused project overviews instead of all files
- Maximum context length limited to 10KB by default

## [1.9.3] - 2024-07-13

### Fixed
- Dynamic version reading from package.json instead of hardcoded "1.0.0"
- Version manager now uses dynamic default version
- Fixed version display in CLI

## [1.9.2] - 2024-07-13

### Fixed
- Increased API timeout from 30s to 60s
- Improved README query detection
- Added debug logging for troubleshooting

## [1.8.2] - 2024-07-13

### Added
- Security documentation (SECURITY.md)
- Contributing guidelines (CONTRIBUTING.md)
- Code of Conduct (CODE_OF_CONDUCT.md)
- Comprehensive .gitignore patterns
- .npmignore for npm publishing
- Repository metadata in package.json

### Security
- Enhanced documentation for API key handling
- Added security considerations to README

## [1.8.1] - 2024-07-13

### Fixed
- Improved Ctrl+C handling to properly cancel queries without exiting
- Implemented double Ctrl+C pattern (once to cancel, twice to exit)

### Changed
- Better visual feedback for cancelled requests

## [1.8.0] - 2024-07-13

### Added
- Query cancellation with Ctrl+C
- Request timeout (30 seconds)
- AbortController implementation for proper request cancellation

## [1.7.1] - 2024-07-13

### Added
- `/verify` command to check index consistency
- `/repair` command to fix index inconsistencies
- Better index count verification

### Fixed
- Index count mismatch issues
- Orphaned files in .grok-memory

## [1.7.0] - 2024-07-13

### Added
- Language-agnostic project detection
- Support for 50+ programming languages
- Dynamic project type detection
- Configurable ignore patterns

### Changed
- Made version manager support non-Node.js projects
- Improved language detection system

## [1.6.0] - 2024-07-13

### Added
- Markdown rendering for better output readability
- marked and marked-terminal dependencies

### Fixed
- Raw markdown display issue

## [1.5.0] - 2024-07-12

### Added
- Real-time file watching with auto-indexing
- `/watch` and `/unwatch` commands
- Persistent file storage in .grok-memory
- Automatic file updates on changes

## [1.4.0] - 2024-07-12

### Added
- Tab autocomplete for commands
- Better command suggestions

## [1.3.0] - 2024-07-12

### Added
- Conversation history persistence
- Context-aware responses
- Auto-save functionality

## [1.2.0] - 2024-07-12

### Added
- Full codebase indexing
- `/index`, `/codesearch`, `/structure`, `/files` commands
- Project context awareness

## [1.1.0] - 2024-07-12

### Added
- Interactive chat mode
- Slash commands support
- Colorful terminal interface

## [1.0.0] - 2024-07-12

### Added
- Initial release
- Basic Grok API integration
- Markdown-based knowledge storage
- Setup wizard
- Configuration management