import { chromium } from 'playwright';

const mode=process.argv[2]||'capture-stress';
const base='http://127.0.0.1:4173/index.html';
const adapter='http://127.0.0.1:4173/v94/case-model-adapter.js';

async function makePage(viewport={width:1366,height:768}){
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error') errors.push('console:'+m.text());});
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForTimeout(1000);
  if(errors.length) throw new Error('page errors '+JSON.stringify(errors.slice(0,10)));
  await page.addScriptTag({url:adapter});
  return {browser,page,errors};
}

async function route(page,r,wait=350){
  await page.evaluate(async (x)=>{
    if(typeof window.chooseMashlul==='function') window.chooseMashlul(x);
    else window._mashlul=x;
  },r);
  await page.waitForTimeout(wait);
}

if(mode==='capture-stress'){
  const {browser,page}=await makePage();
  await route(page,'67');
  const r=await page.evaluate(()=>{
    let mutations=0;
    const obs=new MutationObserver(ms=>{mutations+=ms.length;});
    obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});
    const controlSnapshot=()=>Array.from(document.querySelectorAll('input,select,textarea')).map(e=>({
      id:e.id,value:e.value,checked:!!e.checked,selectedIndex:typeof e.selectedIndex==='number'?e.selectedIndex:null
    }));
    const before=JSON.stringify(controlSnapshot());
    let first=null,last=null;
    for(let i=0;i<250;i++){
      const m=window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
      delete m.metadata.capturedAt;
      if(i===0) first=JSON.stringify(m);
      if(i===249) last=JSON.stringify(m);
    }
    const after=JSON.stringify(controlSnapshot());
    obs.disconnect();
    return {mutations,beforeSame:before===after,modelSame:first===last};
  });
  if(r.mutations!==0) throw new Error('adapter caused DOM mutations '+r.mutations);
  if(!r.beforeSame) throw new Error('adapter changed controls');
  if(!r.modelSame) throw new Error('250 captures drifted');
  await browser.close();
  console.log('PASS capture-stress 250x zero-mutation');
}

if(mode==='route-stress'){
  const {browser,page}=await makePage();
  const routes=['67','10a','67+10a','shichrut','67_shichrut','10a_shichrut','67_10a_shichrut','accident_injury'];
  let n=0;
  for(let round=0;round<4;round++){
    for(const r of routes){
      await route(page,r,180);
      const got=await page.evaluate(()=>window.V94CaseModel.buildCaseModelFromCurrentState(window,document).route);
      if(got!==r) throw new Error('route stress mismatch expected '+r+' got '+got+' at '+n);
      n++;
    }
  }
  await browser.close();
  console.log('PASS route-stress '+n+' real switches');
}

if(mode==='viewports'){
  const vps=[{width:360,height:800},{width:390,height:844},{width:768,height:1024},{width:1366,height:768},{width:1920,height:1080}];
  for(const vp of vps){
    const {browser,page,errors}=await makePage(vp);
    await route(page,'67',250);
    const r=await page.evaluate(()=>({
      route:window.V94CaseModel.buildCaseModelFromCurrentState(window,document).route,
      bodyWidth:document.body.scrollWidth,
      innerWidth:window.innerWidth
    }));
    if(r.route!=='67') throw new Error('viewport route mismatch '+JSON.stringify({vp,r}));
    if(errors.length) throw new Error('viewport errors '+JSON.stringify({vp,errors}));
    await browser.close();
  }
  console.log('PASS viewports 5/5');
}

async function setupLiveMulti(page){
  await route(page,'67',350);
  return await page.evaluate(async ()=>{
    const yes=document.getElementById('has_multiple_yes');
    const proc=document.getElementById('multi_proc_type');
    const count=document.getElementById('multi_count');
    if(!yes||!proc||!count) return {supported:false,missing:[!yes?'has_multiple_yes':null,!proc?'multi_proc_type':null,!count?'multi_count':null].filter(Boolean)};
    yes.checked=true;
    proc.value='consol';
    count.value='3';
    yes.dispatchEvent(new Event('change',{bubbles:true}));
    proc.dispatchEvent(new Event('change',{bubbles:true}));
    count.dispatchEvent(new Event('change',{bubbles:true}));
    if(typeof window.toggleMultipleUI==='function') window.toggleMultipleUI();
    if(typeof window.buildMultiCards==='function') window.buildMultiCards();
    await new Promise(r=>setTimeout(r,250));
    return {
      supported:true,
      funcs:{toggle:typeof window.toggleMultipleUI==='function',build:typeof window.buildMultiCards==='function'},
      ids:[1,2,3].map(i=>!!document.getElementById('m_case_'+i)),
      procValue:proc.value,countValue:count.value,yesChecked:yes.checked
    };
  });
}
if(mode==='multi-structure'){
  const {browser,page}=await makePage();
  const r=await setupLiveMulti(page);
  if(!r.supported) throw new Error('multi controls missing '+JSON.stringify(r));
  if(!r.funcs.build||!r.funcs.toggle) throw new Error('multi functions missing '+JSON.stringify(r));
  if(!r.ids.every(Boolean)) throw new Error('multi card DOM missing '+JSON.stringify(r));
  await browser.close();
  console.log('PASS multi-structure');
}
if(mode==='multi-capture'){
  const {browser,page}=await makePage();
  const prep=await setupLiveMulti(page);
  if(!prep.supported||!prep.ids.every(Boolean)) throw new Error('multi setup failed '+JSON.stringify(prep));
  const r=await page.evaluate(()=>{
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};
    set('m_case_1','MAIN-LIVE');set('m_case_2','JOIN-LIVE-2');set('m_case_3','JOIN-LIVE-3');
    const m=window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
    return {mode:m.proceeding.mode,cases:m.proceeding.cases.map(x=>x.caseNumber),count:m.proceeding.cases.length};
  });
  if(r.mode!=='joined') throw new Error('wrong multi mode '+JSON.stringify(r));
  if(r.count!==3) throw new Error('wrong multi count '+JSON.stringify(r));
  if(r.cases.join('|')!=='MAIN-LIVE|JOIN-LIVE-2|JOIN-LIVE-3') throw new Error('multi capture failed '+JSON.stringify(r));
  await browser.close();
  console.log('PASS multi-capture');
}
async function runShrink(page){
  const prep=await setupLiveMulti(page);
  if(!prep.supported||!prep.ids.every(Boolean)) throw new Error('multi setup failed '+JSON.stringify(prep));
  return await page.evaluate(async ()=>{
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};
    set('case_num','MAIN-LIVE');set('m_case_1','MAIN-LIVE');set('m_case_2','JOIN-LIVE-2');set('m_case_3','JOIN-LIVE-3');
    const count=document.getElementById('multi_count');
    count.value='2'; count.dispatchEvent(new Event('change',{bubbles:true}));
    await new Promise(r=>setTimeout(r,250));
    const m=window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
    return {
      len:m.proceeding.cases.length,
      cases:m.proceeding.cases.map(x=>x.caseNumber),
      thirdExists:!!document.getElementById('m_case_3'),
      countValue:document.getElementById('multi_count')?.value||'',
      leadCase:document.getElementById('case_num')?.value||'',
      firstCard:document.getElementById('m_case_1')?.value||''
    };
  });
}
if(mode==='multi-shrink-model'){
  const {browser,page}=await makePage();
  const r=await runShrink(page);
  if(r.len!==2) throw new Error('model still has wrong count '+JSON.stringify(r));
  if(r.cases.join('|')!=='MAIN-LIVE|JOIN-LIVE-2') throw new Error('remaining card values drifted '+JSON.stringify(r));
  if(r.firstCard!==r.leadCase) throw new Error('lead case/card sync drift '+JSON.stringify(r));
  await browser.close();
  console.log('PASS multi-shrink-model');
}
if(mode==='multi-shrink-dom'){
  const {browser,page}=await makePage();
  const r=await runShrink(page);
  if(r.thirdExists) throw new Error('removed third card still exists '+JSON.stringify(r));
  await browser.close();
  console.log('PASS multi-shrink-dom');
}
if(mode==='multi-shrink'){
  const {browser,page}=await makePage();
  const r=await runShrink(page);
  if(r.len!==2||r.cases.join('|')!=='MAIN-LIVE|JOIN-LIVE-2'||r.thirdExists) throw new Error('multi shrink failed '+JSON.stringify(r));
  await browser.close();
  console.log('PASS multi-shrink');
}
if(mode==='multi-live'){
  console.log('Use multi-structure, multi-capture, and multi-shrink diagnostic modes');
}

if(mode==='conditional-live'){
  const {browser,page}=await makePage();
  await route(page,'67',300);
  const r=await page.evaluate(async ()=>{
    const funcs={
      cond:typeof window.addConditionalItem==='function',
      disq:typeof window.addDisqualificationItem==='function',
      bond:typeof window.addBondItem==='function'
    };
    if(funcs.cond) window.addConditionalItem(3);
    if(funcs.disq) window.addDisqualificationItem(3);
    if(funcs.bond) window.addBondItem(3);
    await new Promise(r=>setTimeout(r,100));
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};
    set('cond_case_3','COND-LIVE-3'); set('cond_months_3','7');
    set('disq_case_3','DISQ-LIVE-3'); set('disq_months_3','14');
    set('bond_case_3','BOND-LIVE-3'); set('bond_amount_3','7000');
    const m=window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
    return {
      funcs,
      ids:{cond:!!document.getElementById('cond_item_3'),disq:!!document.getElementById('disq_item_3'),bond:!!document.getElementById('bond_item_3')},
      lists:{
        cond:m.defendant.record.pendingConditions.imprisonment,
        disq:m.defendant.record.pendingConditions.disqualification,
        bond:m.defendant.record.pendingConditions.bonds
      }
    };
  });
  for(const k of ['cond','disq','bond']){
    if(!r.funcs[k]) throw new Error('missing live list function '+k);
    if(!r.ids[k]) throw new Error('missing live list item DOM '+k);
  }
  if(!r.lists.cond.some(x=>x.index===3&&x.sourceCase==='COND-LIVE-3')) throw new Error('conditional live capture failed '+JSON.stringify(r));
  if(!r.lists.disq.some(x=>x.index===3&&x.sourceCase==='DISQ-LIVE-3')) throw new Error('disq live capture failed '+JSON.stringify(r));
  if(!r.lists.bond.some(x=>x.index===3&&x.sourceCase==='BOND-LIVE-3')) throw new Error('bond live capture failed '+JSON.stringify(r));
  await browser.close();
  console.log('PASS conditional-live index 3 across all lists');
}

if(mode==='legacy-roundtrip'){
  const {browser,page}=await makePage();
  await route(page,'67',300);
  const r=await page.evaluate(async ()=>{
    if(typeof window.getAllFields!=='function'||typeof window.setAllFields!=='function') return {supported:false};
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};
    set('case_num','ROUNDTRIP-94');set('traffic_count','8');set('crim_count','0');set('m_min','5');set('m_max','20');set('pos','high');set('req_prison','9');set('req_disq','30');
    const before=window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
    const state=window.getAllFields();
    window.setAllFields(state);
    await new Promise(r=>setTimeout(r,500));
    const after=window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
    const pick=m=>({
      route:m.route,caseNumber:m.proceeding.leadCaseNumber,
      traffic:m.defendant.record.traffic.count,criminal:m.defendant.record.criminal.count,
      min:m.sentencing.range.imprisonmentMin,max:m.sentencing.range.imprisonmentMax,
      placement:m.sentencing.placement.key,prison:m.sentencing.petition.imprisonment,disq:m.sentencing.petition.disqualification
    });
    return {supported:true,before:pick(before),after:pick(after)};
  });
  if(!r.supported) throw new Error('legacy save/load functions unavailable');
  if(JSON.stringify(r.before)!==JSON.stringify(r.after)) throw new Error('legacy roundtrip drift '+JSON.stringify(r));
  await browser.close();
  console.log('PASS legacy-roundtrip core CaseModel parity');
}
