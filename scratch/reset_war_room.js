const http = require('http');

async function resetToWarRoom() {
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
          const btn = Array.from(document.querySelectorAll("nav button")).find(b => b.textContent.includes("War Room"));
          if (btn) btn.click();
          return "reset to war room";
        })()`
      }
    }));
    setTimeout(() => ws.close(), 500);
  };
}

resetToWarRoom();
