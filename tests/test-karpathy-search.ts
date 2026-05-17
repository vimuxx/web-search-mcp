import { search } from '../src/search.js';

async function test() {
  const { results, engine } = await search({ query: 'karpathy llm wiki' });
  console.error(`Engine: ${engine}`);
  console.error(`Results: ${results.length}`);

  results.forEach((r, i) => {
    console.error(`  ${i + 1}. ${r.title}`);
    console.error(`     ${r.url}`);
  });

  if (results.length === 0) {
    console.error('FAIL: no results returned');
    process.exit(1);
  }
}

test();
