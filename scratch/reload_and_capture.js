const http = require('http');
const fs = require('fs');
const path = require('path');

async function main() {
  const pages = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const page = pages.find(p => p.url.includes('localhost:5173'));
  if (!page) return;

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  ws.onopen = () => {
    // Reload page to refresh all module state
    ws.send(JSON.stringify({
      id: 1,
      method: 'Page.reload',
      params: { ignoreCache: true }
    }));
    setTimeout(() => {
      // Click on Benford's Law tab
      ws.send(JSON.stringify({
        id: 2,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("Benford's Law"));
            if (btn) btn.click();
          `
        }
      }));
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 3,
          method: 'Page.captureScreenshot',
          params: { format: 'png' }
        }));
      }, 1500);
    }, 1500);
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id === 3 && data.result && data.result.data) {
      const buffer = Buffer.from(data.result.data, 'base64');
      const outPath = path.resolve('c:/Users/shash/.gemini/antigravity-ide/brain/dfd2f6b4-8daa-43a1-bf1d-a0be038b0371/frontend_live_benford_refreshed.png');
      fs.writeFileSync(outPath, buffer);
      console.log('Saved refreshed Benford Tab screenshot to:', outPath);
      ws.close();
    }
  };
}

main().catch(console.error);
