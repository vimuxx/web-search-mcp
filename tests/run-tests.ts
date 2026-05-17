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

const TIMEOUT_MS = 30_000;

async function runTest(test: Test, index: number, total: number): Promise<'pass' | 'fail'> {
  const progress = `${index}/${total}`;
  console.error(`\n=== ${progress} ${test.name} ===`);
  try {
    execSync(test.command, { timeout: TIMEOUT_MS });
    console.error(`PASS ${test.name}`);
    return 'pass';
  } catch (e) {
    if (e && typeof e === 'object' && 'signal' in e && e.signal === 'SIGTERM') {
      console.error(`FAIL ${test.name} (timeout >${TIMEOUT_MS}ms)`);
    } else {
      console.error(`FAIL ${test.name}: ${e && typeof e === 'object' && 'message' in e ? e.message : String(e)}`);
    }
    return 'fail';
  }
}

async function test(): Promise<void> {
  console.error('========== TEST BEGIN ==========\n\n');

  const results: Array<'pass' | 'fail'> = [];
  for (let i = 0; i < tests.length; i++) {
    results.push(await runTest(tests[i], i + 1, tests.length));
  }

  const passed = results.filter(r => r === 'pass').length;
  const failed = results.filter(r => r === 'fail').length;

  console.error(`\n========== RESULTS: ${passed} passed, ${failed} failed ==========\n`);
  if (failed > 0) process.exit(1);
}

test();
