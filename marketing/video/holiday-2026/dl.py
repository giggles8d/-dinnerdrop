"""Download Higgsfield voiceover clips listed in vo_manifest.json into each Short's folder (holiday push, Nov 27 2026)."""
import json, os, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = 'https://d8j0ntlcm91z4.cloudfront.net/user_3F5CX7FQgyc63KXE3gzU1BCzjOk/hf_20261127_'
for dest, tail in json.load(open(os.path.join(HERE, 'vo_manifest.json'))).items():
    out = os.path.join(HERE, dest)
    if os.path.exists(out) and os.path.getsize(out) > 1000:
        continue
    os.makedirs(os.path.dirname(out), exist_ok=True)
    urllib.request.urlretrieve(BASE + tail + '.wav', out)
    print('got', dest, os.path.getsize(out))
