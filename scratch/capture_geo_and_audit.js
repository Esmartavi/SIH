const http = require('http');
const fs = require('fs');
const path = require('path');

async function captureTab(tabName, filename) {
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

  return new Promise((resolve) => {
    ws.onopen = () => {
      console.log(`Clicking tab ${tabName}`);
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.innerText.includes("${tabName}"));
            if (btn) { btn.click(); 'clicked'; } else { 'not found'; }
          `
        }
      }));

      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 2,
          method: 'Page.captureScreenshot',
          params: { format: 'png' }
        }));
      }, 1000);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === 2 && data.result && data.result.data) {
        const buffer = Buffer.from(data.result.data, 'base64');
        const outPath = path.resolve(`c:/Users/shash/.gemini/antigravity-ide/brain/dfd2f6b4-8daa-43a1-bf1d-a0be038b0371/${filename}`);
        fs.writeFileSync(outPath, buffer);
        console.log(`Saved ${filename}`);
        ws.close();
        resolve();
      }
    };
  });
}

async function run() {
  await captureTab('Geo Vigilance', 'tab_geo_direct.png');
  await captureTab('Audit Ledger', 'tab_audit_direct.png');
}

run().catch(console.error);
