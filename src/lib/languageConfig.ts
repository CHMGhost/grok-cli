export interface ProjectTypeDetector {
  detect: (files: Array<{relativePath: string, content: string}>) => boolean;
  projectType: string;
  mainTechnology: string;
  packageManager?: string;
}

export const languageExtensions: Record<string, string> = {
  // JavaScript/TypeScript
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.d.ts': 'typescript',
  
  // Python
  '.py': 'python',
  '.pyw': 'python',
  '.pyx': 'python',
  '.pyi': 'python',
  '.pyc': 'python',
  
  // Java/Kotlin
  '.java': 'java',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  
  // C/C++
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.hpp': 'cpp',
  '.hh': 'cpp',
  '.hxx': 'cpp',
  
  // C#
  '.cs': 'csharp',
  '.csx': 'csharp',
  
  // Go
  '.go': 'go',
  
  // Rust
  '.rs': 'rust',
  
  // Ruby
  '.rb': 'ruby',
  '.erb': 'ruby',
  '.rake': 'ruby',
  
  // PHP
  '.php': 'php',
  '.phtml': 'php',
  '.php3': 'php',
  '.php4': 'php',
  '.php5': 'php',
  '.php7': 'php',
  '.phps': 'php',
  
  // Swift
  '.swift': 'swift',
  
  // Objective-C
  '.m': 'objective-c',
  '.mm': 'objective-c',
  
  // Scala
  '.scala': 'scala',
  '.sc': 'scala',
  
  // R
  '.r': 'r',
  '.R': 'r',
  '.rmd': 'r',
  '.Rmd': 'r',
  
  // Julia
  '.jl': 'julia',
  
  // Dart
  '.dart': 'dart',
  
  // Lua
  '.lua': 'lua',
  
  // Perl
  '.pl': 'perl',
  '.pm': 'perl',
  '.pod': 'perl',
  
  // Shell
  '.sh': 'shell',
  '.bash': 'bash',
  '.zsh': 'zsh',
  '.fish': 'fish',
  '.ps1': 'powershell',
  '.psm1': 'powershell',
  '.psd1': 'powershell',
  
  // Web
  '.html': 'html',
  '.htm': 'html',
  '.xhtml': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',
  '.styl': 'stylus',
  
  // Data/Config
  '.json': 'json',
  '.jsonc': 'json',
  '.json5': 'json',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.ini': 'ini',
  '.cfg': 'ini',
  '.conf': 'conf',
  '.properties': 'properties',
  
  // Documentation
  '.md': 'markdown',
  '.markdown': 'markdown',
  '.mdown': 'markdown',
  '.mkd': 'markdown',
  '.mdx': 'markdown',
  '.rst': 'rst',
  '.tex': 'latex',
  '.latex': 'latex',
  
  // SQL
  '.sql': 'sql',
  
  // Vue
  '.vue': 'vue',
  
  // Svelte
  '.svelte': 'svelte',
  
  // Other
  '.dockerfile': 'dockerfile',
  '.makefile': 'makefile',
  '.mk': 'makefile',
  '.cmake': 'cmake'
};

export const projectDetectors: ProjectTypeDetector[] = [
  // Node.js Projects
  {
    detect: (files) => files.some(f => f.relativePath === 'package.json'),
    projectType: 'Node.js application',
    mainTechnology: 'Node.js',
    packageManager: 'npm'
  },
  
  // Python Projects
  {
    detect: (files) => files.some(f => f.relativePath === 'requirements.txt'),
    projectType: 'Python application',
    mainTechnology: 'Python',
    packageManager: 'pip'
  },
  {
    detect: (files) => files.some(f => f.relativePath === 'Pipfile'),
    projectType: 'Python application',
    mainTechnology: 'Python',
    packageManager: 'pipenv'
  },
  {
    detect: (files) => files.some(f => f.relativePath === 'pyproject.toml'),
    projectType: 'Python application',
    mainTechnology: 'Python',
    packageManager: 'poetry'
  },
  {
    detect: (files) => files.some(f => f.relativePath === 'setup.py'),
    projectType: 'Python package',
    mainTechnology: 'Python',
    packageManager: 'pip'
  },
  
  // Java Projects
  {
    detect: (files) => files.some(f => f.relativePath === 'pom.xml'),
    projectType: 'Java application',
    mainTechnology: 'Java',
    packageManager: 'maven'
  },
  {
    detect: (files) => files.some(f => f.relativePath === 'build.gradle' || f.relativePath === 'build.gradle.kts'),
    projectType: 'Java/Kotlin application',
    mainTechnology: 'Java/Kotlin',
    packageManager: 'gradle'
  },
  
  // C# Projects
  {
    detect: (files) => files.some(f => f.relativePath.endsWith('.csproj') || f.relativePath.endsWith('.sln')),
    projectType: '.NET application',
    mainTechnology: 'C#/.NET',
    packageManager: 'nuget'
  },
  
  // Go Projects
  {
    detect: (files) => files.some(f => f.relativePath === 'go.mod'),
    projectType: 'Go application',
    mainTechnology: 'Go',
    packageManager: 'go modules'
  },
  
  // Rust Projects
  {
    detect: (files) => files.some(f => f.relativePath === 'Cargo.toml'),
    projectType: 'Rust application',
    mainTechnology: 'Rust',
    packageManager: 'cargo'
  },
  
  // Ruby Projects
  {
    detect: (files) => files.some(f => f.relativePath === 'Gemfile'),
    projectType: 'Ruby application',
    mainTechnology: 'Ruby',
    packageManager: 'bundler'
  },
  
  // PHP Projects
  {
    detect: (files) => files.some(f => f.relativePath === 'composer.json'),
    projectType: 'PHP application',
    mainTechnology: 'PHP',
    packageManager: 'composer'
  },
  
  // Swift Projects
  {
    detect: (files) => files.some(f => f.relativePath === 'Package.swift'),
    projectType: 'Swift application',
    mainTechnology: 'Swift',
    packageManager: 'swift package manager'
  },
  
  // Dart/Flutter Projects
  {
    detect: (files) => files.some(f => f.relativePath === 'pubspec.yaml'),
    projectType: 'Dart/Flutter application',
    mainTechnology: 'Dart',
    packageManager: 'pub'
  },
  
  // C/C++ Projects
  {
    detect: (files) => files.some(f => f.relativePath === 'CMakeLists.txt'),
    projectType: 'C/C++ application',
    mainTechnology: 'C/C++',
    packageManager: 'cmake'
  },
  {
    detect: (files) => files.some(f => f.relativePath === 'Makefile' || f.relativePath === 'makefile'),
    projectType: 'C/C++ application',
    mainTechnology: 'C/C++',
    packageManager: 'make'
  }
];

// Language-agnostic ignore patterns
export const defaultIgnorePatterns = [
  // Version control
  '.git/**',
  '.svn/**',
  '.hg/**',
  
  // Dependencies (various languages)
  'node_modules/**',
  'vendor/**',
  'target/**',
  'dist/**',
  'build/**',
  'out/**',
  'bin/**',
  'obj/**',
  '.bundle/**',
  'packages/**',
  'bower_components/**',
  
  // Python
  '__pycache__/**',
  '*.pyc',
  '.venv/**',
  'venv/**',
  'env/**',
  '.env/**',
  '*.egg-info/**',
  '.pytest_cache/**',
  
  // Java/Kotlin
  '*.class',
  '.gradle/**',
  '.idea/**',
  '*.iml',
  
  // .NET
  '*.dll',
  '*.exe',
  '*.pdb',
  '.vs/**',
  
  // IDE/Editor
  '.vscode/**',
  '.idea/**',
  '*.swp',
  '*.swo',
  '*~',
  '.DS_Store',
  'Thumbs.db',
  
  // Logs and temp files
  '*.log',
  '*.tmp',
  '*.temp',
  '*.cache',
  
  // Lock files
  '*.lock',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'Gemfile.lock',
  'composer.lock',
  'Cargo.lock',
  
  // Coverage
  'coverage/**',
  '.coverage',
  'htmlcov/**',
  '.nyc_output/**',
  
  // Minified files
  '*.min.js',
  '*.min.css',
  
  // Large files
  '*.zip',
  '*.tar',
  '*.gz',
  '*.rar',
  '*.7z',
  
  // Binary files
  '*.jpg',
  '*.jpeg',
  '*.png',
  '*.gif',
  '*.ico',
  '*.pdf',
  '*.doc',
  '*.docx',
  
  // Grok specific
  '.grok-memory/**'
];

// Framework detectors for Node.js projects
export function detectNodeFramework(packageJsonContent: string): string {
  const content = packageJsonContent.toLowerCase();
  
  // CLI frameworks
  if (content.includes('"commander"') || content.includes('"yargs"') || content.includes('"inquirer"')) {
    return 'CLI application';
  }
  
  // Web frameworks
  if (content.includes('"express"') || content.includes('"fastify"') || content.includes('"koa"') || content.includes('"hapi"')) {
    return 'Web server';
  }
  
  // Frontend frameworks
  if (content.includes('"react"')) return 'React application';
  if (content.includes('"vue"')) return 'Vue application';
  if (content.includes('"@angular/core"')) return 'Angular application';
  if (content.includes('"svelte"')) return 'Svelte application';
  
  // Testing frameworks
  if (content.includes('"jest"') || content.includes('"mocha"') || content.includes('"vitest"')) {
    return 'Node.js application with tests';
  }
  
  // Build tools
  if (content.includes('"webpack"') || content.includes('"vite"') || content.includes('"parcel"')) {
    return 'Bundled JavaScript application';
  }
  
  return 'Node.js application';
}