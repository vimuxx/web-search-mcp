import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import { decodeRedirect, fetchHtml, isNonTargetUrl, cleanupTitle, type SearchHit, type SearchOptions } from './utils.js';

export type { SearchHit, SearchOptions };

const SEARCH_ENGINES = {
  bing: {
    name: 'Bing',
    url: (query: string) => `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
    parseResults: (html: string): SearchHit[] => {
      const $ = cheerio.load(html);
      const results: SearchHit[] = [];

      $('li.b_algo').each((i: number, elem: AnyNode) => {
        const link = $(elem).find('h2 a').first();
        const href = link.attr('href');
        if (!href) return;

        let actualUrl = decodeRedirect(href);
        if (isNonTargetUrl(actualUrl)) return;

        let title = link.text().trim();
        if (title.length < 3) return;

        const snippet = $(elem).find('p').first().text().trim();

        results.push({ title: cleanupTitle(title), url: actualUrl, snippet });
      });

      return results;
    },
  },
  duckDuckGo: {
    name: 'DuckDuckGo',
    url: (query: string) => `https://html.duckduckgo.com/html?q=${encodeURIComponent(query)}`,
    parseResults: (html: string): SearchHit[] => {
      const $ = cheerio.load(html);
      const results: SearchHit[] = [];

      $('a.result__a').each((i: number, elem: AnyNode) => {
        const href = $(elem).attr('href');
        if (!href) return;

        let actualUrl = href;
        try {
          if (href.startsWith('//')) {
            actualUrl = 'https:' + href;
          }
          actualUrl = decodeRedirect(actualUrl);
        } catch {}

        if (isNonTargetUrl(actualUrl)) return;

        const snippet = $(elem).next('a.result__snippet').text().trim();

        const title = cleanupTitle($(elem).text().trim());
        if (title.length < 3) return;

        if (snippet.length > 0) {
          results.push({ title, url: actualUrl, snippet });
        } else {
          results.push({ title, url: actualUrl, snippet: '' });
        }
      });

      return results;
    },
  },
};

function runSearch(name: 'DuckDuckGo' | 'Bing', config: typeof SEARCH_ENGINES[keyof typeof SEARCH_ENGINES], query: string): Promise<SearchHit[]> {
  return fetchHtml(config.url(query)).then(html => html ? config.parseResults(html) : [])
    .catch(() => []);
}

export async function duckDuckGoSearch(options: SearchOptions): Promise<SearchHit[]> {
  return runSearch('DuckDuckGo', SEARCH_ENGINES.duckDuckGo, options.query);
}

export async function bingSearch(options: SearchOptions): Promise<SearchHit[]> {
  return runSearch('Bing', SEARCH_ENGINES.bing, options.query);
}

export async function multiEngineSearch(
  options: SearchOptions
): Promise<{ results: SearchHit[]; engine: string }> {
  const ddgPromise = duckDuckGoSearch(options);
  const bingPromise = new Promise<SearchHit[]>(resolve => {
    setTimeout(() => bingSearch(options).then(resolve), 0);
  });

  const winnerResults = await Promise.race([
    ddgPromise.then(results => ({ type: 'ddg' as const, results })),
    bingPromise.then(results => ({ type: 'bing' as const, results })),
  ]);

  if (winnerResults.results.length > 0) {
    return { results: winnerResults.results, engine: winnerResults.type === 'ddg' ? 'DuckDuckGo' : 'Bing' };
  }

  const loserType = winnerResults.type === 'ddg' ? 'bing' : 'ddg';
  const loserConfig = loserType === 'ddg' ? SEARCH_ENGINES.duckDuckGo : SEARCH_ENGINES.bing;
  const loserUrl = loserConfig.url(options.query);

  let loserResults: SearchHit[] = [];
  try {
    const html = await fetchHtml(loserUrl);
    if (html) {
      loserResults = loserConfig.parseResults(html);
    }
  } catch {}
  return { results: loserResults, engine: loserConfig.name };
}

export async function search(
  options: SearchOptions
): Promise<{ results: SearchHit[]; engine: string }> {
  return await multiEngineSearch(options);
}
