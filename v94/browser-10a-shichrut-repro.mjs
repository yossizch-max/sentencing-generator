import { chromium } from 'playwright';
import fs from 'fs';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}});
await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForTimeout(900);
await page.evaluate(r=>window.chooseMashlul?window.chooseMashlul(r):(window._mashlul=r),'10a_shichrut');
await page.waitForTimeout(900);
await page.evaluate(()=>{
  const set=(id,v)=>{const e=document.getElementById(id);if(!e)return;if(e.type==='checkbox'||e.type==='radio')e.checked=!!v;else e.value=String(v);e.dispatchEvent(new Event('change',{bubbles:true}));};
  set('case_num','REPRO-10SH'); set('prior_10a',true); set('no_fix_10a',true); set('shich_repeat',true); set('shich_repeat_year','2024'); set('ps67s_alcohol_level','760'); set('ps67s_prior_shich_count','1'); set('req_prison','8'); set('req_disq','30');
});
await page.waitForTimeout(700);
const runs=[];
for(let i=0;i<4;i++){
  const r=await page.evaluate(async()=>{
    const norm=s=>String(s||'').replace(/\\s+/g,' ').trim();
    let err=null; try{window.safeGenerate?window.safeGenerate():window.generate?.();}catch(e){err=String(e);} 
    await new Promise(r=>setTimeout(r,3000));
    const paper=document.getElementById('paper'); const pt=document.getElementById('policy_text');
    return {err,text:norm(paper?.innerText||''),policy:norm(pt?.value||''),tag:String(pt?.dataset?.v9367Route||pt?.dataset?.v66Route||'')};
  }); runs.push(r);
}
await browser.close();
const report={uniqueOutputs:[...new Set(runs.map(x=>x.text))].length,uniquePolicies:[...new Set(runs.map(x=>x.policy))].length,lengths:runs.map(x=>x.text.length),runs};
fs.mkdirSync('docs',{recursive:true}); fs.writeFileSync('docs/v94-10a-shichrut-repro.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({uniqueOutputs:report.uniqueOutputs,uniquePolicies:report.uniquePolicies,lengths:report.lengths},null,2));
if(runs.some(x=>x.err)) process.exit(1);