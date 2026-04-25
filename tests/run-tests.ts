import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { LOG_FILE, logToFile } from '../src/utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Test {
  name: string;
  command: string;
}

const tests: Test[] = [
  { name: 'Query: karpathy llm wiki (proxy)', command: `HTTPS_PROXY=http://127.0.0.1:10809 tsx ${join(__dirname, 'test-karpathy-search.ts')}` },
  { name: 'Query: karpathy llm wiki', command: `tsx ${join(__dirname, 'test-karpathy-search.ts')}` },
  { name: 'Gist content scraping (proxy)', command: `HTTPS_PROXY=http://127.0.0.1:10809 tsx ${join(__dirname, 'test-scrape-karpathy-gist.ts')}` },
  { name: 'WordPress content scraping', command: `tsx ${join(__dirname, 'test-wordpress.ts')}` },
  { name: 'WeChat content scraping', command: `tsx ${join(__dirname, 'test-wechat.ts')}` },
];

async function runTest(test: Test, index: number, total: number): Promise<boolean> {
  try {
    const progress = `${index}/${total}`;
    logToFile(`=== ${progress} ${test.name} ===`);
    const output = execSync(test.command, { encoding: 'utf8' });
    logToFile(output);
    return true;
  } catch (e: any) {
    logToFile(`[FAIL] ${test.name}: ${e.message}\n`);
    return false;
  }
}

async function main() {
  logToFile('========== TEST BEGIN ==========\n\n');

  const results: boolean[] = [];
  for (let i = 0; i < tests.length; i++) {
    const passed = await runTest(tests[i], i + 1, tests.length);
    results.push(passed);
  }

  logToFile('\n========== TEST END ==========\n');
}

main().catch((e) => {
  logToFile(`[ERROR] ${e.message}\n`);
});
