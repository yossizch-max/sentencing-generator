import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}});
await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForTimeout(1000);
await page.addScriptTag({url:'http://127.0.0.1:4173/v94/case-model-adapter.js'});

async function route(r){
  await page.evaluate(x=>{ if(typeof window.chooseMashlul==='function') window.chooseMashlul(x); else window._mashlul=x; },r);
  await page.waitForTimeout(450);
}
async function setFields(values){
  return await page.evaluate(vals=>{
    const missing=[];
    for(const [id,v] of Object.entries(vals)){
      const e=document.getElementById(id);
      if(!e){ missing.push(id); continue; }
      if(e.type==='checkbox'||e.type==='radio') e.checked=!!v;
      else e.value=String(v);
      e.dispatchEvent(new Event('change',{bubbles:true}));
    }
    return missing;
  },values);
}

await route('67_10a_shichrut');
let missing=await setFields({
  ps67s_prior_67_count:'3',
  ps67s_disq_knowledge:'ידע',
  prior_10a:'2',
  no_fix_10a:true,
  shich_repeat:'כן',
  shich_repeat_year:'2024',
  ps67s_alcohol_level:'850',
  ps67s_prior_shich_count:'1',
  req_fine:'5000',
  req_bond:'10000'
});
if(missing.length) console.log('INFO combined route absent fields',missing);
const combined=await page.evaluate(()=>window.V94CaseModel.buildCaseModelFromCurrentState(window,document));
if(combined.route!=='67_10a_shichrut') throw new Error('combined route mismatch');
if(combined.currentOffense.routeFacts.section67.prior67Count!==3) throw new Error('67 prior mismatch');
if(combined.currentOffense.routeFacts.section10a.prior10a!=='2') throw new Error('10a prior mismatch');
if(combined.currentOffense.routeFacts.intoxication.priorCount!==1) throw new Error('shichrut prior mismatch');
if(combined.sentencing.petition.fine!=='5000') throw new Error('fine mismatch');

await route('accident_injury');
missing=await setFields({
  acc_injury:'hard',
  acc_negligence:'high',
  acc_placement:'high',
  acc_prison_min:'3',
  acc_prison_max:'6',
  acc_disq_min:'24',
  acc_disq_max:'48',
  acc_victim_count:'2',
  acc_prior_10a:true,
  acc_agg_crosswalk:true,
  acc_p_prison_m:'4',
  acc_p_disq_m:'36'
});
if(missing.length) console.log('INFO accident absent fields',missing);
const acc=await page.evaluate(()=>window.V94CaseModel.buildCaseModelFromCurrentState(window,document));
if(acc.route!=='accident_injury'||!acc.accident) throw new Error('accident route mismatch');
if(acc.accident.negligence!=='high') throw new Error('accident negligence mismatch');
if(acc.accident.victimCount!==2) throw new Error('accident victim count mismatch');
if(acc.accident.priorSignals.acc_prior_10a!==true) throw new Error('accident prior signal mismatch');
if(acc.accident.petition.acc_p_prison_m!=='4') throw new Error('accident petition mismatch');

await browser.close();
console.log('PASS browser route-specific canonical facts');
