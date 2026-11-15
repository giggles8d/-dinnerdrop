const { chromium, devices } = require('/opt/npm-tools/node_modules/playwright')
const fs=require('fs'), path=require('path')
const img=f=>'data:image/jpeg;base64,'+fs.readFileSync(f).toString('base64')
const G='#1a5c38', Y='#e8a838'
const names=['Honey garlic chicken thighs','Taco night','Sheet pan sausage and peppers','Chicken alfredo','Beef stir-fry']
;(async()=>{const b=await chromium.launch()
 // real /maple import box, filled in
 const c=await b.newContext({...devices['iPhone 13'],deviceScaleFactor:3}); const p=await c.newPage()
 await p.goto('https://www.dinnerdrop.app/maple',{waitUntil:'networkidle'})
 const ta=p.locator('textarea'); await ta.scrollIntoViewIfNeeded(); await ta.fill(names.join('\n'))
 await p.evaluate(()=>{const t=document.querySelector('textarea');t.closest('div.rounded-2xl').scrollIntoView({block:'center'})}); await p.waitForTimeout(400)
 await p.screenshot({path:'import.png'}); await c.close()
 const q=await b.newPage({viewport:{width:1080,height:1920}})
 const base='*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;font-family:Poppins}'
 // notes card
 await q.setContent(`<meta charset=utf-8><style>${base}body{background:linear-gradient(#f3efe6,#e9e2d3)}</style>
 <div style="position:absolute;left:150px;top:200px;width:780px;height:1080px;background:#fffdf6;border-radius:60px;box-shadow:0 30px 80px rgba(0,0,0,.18);padding:70px 64px">
 <div style="font-size:34px;color:#c8902a;font-weight:600">‹ Notes</div>
 <div style="font-size:64px;font-weight:700;margin:30px 0 40px;color:#222">Maple dinners</div>
 ${names.map(n=>`<div style="font-size:46px;color:#333;margin:0 0 30px">• ${n}</div>`).join('')}
 </div>`); await q.screenshot({path:'notes.png'})
 // end card
 await q.setContent(`<meta charset=utf-8><style>${base}</style><div style="position:absolute;inset:0;background:url(${img('../pins/p3.jpg')}) center/cover"></div>
 <div style="position:absolute;left:70px;right:70px;top:420px;background:rgba(255,255,255,.95);border-radius:50px;padding:70px 56px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.25)">
 <div style="display:inline-block;background:${Y};color:#fff;font-weight:700;font-size:40px;padding:12px 34px;border-radius:40px">FOR MAPLE FAMILIES</div>
 <div style="font-size:98px;line-height:1.05;font-weight:800;color:${G};margin:40px 0 26px">30 days of Family, free</div>
 <div style="font-size:46px;color:#333">No card. Planning stays free.</div>
 <div style="font-size:60px;font-weight:700;color:${G};margin-top:50px">dinnerdrop.app/maple</div></div>`); await q.screenshot({path:'end.png'})
 // overlays
 const sub=t=>`<div style="position:absolute;left:70px;right:70px;top:1380px;text-align:center;font-size:66px;line-height:1.2;font-weight:600;color:#fff;-webkit-text-stroke:2px rgba(0,0,0,.5);text-shadow:0 3px 14px rgba(0,0,0,.85)">${t}</div>`
 const ov={hook:`<div style="position:absolute;left:0;right:0;top:230px;text-align:center"><span style="display:inline-block;background:#fff;color:#b3261e;font-weight:800;font-size:78px;padding:20px 44px;border-radius:30px;box-shadow:0 8px 30px rgba(0,0,0,.3)">Maple is shutting down</span><div style="margin-top:22px"><span style="display:inline-block;background:${Y};color:#fff;font-weight:700;font-size:46px;padding:12px 34px;border-radius:24px">Data deleted Dec 31, 2026</span></div></div>`,
 s1:sub('If you use the Maple<br>family app, heads up.'), s2:sub('Maple is shutting down and<br>everything gets deleted.'), s3:sub('Open Maple now and copy<br>your family’s dinner names.'), s4:sub('Then paste them<br>into DinnerDrop.').replace('top:1380px','top:1660px')}
 for(const [k,v] of Object.entries(ov)){await q.setContent(`<meta charset=utf-8><style>html,body{margin:0;width:1080px;height:1920px;background:transparent;font-family:Poppins}</style>${v}`);await q.screenshot({path:`ov_${k}.png`,omitBackground:true})}
 await b.close();console.log('ok')})()
