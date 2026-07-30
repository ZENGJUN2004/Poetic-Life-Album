"""Full e2e test that:
  1. Picks N photos from C:\\Users\\zjunc\\Desktop\\vidio photo
  2. Uploads each (so heuristic analysis is cached at upload time)
  3. For each photo, creates 5 sessions with 5 styles → generates poem
  4. Prints: photo filename → heuristic features → core meaning → poems/styles

Goal: verify the generated poem content actually correlates with the photo's
real visual features (not with URL hash anymore).
"""
import os, urllib.request, urllib.error, json, time, sys, glob, random

BASE = "http://localhost"
PHOTO_DIR = r"C:\Users\zjunc\Desktop\vidio photo"
STYLES = ["free", "classical", "haiku", "modern", "cinquain"]
N_PHOTOS = 3

def http(method, path, body=None, files=None):
    req = urllib.request.Request(BASE + path, method=method)
    if files:
        boundary = "----prB" + str(int(time.time()*1000))
        data = bytearray()
        for name, flist in files.items():
            for (fname, fbytes, ftype) in flist:
                data += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"; filename=\"{fname}\"\r\nContent-Type: {ftype}\r\n\r\n").encode()
                data += fbytes; data += b"\r\n"
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
    try:
        with urllib.request.urlopen(req, timeout=240) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")

def collect_photos():
    if not os.path.isdir(PHOTO_DIR): return []
    out = []
    for ext in ("*.jpg", "*.jpeg", "*.png", "*.webp", "*.JPG", "*.PNG"):
        out.extend(glob.glob(os.path.join(PHOTO_DIR, ext)))
    random.seed(42)
    random.shuffle(out)
    return out[:N_PHOTOS]

photos = collect_photos()
if not photos:
    print("No test photos. Abort."); sys.exit(1)

def analyze(features):
    f = features or {}
    s = f.get('_features') or {}
    return (s.get('scenes',[]), s.get('objects',[]), s.get('colors',[]), s.get('stats',{}))

# Also fetch PhotoAnalysis DB dump route? There's none — but /api/poems/generate
# returns the meaning._features if we exposed it. Let's just check the returned
# meaning.imagery / emotions and poem content — we know now that they're derived
# from photoAnalysis cached rows (create route at upload writes the heuristic).

print(f"Testing {len(photos)} photos × {len(STYLES)} styles.\n")

# For each photo: upload once, reuse photoId
for idx, p in enumerate(photos):
    fname = os.path.basename(p)
    with open(p, "rb") as f:
        content = f.read()
    st, txt = http("POST", "/api/photos/upload", files={"files": [(fname, content, "image/jpeg")]})
    print(f"[{idx+1}/{len(photos)}] Upload {fname}: {st}")
    if st != 200:
        print("  ERR:", txt[:500]); continue
    upl = json.loads(txt)
    if not upl.get("photos"):
        print("  No photos returned:", upl); continue
    pid = upl["photos"][0]["id"]

    print(f"  photoId={pid}")
    for s in STYLES:
        st, txt = http("POST", "/api/sessions", json.dumps({"photoIds":[pid],"mode":"FREE","title":f"{fname}-{s}"}))
        if st != 200:
            print(f"  [{s}] session FAIL: {txt[:300]}"); continue
        sid = json.loads(txt)["id"]
        st, txt = http("POST", "/api/poems/generate",
                       json.dumps({"sessionId":sid,"style":s,"skipReview":True}))
        if st != 200:
            print(f"  [{s}] generate FAIL {st}: {txt[:300]}"); continue
        d = json.loads(txt)
        meaning = d.get("meaning") or {}
        poem = d.get("poem") or {}
        print(f"\n  ==== {s} ====")
        print(f"  meaning.coreMeaning : {meaning.get('coreMeaning','')}")
        print(f"  meaning.emotions    : {meaning.get('emotions',[])}")
        print(f"  meaning.imagery     : {meaning.get('imagery',[])}")
        feats = meaning.get('_features') or {}
        if feats:
            print(f"  features.scenes     : {feats.get('scenes',[])}")
            print(f"  features.objects    : {feats.get('objects',[])}")
            print(f"  features.colors     : {feats.get('colors',[])}")
            print(f"  features.dbg_colors : {feats.get('_dbg_dominantColors')}")
            st_ = feats.get('stats',{})
            if st_:
                print(f"  stats(lum/contr/warm/sat/ent/green/blue/asp): "
                      f"L={st_.get('avgLum'):.0f} C={st_.get('contrast'):.2f} "
                      f"W={st_.get('warmth'):+.2f} S={st_.get('saturation'):.2f} "
                      f"E={st_.get('entropy'):.2f} Gn={st_.get('green'):.2f} "
                      f"B={st_.get('blue'):.2f} {st_.get('aspect')}")
        print(f"  poem [{poem.get('style')}]:")
        for ln in str(poem.get('content','')).split('\n'):
            print(f"    {ln}")
    print("=" * 72, "\n")
