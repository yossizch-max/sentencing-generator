import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}});
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{ if(m.type()==='error') errors.push('console:'+m.text()); });

await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForTimeout(1200);
if(errors.length) throw new Error('load errors: '+JSON.stringify(errors.slice(0,10)));

await page.addScriptTag({url:'http://127.0.0.1:4173/v94/case-model-adapter.js'});
const hasApi=await page.evaluate(()=>!!window.V94CaseModel && typeof window.V94CaseModel.buildCaseModelFromCurrentState==='function');
if(!hasApi) throw new Error('V94CaseModel API injection failed');

const baseline=await page.evaluate(()=>{
  const api=window.V94CaseModel;
  const before=document.body.innerHTML;
  const model=api.buildCaseModelFromCurrentState(window,document);
  const after=document.body.innerHTML;
  return {same:before===after,model,issues:api.validateCaseModel(model)};
});
if(!baseline.same) throw new Error('CaseModel adapter mutated DOM');
if(!baseline.model || baseline.model.schemaVersion!==1) throw new Error('bad schema version');

const routes=['67','10a','67+10a','shichrut','67_shichrut','10a_shichrut','67_10a_shichrut','accident_injury'];
for (const route of routes){
  const result=await page.evaluate((r)=>{
    window._mashlul=r;
    const m=window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
    return {route:m.route,accident:!!m.accident};
  },route);
  if(result.route!==route) throw new Error('route capture mismatch '+route+' got '+result.route);
  if((route==='accident_injury')!==result.accident) throw new Error('accident mapping mismatch '+route);
}

const deterministic=await page.evaluate(()=>{
  window._mashlul='67';
  const a=window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
  const b=window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
  delete a.metadata.capturedAt; delete b.metadata.capturedAt;
  return JSON.stringify(a)===JSON.stringify(b);
});
if(!deterministic) throw new Error('nondeterministic model capture');

const targetIds=['case_num','traffic_count','crim_count','m_min','m_max','pos','req_prison','req_disq'];
const parity=await page.evaluate((ids)=>{
  window._mashlul='67';
  for(const id of ids){
    const el=document.getElementById(id);
    if(!el) continue;
    if(el.type==='checkbox') el.checked=false;
  }
  const set=(id,v)=>{const e=document.getElementById(id); if(e) e.value=v;};
  set('case_num','QA-CASE-94');
  set('traffic_count','5');
  set('crim_count','0');
  set('m_min','6');
  set('m_max','24');
  set('pos','center');
  set('req_prison','8');
  set('req_disq','36');
  const legacy=typeof window.getAllFields==='function'?window.getAllFields():{
    _mashlul:window._mashlul,
    case_num:document.getElementById('case_num')?.value,
    traffic_count:document.getElementById('traffic_count')?.value,
    crim_count:document.getElementById('crim_count')?.value,
    m_min:document.getElementById('m_min')?.value,
    m_max:document.getElementById('m_max')?.value,
    pos:document.getElementById('pos')?.value,
    req_prison:document.getElementById('req_prison')?.value,
    req_disq:document.getElementById('req_disq')?.value
  };
  const model=window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
  return window.V94CaseModel.compareLegacyStateToCaseModel(legacy,model);
},targetIds);
if(!parity.ok) throw new Error('browser parity failed '+JSON.stringify(parity.differences));

await browser.close();
console.log('PASS Playwright live-DOM v94 adapter smoke');
