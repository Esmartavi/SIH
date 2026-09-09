import json
import ssl
import urllib.request
import base64
import os

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    'Content-Type': 'application/json; charset=utf-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
}

def post_json(url, data):
    payload = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=payload, headers=HEADERS)
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        text = resp.read().decode('latin-1', errors='ignore')
        return json.loads(text)

# Test 1: Fetch attach IDs for Mahesh Sharma work or Premachandran work
test_work_id = 56999
test_flag = 3

print(f"Testing work_id={test_work_id}, flag={test_flag}...")
res = post_json('https://mplads.mospi.gov.in/rest/PreLoginDashboardData/getAttachIdsbyFlag', {'json': {'FLAG': test_flag, 'WORK_ID': test_work_id}})
print("Result:", res)

if res and isinstance(res, list) and len(res) > 0:
    file_names = res[0].get('FILE_NAME', [])
    attach_ids = res[0].get('ATTACH_ID', [])
    for fn, aid in zip(file_names, attach_ids):
        if fn != 'File not available.':
            print(f"Downloading {fn} (ID: {aid})...")
            doc_res = post_json('https://mplads.mospi.gov.in/rest/PreLoginCitizenWorkRcmdRest/getAttachmentById', {'id': str(aid)})
            b64_content = doc_res[0].get('URL', '')
            print(f"Downloaded! Base64 size: {len(b64_content)}")
            bin_data = base64.b64decode(b64_content)
            print(f"Binary size: {len(bin_data)} bytes. Header: {bin_data[:8]}")
