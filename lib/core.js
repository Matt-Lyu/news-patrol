/**
 * 巡查核心引擎
 */
const { parse } = require('node-html-parser');
const { fetchUrl, sleep } = require('./fetcher');
const {
  extractArticlesFromArea,
  analyzeArticlePage,
} = require('./parser');
const { checkTypos, checkTitleConsistency } = require('./checkers');

/**
 * 巡查单个站点
 */
async function patrolSite(siteConfig, globalConfig) {
  const startTime = Date.now();

  const report = {
    siteName: siteConfig.name,
    siteKey: siteConfig.key,
    page: siteConfig.url,
    patrolTime: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    pageStatus: null,
    areas: {},
    articles: [],
    linkIssues: [],
    typoIssues: [],
    _startTime: startTime,
  };

  // 1. 获取页面
  process.stdout.write(`📡 [${siteConfig.key}] 获取页面... `);
  let resp;
  try {
    resp = await fetchUrl(siteConfig.url, globalConfig.requestTimeout);
  } catch (e) {
    console.log(`❌ ${e.message}`);
    return null;
  }
  report.pageStatus = resp.status;
  console.log(`HTTP ${resp.status} (${(resp.data.length/1024).toFixed(0)}KB)`);

  const root = parse(resp.data, {
    comment: false,
    blockTextElements: { script: false, style: false },
  });

  // 2. 提取各区域稿件
  for (const area of siteConfig.areas) {
    const articles = extractArticlesFromArea(root, area, siteConfig);
    report.areas[area.name] = articles;
    console.log(`   ${area.icon || ''} ${area.name}: ${articles.length}篇`);
    articles.forEach(a => console.log(`      ${a.title.slice(0, 40)}`));
    report.articles.push(...articles);
  }

  // 去重
  const seenUrls = new Set();
  report.articles = report.articles.filter(a => {
    if (seenUrls.has(a.url)) return false;
    seenUrls.add(a.url);
    return true;
  });
  console.log(`   📊 去重后共 ${report.articles.length} 篇`);

  // 3. 逐个分析文章页
  const delay = globalConfig.requestDelayMs || 300;
  for (let i = 0; i < report.articles.length; i++) {
    const art = report.articles[i];
    process.stdout.write(`   [${i+1}/${report.articles.length}] ${(art.title||'').slice(0,20).padEnd(20)} `);

    try {
      const r = await fetchUrl(art.url, globalConfig.requestTimeout);
      if (r.status === 200) {
        art.linkOk = true;
        const analysis = analyzeArticlePage(r.data, art.url, siteConfig.topicUrlPattern);
        art.type = analysis.type;
        art.wordCount = analysis.wordCount;
        art.bodyImgs = analysis.bodyImgs;
        art.pageTitle = analysis.pageTitle;
        art.pageSize = analysis.pageSize;
        art.source = analysis.source;
        art.isTopic = art.isTopic || analysis.isTopic;

        // 标题一致性（跳过专题页）
        if (!art.isTopic && art.pageTitle && art.title.length > 4) {
          if (!checkTitleConsistency(art.title, art.pageTitle)) {
            art.titleMismatch = true;
            report.linkIssues.push({
              type: '标题不一致',
              title: art.title,
              url: art.url,
              detail: `链接显示: "${art.title}"，页面标题: "${art.pageTitle}"`,
            });
          }
        }

        const icon = art.type === '视频' ? '🎬' : art.type === '组图' ? '🖼️' : art.type === '图文' ? '📷' : '📄';
        const countStr = art.isTopic ? '-' : (analysis.wordCount + '字');
        console.log(`${icon} ${art.type} ${countStr} ✅`);
      } else {
        art.linkOk = false;
        art.linkError = `HTTP ${r.status}`;
        report.linkIssues.push({ type: '链接异常', title: art.title, url: art.url, detail: `HTTP ${r.status}` });
        console.log(`❌ ${r.status}`);
      }
    } catch (e) {
      art.linkOk = false;
      art.linkError = e.message;
      report.linkIssues.push({ type: '链接异常', title: art.title, url: art.url, detail: e.message });
      console.log(`❌ ${e.message}`);
    }

    if (i < report.articles.length - 1) await sleep(delay);
  }

  // 4. 标题拼写检查
  console.log('   ✏️ 标题拼写检查...');
  for (const art of report.articles) {
    const issues = checkTypos(art.title);
    if (issues.length > 0) {
      art.typoIssues = issues;
      report.typoIssues.push({ title: art.title, issues });
      issues.forEach(i => console.log(`      ⚠️ "${art.title}" → ${i}`));
    }
  }
  if (report.typoIssues.length === 0) console.log('      ✅ 未发现错别字');

  // 5. 生成汇总数据
  report.summary = {
    total: report.articles.length,
    ok: report.articles.filter(a => a.linkOk === true).length,
    bad: report.linkIssues.filter(i => i.type === '链接异常').length,
    mismatch: report.linkIssues.filter(i => i.type === '标题不一致').length,
    typos: report.typoIssues.length,
    elapsed: ((Date.now() - startTime) / 1000).toFixed(1),
  };

  return report;
}

module.exports = { patrolSite };
