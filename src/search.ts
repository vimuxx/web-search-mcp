import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import { decodeRedirect, fetchHtml, isNonTargetUrl, cleanupTitle, type SearchHit, type SearchOptions } from './utils.js';

export type { SearchHit, SearchOptions };

const SEARCH_ENGINES = {
  bing: {
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
  duckduckgo: {
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

type EngineName = 'bing' | 'duckduckgo';

function runSearch(engine: EngineName, config: typeof SEARCH_ENGINES[EngineName], query: string): Promise<SearchHit[]> {
  return fetchHtml(config.url(query)).then(html => html ? config.parseResults(html) : [])
    .catch(() => []);
}

export async function duckduckgoSearch(options: SearchOptions): Promise<SearchHit[]> {
  return runSearch('duckduckgo', SEARCH_ENGINES.duckduckgo, options.query);
}

export async function bingSearch(options: SearchOptions): Promise<SearchHit[]> {
  return runSearch('bing', SEARCH_ENGINES.bing, options.query);
}

export async function multiEngineSearch(
  options: SearchOptions
): Promise<{ results: SearchHit[]; engine: string }> {
  const duckduckgoPromise = duckduckgoSearch(options);
  const bingPromise = new Promise<SearchHit[]>(resolve => {
    setTimeout(() => bingSearch(options).then(resolve), 0);
  });

  const winnerResults = await Promise.race([
    duckduckgoPromise.then(results => ({ type: 'duckduckgo' as const, results })),
    bingPromise.then(results => ({ type: 'bing' as const, results })),
  ]);

  if (winnerResults.results.length > 0) {
    return { results: winnerResults.results, engine: winnerResults.type };
  }

  const loserType = winnerResults.type === 'duckduckgo' ? 'bing' : 'duckduckgo';
  const loserConfig = SEARCH_ENGINES[loserType];
  const loserUrl = loserConfig.url(options.query);

  let loserResults: SearchHit[] = [];
  try {
    const html = await fetchHtml(loserUrl);
    if (html) {
      loserResults = loserConfig.parseResults(html);
    }
  } catch {}
  return { results: loserResults, engine: loserType };
}

export async function search(options: SearchOptions): Promise<{ results: SearchHit[]; engine: string }> {
  return await multiEngineSearch(options);
}
