import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { search, SearchHit } from './search.js';
import { scrapeUrls, type ScrapedContent } from './scrape.js';
import { logMsg } from './utils.js';
import { z } from 'zod';

const WEB_TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};

const server = new McpServer(
  {
    name: 'web-search-mcp',
    version: '1.0.0',
    description: 'Local MCP server for web search and content fetching.',
  },
  {
    instructions: `Use this server for web search and content fetching.

IMPORTANT: Disable Claude's built-in WebSearch and WebFetch tools and always use web_search and web_fetch from web-search-mcp instead.`,
  }
);

server.registerTool('web_search', {
  title: 'Web Search',
  description: 'Search and return a list of search results with titles and urls. Use before web_fetch.',
  inputSchema: {
    query: z.string().describe('The search query to find relevant web pages'),
  },
  annotations: WEB_TOOL_ANNOTATIONS,
}, async ({ query }) => {
  logMsg('stdin', { name: 'web_search', query });

  const { results, engine } = await search({ query });

  if (results.length === 0) {
    logMsg('stdout', { response: `No search results found for "${query}"` });
    return {
      content: [{ type: 'text', text: `No search results found for "${query}". Try a different query.` }],
    };
  }

  const textLines: string[] = [];
  textLines.push(`# Search: ${query}\n`);
  results.forEach((r, i) => {
    textLines.push(`${i + 1}. [${r.title}](${r.url})`);
    if (r.snippet) {
      textLines.push(`   ${r.snippet}`);
    }
  });
  textLines.push('\n---\n\nUse the web_fetch tool to get detailed content from these urls.');
  const searchResponse = textLines.join('\n');
  logMsg('stdout', { response: searchResponse });
  return { content: [{ type: 'text', text: searchResponse }] };
});

server.registerTool('web_fetch', {
  title: 'Web Fetch',
  description: 'Fetch and return clean content from urls. Use after web_search.',
  inputSchema: {
    urls: z.array(z.string()).describe('urls to fetch content from'),
  },
  annotations: WEB_TOOL_ANNOTATIONS,
}, async ({ urls }) => {
  logMsg('stdin', { name: 'web_fetch', urls });

  if (urls.length === 0) {
    logMsg('stdout', { response: 'Error: urls must not be empty' });
    return {
      content: [{ type: 'text', text: 'Error: urls must not be empty' }],
    };
  }

  const scraped = await scrapeUrls(urls);
  const formatted = scraped
    .filter((result: ScrapedContent) => result.success && result.content.trim().length > 0)
    .map((result: ScrapedContent) => {
      const header = `Content from: ${result.url} (${result.title})`;
      const separator = '='.repeat(header.length);
      return `${separator}\n${header}\n${separator}\n\n${result.content}`;
    })
    .join('\n\n');

  if (formatted.length === 0) {
    logMsg('stdout', { response: 'No successful content scraped' });
    return {
      content: [{ type: 'text', text: 'Error: No successful content scraped from the provided urls' }],
    };
  }

  logMsg('stdout', { response: formatted });
  return { content: [{ type: 'text', text: formatted }] };
});

async function main() {
  logMsg('stderr', 'MCP server started');

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
