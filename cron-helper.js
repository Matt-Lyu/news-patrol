// Helper script to create a cron job via the gateway WebSocket API
// This connects with the stored auth token

const WebSocket = require('ws');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const GATEWAY_URL = 'ws://127.0.0.1:18692';
// Read stored device identity
const stateDir = path.join(process.env.HOME || '/home/admin', '.openclaw');
const config = JSON.parse(fs.readFileSync(path.join(stateDir, 'openclaw.json'), 'utf8'));

async function main() {
  const ws = new WebSocket(GATEWAY_URL);
  
  ws.on('open', () => {
    console.log('Connected');
    
    // Send connect request with stored token
    const connectMsg = {
      id: crypto.randomUUID(),
      type: 'request',
      method: 'connect',
      params: {
        token: config.gateway.auth.token,
        clientInfo: { name: 'cron-helper', version: '1.0.0' }
      }
    };
    ws.send(JSON.stringify(connectMsg));
  });
  
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    console.log('Message type:', msg.type, 'method:', msg.method, 'ok:', msg.ok);
    
    if (msg.type === 'response' && msg.method === 'connect') {
      if (msg.ok) {
        // Now add cron job
        const cronPayload = {
          id: crypto.randomUUID(),
          type: 'request',
          method: 'cron.add',
          params: {
            name: 'news-patrol-daily',
            cron: '0 9,14,20 * * *',
            tz: 'Asia/Shanghai',
            channel: 'openclaw-weixin',
            to: 'o9cq80w6dlGTF1Mq27bg0hC_MiQU@im.wechat',
            account: '1f1aac3300a9-im-bot',
            announce: true,
            timeoutSeconds: 300,
            lightContext: true,
            session: 'isolated',
            message: '运行新闻巡查工具，巡查所有站点（finance/ent/health）。巡查脚本: node /home/admin/.openclaw/workspace/news-patrol/index.js。运行完成后，读取 reports/ 目录下最新的文本报告，把完整的巡查报告推送给我。注意：要先 cd /home/admin/.openclaw/workspace/news-patrol/ 再运行。'
          }
        };
        ws.send(JSON.stringify(cronPayload));
        console.log('Cron add request sent');
      } else {
        console.error('Connect failed:', msg.error);
      }
    }
    
    if (msg.type === 'response' && msg.method === 'cron.add') {
      if (msg.ok) {
        console.log('Cron job created successfully!');
        console.log(JSON.stringify(msg.payload, null, 2));
      } else {
        console.error('Cron add failed:', JSON.stringify(msg.error));
      }
      ws.close();
    }
    
    if (msg.type === 'response' && !msg.ok) {
      console.error('Error:', JSON.stringify(msg.error));
      if (msg.error?.code === 'AUTH_UNAUTHORIZED') {
        console.log('Trying with device identity...');
        // Would need device pairing
      }
    }
  });
  
  ws.on('error', (e) => console.error('WS error:', e.message));
  ws.on('close', () => { console.log('Disconnected'); process.exit(0); });
  
  setTimeout(() => { console.log('Timeout'); process.exit(1); }, 10000);
}

main();
