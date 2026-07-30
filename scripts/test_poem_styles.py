"""Test 5 poem styles produce DIFFERENT content with the same photo meaning.

Matches real frontend flow:
  1. POST /api/photos/upload  with multipart FormData field "files"
  2. POST /api/sessions  {photoIds, mode: "FREE"}
  3. POST /api/poems/generate {sessionId, style, skipReview: true}
"""
import os, urllib.request, urllib.error, json, time, sys, glob

BASE = "http://localhost"
PHOTO_DIR = r"C:\Users\zjunc\Desktop\vidio photo"

def http(method, path, body=None, headers=None, files=None, field_name="files"):
    req = urllib.request.Request(BASE + path, method=method)
    if files:
        boundary = "----prB" + str(int(time.time()*1000))
        data = bytearray()
        for name, flist in files.items():
            for (fname, fbytes, ftype) in flist:
                data += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"; filename=\"{fname}\"\r\nContent-Type: {ftype}\r\n\r\n").encode()
                data += fbytes
                data += b"\r\n"
        if body:
            for fn, val in body.items():
                data += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{fn}\"\r\n\r\n{val}\r\n").encode()
        data += (f"--{boundary}--\r\n").encode()
        req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
        req.data = bytes(data)
    else:
        req.add_header("Content-Type", "application/json")
        if body is not None:
            req.data = body.encode() if isinstance(body, str) else body
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")

def find_test_photo():
    if not os.path.isdir(PHOTO_DIR):
        print(f"[SKIP] photo dir not found: {PHOTO_DIR}")
        return None
    for ext in ("*.jpg", "*.jpeg", "*.png", "*.webp", "*.JPG", "*.PNG"):
        g = glob.glob(os.path.join(PHOTO_DIR, ext))
        if g:
            return g[0]
    return None

photo_path = find_test_photo()
if not photo_path:
    print("No photo available; aborting.")
    sys.exit(1)

with open(photo_path, "rb") as f:
    photo_bytes = f.read()
fname = os.path.basename(photo_path)

# Upload once, reuse the photoId across sessions so meaning seed is identical
st, txt = http("POST", "/api/photos/upload", files={"files": [(fname, photo_bytes, "image/jpeg")]})
print(f"[upload] {fname} -> {st}")
if st != 200:
    print(txt[:1000])
    sys.exit(1)
uploaded = json.loads(txt)
if not uploaded.get("photos"):
    print("upload returned no photos:", uploaded)
    sys.exit(1)
pids = [p["id"] for p in uploaded["photos"]]
print(f"  photoIds = {pids}")

styles = ["free", "classical", "haiku", "modern", "cinquain"]
results = {}
for s in styles:
    # new session (so CSM not state-confused), same photoId so meaning content similar
    st, txt = http("POST", "/api/sessions", json.dumps({"photoIds": pids, "mode": "FREE", "title": f"style-{s}-{int(time.time()*1000)}"}))
    if st != 200:
        print(f"[session {s}] FAIL {st}: {txt[:400]}")
        results[s] = None
        continue
    fresh_sid = json.loads(txt)["id"]
    print(f"[{s}] sid={fresh_sid} generating...", flush=True)
    st, txt = http("POST", "/api/poems/generate", json.dumps({"sessionId": fresh_sid, "style": s, "skipReview": True}))
    print(f"  status={st}", flush=True)
    if st == 200:
        data = json.loads(txt)
        results[s] = {
            "content": data["poem"]["content"],
            "style": data["poem"]["style"],
            "coreMeaning": data.get("meaning", {}).get("coreMeaning", ""),
            "emotions": data.get("meaning", {}).get("emotions", []),
            "imagery": data.get("meaning", {}).get("imagery", []),
        }
    else:
        results[s] = None
        print(f"  ERR: {txt[:600]}")

print("\n==== OUTPUTS ====\n")
for s, r in results.items():
    if not r:
        print(f"[{s}] (failed)")
    else:
        print(f"[{s}]   style-stored={r['style']}   meaning={r['coreMeaning']}")
        print(f"    emo={r['emotions']}  imagery={r['imagery']}")
        print(r["content"])
    print("---")

# pairwise content comparison
styles_done = [s for s in styles if results.get(s)]
pairs = []
for i, a in enumerate(styles_done):
    for b in styles_done[i+1:]:
        same = results[a]["content"] == results[b]["content"]
        pairs.append(((a,b), same, a==b and "identical" or "different"))
ok = sum(1 for _, same, _ in pairs if not same)
tot = len(pairs)
print(f"\nPairwise distinct: {ok}/{tot}")
for (a,b), same, _ in pairs:
    print(f"  {a:12s} vs {b:12s}: {'SAME (BUG!)' if same else 'different ✓'}")

# Also check style was correctly persisted
style_matches = all(results[s]["style"] == s for s in styles_done)
print(f"\nPersisted style matches requested: {style_matches}")
for s in styles_done:
    print(f"  asked={s:12s} stored={results[s]['style']}")

sys.exit(0 if (ok == tot and style_matches and tot > 0) else 2)
