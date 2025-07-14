import path from 'path';

/**
 * Validates that a path is safe and within the allowed directory
 * Prevents path traversal attacks
 */
export function isPathSafe(basePath: string, targetPath: string): boolean {
  // Resolve both paths to absolute paths
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(basePath, targetPath);
  
  // Check if the resolved target is within the base path
  return resolvedTarget.startsWith(resolvedBase + path.sep) || 
         resolvedTarget === resolvedBase;
}

/**
 * Validates that a file path doesn't contain dangerous patterns
 */
export function validateFilePath(filePath: string): boolean {
  // Check for null bytes
  if (filePath.includes('\0')) {
    return false;
  }
  
  // Check for dangerous patterns
  const dangerousPatterns = [
    /\.\.\//, // Parent directory traversal
    /\.\.\\/, // Windows parent directory traversal
    /^\//, // Absolute paths on Unix
    /^[a-zA-Z]:/, // Absolute paths on Windows
    /[\x00-\x1f\x7f-\x9f]/, // Control characters
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(filePath));
}

/**
 * Sanitizes a file path by removing dangerous characters
 */
export function sanitizePath(filePath: string): string {
  return filePath
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[<>:"|?*]/g, '') // Remove invalid filename characters
    .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
    .replace(/\/{2,}/g, '/') // Replace multiple slashes with single
    .replace(/\\/g, '/'); // Normalize path separators
}

/**
 * Validates file size to prevent memory exhaustion
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB default limit

export function isFileSizeValid(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}