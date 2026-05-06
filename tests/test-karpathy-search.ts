import { search } from '../src/search.js';

async function test() {
  const { results, engine } = await search({ query: 'karpathy llm wiki' });
  console.error(`Winner: ${engine}`);

  results.forEach((r, i) => {
    console.error(`${i + 1}. ${r.title}`);
    console.error(`   ${r.url}`);
  });

  process.exit(0);
}

test();
