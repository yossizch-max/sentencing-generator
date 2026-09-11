import { chromium } from 'playwright';
import fs from 'fs';

const base='http://127.0.0.1:4173/index.html';
const browser=await chromium.launch({headless:true});
async function open(){
  const p=await browser.newPage({viewport:{width:1366,height:768}});
  await p.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  await p.waitForTimeout(900);
  await p.addScriptTag({url:base.replace('index.html','v94/case-model-adapter.js')});
  await p.addScriptTag({url:base.replace('index.html','v94/case-model-writer.js')});
  return p;
}
async function choose(p,r){await p.evaluate(x=>window.chooseMashlul?window.chooseMashlul(x):(window._mashlul=x),r);await p.waitForTimeout(450);}
function diff(a,b,path='',out=[]){
  if(out.length>=200) return out;
  if(typeof a!==typeof b){out.push({path,a,b});return out;}
  if(a&&typeof a==='object'){
    const keys=new Set([...Object.keys(a||{}),...Object.keys(b||{})]);
    for(const k of keys) diff(a?.[k],b?.[k],path?path+'.'+k:k,out);
  }else if(String(a??'')!==String(b??'')) out.push({path,a,b});
  return out;
}

const p1=await open();await choose(p1,'67');
const m1=await p1.evaluate(async()=>{
  const set=(id,v)=>{const e=document.getElementById(id);if(!e)return;if(e.type==='checkbox'||e.type==='radio')e.checked=!!v;else e.value=String(v);e.dispatchEvent(new Event('change',{bubbles:true}));};
  set('case_num','WRITER-MAIN-94');set('def_name','נאשם QA');set('traffic_count','7');set('traffic_detail','עבר תעבורתי QA');set('crim_count','0');set('off_no_insurance',true);set('req_prison','10');set('req_disq','36');set('req_fine','5000');
  set('has_multiple_yes',true);set('multi_proc_type','consol');set('multi_count','3');window.toggleMultipleUI?.();window.buildMultiCards?.();await new Promise(r=>setTimeout(r,160));
  set('m_case_1','WRITER-MAIN-94');set('m_case_2','WRITER-JOIN-2');set('m_case_3','WRITER-JOIN-3');
  set('m_date_1','2026-01-01');set('m_date_2','2026-02-02');set('m_date_3','2026-03-03');
  if(window.addConditionalItem)window.addConditionalItem(3);
  if(window.addDisqualificationItem)window.addDisqualificationItem(2);
  if(window.addBondItem)window.addBondItem(4);
  await new Promise(r=>setTimeout(r,100));
  set('cond_case_3','COND-3');set('cond_months_3','6');set('disq_case_2','DISQ-2');set('disq_months_2','12');set('bond_case_4','BOND-4');set('bond_amount_4','9000');
  return window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
});
await p1.close();

const p2=await open();
await p2.evaluate(async m=>{await window.V94CaseModelWriter.applyCaseModelToDocument(m,window,document);await new Promise(r=>setTimeout(r,500));},m1);
const m2=await p2.evaluate(()=>window.V94CaseModel.buildCaseModelFromCurrentState(window,document));
await p2.close();await browser.close();

for(const m of [m1,m2]){if(m.metadata){delete m.metadata.capturedAt;m.metadata.source='legacy-dom-readonly';}}
const report={equal:JSON.stringify(m1)===JSON.stringify(m2),diffs:diff(m1,m2),m1,m2};
fs.mkdirSync('docs',{recursive:true});
fs.writeFileSync('docs/v94-writer67-diff.json',JSON.stringify(report,null,2));
console.log('writer67 equal',report.equal,'diffs',report.diffs.length);
