import urllib.request, urllib.error, json

BASE='http://localhost'
results=[]

# Create fresh poem via full flow first
import mimetypes, os, uuid, time
IMG=r'C:\Users\zjunc\Desktop\vidio photo\微信图片_20260729210117_1085_66.jpg'

def upload_one(path):
    name=os.path.basename(IMG); m=mimetypes.guess_type(IMG)[0]; raw=open(IMG,'rb').read()
    boundary='B'+uuid.uuid4().hex[:10]
    body=b'--'+boundary.encode()+b'\r\n'
    body+=f'Content-Disposition: form-data; name="files"; filename="{name}"\r\n'.encode()
    body+=f'Content-Type: {m}\r\n\r\n'.encode()+raw+b'\r\n--'+boundary.encode()+b'--\r\n'
    req=urllib.request.Request(BASE+'/api/photos/upload', data=body, headers={'Content-Type': f'multipart/form-data; boundary={boundary}'})
    return json.loads(urllib.request.urlopen(req).read())['photos'][0]

def req(method, path, obj=None):
    data=None; headers={}
    if obj is not None:
        data=json.dumps(obj).encode(); headers['Content-Type']='application/json'
    r=urllib.request.Request(BASE+path, data=data, headers=headers, method=method)
    try:
        resp=urllib.request.urlopen(r, timeout=60)
        body=resp.read().decode()
        try: j=json.loads(body)
        except: j=body
        return resp.status, j
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

# Setup: create fresh poem (no dependency on _last_test_state)
print('=== 准备：新建一首诗 ===')
photo=upload_one(IMG)
_, s=req('POST','/api/sessions', {'photoIds':[photo['id']],'mode':'FREE','title':'测试诗集'})
sid=s['id'] if isinstance(s,dict) else None
if not sid:
    print('FATAL: 创建会话失败', s); exit(1)
_, g=req('POST','/api/poems/generate', {'sessionId':sid,'style':'free'})
poem_id=None
if isinstance(g,dict) and g.get('poem'):
    poem_id=g['poem']['id']
    print(f'  poem_id={poem_id}')
else:
    print('FATAL: generate失败:', str(g)[:300]); exit(1)

print('\n=== 测试4.1：诗集列表API包含新生成诗 ===')
code, data = req('GET', '/api/poems')
poems = data.get('poems', []) if isinstance(data, dict) else []
id_found = any(p['id'] == poem_id for p in poems)
print(f'  code={code}, count={len(poems)}, id_found_in_list={id_found}')
results.append(('4.1.诗集列表API', code==200 and id_found, ''))

print('\n=== 测试4.2：/poems 列表页 SSR 200 ===')
resp=urllib.request.urlopen(BASE+'/poems', timeout=30)
html=resp.read().decode('utf-8','ignore')
ok = resp.status==200 and len(html)>5000 and ('诗集' in html or '诗意' in html)
print(f'  code=200, size={len(html)}, contains_keyword={ok}')
results.append(('4.2./poems列表页', ok, ''))

print('\n=== 测试4.3：诗歌详情API /api/poems/<id> 直接返回poem对象，含 title+content+style ===')
code, obj = req('GET', f'/api/poems/{poem_id}')
is_poem = isinstance(obj, dict) and obj.get('id') == poem_id and obj.get('title') and obj.get('content')
print(f'  code={code}, id_match={isinstance(obj,dict) and obj.get("id")==poem_id}, has_title={bool(isinstance(obj,dict) and obj.get("title"))}, has_content={bool(isinstance(obj,dict) and obj.get("content"))}, viewCount={obj.get("viewCount") if isinstance(obj,dict) else None}')
results.append(('4.3.诗歌详情API', code==200 and is_poem, f'code={code}'))

print('\n=== 测试4.4：/poems/<id> 详情页 SSR 200 ===')
resp=urllib.request.urlopen(BASE+f'/poems/{poem_id}', timeout=30)
html=resp.read().decode('utf-8','ignore')
ok = resp.status==200 and len(html) > 5000
print(f'  code={resp.status}, size={len(html)}')
results.append(('4.4./poems/<id>详情页', ok, f'code={resp.status}'))

print('\n=== 测试4.5：编辑诗歌 PATCH 修改 title/isPublic/content ===')
new_title = '（已编辑）时光之诗'
new_content = '新的诗歌内容\n第二行\n第三行\n第四行'
code, obj = req('PATCH', f'/api/poems/{poem_id}', {'title': new_title, 'isPublic': True, 'content': new_content})
title_ok = isinstance(obj,dict) and obj.get('title') == new_title
public_ok = isinstance(obj,dict) and obj.get('isPublic') == True
content_ok = isinstance(obj,dict) and obj.get('content') == new_content
has_rev = isinstance(obj,dict)  # revision created elsewhere
print(f'  code={code}, title_ok={title_ok}, public_ok={public_ok}, content_ok={content_ok}')
results.append(('4.5.编辑PATCH', code==200 and title_ok and public_ok and content_ok, f'code={code}'))

# verify revisions exist via detail API
code2, obj2 = req('GET', f'/api/poems/{poem_id}')
revisions = obj2.get('revisions', []) if isinstance(obj2,dict) else []
print(f'  revisions 数量: {len(revisions)}')
results.append(('4.5b.编辑后产生历史版本', len(revisions)>=1, f'revisions={len(revisions)}'))

print('\n=== 测试4.6：公共诗集 /api/poems?public=true 包含刚才已发布的诗 ===')
code, data = req('GET', '/api/poems?public=true')
poems_pub = data.get('poems', []) if isinstance(data, dict) else []
in_public = any(p['id'] == poem_id for p in poems_pub)
print(f'  code={code}, public_poems_count={len(poems_pub)}, in_public={in_public}')
results.append(('4.6.公共诗集包含已发布诗', code==200 and in_public, f'code={code}'))

print('\n=== 测试4.7：探索页 /explore SSR 200 展示公共作品 ===')
resp=urllib.request.urlopen(BASE+'/explore', timeout=30)
html=resp.read().decode('utf-8','ignore')
ok = resp.status==200 and len(html)>5000
print(f'  code={resp.status}, size={len(html)}')
results.append(('4.7./explore探索页', ok, f'code={resp.status}'))

print('\n=== 测试4.8：删除诗歌 ===')
code, obj = req('DELETE', f'/api/poems/{poem_id}')
del_ok = code==200 and isinstance(obj, dict) and obj.get('success')==True
print(f'  code={code}, success={obj.get("success") if isinstance(obj,dict) else obj}')
results.append(('4.8.删除诗歌', del_ok, f'code={code}'))

print('\n=== 测试4.9：删除后不再出现在列表 ===')
code, data = req('GET', '/api/poems')
poems2 = data.get('poems', []) if isinstance(data, dict) else []
in_list = any(p['id'] == poem_id for p in poems2)
results.append(('4.9.删除后列表不含', not in_list, f'in_list={in_list}'))
print(f'  in_list={in_list}')

passed=sum(1 for r in results if r[1])
total=len(results)
print(f'\n=== 测试4总结: {passed}/{total} 通过 ===')
ok_all=True
for r in results:
    print(f'  [{"OK" if r[1] else "FAIL"}] {r[0]} {r[2]}')
    if not r[1]: ok_all=False
exit(0 if ok_all else 1)
