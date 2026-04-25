import { scrapeUrl } from '../src/scrape.js';
import { logToFile } from '../src/utils.js';

async function test() {
  const url = 'https://ai-bot.cn/llm-wiki/';
  const result = await scrapeUrl(url);

  logToFile(`URL: ${url}`);
  logToFile(`Title: ${result.title}`);
  const lines = result.content.split('\n');
  const firstLines = lines[0];
  const lastLines = lines[lines.length - 1];
  logToFile(`Content: ${firstLines}\n...\n${lastLines}`);

  process.exit(0);
}

test().catch((e) => {
  logToFile(`[ERROR] ${e.message}`);
});
