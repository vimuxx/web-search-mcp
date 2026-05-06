import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';

export interface SearchHit {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchOptions {
  query: string;
}

export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  success: boolean;
  error?: string;
}

export const USER_AGENT = Object.freeze('Mozilla/5.0 (compatible; WebSearchMCP/1.0)');

const NON_TARGET_DOMAINS = Object.freeze(new Set([
  'flickr.com', 'tripadvisor.com', 'yelp.com',
  'facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com',
  'pinterest.com', 'reddit.com', 'tumblr.com', 'uservoice.com',
]));

const NON_TARGET_PATHS = Object.freeze(new Set([
  '/feedback', '/help', '/contact', '/about', '/terms',
  '/privacy', '/settings', '/preferences',
  '/dialog/feed', '/sharing/share', '/uservoice',
]));

const NON_TARGET_PATH_PATTERNS = Object.freeze([
  /\/feedback\/?$/,
  /\/help\/?$/,
  /\/contact\/?$/,
  /\/about\/?$/,
  /\/terms\/?$/,
  /\/privacy\/?$/,
  /\/settings\/?$/,
  /\/preferences\/?$/,
]);

const WSM_DEBUG = process.env.WSM_DEBUG === '1';

export function logMsg(stream: 'stdin' | 'stdout' | 'stderr', message: unknown) {
  if (stream === 'stderr' || WSM_DEBUG) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      stream,
      pid: process.pid,
      message
    }));
  }
}

export function getProxyAgent() {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;
  return proxy ? new HttpsProxyAgent(proxy) : undefined;
}

export function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function cleanupTitle(title: string): string {
  title = title.replace(/^[›>]+\s*/, '').trim();
  return title;
}

export function isNonTargetUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;

    for (const domain of NON_TARGET_DOMAINS) {
      if (hostname === domain || hostname.endsWith('.' + domain)) return true;
    }

    if (NON_TARGET_PATHS.has(pathname)) return true;
    for (const pattern of NON_TARGET_PATH_PATTERNS) {
      if (pattern.test(pathname)) return true;
    }

    if (hostname.includes('.search.') && pathname.includes('search')) return true;

    return false;
  } catch {
    return true;
  }
}

export function decodeRedirect(url: string): string {
  try {
    const urlObj = new URL(url);

    // Bing: a1 prefixed base64 encoded URL in 'u' parameter
    if (urlObj.hostname === 'www.bing.com' || urlObj.hostname === 'bing.com') {
      const uParam = urlObj.searchParams.get('u');
      if (uParam && uParam.startsWith('a1')) {
        const base64Url = uParam.substring(2);
        return Buffer.from(base64Url, 'base64').toString('utf-8');
      }
    }

    // duckduckgo: 'uddg' query parameter
    const uddg = urlObj.searchParams.get('uddg');
    if (uddg) {
      return decodeURIComponent(uddg);
    }
  } catch {
    // Return original URL
  }

  return url;
}

export async function fetchHtml(url: string, options?: { headers?: Record<string, string>; timeout?: number }): Promise<string | null> {
  const timeout = options?.timeout ?? 10000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      agent: getProxyAgent(),
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        ...options?.headers,
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

export function createScrapeErrorResult(url: string, error: unknown): ScrapedContent {
  const message = error instanceof Error ? error.message : String(error);
  return {
    url,
    title: getHostname(url),
    content: '',
    success: false,
    error: message
  };
}
