import urllib.request
import ssl
import re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://mplads.mospi.gov.in/digigov/dashboard.html"
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
req = urllib.request.Request(url, headers=headers)

try:
    with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
        html = resp.read().decode("utf-8", errors="ignore")
    
    with open("scratch/dashboard_dump.html", "w", encoding="utf-8") as f:
        f.write(html)
    print("Saved HTML, length:", len(html))
    
    scripts = re.findall(r'<script[^>]*src=[\'"]([^\'"]+)[\'"]', html)
    print("\nScripts found:")
    for s in scripts:
        print(" -", s)
        
    links = re.findall(r'<a[^>]*href=[\'"]([^\'"]+)[\'"]', html)
    print("\nLinks found:")
    for l in links[:20]:
        print(" -", l)
except Exception as e:
    print("Error:", e)
