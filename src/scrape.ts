import * as cheerio from 'cheerio';
import { fetchHtml, getHostname, createScrapeErrorResult, ScrapedContent } from './utils.js';

export type { ScrapedContent };

function extractTitle($: cheerio.CheerioAPI): string {
  let ogTitle = $('meta[property="og:title"]').attr('content');
  if (ogTitle) return ogTitle.trim();

  let twitterTitle = $('meta[name="twitter:title"]').attr('content');
  if (twitterTitle) return twitterTitle.trim();

  let title = $('title').text();
  if (title) return title.trim();

  return '';
}

const elementsToRemove = [
  'script',
  'style',
  'nav',
  'header',
  'footer',
  'aside',
  '.navigation',
  '.header',
  '.footer',
  '.sidebar',
  '.aside',
  '.ads',
  '.ad',
  '.promo',
  '.newsletter',
  '.related',
  '.recommendations',
  'iframe',
  '[role="navigation"]',
  '[id*="footer"]',
  '[id*="sidebar"]',
  '.share-buttons',
  '.social-icons',
  '.subscribe',
  '.comment',
  '.related-posts',
  '.author-bio',
  '.breadcrumbs',
  '.tag-cloud',
  '.archive',
  '.sidebar-tools',
  '.sidebar-nav',
  '.sidebar-menu',
  '.sidebar-item',
  '.sidebar-logo',
  '.sidebar-scroll',
  '.sidebar-header',
  '.sidebar-more',
  // WeChat official account specific
  '.wx_ratio_box',
  '.wx_ratio_btn',
  '.wx_read_more',
  '.wx_read_other',
  '.wx_read_bottom',
  '.wx_read_upper',
  '.wx_read_tips',
  '.wx_read_copyright',
  '.wx_read_ad',
  '.wx_read_recommend',
  '.wx_read_share',
  '.wx_read_comment',
  '.wx_read_like',
  '.wx_read_in',
  '.wx_read_action',
  '.wx_read_menu',
  '.wx_read_tool',
  '.wx_read_widget',
  '.wx_read_app',
  '.wx_read_promotion',
  '.wx_read_service',
  '.wx_read_extra',
  '.wx_read_bottom_bar',
  '.wx_read_action_bar',
  '.wx_read_tips_box',
  '.wx_read_tips_inner',
  // WordPress comments and related
  '.comments-area',
  '.comment-list',
  '.comment-respond',
  '.related-articles',
  '.post-related',
  '.entry-related',
  '.widget-area',
  '.sidebar-widget',
  '.footer-widget',
  '.site-footer',
  '.wp-comment-comment',
  '.comment-meta',
  '.comment-author',
  '.comment-content',
  '.comment-reply-title',
  '.comments-title',
  '#comments',
  '.social-sharing',
  '.shareaholic',
  '.addtoany',
  '.sharing-links',
];

const elementsToRemoveSelector = elementsToRemove.join(', ');

const contentSelectors = [
  '.Box-body.readme.blob',
  '.js-file-content',
  '.file',
  '[id^="file-"]',
];

const mainContentSelectors = [
  '.panel-body.single',
  'main',
  'article',
  '[role="main"]',
  '[itemprop="articleBody"]',
  '#content',
  '.content',
  '.document',
  '.rst-content',
  '.entry-content',
  '.post-content',
  '.article-content',
  '#article',
  '#post',
  '.text',
  '.body',
  '.content-wrap',
  '.content-layout',
  '.single-content',
  '.post-body',
  '.entrytext',
  // WordPress.com specific
  '.site-content-container',
  '.wp-block-post-content',
  '.wp-site-blocks',
  '.entry',
  '.hentry',
  // WeChat official account article content
  '#js_content',
  '.rich_media_content',
  '#js_pv',
  '.article_content',
];


export function extractContent($: cheerio.CheerioAPI): string {
  $(elementsToRemoveSelector).remove();

  for (const selector of contentSelectors) {
    const element = $(selector).first();
    if (element.length > 0) {
      element.find('.raw-button, .file-actions, .file-header, .breadcrumb').remove();
      let content = element.text().replace(/^\s+/, '');
      if (content.length > 100) return content;
    }
  }

  const gistContent = $('.repository-content.gist-content').first();
  if (gistContent.length > 0) {
    gistContent.find('.file-actions, .btn, .clone-url, .gist-bubble, .starship-prompt').remove();
    let content = gistContent.text();
    if (content.length > 100) return content;
  }

  for (const selector of mainContentSelectors) {
    const element = $(selector).first();
    if (element.length > 0) {
      let content = element.text();

      const firstHeading = element.find('h2, h3').first();
      if (firstHeading.length > 0) {
        const textAfterHeading = element.text().substring(element.text().indexOf(firstHeading.text()));
        if (textAfterHeading.length > content.length * 0.5) {
          content = textAfterHeading;
        }
      }

      content = content.trimEnd();

      if (content.length > 100) return content;
    }
  }

  const paragraphs = $('p').toArray();
  if (paragraphs.length > 5) {
    const start = Math.floor(paragraphs.length * 0.1);
    const end = Math.floor(paragraphs.length * 0.9);
    let content = paragraphs.slice(start, end).map(p => $(p).text()).join('\n\n');
    if (content.length > 50) return content;
  }

  let content = $('body').text();
  return content.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();
}

export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  const html = await fetchHtml(url);
  if (!html) {
    return createScrapeErrorResult(url, new Error('Failed to fetch'));
  }
  const $ = cheerio.load(html);
  const content = extractContent($);
  const title = extractTitle($);
  return { url, title: title || getHostname(url), content, success: true };
}

export async function scrapeUrls(urls: string[]): Promise<ScrapedContent[]> {
  if (urls.length === 0) return [];
  return await Promise.all(urls.map(url => scrapeUrl(url)));
}
