/**
 * HTTP 请求模块
 */
const http = require('http');
const https = require('https');

function fetchUrl(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({
        status: res.statusCode,
        data,
        headers: res.headers,
        url: res.responseUrl || url
      }));
    });
    req.on('error', (e) => reject(e));
    req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')); });
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { fetchUrl, sleep };
