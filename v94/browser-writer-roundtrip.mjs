import { chromium } from 'playwright';

const base='http://127.0.0.1:4173/index.html';
const adapter='http://127.0.0.1:4173/v94/case-model-adapter.js';
const writer='http://127.0.0.1:4173/v94/case-model-writer.js';

const only=process.argv[2]||'all';
const browser=await chromium.launch({headless:true});

async function newPage(){
  const page=await browser.newPage({viewport:{width:1366,height:768}});
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForTimeout(900);
  await page.addScriptTag({url:adapter});
  await page.addScriptTag({url:writer});
  return page;
}
async function choose(page,route){
  await page.evaluate(r=>{ if(typeof window.chooseMashlul==='function') window.chooseMashlul(r); else window._mashlul=r; },route);
  await page.waitForTimeout(450);
}
function stable(v){ return JSON.stringify(v); }
function deepDiff(a,b,path='',out=[]){
  if(out.length>=80) return out;
  if(typeof a!==typeof b){out.push({path,a,b});return out;}
  if(a&&typeof a==='object'){
    const keys=new Set([...Object.keys(a||{}),...Object.keys(b||{})]);
    for(const k of keys) deepDiff(a?.[k],b?.[k],path?path+'.'+k:k,out);
  } else if(String(a??'')!==String(b??'')) out.push({path,a,b});
  return out;
}

async function build67Source(){
  const page=await newPage();
  await choose(page,'67');
  const result=await page.evaluate(async ()=>{
    const set=(id,v)=>{
      const e=document.getElementById(id); if(!e) return;
      if(e.type==='checkbox'||e.type==='radio') e.checked=!!v; else e.value=String(v);
      e.dispatchEvent(new Event('change',{bubbles:true}));
    };
    set('case_num','WRITER-MAIN-94');
    set('def_name','נאשם QA');
    set('traffic_count','7');
    set('traffic_detail','עבר תעבורתי QA');
    set('crim_count','0');
    set('off_no_insurance',true);
    set('req_prison','10');
    set('req_disq','36');
    set('req_fine','5000');

    set('has_multiple_yes',true);
    set('multi_proc_type','consol');
    set('multi_count','3');
    if(typeof window.toggleMultipleUI==='function') window.toggleMultipleUI();
    if(typeof window.buildMultiCards==='function') window.buildMultiCards();
    await new Promise(r=>setTimeout(r,160));
    set('m_case_1','WRITER-MAIN-94');
    set('m_case_2','WRITER-JOIN-2');
    set('m_case_3','WRITER-JOIN-3');
    set('m_date_1','2026-01-01');
    set('m_date_2','2026-02-02');
    set('m_date_3','2026-03-03');

    if(typeof window.addConditionalItem==='function') window.addConditionalItem(3);
    if(typeof window.addDisqualificationItem==='function') window.addDisqualificationItem(2);
    if(typeof window.addBondItem==='function') window.addBondItem(4);
    await new Promise(r=>setTimeout(r,100));
    set('cond_case_3','COND-3'); set('cond_months_3','6');
    set('disq_case_2','DISQ-2'); set('disq_months_2','12');
    set('bond_case_4','BOND-4'); set('bond_amount_4','9000');

    return window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
  });
  await page.close();
  return result;
}

async function roundtripModel(model,label){
  const page=await newPage();
  await page.evaluate(async m=>{
    await window.V94CaseModelWriter.applyCaseModelToDocument(m,window,document);
    await new Promise(r=>setTimeout(r,500));
  },model);
  const rebuilt=await page.evaluate(()=>window.V94CaseModel.buildCaseModelFromCurrentState(window,document));
  await page.close();
  const a=structuredClone(model), b=structuredClone(rebuilt);
  if(a.metadata) delete a.metadata.capturedAt;
  if(b.metadata) delete b.metadata.capturedAt;
  if(a.metadata) a.metadata.source='legacy-dom-readonly';
  if(b.metadata) b.metadata.source='legacy-dom-readonly';
  if(stable(a)!==stable(b)){
    const summary={
      route:[a.route,b.route],
      proceeding:[a.proceeding,b.proceeding],
      traffic:[a.defendant?.record?.traffic,b.defendant?.record?.traffic],
      conditions:[a.defendant?.record?.pendingConditions,b.defendant?.record?.pendingConditions],
      petition:[a.sentencing?.petition,b.sentencing?.petition]
    };
    summary.diffs=deepDiff(a,b);
    console.error(JSON.stringify({label,summary},null,2));
    throw new Error(label+' writer roundtrip drift');
  }
  console.log('PASS '+label+' clean-form writer roundtrip');
}

if(only==='all'||only==='67'){
  const model67=await build67Source();
  await roundtripModel(model67,'67 joined+sparse');
}

if(only==='all'||only==='combined'){
const combinedPage=await newPage();
await choose(combinedPage,'67_10a_shichrut');
const combined=await combinedPage.evaluate(()=>{
  const set=(id,v)=>{const e=document.getElementById(id);if(!e)return;if(e.type==='checkbox'||e.type==='radio')e.checked=!!v;else e.value=String(v);e.dispatchEvent(new Event('change',{bubbles:true}));};
  set('traffic_count','4'); set('traffic_detail','עבר משולב');
  set('ps67s_prior_67_count','2'); set('prior_10a','1'); set('no_fix_10a',true);
  set('ps67s_alcohol_level','850'); set('ps67s_prior_shich_count','1');
  set('req_prison','8'); set('req_disq','30'); set('req_fine','4000');
  return window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
});
await combinedPage.close();
await roundtripModel(combined,'combined');
}

if(only==='all'||only==='accident'){
const accidentPage=await newPage();
await choose(accidentPage,'accident_injury');
const accident=await accidentPage.evaluate(()=>{
  const set=(id,v)=>{const e=document.getElementById(id);if(!e)return;if(e.type==='checkbox'||e.type==='radio')e.checked=!!v;else e.value=String(v);e.dispatchEvent(new Event('change',{bubbles:true}));};
  set('acc_injury','hard'); set('acc_negligence','high'); set('acc_placement','center');
  set('acc_placement_manual','1'); set('acc_placement_manual_reason','נימוק writer QA');
  set('acc_prison_min','3'); set('acc_prison_max','6'); set('acc_disq_min','24'); set('acc_disq_max','48');
  set('acc_victim_count','2'); set('acc_description','תאונת QA');
  set('acc_prior_10a',true); set('acc_agg_crosswalk',true); set('acc_mit_self',true);
  set('acc_p_prison_m','4'); set('acc_p_disq_m','36');
  return window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
});
await accidentPage.close();
await roundtripModel(accident,'accident');
}

await browser.close();
