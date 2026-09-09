import json
import ssl
import urllib.request

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = 'https://mplads.mospi.gov.in/rest/PreLoginDashboardData/getAttachIdsbyFlag'
payload = json.dumps({'json': {'FLAG': 3, 'WORK_ID': 56999}}).encode('utf-8')
req = urllib.request.Request(url, data=payload, headers={
    'Content-Type': 'application/json; charset=utf-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
})

try:
    with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
        raw = resp.read().decode('latin-1', errors='ignore')
        res = json.loads(raw)
        print("getAttachIdsbyFlag Response:", res)
except Exception as e:
    print("Error:", e)
