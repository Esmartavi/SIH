import json
import ssl
import urllib.request

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = 'https://mplads.mospi.gov.in/rest/PreLoginDashboardData/getTilesReportData'
payload = json.dumps({'combo': '0,0,0,2', 'key': 'Works Completed'}).encode('utf-8')
req = urllib.request.Request(url, data=payload, headers={
    'Content-Type': 'application/json; charset=utf-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
})

with urllib.request.urlopen(req, context=ctx, timeout=35) as resp:
    raw = resp.read()
    text = raw.decode('latin-1', errors='ignore')
    data = json.loads(text)

raw_works_str = data.get("Total Works Completed", "[]")
works = json.loads(raw_works_str)
print(f"Total Works: {len(works)}")

with_images = [w for w in works if w.get('FILE_STATUS') and str(w.get('FILE_STATUS')).strip() not in ('', 'None', 'null')]
print(f"Works with Images/Attachments: {len(with_images)}")

if with_images:
    sample = with_images[0]
    print("Sample work with image:")
    for k, v in sample.items():
        print(f"  {k}: {v}")
