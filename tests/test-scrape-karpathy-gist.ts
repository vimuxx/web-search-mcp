import { scrapeUrl } from '../src/scrape.js';

async function test() {
  const url = 'https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f';
  const result = await scrapeUrl(url);

  console.error(`URL: ${url}`);
  console.error(`Title: ${result.title}`);
  const lines = result.content.split('\n').filter(line => line.trim());
  const firstLines = lines[0];
  const lastLines = lines[lines.length - 1];
  console.error(`Content: ${firstLines}\n...\n${lastLines}`);

  process.exit(0);
}

test();
