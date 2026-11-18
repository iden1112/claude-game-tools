import glob,sys
t=open('template.html').read()
three=open('three.min.js').read(); fx=open('fx3d.js').read(); pj=open('peerjs.min.js').read(); mq=open('mqtt.min.js').read()
game='\n'.join(open(f).read() for f in sorted(glob.glob('src/*.js')))
for name,src in [('THREE',three),('FX3D',fx),('PEERJS',pj),('MQTT',mq),('GAME',game)]:
    assert '</script' not in src.lower(), name
    t=t.replace('/*%s*/'%name, src,1)
open('index.html','w').write(t)
import os
if os.path.exists('turn_key.json'):
    key=open('turn_key.json').read().strip()
    tk=t.replace('<script>/*GAME*/</script>','')  # (자리표시 없음: 아래에서 GAME 앞에 넣음)
    marker='<script>\n// ================='
    i=t.find("'use strict';")
    j=t.rfind('<script>',0,i)
    tk=t[:j]+'<script>window.__builtinTurn='+key+';</script>\n'+t[j:]
    open('index_key.html','w').write(tk)
    # 웹사이트용: 키를 섞어서 넣기 (자동 수집 프로그램에 바로 안 걸리게)
    import base64
    enc=base64.b64encode(key.encode()).decode()[::-1]
    tw=t[:j]+'<script>try{window.__builtinTurn=JSON.parse(atob("'+enc+'".split("").reverse().join("")));}catch(e){}</script>\n'+t[j:]
    open('index_web.html','w').write(tw)
open('dev.js','w').write(game)
print('ok', len(t))
