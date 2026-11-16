"""
진짜 three.js 로 3D 페이지를 화면 없이 렌더해서 스크린샷을 찍어요 (헤드리스 크롬 + SwiftShader).
three.min.js 는 인터넷이 막혀 있으면 사용자에게 npm 패키지(three-0.128.0.tgz)를 첨부받아 풀어서 써요.

  python3 render-check.py page.html three.min.js out.png [js-to-run-after-load] [wait-ms]

페이지의 cdnjs three.js 주소를 로컬 파일로 바꿔치기해요. 페이지 오류는 표준 출력에 찍혀요.
lab-template.html 에는 시간을 멈추고 한 프레임씩 넘기는 step(n) 이 있어서, 이펙트를 프레임별로 찍을 때 써요.
"""
import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    page, three, out = sys.argv[1], sys.argv[2], sys.argv[3]
    js = sys.argv[4] if len(sys.argv) > 4 else ''
    wait = int(sys.argv[5]) if len(sys.argv) > 5 else 1500
    src = open(three).read()
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 390, 'height': 760})
        errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
        pg.on('console', lambda m: m.type == 'error' and errs.append(m.text[:300]))
        await pg.route('**/three*.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=src))
        import os
        await pg.goto('file://' + os.path.abspath(page)); await pg.wait_for_timeout(1500)
        if js: await pg.evaluate(js)
        await pg.wait_for_timeout(wait)
        await pg.screenshot(path=out)
        print('saved', out, 'errors:', errs)
        await b.close()
asyncio.run(main())
