import { chromium } from '/home/andrea/projets/github/zoned-tri/node_modules/playwright-core/index.mjs'
const FILE='file:///home/andrea/Downloads/Zoned%20Tri(1)/design_handoff_zoned_tri/Zoned%20TRI%20Brut%20-%20App.dc.html'
const [label, url, w, h] = process.argv.slice(2)
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome-stable'})

const DUMP = `(root)=>{
  // Un conteneur sans peinture propre (ni fond, ni contour, ni gouttiere) n'est pas un bloc :
  // c'est une structure. On descend dedans pour comparer ce qui se voit, pas ce qui organise.
  const bare=(el)=>{const s=getComputedStyle(el);
    return el.children.length>0 && s.display!=='grid' && s.borderTopWidth==='0px' && s.borderBottomWidth==='0px'
      && (s.backgroundColor==='rgba(0, 0, 0, 0)'||s.backgroundColor==='transparent')
      && s.paddingTop==='0px' && s.paddingBottom==='0px' && s.marginTop==='0px'};
  const flat=(el)=>[...el.children].flatMap(k=>(getComputedStyle(k).display==='contents'||bare(k))?flat(k):[k]);
  const r=root.getBoundingClientRect();
  return flat(root).map(k=>{const kr=k.getBoundingClientRect();
    return {top:Math.round(kr.top-r.top),h:Math.round(kr.height),
      txt:(k.textContent||'').trim().replace(/\\s+/g,' ').slice(0,34)}});
}`

const c=await b.newPage({viewport:{width:1600,height:1400}})
await c.goto(FILE,{waitUntil:'networkidle'}); await c.waitForTimeout(2500)
const ref=await c.evaluate(`(${DUMP})(document.querySelector('[data-screen-label="${label}"]'))`)
await c.close()

const p=await b.newPage({viewport:{width:+w,height:+h}})
await p.goto(url,{waitUntil:'networkidle'}); await p.waitForTimeout(700)
const got=await p.evaluate(`(${DUMP})(document.querySelector('#root').firstElementChild.querySelector('[class*="screen"]') || document.querySelector('#root').firstElementChild)`)
await p.close(); await b.close()

const rows=Math.max(ref.length,got.length)
console.log(`  CANEVAS ${label}`.padEnd(46)+'| APP')
for(let i=0;i<rows;i++){
  const a=ref[i], g=got[i]
  const L=a?`${String(a.top).padStart(4)} +${String(a.h).padStart(3)} ${a.txt}`:''
  const R=g?`${String(g.top).padStart(4)} +${String(g.h).padStart(3)} ${g.txt}`:''
  const flag=(a&&g&&(Math.abs((a.top-2)-g.top)>2||Math.abs(a.h-g.h)>2))?' <<':''
  console.log(L.padEnd(46)+'| '+R+flag)
}
