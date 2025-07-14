# Contributing to Grok CLI

Thank you for your interest in contributing to Grok CLI! This document provides guidelines for contributing to the project.

## Code of Conduct

Please note that this project is released with a [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Your environment (OS, Node.js version, etc.)
- Any relevant logs or error messages

### Suggesting Enhancements

Enhancement suggestions are welcome! Please include:

- A clear and descriptive title
- Detailed description of the proposed feature
- Use cases for the feature
- Any potential drawbacks or considerations

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting:
   ```bash
   npm run typecheck
   npm run lint
   npm run build
   ```
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/grok-cli.git
cd grok-cli

# Install dependencies
npm install

# Run in development mode
npm run dev
```

## Coding Standards

- Use TypeScript for all new code
- Follow the existing code style
- Add types for all function parameters and return values
- Write descriptive commit messages
- Add comments for complex logic
- Update documentation as needed

## Testing

- Test your changes thoroughly
- Ensure all commands work as expected
- Test edge cases and error handling
- Verify the indexing functionality with different project types

## Documentation

- Update the README.md if adding new features
- Add JSDoc comments to new functions
- Update the `/help` command if adding new commands

## Release Process

Maintainers will:
1. Review and merge PRs
2. Update version numbers following semver
3. Update CHANGELOG.md
4. Create GitHub releases
5. Publish to npm (if applicable)

## Questions?

Feel free to open an issue for any questions about contributing!