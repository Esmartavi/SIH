import json
import ssl
import urllib.request
import base64
import os

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = 'https://mplads.mospi.gov.in/rest/PreLoginCitizenWorkRcmdRest/getAttachmentById'
payload = json.dumps({'id': 822763}).encode('utf-8')
req = urllib.request.Request(url, data=payload, headers={
    'Content-Type': 'application/json; charset=utf-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
})

try:
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        raw = resp.read().decode('latin-1', errors='ignore')
        res = json.loads(raw)
        print("Response received! Type:", type(res), "Length:", len(res))
        if isinstance(res, list) and len(res) > 0:
            b64_str = res[0].get('URL', '')
            print("Base64 string length:", len(b64_str))
            # decode first 50 bytes of binary
            binary = base64.b64decode(b64_str)
            print("Decoded binary size:", len(binary), "bytes")
            print("Header magic bytes:", binary[:10])
            
            # Let's save a test file
            ext = ".pdf" if binary.startswith(b'%PDF') else ".jpg"
            test_path = os.path.join("scratch", f"download_test_822763{ext}")
            with open(test_path, "wb") as f:
                f.write(binary)
            print(f"Saved test file successfully to {test_path}!")
except Exception as e:
    print("Error:", e)
