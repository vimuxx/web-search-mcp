# web-search-mcp

Local MCP server for web search and content fetching.

This tool is designed for locally deployed models that do not have built-in web search capabilities.

## Architecture

Uses `node-fetch` + `cheerio` instead of headless browsers like Playwright:

- **Direct HTML parsing** - extracts content from HTML responses efficiently
- **Fast startup** - no browser process to initialize
- **Low memory** - ~50MB vs ~150-300MB for headless browsers
- **Lightweight** - no bundled Chromium dependency

## How It Works

This MCP server:
1. Receives search queries or URLs from the model
2. Race parallel search (DuckDuckGo vs Bing)
3. Searches the web or scrapes URLs directly
4. Returns formatted results for the model to consume

## Usage

```bash
claude mcp add -s user -- web-search-mcp npx -y https://github.com/vimuxx/web-search-mcp/releases/download/v1.0.0/web-search-mcp-1.0.0.tgz
    # -e HTTPS_PROXY=http://127.0.0.1:10809         HTTP proxy (optional)
    # -e WSM_LOG_FILE=/tmp/web-search-mcp.log       Enable logging (optional)
```
