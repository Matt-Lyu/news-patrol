/**
 * 页面解析模块
 * 从文章页面提取：类型、字数、来源、标题一致性
 */
const { parse } = require('node-html-parser');

/**
 * 判断是否为专题/栏目页
 */
function isTopicPage(url, topicPattern) {
  if (new RegExp(topicPattern).test(url)) return true;
  if (/\/index\.html$/.test(url)) return true;
  return false;
}

/**
 * 判断是否为新闻正文页
 */
function isArticlePage(url, articlePattern) {
  return new RegExp(articlePattern).test(url);
}

/**
 * 从URL提取日期
 */
function extractDateFromUrl(url) {
  let m = url.match(/\/(\d{4})\/(\d{2})(\d{2})\//);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = url.match(/\/(\d{4})-(\d{2})-(\d{2})\//);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return 'N/A';
}

/**
 * 分析文章页面, 提取类型、字数、来源、页面标题
 */
function analyzeArticlePage(html, url, topicPattern) {
  const root = parse(html, { blockTextElements: { script: false, style: false } });
  const isTopic = isTopicPage(url, topicPattern);
  const txtCon = root.querySelector('div.rm_txt_con');

  let wordCount = 0;
  let bodyImgs = 0;
  let type = '纯文字';

  if (txtCon && !isTopic) {
    const text = txtCon.text.replace(/\s+/g, '');
    wordCount = text.length;
    bodyImgs = txtCon.querySelectorAll('img').length;
  }

  // 视频检测
  const pageVideos = root.querySelectorAll('video');
  const hasVideoPlayer = /video-wrap|player-wrap/i.test(html);

  if (pageVideos.length > 0 || hasVideoPlayer) {
    type = '视频';
  } else if (bodyImgs >= 7) {
    type = '组图';
  } else if (bodyImgs >= 3) {
    type = '图文';
  } else {
    type = '纯文字';
  }

  // 提取来源
  let source = '人民网';
  const sourceMeta = html.match(/<meta[^>]*?name="source"[^>]*?content="([^"]+)"[^>]*>/i);
  if (sourceMeta) {
    let raw = sourceMeta[1];
    raw = raw.replace(/^来源[：:]?\s*/, '');
    raw = raw.replace(/\s*原创稿$/, '');
    if (raw) source = raw;
  }

  // 提取页面标题
  const titleEl = root.querySelector('title');
  const pageTitle = titleEl ? titleEl.text.trim().replace(/\s+/g, ' ') : '';

  return { type, wordCount, bodyImgs, pageTitle, source, pageSize: html.length, isTopic };
}

/**
 * 提取某区域所有链接
 */
function extractArticlesFromArea(root, areaConfig, siteConfig) {
  const { name, selector } = areaConfig;
  const elements = root.querySelectorAll(selector);
  const articles = [];
  const seen = new Set();

  elements.forEach(el => {
    const links = el.querySelectorAll('a');
    links.forEach(link => {
      const href = link.getAttribute('href');
      const title = (link.text || '').trim().replace(/\s+/g, ' ');
      if (!href || !title || title.length < 4) return;

      // 过滤摘要文本
      if (title.length > 30) return;

      const key = href.split('#')[0];
      if (seen.has(key)) return;
      seen.add(key);

      let fullUrl = href;
      if (href.startsWith('//')) fullUrl = `http:${href}`;
      else if (href.startsWith('/')) fullUrl = `${siteConfig.domain}${href}`;
      else if (!href.startsWith('http')) fullUrl = `${siteConfig.domain}/${href}`;
      else fullUrl = href;

      articles.push({
        title,
        url: fullUrl,
        area: name,
        date: extractDateFromUrl(fullUrl),
        titleLen: title.length,
        source: '',
        isTopic: isTopicPage(fullUrl, siteConfig.topicUrlPattern),
      });
    });
  });

  return articles;
}

module.exports = {
  isTopicPage,
  isArticlePage,
  extractDateFromUrl,
  analyzeArticlePage,
  extractArticlesFromArea,
};
