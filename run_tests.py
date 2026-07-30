import urllib.request
import urllib.error
import json

pages = [
    ('/', '首页'),
    ('/create', '创作页'),
    ('/explore', '探索页'),
    ('/poems', '诗集列表'),
    ('/login', '登录页（已无功能但应可访问）'),
]

apis = [
    ('GET /api/photos/upload', 'GET', None, '照片列表'),
    ('GET /api/poems', 'GET', None, '诗歌列表'),
    ('GET /api/sessions', 'GET', None, '会话列表'),
    ('GET /api/uploads/nonexistent/test.png', 'GET', None, '上传访问路由（404属正常）'),
]

base = 'http://localhost'
results = []

print('=== 页面连通性测试 ===')
for path, desc in pages:
    try:
        req = urllib.request.Request(base + path)
        resp = urllib.request.urlopen(req)
        body_len = len(resp.read())
        ok = resp.status in (200, 307, 308)
        print(f'  [{resp.status}] {path:<20} {desc:<30} size={body_len:>8}  {"OK" if ok else "FAIL"}')
        results.append(('page', path, desc, resp.status, body_len, ok))
    except urllib.error.HTTPError as e:
        print(f'  [{e.code}] {path:<20} {desc:<30} FAIL')
        results.append(('page', path, desc, e.code, 0, False))
    except Exception as e:
        print(f'  [ERR] {path:<20} {desc:<30} {e}')
        results.append(('page', path, desc, 'ERR', 0, False))

print('\n=== API 连通性测试 ===')
for api_str, method, body, desc in apis:
    try:
        path = api_str.split(' ', 1)[1]
        req = urllib.request.Request(base + path, method=method)
        resp = urllib.request.urlopen(req)
        resp_body = resp.read().decode(errors='ignore')
        status_line = resp.code
        # For uploads route, 404 is also acceptable
        if 'uploads/nonexistent' in path:
            ok = True
        else:
            ok = resp.code == 200 and len(resp_body) > 0
        print(f'  [{status_line}] {api_str:<30} {desc:<20} size={len(resp_body):>6}  {"OK" if ok else "FAIL"}')
        results.append(('api', api_str, desc, status_line, len(resp_body), ok))
    except urllib.error.HTTPError as e:
        if 'uploads/nonexistent' in api_str and e.code == 404:
            print(f'  [{e.code}] {api_str:<30} {desc:<20} OK (404 expected)')
            results.append(('api', api_str, desc, e.code, 0, True))
        else:
            print(f'  [{e.code}] {api_str:<30} {desc:<20} FAIL')
            results.append(('api', api_str, desc, e.code, 0, False))
    except Exception as e:
        print(f'  [ERR] {api_str:<30} {desc:<20} {e}')
        results.append(('api', api_str, desc, 'ERR', 0, False))

passed = sum(1 for r in results if r[5])
total = len(results)
print(f'\n=== 结果: {passed}/{total} 项通过 ===')
for r in results:
    if not r[5]:
        print(f'  FAIL: {r[0]} {r[1]} {r[2]} status={r[3]}')
