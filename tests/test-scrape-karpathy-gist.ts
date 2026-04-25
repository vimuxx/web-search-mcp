import { scrapeUrl } from '../src/scrape.js';
import { logToFile } from '../src/utils.js';

async function test() {
  const url = 'https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f';
  const result = await scrapeUrl(url);

  logToFile(`URL: ${url}`);
  logToFile(`Title: ${result.title}`);
  const lines = result.content.split('\n').filter(line => line.trim());
  const firstLines = lines[0];
  const lastLines = lines[lines.length - 1];
  logToFile(`Content: ${firstLines}\n...\n${lastLines}`);

  process.exit(0);
}

test().catch((e) => {
  logToFile(`[ERROR] ${e.message}`);
});
