import { minify } from 'terser';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, 'dist');

type MinifyOptions = Parameters<typeof minify>[0];

const minifyOptions: MinifyOptions = {
  compress: {
    drop_debugger: true,
    toplevel: true,
  },
  mangle: {
    toplevel: true,
    reserved: ['Server', 'stdio', 'CallToolRequestSchema', 'ListToolsRequestSchema'],
  },
  format: {
    comments: false,
    semicolons: false,
    braces: true,
    ascii_only: true,
  },
};

async function minifyFile(filePath: string): Promise<void> {
  const content = await fs.readFile(filePath, 'utf8');

  const result = await minify(content, minifyOptions);

  if (result.code) {
    // Add shebang for index.js
    if (filePath.endsWith('index.js')) {
      result.code = '#!/usr/bin/env node\n' + result.code;
    }
    await fs.writeFile(filePath, result.code, 'utf8');
    console.log(`Minified: ${filePath}`);
  }
}

async function minifyDirectory(dir: string): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  const jsFiles = entries
    .filter(e => e.isFile() && e.name.endsWith('.js'))
    .map(e => path.join(dir, e.name));

  await Promise.all(jsFiles.map(f => minifyFile(f)));
}

await minifyDirectory(DIST_DIR);
console.log('Minification complete');
