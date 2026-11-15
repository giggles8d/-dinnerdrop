const { chromium } = require('/opt/npm-tools/node_modules/playwright')
const F="html,body{margin:0;width:1080px;height:1920px;background:transparent;font-family:Poppins}"
const sub=t=>`<div style="position:absolute;left:70px;right:70px;top:1490px;text-align:center;font-family:Poppins;font-weight:500;font-size:68px;line-height:1.2;color:#fff;-webkit-text-stroke:2px rgba(0,0,0,.5);text-shadow:0 3px 14px rgba(0,0,0,.8),0 0 4px rgba(0,0,0,.6)">${t}</div>`
const caps={
 s1:sub("Again? Still mustard."), s2:sub("Lots of food.<br>Zero dinners."), s3:sub("Let's plan next week,<br>big guy."),
 s4:sub("Even the one who<br>hates green things?"), s5:sub("Even him."), s6:sub("Finally. Mustard isn't<br>the main course."),
 hook:`<div style="position:absolute;left:0;right:0;top:250px;text-align:center"><span style="display:inline-block;background:#fff;color:#1b5e3b;font-family:Poppins;font-weight:700;font-size:62px;padding:18px 40px;border-radius:26px;box-shadow:0 6px 24px rgba(0,0,0,.25)">5:03 PM. No dinner plan.</span></div>`,
 after:`<div style="position:absolute;left:0;right:0;top:250px;text-align:center"><span style="display:inline-block;background:rgba(255,255,255,.95);color:#333;font-family:Poppins;font-weight:500;font-size:46px;padding:14px 34px;border-radius:22px;box-shadow:0 6px 24px rgba(0,0,0,.2)">After checkout and delivery</span></div>`,
 end:`<div style="position:absolute;left:60px;right:60px;top:170px;text-align:center;background:rgba(255,255,255,.93);border-radius:44px;padding:44px 30px 50px;box-shadow:0 10px 40px rgba(0,0,0,.25)"><div style="font-family:Poppins;font-weight:700;font-size:104px;line-height:1;color:#1b5e3b">Dinner<span style="color:#e8a33d">Drop</span></div><div style="font-family:Poppins;font-weight:500;font-size:44px;color:#333;margin-top:18px">Dinner, handled.</div><div style="display:inline-block;margin-top:30px;background:#000;color:#fff;padding:16px 46px;border-radius:24px;text-align:left"><div style="font-size:26px;font-weight:500;opacity:.85">Download on the</div><div style="font-size:52px;font-weight:700;line-height:1.05">App Store</div></div><div style="font-family:Poppins;font-weight:500;font-size:38px;color:#1b5e3b;margin-top:22px">Free to start</div></div>`
}
;(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}})
for(const [k,v] of Object.entries(caps)){await p.setContent(`<meta charset=utf-8><style>${F}</style>${v}`);await p.waitForTimeout(150);await p.screenshot({path:`ov/${k}.png`,omitBackground:true})}
await b.close();console.log('ok')})()
