/**
 * 报告生成模块
 */
const fs = require('fs');
const path = require('path');

/**
 * 生成文本报告（用于终端/微信展示）
 */
function generateTextReport(report, siteConfig) {
  const lines = [];
  const elapsed = ((Date.now() - report._startTime) / 1000).toFixed(1);

  lines.push('━'.repeat(24));
  lines.push(`📋 ${siteConfig.name} 页面巡查报告`);
  lines.push(`⏱ ${report.patrolTime}  |  耗时 ${elapsed}秒`);
  lines.push(`🔗 ${siteConfig.url}`);
  lines.push('');

  lines.push('━━ 一、巡查概况 ━━');
  lines.push(`✅ 页面访问: HTTP ${report.pageStatus}`);
  lines.push(`📌 巡查区域: ${siteConfig.areas.map(a => a.name).join(' / ')}`);
  const topicCount = report.articles.filter(a => a.isTopic).length;
  lines.push(`📄 稿件总数: ${report.articles.length} 篇${topicCount > 0 ? `（含${topicCount}个专题页）` : ''}`);
  lines.push('');

  lines.push('━━ 二、各区域稿件明细 ━━');
  for (const area of siteConfig.areas) {
    const arts = report.areas[area.name] || [];
    if (arts.length === 0) {
      lines.push(`\n📍 ${area.name} · 0篇（未找到匹配区域）`);
      continue;
    }
    lines.push(`\n📍 ${area.name} · ${arts.length}篇`);
    arts.forEach((a, i) => {
      const typeIcon = a.type === '视频' ? '🎬' : a.type === '组图' ? '🖼️' : a.type === '图文' ? '📷' : '📄';
      const typeLabel = a.type || '待查';
      const src = a.source || '人民网';
      const wordStr = a.isTopic ? '-' : (a.wordCount ? a.wordCount + '字' : '-');
      const topicTag = a.isTopic ? ' [专题]' : '';

      lines.push('');
      lines.push(` ${i+1}. ${a.title}${topicTag}`);
      lines.push(`    ${typeIcon} ${typeLabel}  |  来源 ${src}  |  正文 ${wordStr}  |  ${a.date}`);
      lines.push(`    ${a.url}`);
      if (a.linkOk !== undefined) {
        lines.push(`    链接: ${a.linkOk ? '✅' : '❌'}  |  页面 ${a.pageSize ? (a.pageSize/1024).toFixed(0)+'KB' : '?'}`);
      }
      if (a.titleMismatch) lines.push(`    ⚠️ 标题与页面标题不一致`);
      if (a.typoIssues) lines.push(`    ✏️ ${a.typoIssues.join('; ')}`);
    });
  }
  lines.push('');

  lines.push('━━ 三、链接检查 ━━');
  const ok = report.articles.filter(a => a.linkOk === true).length;
  const bad = report.linkIssues.filter(i => i.type === '链接异常').length;
  const mismatch = report.linkIssues.filter(i => i.type === '标题不一致').length;
  lines.push(`✅ 正常: ${ok} / ${report.articles.length}`);
  lines.push(`❌ 异常: ${bad}`);
  lines.push(`⚠️ 标题不一致: ${mismatch}`);
  if (bad > 0) {
    lines.push(''); lines.push('异常链接:');
    report.linkIssues.filter(i => i.type === '链接异常').forEach(i => {
      lines.push(`  ❌ ${i.title} → ${i.detail}`);
    });
  }
  if (mismatch > 0) {
    lines.push(''); lines.push('标题不一致:');
    report.linkIssues.filter(i => i.type === '标题不一致').forEach(i => {
      lines.push(`  ⚠️ ${i.title}`);
      lines.push(`     ${i.detail}`);
    });
  }
  lines.push('');

  lines.push('━━ 四、标题拼写检查 ━━');
  lines.push(`检查 ${report.articles.length} 个标题`);
  if (report.typoIssues.length > 0) {
    lines.push(`发现问题 ${report.typoIssues.length} 个:`);
    report.typoIssues.forEach(t => {
      lines.push(`  ⚠️ ${t.title}`);
      t.issues.forEach(i => lines.push(`     ${i}`));
    });
  } else {
    lines.push('✅ 未发现错别字/多字少字问题');
  }
  lines.push('');

  lines.push('━━ 五、综合评估 ━━');
  const totalIssues = bad + mismatch + report.typoIssues.length;
  if (totalIssues > 0) {
    lines.push(`⚠️ 共发现 ${totalIssues} 个问题:`);
    if (bad > 0) lines.push(`  链接异常: ${bad}个`);
    if (mismatch > 0) lines.push(`  标题不一致: ${mismatch}个`);
    if (report.typoIssues.length > 0) lines.push(`  拼写问题: ${report.typoIssues.length}个`);
  } else {
    lines.push(`✅ 全部 ${report.articles.length} 篇稿件均正常`);
  }
  lines.push('');
  lines.push('━'.repeat(24));

  return lines.join('\n');
}

/**
 * 保存报告文件
 */
function saveReport(report, siteConfig, textReport) {
  const dir = path.resolve(__dirname, '..', 'reports');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const siteKey = siteConfig.key;

  // 保存文本报告
  const txtPath = path.join(dir, `${siteKey}_${timestamp}.txt`);
  fs.writeFileSync(txtPath, textReport);
  console.log(`\n📁 文本报告: ${txtPath}`);

  // 保存JSON报告
  const jsonPath = path.join(dir, `${siteKey}_${timestamp}.json`);
  const cleanReport = JSON.parse(JSON.stringify(report));
  delete cleanReport._startTime;
  fs.writeFileSync(jsonPath, JSON.stringify(cleanReport, null, 2));
  console.log(`📁 JSON报告: ${jsonPath}`);

  return { txtPath, jsonPath };
}

module.exports = { generateTextReport, saveReport };
