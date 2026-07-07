#!/usr/bin/env node
/**
 * 新闻网站页面巡查工具 — 入口
 *
 * 用法：
 *   node index.js              # 巡查所有站点
 *   node index.js --site finance # 只巡查指定站点
 *   node index.js --quiet      # 安静模式，只输出摘要
 */
const fs = require('fs');
const path = require('path');

// 加载配置
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

const { patrolSite } = require('./lib/core');
const { generateTextReport, saveReport } = require('./lib/reporter');

// 解析参数
const args = process.argv.slice(2);
const siteFilter = args.includes('--site') ? args[args.indexOf('--site') + 1] : null;

async function main() {
  const sitesToRun = siteFilter
    ? config.sites.filter(s => s.key === siteFilter)
    : config.sites;

  if (sitesToRun.length === 0) {
    console.error(`❌ 未找到站点: ${siteFilter}`);
    console.error(`   可用站点: ${config.sites.map(s => s.key).join(', ')}`);
    process.exit(1);
  }

  console.log('');
  console.log('='.repeat(30));
  console.log('  📋 新闻页面巡查工具');
  console.log(`  ⏱ ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
  console.log(`  📌 ${sitesToRun.length} 个站点`);
  console.log('='.repeat(30));
  console.log('');

  const allReports = [];
  let totalIssues = 0;

  for (const siteConfig of sitesToRun) {
    console.log('━'.repeat(20));
    console.log(`  🌐 ${siteConfig.name}`);
    console.log('━'.repeat(20));

    const report = await patrolSite(siteConfig, config.global);

    if (!report) {
      console.error(`  ❌ ${siteConfig.key}: 巡查失败\n`);
      continue;
    }

    const textReport = generateTextReport(report, siteConfig);
    console.log('\n' + textReport);

    saveReport(report, siteConfig, textReport);
    console.log('');

    allReports.push(report);
    totalIssues += report.summary.bad + report.summary.mismatch + report.summary.typos;
  }

  // 如果巡查了多个站点，输出总览
  if (allReports.length > 1) {
    console.log('='.repeat(30));
    console.log('  📊 多站巡查总览');
    console.log('='.repeat(30));

    for (const r of allReports) {
      const s = r.summary;
      const status = (s.bad + s.mismatch + s.typos) > 0 ? '⚠️' : '✅';
      console.log(`  ${status} ${r.siteName}`);
      console.log(`     稿件 ${s.total}篇 | 链接 ${s.bad ? s.bad+'异常' : '全部正常'} | 标题 ${s.mismatch ? s.mismatch+'不一致' : '一致'} | 拼写 ${s.typos ? s.typos+'问题' : '无问题'}`);
    }

    if (totalIssues > 0) {
      console.log(`\n  ⚠️ 共发现 ${totalIssues} 个问题，请查看各站点报告详情`);
    } else {
      console.log('\n  ✅ 全部站点巡查正常');
    }
    console.log('='.repeat(30));
  }

  // 返回是否有问题（用于cron判断）
  return totalIssues;
}

main()
  .then(issues => {
    process.exit(issues > 0 ? 1 : 0);
  })
  .catch(e => {
    console.error('❌ 程序异常:', e.message);
    process.exit(1);
  });
