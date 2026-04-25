import { search } from '../src/search.js';
import { logToFile } from '../src/utils.js';

async function main() {
  const { results, engine } = await search({ query: 'karpathy llm wiki' });
  logToFile(`Winner: ${engine}`);

  results.forEach((r, i) => {
    logToFile(`${i + 1}. ${r.title}`);
    logToFile(`   ${r.url}`);
  });

  process.exit(0);
}

main().catch((e) => {
  logToFile(`[ERROR] ${e.message}`);
});
