import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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
  const progress = `${index}/${total}`;
  console.error(`=== ${progress} ${test.name} ===`);
  const output = execSync(test.command, { encoding: 'utf8' });
  console.error(output);
  return true;
}

async function test() {
  console.error('========== TEST BEGIN ==========\n\n');

  for (let i = 0; i < tests.length; i++) {
    await runTest(tests[i], i + 1, tests.length);
  }

  console.error('\n========== TEST END ==========\n');
}

test();
