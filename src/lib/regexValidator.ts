/**
 * Validates regex patterns to prevent ReDoS attacks
 */
export function isRegexSafe(pattern: string): boolean {
  // Check for dangerous patterns that could cause exponential backtracking
  const dangerousPatterns = [
    /(\+|\*){2,}/, // Nested quantifiers like ++, **
    /\([^)]*\)\{[0-9]{3,}\}/, // Large repetition counts
    /\([^)]*\+\)[+*]/, // Nested quantifiers with groups
    /\[[^\]]*\]\{[0-9]{3,}\}/, // Large repetition on character classes
  ];
  
  return !dangerousPatterns.some(dangerous => dangerous.test(pattern));
}

/**
 * Limits regex execution time
 */
export async function safeRegexTest(pattern: string, text: string, timeoutMs: number = 100): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    try {
      const regex = new RegExp(pattern);
      const result = regex.test(text);
      
      // Check if it took too long
      if (Date.now() - startTime > timeoutMs) {
        console.warn(`Regex took too long: ${pattern}`);
        resolve(false);
      } else {
        resolve(result);
      }
    } catch {
      resolve(false);
    }
  });
}