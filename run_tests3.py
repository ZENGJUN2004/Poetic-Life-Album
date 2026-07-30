import urllib.request, urllib.error, json, os, uuid, time, mimetypes

BASE='http://localhost'
IMG=r'C:\Users\zjunc\Desktop\vidio photo\微信图片_20260729210117_1085_66.jpg'
results=[]

def upload_one(path, mime_override=None):
    boundary='--U'+uuid.uuid4().hex[:12]
    name=os.path.basename(path)
    m=mime_override or mimetypes.guess_type(path)[0] or 'image/jpeg'
    raw=open(path,'rb').read()
    body=b'--'+boundary.encode()+b'\r\n'
    body+=f'Content-Disposition: form-data; name="files"; filename="{name}"\r\n'.encode()
    body+=f'Content-Type: {m}\r\n\r\n'.encode()
    body+=raw
    body+=b'\r\n--'+boundary.encode()+b'--\r\n'
    req=urllib.request.Request(BASE+'/api/photos/upload', data=body, headers={'Content-Type': f'multipart/form-data; boundary={boundary}'})
    resp=urllib.request.urlopen(req)
    return json.loads(resp.read().decode())

def post_json(path, obj):
    data=json.dumps(obj).encode()
    req=urllib.request.Request(BASE+path, data=data, headers={'Content-Type': 'application/json'}, method='POST')
    try:
        resp=urllib.request.urlopen(req, timeout=300)
        return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

print('=== 测试3.1：上传测试图 ===')
up=upload_one(IMG)
photo_ids=[p['id'] for p in up.get('photos',[])]
ok=len(photo_ids)>0
print(f'  上传 {len(photo_ids)} 张，photo_ids 前2位:', photo_ids[:2])
results.append(('3.1.上传测试图', ok, '' if ok else '0 photos uploaded'))
if not ok:
    exit(1)

print('\n=== 测试3.2：创建创作会话 ===')
code, data = post_json('/api/sessions', {'photoIds': photo_ids, 'mode': 'FREE', 'title': '测试创作'})
session_id=data.get('id') if isinstance(data,dict) else None
ok = (code == 200 and session_id is not None)
print(f'  HTTP {code}, session_id={session_id}, keys={list(data.keys()) if isinstance(data,dict) else data[:200]}')
results.append(('3.2.创建会话', ok, f'code={code}' if not ok else ''))
if not ok:
    exit(1)

print('\n=== 测试3.3：会话列表GET包含新会话 ===')
lresp=urllib.request.urlopen(BASE+'/api/sessions')
lobj=json.loads(lresp.read().decode())
# Sessions GET returns array or dict?
sessions = lobj if isinstance(lobj, list) else lobj.get('sessions', [])
in_list = any(s.get('id') == session_id for s in sessions)
print(f'  count={len(sessions)}, new_session_in_list={in_list}')
results.append(('3.3.会话列表包含', in_list, ''))

print('\n=== 测试3.4：诗歌生成（全流程：AI分析→意义提取→写诗）===')
t0=time.time()
code, data = post_json('/api/poems/generate', {'sessionId': session_id, 'style': 'free'})
elapsed=time.time()-t0
print(f'  耗时: {elapsed:.1f}s, HTTP={code}')
if isinstance(data, dict):
    poem = data.get('poem')
    meaning = data.get('meaning')
    status = data.get('status')
    ok = (code == 200 and poem is not None and meaning is not None)
    print(f'  poem存在={poem is not None}, meaning存在={meaning is not None}, status={status}')
    if poem:
        print(f'  诗名: {poem.get("title")}')
        content = poem.get('content','')
        lines = content.count('\n') + 1
        print(f'  行数: {lines}, 字数: {poem.get("characterCount") or len(content)}')
        print(f'  风格: {poem.get("style")}')
        if meaning:
            print(f'  核心意义: {meaning.get("coreMeaning","")}')
            print(f'  情感: {meaning.get("emotions",[])}')
            print(f'  意象: {meaning.get("imagery",[])}')
    results.append(('3.4.诗歌生成', ok, f'code={code}' if not ok else ''))
    poem_id = poem.get('id') if poem else None
else:
    results.append(('3.4.诗歌生成', False, f'HTTP {code}: {data[:300] if isinstance(data,str) else str(data)[:300]}'))
    poem_id = None

print('\n=== 测试3.5：诗歌列表包含新生成诗 ===')
presp=urllib.request.urlopen(BASE+'/api/poems')
pobj=json.loads(presp.read().decode())
poems = pobj.get('poems', []) if isinstance(pobj, dict) else []
poem_in_list = any(p.get('id') == poem_id for p in poems) if poem_id else False
print(f'  列表诗歌数: {len(poems)}, 新诗歌in_list={poem_in_list}')
results.append(('3.5.诗歌列表包含', poem_in_list, ''))

passed=sum(1 for r in results if r[1])
total=len(results)
print(f'\n=== 测试3总结: {passed}/{total} 通过 ===')
ok_all=True
for r in results:
    print(f'  [{"OK" if r[1] else "FAIL"}] {r[0]} {r[2]}')
    if not r[1]: ok_all=False

if ok_all:
    # 保存poem_id供后续测试使用
    with open(r'd:\诗意生活相册\_last_test_state.json','w') as f:
        json.dump({'session_id': session_id, 'poem_id': poem_id, 'photo_ids': photo_ids}, f)
    print(f'\n已保存测试上下文: poem_id={poem_id}, session_id={session_id}')

exit(0 if ok_all else 1)
