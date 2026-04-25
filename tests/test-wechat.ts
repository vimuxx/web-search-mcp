import { scrapeUrl } from '../src/scrape.js';
import { logToFile } from '../src/utils.js';

async function main() {
  const url = 'https://mp.weixin.qq.com/s/DBvLZPdKo7So0VCkVqIb3w';
  const result = await scrapeUrl(url);

  logToFile(`URL: ${url}`);
  logToFile(`Title: ${result.title}`);
  const lines = result.content.split('\n');
  const firstLines = lines[0];
  const lastLines = lines[lines.length - 1];
  logToFile(`Content: ${firstLines}\n...\n${lastLines}`);

  process.exit(0);
}

main().catch((e) => {
  logToFile(`[ERROR] ${e.message}`);
});
