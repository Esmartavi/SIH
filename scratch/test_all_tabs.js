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

  const tabs = [
    { label: 'Vendor Rings', out: 'tab_vendor_rings.png' },
    { label: 'Geo Vigilance', out: 'tab_geo_vigilance.png' },
    { label: 'Audit Ledger', out: 'tab_audit_ledger.png' },
    { label: 'Live Flags', out: 'tab_live_flags.png' },
    { label: 'War Room', out: 'tab_war_room.png' }
  ];

  let currentIdx = 0;

  function switchAndCapture() {
    if (currentIdx >= tabs.length) {
      console.log('All tabs captured successfully!');
      ws.close();
      return;
    }

    const t = tabs[currentIdx];
    console.log(`Switching to: ${t.label}`);
    ws.send(JSON.stringify({
      id: 100 + currentIdx,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          const b = Array.from(document.querySelectorAll('nav button')).find(el => el.innerText.trim() === "${t.label}");
          if (b) { b.click(); 'clicked'; } else { 'not found'; }
        `
      }
    }));

    setTimeout(() => {
      ws.send(JSON.stringify({
        id: 200 + currentIdx,
        method: 'Page.captureScreenshot',
        params: { format: 'png' }
      }));
    }, 1200);
  }

  ws.onopen = () => {
    switchAndCapture();
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id >= 200 && data.result && data.result.data) {
      const t = tabs[currentIdx];
      const buffer = Buffer.from(data.result.data, 'base64');
      const outPath = path.resolve(`c:/Users/shash/.gemini/antigravity-ide/brain/dfd2f6b4-8daa-43a1-bf1d-a0be038b0371/${t.out}`);
      fs.writeFileSync(outPath, buffer);
      console.log(`Saved ${t.label} to ${outPath}`);
      currentIdx++;
      setTimeout(switchAndCapture, 400);
    }
  };
}

main().catch(console.error);
