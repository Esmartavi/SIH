import json
import ssl
import urllib.request
import base64

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = 'https://mplads.mospi.gov.in/rest/PreLoginCitizenWorkRcmdRest/getAttachmentById'
payload = json.dumps({'id': '822763.849949'}).encode('utf-8')
req = urllib.request.Request(url, data=payload, headers={
    'Content-Type': 'application/json; charset=utf-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
})

try:
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        raw = resp.read().decode('latin-1', errors='ignore')
        res = json.loads(raw)
        b64_str = res[0].get('URL', '')
        print("Base64 string length:", len(b64_str))
        binary = base64.b64decode(b64_str)
        print("Decoded binary size:", len(binary), "bytes")
        print("Header magic bytes:", binary[:10])
except Exception as e:
    print("Error:", e)
