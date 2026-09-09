const http = require('http');
const fs = require('fs');
const path = require('path');

async function testClickGeo() {
  const pages = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });

  const page = pages.find(p => p.url.includes('localhost:5173'));
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => {
          const btn = Array.from(document.querySelectorAll("nav button")).find(b => b.textContent.includes("Geo Vigilance"));
          if (!btn) return "btn not found";
          btn.click();
          return "clicked";
        })()`
      }
    }));
    setTimeout(() => {
      ws.send(JSON.stringify({
        id: 2,
        method: 'Page.captureScreenshot',
        params: { format: 'png' }
      }));
    }, 1500);
  };

  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.id === 1) {
      console.log('Click result:', data.result);
    }
    if (data.id === 2 && data.result && data.result.data) {
      const buffer = Buffer.from(data.result.data, 'base64');
      const outPath = path.resolve('c:/Users/shash/.gemini/antigravity-ide/brain/dfd2f6b4-8daa-43a1-bf1d-a0be038b0371/tab_geo_live.png');
      fs.writeFileSync(outPath, buffer);
      console.log('Saved Geo Vigilance to:', outPath);
      ws.close();
    }
  };
}

testClickGeo();
