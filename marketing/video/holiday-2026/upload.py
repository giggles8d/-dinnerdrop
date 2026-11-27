"""PUT each finished Short to the Higgsfield upload URL that media_upload returned (read from a JSON file of
{"uploads":[{upload_url, media_id, url, instructions}]}), so Publer can pull the public URL.
Usage: python upload.py <uploads.json>   Prints media_id, public url and HTTP status per file. Never prints the signed URL."""
import glob, json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ups = json.load(open(sys.argv[1], encoding='utf-8'))['uploads']
for u in ups:
    name = re.search(r'--data-binary @(\S+\.mp4)', u['instructions']).group(1)
    hits = glob.glob(os.path.join(HERE, '*', name))
    if not hits:
        print('MISSING', name); continue
    for extra in ([], ['-H', 'If-None-Match: *']):
        r = subprocess.run(['curl', '-s', '-o', os.devnull, '-w', '%{http_code}', '-X', 'PUT', '-H', 'Content-Type: video/mp4', *extra,
                            '--data-binary', '@' + hits[0], u['upload_url']], capture_output=True, text=True)
        if r.stdout.strip() == '200':
            break
    print(name, os.path.getsize(hits[0]), 'HTTP', r.stdout.strip(), u['media_id'], u['url'])
