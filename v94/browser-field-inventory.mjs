import { chromium } from 'playwright';
import fs from 'fs';

const routes=['67','10a','67+10a','shichrut','67_shichrut','10a_shichrut','67_10a_shichrut','accident_injury'];
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}});
await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForTimeout(1000);

const out={routes:{},allStateKeys:[]};
const all=new Set();

for(const route of routes){
  await page.evaluate(r=>{ if(typeof window.chooseMashlul==='function') window.chooseMashlul(r); else window._mashlul=r; },route);
  await page.waitForTimeout(400);
  const snap=await page.evaluate(()=>{
    const isVisible=e=>{
      const st=getComputedStyle(e), r=e.getBoundingClientRect();
      return st.display!=='none' && st.visibility!=='hidden' && r.width>0 && r.height>0;
    };
    const controls=[...document.querySelectorAll('input[id],select[id],textarea[id]')];
    let state={};
    if(typeof window.getAllFields==='function'){
      try{ state=window.getAllFields()||{}; }catch(e){ state={__error:String(e)}; }
    }
    return {
      visibleIds:controls.filter(isVisible).map(e=>e.id).sort(),
      allIds:controls.map(e=>e.id).sort(),
      stateKeys:Object.keys(state).sort(),
      rawRoute:String(window._mashlul||''),
      engineRoute:(window.RouteEngine&&typeof window.RouteEngine.current==='function')?String(window.RouteEngine.current()||''):''
    };
  });
  snap.stateKeys.forEach(k=>all.add(k));
  out.routes[route]=snap;
}
out.allStateKeys=[...all].sort();

const families={};
for(const key of out.allStateKeys){
  const m=key.match(/^([A-Za-z0-9]+_)/);
  const p=m?m[1]:'(none)';
  (families[p]||(families[p]=[])).push(key);
}
out.stateFamilies=families;

fs.mkdirSync('docs',{recursive:true});
fs.writeFileSync('docs/v94-field-inventory.json',JSON.stringify(out,null,2));
console.log('PASS field inventory',routes.length,'routes',out.allStateKeys.length,'state keys');
await browser.close();
