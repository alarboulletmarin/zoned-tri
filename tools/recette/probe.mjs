import { chromium } from '/home/andrea/projets/github/zoned-tri/node_modules/playwright-core/index.mjs'
const FILE='file:///home/andrea/Downloads/Zoned%20Tri(1)/design_handoff_zoned_tri/Zoned%20TRI%20Brut%20-%20App.dc.html'
const [csel, url, asel, w, h] = process.argv.slice(2)
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome-stable'})
const probe=(sel)=>`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return [{t:'ABSENT '+${JSON.stringify(sel)},h:0,mt:'',pt:''}];
  return [...el.children].map(k=>{const r=k.getBoundingClientRect();const s=getComputedStyle(k);
    return {t:(k.textContent||'').trim().replace(/\\s+/g,' ').slice(0,30),h:Math.round(r.height),mt:s.marginTop,pt:s.paddingTop,fs:s.fontSize}})})()`
const c=await b.newPage({viewport:{width:1600,height:1400}})
await c.goto(FILE,{waitUntil:'networkidle'}); await c.waitForTimeout(2500)
const ref=await c.evaluate(probe(csel)); await c.close()
const p=await b.newPage({viewport:{width:+w,height:+h}})
await p.goto(url,{waitUntil:'networkidle'}); await p.waitForTimeout(600)
const got=await p.evaluate(probe(asel)); await p.close(); await b.close()
const f=(x)=>x?`${x.t.padEnd(32)} h=${String(x.h).padStart(3)} mt=${x.mt} pt=${x.pt}`:''
for(let i=0;i<Math.max(ref.length,got.length);i++) console.log(f(ref[i]).padEnd(60)+'| '+f(got[i]))
