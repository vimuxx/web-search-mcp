import { scrapeUrl } from '../src/scrape.js';

async function test() {
  const url = 'https://ai-bot.cn/llm-wiki/';
  const result = await scrapeUrl(url);

  console.error(`URL: ${url}`);
  console.error(`Title: ${result.title}`);
  const lines = result.content.split('\n');
  const firstLines = lines[0];
  const lastLines = lines[lines.length - 1];
  console.error(`Content: ${firstLines}\n...\n${lastLines}`);

  process.exit(0);
}

test();
