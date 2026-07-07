#!/bin/bash
# 新闻巡查包装脚本 - 由cron调用
# 运行巡查并推送报告到微信

cd /home/admin/.openclaw/workspace/news-patrol/
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[${TIMESTAMP}] 开始巡查..."
node index.js 2>&1
EXIT_CODE=$?

LATEST_REPORT=$(ls -t reports/*.txt 2>/dev/null | head -1)
if [ -n "$LATEST_REPORT" ]; then
  echo "$TIMESTAMP" > /tmp/news_patrol_last_run.txt
  cp "$LATEST_REPORT" /tmp/news_patrol_latest_report.txt 2>/dev/null
  echo "pending" > /tmp/news_patrol_push_pending.txt
  echo "$LATEST_REPORT" >> /tmp/news_patrol_push_pending.txt
fi

echo "[${TIMESTAMP}] 巡查完成 (exit=$EXIT_CODE)"
exit $EXIT_CODE
