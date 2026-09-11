import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}});
await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1000);
await page.addScriptTag({url:'http://127.0.0.1:4173/v94/case-model-adapter.js'});
await page.evaluate(()=>{ if(typeof window.chooseMashlul==='function') window.chooseMashlul('67_10a_shichrut'); else window._mashlul='67_10a_shichrut'; });
await page.waitForTimeout(500);
const result=await page.evaluate(()=>{
  const m=window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
  const gv=id=>document.getElementById(id)?.value??'';
  const gc=id=>!!document.getElementById(id)?.checked;
  const gi=id=>/^\d+$/.test(gv(id))?Number(gv(id)):null;
  const checks=[
    ['ps67s_prior_67_count',gi('ps67s_prior_67_count'),m.currentOffense.routeFacts.section67.prior67Count],
    ['ps67s_disq_knowledge',gv('ps67s_disq_knowledge'),m.currentOffense.routeFacts.section67.disqualificationKnowledge],
    ['ps67s_disq_source',gv('ps67s_disq_source'),m.currentOffense.routeFacts.section67.disqualificationSource],
    ['prior_10a',gv('prior_10a'),m.currentOffense.routeFacts.section10a.prior10a],
    ['no_fix_10a',gc('no_fix_10a'),m.currentOffense.routeFacts.section10a.noFix10a],
    ['shich_repeat',gv('shich_repeat'),m.currentOffense.routeFacts.intoxication.repeat],
    ['shich_repeat_year',gv('shich_repeat_year'),m.currentOffense.routeFacts.intoxication.repeatYear],
    ['ps67s_alcohol_level',gv('ps67s_alcohol_level'),m.currentOffense.routeFacts.intoxication.alcoholLevel],
    ['ps67s_prior_shich_count',gi('ps67s_prior_shich_count'),m.currentOffense.routeFacts.intoxication.priorCount],
    ['req_fine',gv('req_fine'),m.sentencing.petition.fine],
    ['req_bond',gv('req_bond'),m.sentencing.petition.bond]
  ].filter(x=>document.getElementById(x[0]));
  return {route:m.route,bad:checks.filter(([,a,b])=>String(a??'')!==String(b??''))};
});
if(result.route!=='67_10a_shichrut'||result.bad.length) throw new Error(JSON.stringify(result));
await browser.close();
console.log('PASS combined live-DOM mapping');
