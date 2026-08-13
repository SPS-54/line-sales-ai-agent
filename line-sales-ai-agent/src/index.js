import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { processUserMessage } from './services/geminiAgent.js';

import { getLineUserProfile, getLineGroupSummary } from './services/lineProfileService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '../public');

// MIME types for static file serving
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  // CORS & ngrok bypass Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('ngrok-skip-browser-warning', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end('OK');
    return;
  }

  const urlPath = req.url.split('?')[0];

  // 1. Web Chat Simulator REST API Endpoint: POST /api/chat
  if (req.method === 'POST' && urlPath === '/api/chat') {
    let bodyText = '';
    req.on('data', chunk => { bodyText += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(bodyText || '{}');
        const message = payload.message || '';
        if (!message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Message is required' }));
          return;
        }

        const contextId = payload.contextId || payload.userId || 'default';
        const result = await processUserMessage(message, contextId);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 2. LINE Messaging API Webhook Endpoint: POST/GET /webhook or POST /
  if ((urlPath === '/webhook' || urlPath === '/') && req.method === 'POST') {
    let bodyText = '';
    req.on('data', chunk => { bodyText += chunk; });
    req.on('end', async () => {
      try {
        const body = JSON.parse(bodyText || '{}');
        const events = body.events || [];
        console.log(`[LINE Webhook Received]: ${events.length} events`);
        
        for (const event of events) {
          if (event.type === 'message' && event.message && event.message.type === 'text') {
            const userText = event.message.text;
            const source = event.source || {};
            const contextId = source.groupId || source.roomId || source.userId || 'default';

            // 🟢 ดึงและสะสมชื่อโปรไฟล์ไลน์ (LINE Display Name) และชื่อกลุ่มจาก LINE API อัตโนมัติ
            if (source.userId) {
              getLineUserProfile(source.userId, source.groupId).catch(() => {});
            }
            if (source.groupId) {
              getLineGroupSummary(source.groupId).catch(() => {});
            }

            console.log(`[User LINE Msg (${contextId})]: ${userText}`);
            const aiResult = await processUserMessage(userText, contextId, source.userId);
            
            if (!aiResult) {
              console.log(`[LINE Reply Ignored]: Context (${contextId}) / User (${source.userId}) is not registered.`);
              continue;
            }
            
            // Reply via LINE Messaging API if Access Token is provided
            if (config.line.channelAccessToken && config.line.channelAccessToken !== 'your_line_channel_access_token_here') {
              const messagesToSend = [];
              if (aiResult.text) messagesToSend.push({ type: 'text', text: aiResult.text });
              if (aiResult.flexMessage) {
                if (Array.isArray(aiResult.flexMessage)) {
                  aiResult.flexMessage.filter(Boolean).forEach(flex => messagesToSend.push(flex));
                } else {
                  messagesToSend.push(aiResult.flexMessage);
                }
              }

              const replyRes = await fetch('https://api.line.me/v2/bot/message/reply', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${config.line.channelAccessToken.trim()}`
                },
                body: JSON.stringify({
                  replyToken: event.replyToken,
                  messages: messagesToSend
                })
              });
              if (!replyRes.ok) {
                const errBody = await replyRes.text();
                console.error(`[LINE Reply Error ${replyRes.status}]:`, errBody);
              } else {
                console.log('[LINE Reply Sent Successfully]');
              }
            } else {
              console.log('[Mock LINE Reply]:', aiResult.text);
            }
          }
        }
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
      } catch (err) {
        console.error('Webhook Error:', err.message);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
      }
    });
    return;
  }

  if (urlPath === '/webhook' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  // 3. Health Check: GET /health
  if (req.method === 'GET' && urlPath === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'online', service: 'LINE AI Sales Assistant Agent' }));
    return;
  }

  // 4. Static Files Serving (public/index.html)
  let filePath = path.join(publicDir, urlPath === '/' ? 'index.html' : urlPath);
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 Not Found</h1>');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(config.port, () => {
  console.log(`=================================================`);
  console.log(`🚀 LINE AI Sales Assistant Agent Server Online!`);
  console.log(`📍 Web Chat Simulator: http://localhost:${config.port}`);
  console.log(`🔗 Webhook Endpoint:  http://localhost:${config.port}/webhook`);
  console.log(`=================================================`);

  // Self-Ping Keep Alive to prevent Render free instance from sleeping
  const renderUrl = process.env.RENDER_EXTERNAL_URL || 'https://line-sales-ai-agent.onrender.com';
  console.log(`[Keep-Alive]: Self-ping initialized for ${renderUrl}`);
  setInterval(() => {
    fetch(`${renderUrl}/health`)
      .then(r => r.json())
      .then(d => console.log(`[Keep-Alive Ping OK]: ${d.status}`))
      .catch(e => console.log(`[Keep-Alive Ping Note]: ${e.message}`));
  }, 5 * 60 * 1000);
});
