import urllib.request
import ssl
import json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = 'https://mplads.mospi.gov.in/rest/PreLoginDashboardData/getTilesData'
payload = json.dumps({'uname': '0,0,0,2'}).encode('utf-8')
req = urllib.request.Request(url, data=payload, headers={
    'Content-Type': 'application/json; charset=utf-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
})

try:
    with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
        raw = resp.read()
        print('Received bytes:', len(raw))
        text = raw.decode('latin-1', errors='ignore')
        data = json.loads(text)
        print('Tiles data keys:')
        for k in data.keys():
            print(' ', k)
except Exception as e:
    print('Error:', e)
