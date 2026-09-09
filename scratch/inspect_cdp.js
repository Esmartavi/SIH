const http = require('http');

async function main() {
  const pages = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const page = pages.find(p => p.url.includes('localhost:5173'));
  if (!page) {
    console.log('No localhost:5173 page found');
    return;
  }
  console.log('Found page:', page.title, page.webSocketDebuggerUrl);

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  ws.onopen = () => {
    // Enable runtime console events
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
    ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
    ws.send(JSON.stringify({
      id: 3,
      method: 'Runtime.evaluate',
      params: {
        expression: 'JSON.stringify({ title: document.title, rootHTML: document.getElementById("root")?.innerHTML?.substring(0, 500), bodyText: document.body.innerText.substring(0, 300) })'
      }
    }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id === 3) {
      console.log('DOM Evaluation:', data.result);
      setTimeout(() => ws.close(), 1000);
    }
    if (data.method === 'Runtime.consoleAPICalled') {
      console.log('Console:', data.params.type, data.params.args.map(a => a.value || a.description));
    }
    if (data.method === 'Runtime.exceptionThrown') {
      console.error('Exception thrown:', data.params.exceptionDetails);
    }
  };
}

main().catch(console.error);
