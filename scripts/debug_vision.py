import urllib.request, json, time, os, glob
BASE='http://localhost'
ph=None
for ext in ('*.jpg','*.jpeg','*.png','*.webp','*.JPG','*.PNG'):
    g = glob.glob(os.path.join(r'C:\Users\zjunc\Desktop\vidio photo', ext))
    if g: ph=g[0]; break
print('photo:', os.path.basename(ph))
with open(ph,'rb') as f: content=f.read()
b='----PB'+str(int(time.time()*1000))
data=bytearray()
data += (f'--{b}\r\nContent-Disposition: form-data; name="files"; filename="{os.path.basename(ph)}"\r\nContent-Type: image/jpeg\r\n\r\n').encode() + content + b'\r\n'
data += (f'--{b}--\r\n').encode()
req = urllib.request.Request(BASE+'/api/photos/upload', method='POST', data=bytes(data))
req.add_header('Content-Type', f'multipart/form-data; boundary={b}')
with urllib.request.urlopen(req, timeout=120) as r:
    upl = json.loads(r.read().decode())
pid = upl['photos'][0]['id']
print('photoId', pid)
stxt = json.dumps({'photoIds':[pid],'mode':'FREE','title':'debug'}).encode()
req2 = urllib.request.Request(BASE+'/api/sessions', data=stxt, headers={'Content-Type':'application/json'}, method='POST')
sid = json.loads(urllib.request.urlopen(req2, timeout=60).read().decode())['id']
print('sessionId', sid)
bdy = json.dumps({'sessionId':sid,'style':'free','skipReview':True}).encode()
req3 = urllib.request.Request(BASE+'/api/poems/generate', data=bdy, headers={'Content-Type':'application/json'}, method='POST')
with urllib.request.urlopen(req3, timeout=240) as g:
    obj = json.loads(g.read().decode())
    print('gen poem style:', obj['poem']['style'])
    print(obj['poem']['content'])
    print('meaning:', obj['meaning'].get('coreMeaning'), 'img:', obj['meaning'].get('imagery'))
    if obj['meaning'].get('_features'):
        f = obj['meaning']['_features']
        print('  colors final:', f.get('colors'))
        print('  dbg_dominantColors:', f.get('_dbg_dominantColors'))

print('\n== PhotoAnalysis rows ==')
with urllib.request.urlopen(BASE+'/api/dbg/photo-analysis') as x:
    obj = json.loads(x.read().decode())
    print('count:', obj['count'])
    for r in obj['rows'][:5]:
        print('  photoId:', r['photoId'], 'ai:', r['aiModel'], 'score:', r['aestheticScore'])
        print('    DC raw:', (r['dominantColors'] or '')[:200])
        print('    DC parsed:', r['_dc_parsed'])
        print('    OBJ parsed:', r['_obj_parsed'])
        print('    SC parsed:', r['_sc_parsed'])
