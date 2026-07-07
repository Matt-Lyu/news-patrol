/**
 * 检查模块：链接检查、拼写检查
 */

// 常见错别字表
const TYPO_DICT = {
  '再接再励': '再接再厉', '穿流不息': '川流不息',
  '不加思索': '不假思索', '食不裹腹': '食不果腹',
  '一愁莫展': '一筹莫展', '烩炙人口': '脍炙人口',
  '出奇不意': '出其不意', '迫不急待': '迫不及待',
  '一股作气': '一鼓作气', '按步就班': '按部就班',
  '不径而走': '不胫而走',
};

/**
 * 标题错别字检查
 */
function checkTypos(text) {
  if (!text) return [];
  const issues = [];
  for (const [wrong, correct] of Object.entries(TYPO_DICT)) {
    if (text.includes(wrong)) {
      issues.push(`疑似错字: "${wrong}" 应为 "${correct}"`);
    }
  }
  const punctIssues = text.match(/[，、]{2,}/g);
  if (punctIssues) issues.push(`标点连用: "${punctIssues[0]}"`);
  return issues;
}

/**
 * 标题一致性检查（链接文本 vs 页面标题）
 * 忽略装饰符号（【】）、站点后缀（--站点名）、栏目标签（（xxx））
 */
function checkTitleConsistency(linkTitle, pageTitle) {
  if (!linkTitle || !pageTitle || linkTitle.length < 4) return false;

  // 清理链接标题：去掉【】、（）装饰符和首尾空格
  const cleanLink = linkTitle.replace(/[【】]/g, '').replace(/[（(][^）)]*[）)]/g, '').trim();
  if (cleanLink.length < 4) return false;

  // 清理页面标题：去掉 -- 后缀 和 （xxx）栏目标签
  const cleanPage = pageTitle
    .replace(/--.*$/, '')
    .replace(/[（(][^）)]*[）)]/g, '')
    .trim();
  if (cleanPage.length < 4) return false;

  // 用清理后的短标题（前15字）做包含检查
  const shortKey = cleanLink.slice(0, Math.min(15, cleanLink.length));
  return cleanPage.includes(shortKey);
}

module.exports = { checkTypos, checkTitleConsistency };
