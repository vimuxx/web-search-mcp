import * as cheerio from 'cheerio';
import { decodeRedirect, fetchHtml, isNonTargetUrl, cleanupTitle, logMsg, type SearchHit, type SearchOptions } from './utils.js';

export type { SearchHit, SearchOptions };

const SEARCH_ENGINES = {
  bing: {
    url: (query: string) => `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
    parseResults: (html: string): SearchHit[] => {
      const $ = cheerio.load(html);
      const results: SearchHit[] = [];

      $('li.b_algo').each((_, elem) => {
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

      $('a.result__a').each((_, elem) => {
        const href = $(elem).attr('href');
        if (!href) return;

        let actualUrl = href;
        try {
          if (href.startsWith('//')) {
            actualUrl = 'https:' + href;
          }
          actualUrl = decodeRedirect(actualUrl);
        } catch (e) {
          logMsg('stderr', { warn: 'decodeRedirect failed', url: href, error: String(e) });
        }

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

function runSearch(engine: EngineName, query: string): Promise<SearchHit[]> {
  return fetchHtml(SEARCH_ENGINES[engine].url(query))
    .then(html => {
      if (!html) return [];
      try {
        return SEARCH_ENGINES[engine].parseResults(html);
      } catch (e) {
        logMsg('stderr', { error: 'parseResults', engine, query, message: String(e) });
        return [];
      }
    })
    .catch((e) => {
      logMsg('stderr', { error: 'runSearch', engine, query, message: String(e) });
      return [];
    });
}

export async function duckduckgoSearch(options: SearchOptions): Promise<SearchHit[]> {
  return runSearch('duckduckgo', options.query);
}

export async function bingSearch(options: SearchOptions): Promise<SearchHit[]> {
  return runSearch('bing', options.query);
}

export async function search(options: SearchOptions): Promise<{ results: SearchHit[]; engine: string }> {
  const duckduckgoPromise = duckduckgoSearch(options);
  // Start Bing on macrotask so DDG resolves first if equally fast
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

  // Fall back to loser's result — the request is already in flight, reuse it directly
  const loserPromise = winnerResults.type === 'duckduckgo' ? bingPromise : duckduckgoPromise;
  const loserType = winnerResults.type === 'duckduckgo' ? 'bing' : 'duckduckgo';
  const loserResults = await loserPromise;
  return { results: loserResults, engine: loserType };
}
