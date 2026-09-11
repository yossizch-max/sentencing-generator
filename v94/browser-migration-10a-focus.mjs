import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const base='http://127.0.0.1:4173/index.html';
const adapter='http://127.0.0.1:4173/v94/case-model-adapter.js';
const writer='http://127.0.0.1:4173/v94/case-model-writer.js';

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
async function set(p,vals){
  await p.evaluate(values=>{
    for(const [id,v] of Object.entries(values)){
      const e=document.getElementById(id); if(!e) continue;
      if(e.type==='checkbox'||e.type==='radio') e.checked=!!v;
      else if(e.tagName==='SELECT'){
        const opts=[...e.options].map(o=>o.value), wanted=String(v);
        e.value=opts.includes(wanted)?wanted:(opts.find(x=>x!=='')||opts[0]||'');
      } else e.value=String(v);
      e.dispatchEvent(new Event('input',{bubbles:true}));
      e.dispatchEvent(new Event('change',{bubbles:true}));
    }
  },vals);
  await p.waitForTimeout(250);
}
async function capture(p){
  return await p.evaluate(()=>{
    const m=window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
    const state=typeof window.getAllFields==='function'?window.getAllFields():{};
    const ids=['case_num','traffic_count','traffic_detail','prior_10a','no_fix_10a','ps67s_10a_detail','ps67s_10a_related','req_prison','req_disq','req_fine','req_bond','m_min','m_max','pos'];
    const dom={};
    for(const id of ids){
      const e=document.getElementById(id);
      dom[id]=!e?null:((e.type==='checkbox'||e.type==='radio')?!!e.checked:String(e.value||''));
    }
    return {m,state,dom,rawRoute:String(window._mashlul||''),engine:(window.RouteEngine&&typeof window.RouteEngine.current==='function')?String(window.RouteEngine.current()||''):''};
  });
}
async function generate(p){
  return await p.evaluate(async()=>{
    let err=null;
    try{
      if(typeof window.safeGenerate==='function') window.safeGenerate();
      else if(typeof window.generate==='function') window.generate();
      await new Promise(r=>setTimeout(r,900));
    }catch(e){err=String(e);}
    return {
      err,
      html:String(document.getElementById('paper')?.innerHTML||''),
      text:String(document.getElementById('paper')?.innerText||'')
    };
  });
}
function clean(m){const x=structuredClone(m);if(x.metadata){delete x.metadata.capturedAt;x.metadata.source='legacy-dom-readonly';}return x;}
function normText(s){return String(s||'').replace(/\s+/g,' ').trim();}

const p1=await open();
await choose(p1,'10a');
await set(p1,{
  case_num:'QA-10A-FOCUS',
  traffic_count:'3',
  traffic_detail:'עבר 10א מפורט',
  crim_count:'0',
  prior_10a:'2',
  no_fix_10a:true,
  ps67s_10a_detail:'פרט 10א QA',
  ps67s_10a_related:'כן',
  req_prison:'6',
  req_disq:'18',
  req_fine:'2500',
  req_bond:'5000'
});
const before=await capture(p1);
const gen1=await generate(p1);
await p1.close();

const p2=await open();
await p2.evaluate(async m=>{ await window.V94CaseModelWriter.applyCaseModelToDocument(m,window,document); },before.m);
await p2.waitForTimeout(600);
const after=await capture(p2);
const gen2=await generate(p2);
await p2.close();
await browser.close();

const a=clean(before.m),b=clean(after.m);
const modelEqual=JSON.stringify(a)===JSON.stringify(b);
const textEqual=normText(gen1.text)===normText(gen2.text);

const diffs=[];
function cmp(path,x,y){ if(JSON.stringify(x)!==JSON.stringify(y)) diffs.push({path,before:x,after:y}); }
cmp('route',before.m.route,after.m.route);
cmp('routeFacts.section10a',before.m.currentOffense?.routeFacts?.section10a,after.m.currentOffense?.routeFacts?.section10a);
cmp('petition',before.m.sentencing?.petition,after.m.sentencing?.petition);
cmp('traffic',before.m.defendant?.record?.traffic,after.m.defendant?.record?.traffic);
cmp('proceeding',before.m.proceeding,after.m.proceeding);

const stateKeys=['case_num','traffic_count','traffic_detail','prior_10a','no_fix_10a','ps67s_10a_detail','ps67s_10a_related','req_prison','req_disq','req_fine','req_bond','m_min','m_max','pos'];
const stateDiff=[];
for(const k of stateKeys){
  const x=before.state?.[k], y=after.state?.[k];
  if(String(x??'')!==String(y??'')) stateDiff.push({key:k,before:x,after:y});
}

console.log(JSON.stringify({
  modelEqual,textEqual,
  beforeRoute:{raw:before.rawRoute,engine:before.engine,model:before.m.route},
  afterRoute:{raw:after.rawRoute,engine:after.engine,model:after.m.route},
  domBefore:before.dom,domAfter:after.dom,
  stateDiff,diffs,
  gen1Err:gen1.err,gen2Err:gen2.err,
  len1:gen1.text.length,len2:gen2.text.length
},null,2));

if(gen1.err||gen2.err) throw new Error('generation error');
if(!modelEqual||!textEqual) throw new Error('10a focused migration mismatch');
console.log('PASS 10a focused migration');
