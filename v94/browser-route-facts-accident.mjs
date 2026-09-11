import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}});
await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1000);
await page.addScriptTag({url:'http://127.0.0.1:4173/v94/case-model-adapter.js'});
await page.evaluate(()=>{ if(typeof window.chooseMashlul==='function') window.chooseMashlul('accident_injury'); else window._mashlul='accident_injury'; });
await page.waitForTimeout(500);
const result=await page.evaluate(()=>{
  const m=window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
  const gv=id=>document.getElementById(id)?.value??'';
  const gc=id=>!!document.getElementById(id)?.checked;
  const gi=id=>/^\d+$/.test(gv(id))?Number(gv(id)):null;
  const checks=[
    ['acc_injury',gv('acc_injury'),m.accident?.injuryLevel],
    ['acc_negligence',gv('acc_negligence'),m.accident?.negligence],
    ['acc_placement',gv('acc_placement'),m.accident?.placement],
    ['acc_prison_min',gv('acc_prison_min'),m.accident?.prisonMin],
    ['acc_prison_max',gv('acc_prison_max'),m.accident?.prisonMax],
    ['acc_disq_min',gv('acc_disq_min'),m.accident?.disqualificationMin],
    ['acc_disq_max',gv('acc_disq_max'),m.accident?.disqualificationMax],
    ['acc_victim_count',gi('acc_victim_count'),m.accident?.victimCount],
    ['acc_prior_10a',gc('acc_prior_10a'),m.accident?.priorSignals?.acc_prior_10a],
    ['acc_agg_crosswalk',gc('acc_agg_crosswalk'),m.accident?.aggravating?.acc_agg_crosswalk],
    ['acc_p_prison_m',gv('acc_p_prison_m'),m.accident?.petition?.acc_p_prison_m],
    ['acc_p_disq_m',gv('acc_p_disq_m'),m.accident?.petition?.acc_p_disq_m]
  ].filter(x=>document.getElementById(x[0]));
  return {route:m.route,hasAccident:!!m.accident,bad:checks.filter(([,a,b])=>String(a??'')!==String(b??''))};
});
if(result.route!=='accident_injury'||!result.hasAccident||result.bad.length) throw new Error(JSON.stringify(result));
await browser.close();
console.log('PASS accident live-DOM mapping');
