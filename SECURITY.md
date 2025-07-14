# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.8.x   | :white_check_mark: |
| < 1.8   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Grok CLI, please report it through one of the following channels:

1. **Email**: security@[yourdomain].com
2. **GitHub Security Advisories**: Use the "Security" tab in this repository

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Security Best Practices

When using Grok CLI:

1. **Never share your API key**: Your Grok API key should be kept confidential
2. **Use environment variables**: Store sensitive data in `.env` files, not in code
3. **Review indexed files**: Be aware of what files are being indexed and sent to the API
4. **Custom ignore patterns**: Add sensitive file patterns to your ignore list
5. **Local storage**: All indexed data is stored locally in `.grok-memory/`

## Known Security Considerations

- API keys are stored in plaintext in `~/.grok-cli/config.json` (user-readable only)
- Indexed code content is sent to the Grok API when asking questions
- File watching may index new files automatically if enabled

## Response Time

We aim to respond to security reports within 48 hours and provide a fix within 7 days for critical vulnerabilities.