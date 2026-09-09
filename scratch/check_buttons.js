const http = require('http');

async function test() {
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
        expression: 'JSON.stringify(Array.from(document.querySelectorAll("nav button")).map(b => ({ text: b.textContent, className: b.className })))'
      }
    }));
  };
  ws.onmessage = (e) => {
    console.log('Nav buttons:', JSON.parse(e.data).result);
    ws.close();
  };
}

test();
