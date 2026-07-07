---
name: news-patrol
description: 人民网多频道新闻页面巡查工具。当用户要求"巡查人民网""跑一遍巡查""检查新闻页面""看看有没有异常"时触发。支持经济频道(finance)、文旅频道(ent)、健康频道(health)三个站点的自动抓取、稿件列表提取、链接可用性检测、标题一致性比对、错别字检查，并生成文本/JSON/HTML三格式报告。
---

# News Patrol

## Quick Start

Run a full patrol on all 3 sites:

```bash
cd /home/admin/.openclaw/workspace/skills/news-patrol/scripts
node index.js
```

This produces:
- Terminal output with real-time progress
- **Text report** → `reports/{key}_YYYY-MM-DDThh-mm-ss.txt`
- **JSON report** → `reports/{key}_YYYY-MM-DDThh-mm-ss.json`

## Workflow

### 1. Run Patrol

```bash
cd /home/admin/.openclaw/workspace/skills/news-patrol/scripts && node index.js
```

The tool fetches each site's homepage, extracts articles from 3 areas（头条区/焦点图区/右侧文字链）, checks all links and page titles, and scans for typos.

### 2. Read Results

Exit code 0 = all OK. Exit code 1 = issues found.

Key fields in terminal output:
- ✅ HTTP 200 — page accessible
- ✅ link — article URL resolves
- ✅ 标题一致 — link title matches page title (after cleaning suffixes)
- ✅ 拼写 — no typos
- ⚠️ 标题不一致 — mismatched title (rare, usually CMS suffix artifacts)

### 3. Generate HTML Report

Use the gen script to create a browsable HTML report with tables:

```bash
node /tmp/gen_report3.js
```

The HTML file is at `/tmp/patrol_report.html`.

To update the gen script for latest data, edit `JSON_FILES` paths in `/tmp/gen_report3.js` to point to the newest JSON reports from `reports/`.

### 4. Push to User

```bash
# Update tracking files
echo "$(date '+%Y-%m-%d %H:%M:%S')" > /tmp/news_patrol_last_run.txt
cp reports/health_latest.txt /tmp/news_patrol_latest_report.txt
echo "pending" > /tmp/news_patrol_push_pending.txt

# Send via message tool
message(channel='openclaw-weixin', filePath='/tmp/patrol_report.html', message='summary text')
```

## Title Comparison Logic

The checker (`lib/checkers.js`) compares link titles vs page `<title>` tags:

- **Strips from link title**: `【】` brackets, `（）` category tags
- **Strips from page title**: `-- 站点名` suffix, `（xxx）` column tags
- Compares first 15 chars of cleaned strings

This prevents false alarms from人民网's CMS auto-appended suffixes like `（大数据观察）` or ` --经济·科技--人民网`.

## Config

`config.json` defines the 3 sites with area selectors and URL patterns. To add a site:

```json
{
  "name": "站点名",
  "key": "unique-key", 
  "url": "http://example.com/",
  "domain": "http://example.com",
  "areas": [
    { "name": "头条区", "selector": "div.title.mt15", "icon": "📰" },
    { "name": "焦点图区", "selector": "div.focus_list", "icon": "🖼️" },
    { "name": "右侧文字链", "selector": "div.news_box", "icon": "🔗" }
  ]
}
```

## Files

| File | Purpose |
|------|---------|
| `index.js` | Main entry, orchestrates patrol across all sites |
| `lib/core.js` | Core patrol loop per site |
| `lib/fetcher.js` | HTTP fetch with error handling |
| `lib/parser.js` | HTML parsing, article extraction |
| `lib/checkers.js` | Link check, title consistency, typo scan |
| `lib/reporter.js` | Text/JSON report generation |
| `config.json` | Site definitions and global settings |
| `run-patrol.sh` | Cron wrapper with push flag |
