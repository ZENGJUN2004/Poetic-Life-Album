import urllib.request
import urllib.error
import json
import mimetypes
import os
import uuid

BASE = 'http://localhost'
TEST_DIR = r'C:\Users\zjunc\Desktop\vidio photo'
IMG = os.path.join(TEST_DIR, '微信图片_20260729210117_1085_66.jpg')
VID = os.path.join(TEST_DIR, '微信视频2026-07-29_212949_191.mp4')

results = []

def upload_file(path, desc, mime=None, data_override=None):
    boundary = '----Test' + uuid.uuid4().hex[:12]
    name = os.path.basename(path)
    m = mime or mimetypes.guess_type(path)[0] or 'application/octet-stream'
    raw = data_override if data_override is not None else open(path, 'rb').read()
    body = b'--' + boundary.encode() + b'\r\n'
    body += f'Content-Disposition: form-data; name="files"; filename="{name}"\r\n'.encode('utf-8')
    body += f'Content-Type: {m}\r\n\r\n'.encode('utf-8')
    body += raw
    body += b'\r\n--' + boundary.encode() + b'--\r\n'
    req = urllib.request.Request(
        BASE + '/api/photos/upload',
        data=body,
        headers={'Content-Type': 'multipart/form-data; boundary=' + boundary}
    )
    try:
        resp = urllib.request.urlopen(req)
        obj = json.loads(resp.read().decode())
        return True, resp.status, obj
    except urllib.error.HTTPError as e:
        try:
            detail = e.read().decode()
        except Exception:
            detail = ''
        return False, e.code, detail

print('=== 测试2.1：JPG照片正常上传 + 预览 + 列表可见 ===')
ok, code, data = upload_file(IMG, 'JPG图片')
# strict success: HTTP 200 + photos non-empty
strict_ok = (code == 200 and isinstance(data, dict) and data.get('photos') and len(data['photos']) > 0)
print(f'  上传: code={code}, photosCount={len(data.get("photos", [])) if isinstance(data,dict) else 0}, strict_ok={strict_ok}')
if strict_ok:
    photo = data['photos'][0]
    url = photo['url']
    id_ = photo['id']
    print(f'  照片URL: {url}, id={id_}')
    # Preview check
    try:
        with urllib.request.urlopen(BASE + url) as presp:
            ctype = presp.headers.get('Content-Type', '')
            raw_bytes = presp.read()
            ok_prev = (presp.status == 200 and 'image' in ctype and len(raw_bytes) > 100)
            print(f'  预览: HTTP {presp.status}, type={ctype}, bytes={len(raw_bytes)}  ok={ok_prev}')
            results.append(('2.1.上传+预览', ok_prev, ''))
    except Exception as e:
        print(f'  预览失败: {e}')
        results.append(('2.1.上传+预览', False, str(e)))
    # List check
    try:
        with urllib.request.urlopen(BASE + '/api/photos/upload') as lresp:
            lobj = json.loads(lresp.read().decode())
            in_list = any(p.get('id') == id_ for p in lobj.get('photos', []))
            print(f'  照片列表: count={len(lobj.get("photos", []))}, newly_uploaded_in_list={in_list}')
            results.append(('2.1.列表可见', in_list, ''))
    except Exception as e:
        results.append(('2.1.列表可见', False, str(e)))
else:
    print(f'  详情: {data}')
    results.append(('2.1.上传', False, str(data)))

print('\n=== 测试2.2：MP4视频应被拒绝（只允许图片类型）===')
ok, code, data = upload_file(VID, 'MP4视频', mime='video/mp4')
# Should be rejected: photos is empty AND errors contains a rejection message
rejected = (isinstance(data, dict) and not data.get('photos') and data.get('errors'))
print(f'  code={code}, photos_count={len(data.get("photos", [])) if isinstance(data,dict) else 0}, errors={data.get("errors") if isinstance(data,dict) else data}')
print(f'  视频被拒绝: {rejected}')
results.append(('2.2.视频拒绝', rejected, '' if rejected else f'should have errors but got {data}'))

print('\n=== 测试2.3：超大文件（20MB）应被拒绝 ===')
huge = b'\xff\xd8\xff\xe0' + b'\x00' * (20*1024*1024) + b'\xff\xd9'
ok, code, data = upload_file(IMG, '伪造20MB超大JPG', mime='image/jpeg', data_override=huge)
rejected = (isinstance(data, dict) and not data.get('photos') and data.get('errors'))
print(f'  code={code}, photos_count={len(data.get("photos", [])) if isinstance(data,dict) else 0}, errors={data.get("errors") if isinstance(data,dict) else data}')
print(f'  超大文件被拒绝: {rejected}')
results.append(('2.3.超大文件拒绝', rejected, '' if rejected else f'should have errors but got {data}'))

print('\n=== 测试2.4：错误MIME（text/plain 伪装 .jpg）应被拒绝 ===')
fake = b'Some non-image content here' * 100
ok, code, data = upload_file(IMG, '错误MIME伪装JPG', mime='text/plain', data_override=fake)
rejected = (isinstance(data, dict) and not data.get('photos') and data.get('errors'))
print(f'  code={code}, errors={data.get("errors") if isinstance(data,dict) else data}')
print(f'  错误MIME拒绝: {rejected}')
results.append(('2.4.错误MIME拒绝', rejected, ''))

passed = sum(1 for r in results if r[1])
total = len(results)
print(f'\n=== 测试2总结: {passed}/{total} 通过 ===')
ok_all = True
for r in results:
    mark = 'OK' if r[1] else 'FAIL'
    print(f'  [{mark}] {r[0]} {r[2]}')
    if not r[1]:
        ok_all = False
exit(0 if ok_all else 1)
