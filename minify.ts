import { minify } from 'terser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, 'dist');
const JS_EXT = '.js';
const DTS_EXT = '.d.ts';

type MinifyOptions = Parameters<typeof minify>[0];

async function minifyFile(filePath: string): Promise<void> {
  const content = fs.readFileSync(filePath, 'utf8');

  const options: MinifyOptions = {
    compress: {
      drop_console: false,
      drop_debugger: true,
      unused: true,
      dead_code: true,
      conditionals: true,
      comparisons: true,
      evaluate: true,
      booleans: true,
      loops: true,
      toplevel: true,
      sequences: true,
      properties: true,
      reduce_funcs: true,
      reduce_vars: true,
      join_vars: true,
      collapse_vars: true,
      inline: true,
      warnings: false
    },
    mangle: {
      properties: { regex: /^_/ },
      toplevel: true,
      reserved: ['Server', 'stdio', 'CallToolRequestSchema', 'ListToolsRequestSchema']
    },
    format: {
      comments: false,
      semicolons: false,
      braces: true,
      ascii_only: true,
      preserve_annotations: false
    }
  };

  const result = await minify(content, options);

  if (result.code) {
    // Add shebang for index.js
    if (filePath.endsWith('index.js')) {
      result.code = '#!/usr/bin/env node\n' + result.code;
    }
    fs.writeFileSync(filePath, result.code, 'utf8');
    console.log(`Minified: ${filePath}`);
  }
}

async function minifyDirectory(dir: string): Promise<void> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });

  const jsFiles = entries
    .filter(e => e.isFile() && e.name.endsWith(JS_EXT) && !e.name.endsWith(DTS_EXT))
    .map(e => path.join(dir, e.name));

  await Promise.all(jsFiles.map(f => minifyFile(f)));
}

await minifyDirectory(DIST_DIR);
console.log('Minification complete');
