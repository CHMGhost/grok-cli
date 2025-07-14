# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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