import { scrapeUrl } from '../src/scrape.js';

async function test() {
  const url = 'https://ai-bot.cn/llm-wiki/';
  const result = await scrapeUrl(url);

  console.error(`URL: ${url}`);
  console.error(`Title: ${result.title}`);
  const lines = result.content.split('\n');
  console.error(`Content lines: ${lines.length}`);
  if (lines.length > 0) {
    console.error(`  First: ${lines[0]}`);
    console.error(`  Last:  ${lines[lines.length - 1]}`);
  }

  if (!result.success) {
    console.error(`FAIL: ${result.error}`);
    process.exit(1);
  }
  if (result.content.trim().length === 0) {
    console.error('FAIL: empty content');
    process.exit(1);
  }
}

test();
