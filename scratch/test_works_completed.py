import urllib.request
import ssl
import json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = 'https://mplads.mospi.gov.in/rest/PreLoginDashboardData/getTilesReportData'
payload = json.dumps({'combo': '0,0,0,2', 'key': 'Works Completed'}).encode('utf-8')
req = urllib.request.Request(url, data=payload, headers={
    'Content-Type': 'application/json; charset=utf-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
})

try:
    with urllib.request.urlopen(req, context=ctx, timeout=25) as resp:
        raw = resp.read()
        print('Received bytes:', len(raw))
        text = raw.decode('latin-1', errors='ignore')
        data = json.loads(text)
        print('Type:', type(data))
        if isinstance(data, dict):
            for k, v in data.items():
                print(f'Key {k}: count={len(v) if isinstance(v, list) else type(v)}')
                if isinstance(v, list) and len(v) > 0:
                    print(' Sample item:', v[0])
                    # Count how many have FILE_STATUS
                    has_img = sum(1 for row in v if row.get('FILE_STATUS') or row.get('ATTACH_ID'))
                    print(f' Rows with image/attachment: {has_img} / {len(v)}')
except Exception as e:
    print('Error:', e)
