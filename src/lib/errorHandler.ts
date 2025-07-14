import path from 'path';

/**
 * Sanitizes error messages to prevent information leakage
 */
export function sanitizeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'An unexpected error occurred';
  }
  
  let message = error.message;
  
  // Remove absolute paths - replace with relative paths
  const cwd = process.cwd();
  message = message.replace(new RegExp(cwd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '.');
  
  // Remove user home directory references
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  if (homeDir) {
    message = message.replace(new RegExp(homeDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '~');
  }
  
  // Remove sensitive file system information
  message = message.replace(/\/[^/\s]*\/[^/\s]*\/[^/\s]*/g, (match) => {
    // Keep only the last part of deep paths
    const parts = match.split('/');
    return parts.length > 3 ? `/.../${parts[parts.length - 1]}` : match;
  });
  
  // Remove potential API keys or tokens (basic pattern)
  message = message.replace(/[a-zA-Z0-9]{32,}/g, '[REDACTED]');
  
  return message;
}

/**
 * Wraps an async function with error handling
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  customMessage?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const sanitized = sanitizeError(error);
      throw new Error(customMessage || sanitized);
    }
  }) as T;
}