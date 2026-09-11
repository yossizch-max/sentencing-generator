import { chromium } from 'playwright';
import fs from 'fs';

const base='http://127.0.0.1:4173/index.html';
const adapter='http://127.0.0.1:4173/v94/case-model-adapter.js';
const writer='http://127.0.0.1:4173/v94/case-model-writer.js';

const browser=await chromium.launch({headless:true});
async function open(){
  const p=await browser.newPage({viewport:{width:1366,height:768}});
  await p.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  await p.waitForTimeout(900);
  await p.addScriptTag({url:adapter});
  await p.addScriptTag({url:writer});
  return p;
}
async function choose(p,r){
  await p.evaluate(x=>{ if(typeof window.chooseMashlul==='function') window.chooseMashlul(x); else window._mashlul=x; },r);
  await p.waitForTimeout(450);
}
function clean(m){
  const x=structuredClone(m);
  if(x.metadata){ delete x.metadata.capturedAt; x.metadata.source='legacy-dom-readonly'; }
  return x;
}
function diff(a,b,path='',out=[]){
  if(out.length>=200) return out;
  if(typeof a!==typeof b){out.push({path,before:a,after:b});return out;}
  if(a&&typeof a==='object'){
    const keys=[...new Set([...Object.keys(a||{}),...Object.keys(b||{})])].sort();
    for(const k of keys) diff(a?.[k],b?.[k],path?path+'.'+k:k,out);
  }else if(String(a??'')!==String(b??'')) out.push({path,before:a,after:b});
  return out;
}

const p1=await open();
await choose(p1,'67');
const source=await p1.evaluate(async ()=>{
  const set=(id,v)=>{const e=document.getElementById(id);if(!e)return false;if(e.type==='checkbox'||e.type==='radio')e.checked=!!v;else e.value=String(v);e.dispatchEvent(new Event('change',{bubbles:true}));return true;};
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
  window.toggleMultipleUI?.();
  window.buildMultiCards?.();
  await new Promise(r=>setTimeout(r,200));
  set('m_case_1','WRITER-MAIN-94');
  set('m_case_2','WRITER-JOIN-2');
  set('m_case_3','WRITER-JOIN-3');
  set('m_date_1','2026-01-01');
  set('m_date_2','2026-02-02');
  set('m_date_3','2026-03-03');
  set('m_disq_type_1','court');
  set('m_disq_type_2','police');
  set('m_disq_type_3','court');
  set('m_disq_1','ראשי');
  set('m_disq_2','מצורף 2');
  set('m_disq_3','מצורף 3');
  set('m_lic_exp_1',true);
  set('m_lic_exp_year_1','2020');
  set('m_no_ins_2',true);
  set('m_other_off_3','אחר 3');
  set('m_aggr_2','מחמיר 2');
  window.addConditionalItem?.(3);
  window.addDisqualificationItem?.(2);
  window.addBondItem?.(4);
  await new Promise(r=>setTimeout(r,100));
  set('cond_case_3','COND-3'); set('cond_months_3','6');
  set('disq_case_2','DISQ-2'); set('disq_months_2','12');
  set('bond_case_4','BOND-4'); set('bond_amount_4','9000');
  return {
    model:window.V94CaseModel.buildCaseModelFromCurrentState(window,document),
    ids:Array.from(document.querySelectorAll('input[id],select[id],textarea[id]')).reduce((o,e)=>{o[e.id]=(e.type==='checkbox'||e.type==='radio')?!!e.checked:String(e.value||'');return o;},{})
  };
});
await p1.close();

const p2=await open();
const phases=await p2.evaluate(async m=>{
  const snap=label=>({
    label,
    route:String(window._mashlul||''),
    model:window.V94CaseModel.buildCaseModelFromCurrentState(window,document),
    ids:Array.from(document.querySelectorAll('input[id],select[id],textarea[id]')).reduce((o,e)=>{o[e.id]=(e.type==='checkbox'||e.type==='radio')?!!e.checked:String(e.value||'');return o;},{})
  });
  const out=[snap('initial')];
  await window.V94CaseModelWriter.applyCaseModelToDocument(m,window,document);
  out.push(snap('after-writer'));
  await new Promise(r=>setTimeout(r,300));
  out.push(snap('after-300'));
  await new Promise(r=>setTimeout(r,700));
  out.push(snap('after-1000'));
  return out;
},source.model);
await p2.close();
await browser.close();

const baseModel=clean(source.model);
const reports=phases.map(ph=>{
  const cm=clean(ph.model);
  return {
    label:ph.label,
    route:ph.route,
    diff:diff(baseModel,cm),
    keyIds:{
      case_num:[source.ids.case_num,ph.ids.case_num],
      has_multiple_yes:[source.ids.has_multiple_yes,ph.ids.has_multiple_yes],
      multi_proc_type:[source.ids.multi_proc_type,ph.ids.multi_proc_type],
      multi_count:[source.ids.multi_count,ph.ids.multi_count],
      m_case_1:[source.ids.m_case_1,ph.ids.m_case_1],
      m_case_2:[source.ids.m_case_2,ph.ids.m_case_2],
      m_case_3:[source.ids.m_case_3,ph.ids.m_case_3],
      cond_case_3:[source.ids.cond_case_3,ph.ids.cond_case_3],
      disq_case_2:[source.ids.disq_case_2,ph.ids.disq_case_2],
      bond_case_4:[source.ids.bond_case_4,ph.ids.bond_case_4]
    }
  };
});
fs.mkdirSync('docs',{recursive:true});
fs.writeFileSync('docs/v94-writer67-diff.json',JSON.stringify({sourceModel:baseModel,reports},null,2));
console.log(JSON.stringify(reports.map(r=>({label:r.label,diffs:r.diff.length,first:r.diff.slice(0,20),keyIds:r.keyIds})),null,2));
