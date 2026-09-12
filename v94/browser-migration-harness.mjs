import { chromium } from 'playwright';

const base='http://127.0.0.1:4173/index.html';
const adapter='http://127.0.0.1:4173/v94/case-model-adapter.js';
const writer='http://127.0.0.1:4173/v94/case-model-writer.js';

const browser=await chromium.launch({headless:true});

async function page(){
  const p=await browser.newPage({viewport:{width:1366,height:768}});
  await p.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  await p.waitForTimeout(900);
  await p.addScriptTag({url:adapter});
  await p.addScriptTag({url:writer});
  return p;
}
async function waitRouteReady(p,route){
  await p.waitForFunction((r)=>{
    const cur=(window.RouteEngine&&typeof window.RouteEngine.current==='function')?String(window.RouteEngine.current()||''):String(window._mashlul||'');
    if(cur!==r) return false;
    if(['67_shichrut','10a_shichrut','67_10a_shichrut'].includes(r)){
      const pt=document.getElementById('policy_text');
      const tag=String(pt?.dataset?.v9367Route||pt?.dataset?.v66Route||'');
      return !!pt && tag===r && String(pt.value||'').trim().length>0;
    }
    return true;
  },route,{timeout:6000}).catch(()=>{});
  await p.waitForTimeout(250);
}
async function choose(p,route){
  await p.evaluate(r=>{ if(typeof window.chooseMashlul==='function') window.chooseMashlul(r); else window._mashlul=r; },route);
  await p.waitForTimeout(450);
  await waitRouteReady(p,route);
}
async function gen(p){
  return await p.evaluate(async ()=>{
    const before=String(document.getElementById('paper')?.innerHTML||'');
    let ret=null,err=null;
    try{
      if(typeof window.safeGenerate==='function') ret=window.safeGenerate();
      else if(typeof window.generate==='function') ret=window.generate();
      const read=()=>({
        paper:String(document.getElementById('paper')?.innerHTML||''),
        text:String(document.getElementById('paper')?.innerText||'')
      });
      let prev='',stable=0,snap=read();
      for(let i=0;i<24;i++){
        await new Promise(r=>setTimeout(r,150));
        snap=read();
        const key=snap.paper+'\n'+snap.text;
        if(key===prev && key.length>0) stable++; else stable=0;
        if(stable>=3) break;
        prev=key;
      }
      return {err,ret:ret==null?null:String(ret),paper:snap.paper,text:snap.text,before};
    }catch(e){err=String(e);}
    return {err,ret:ret==null?null:String(ret),paper:String(document.getElementById('paper')?.innerHTML||''),text:String(document.getElementById('paper')?.innerText||''),before};
  });
}
async function legacyState(p){
  return await p.evaluate(()=>typeof window.getAllFields==='function'?window.getAllFields():{});
}
function stable(v){ return JSON.stringify(v); }
function stripVolatile(model){
  const m=structuredClone(model);
  if(m.metadata) delete m.metadata.capturedAt;
  return m;
}
function normalizeHtml(s){
  return String(s||'')
    .replace(/s+/g,' ')
    .replace(/>s+</g,'><')
    .trim();
}
async function seed(p,vals){
  await p.evaluate(values=>{
    for(const [id,v] of Object.entries(values)){
      const e=document.getElementById(id); if(!e) continue;
      if(e.type==='checkbox'||e.type==='radio') e.checked=!!v;
      else if(e.tagName==='SELECT'){
        const opts=[...e.options].map(o=>o.value);
        const wanted=String(v);
        e.value=opts.includes(wanted)?wanted:(opts.find(x=>x!=='')||opts[0]||'');
      } else e.value=String(v);
      e.dispatchEvent(new Event('input',{bubbles:true}));
      e.dispatchEvent(new Event('change',{bubbles:true}));
    }
  },vals);
  await p.waitForTimeout(250);
}

const scenarios=[
  {
    name:'67-basic',route:'67',
    vals:{case_num:'PAR-67',traffic_count:'5',traffic_detail:'עבר תעבורתי QA',crim_count:'0',off_no_insurance:true,req_prison:'8',req_disq:'24'}
  },
  {
    name:'67-joined',route:'67',
    vals:{case_num:'PAR-MAIN',traffic_count:'8',traffic_detail:'עבר מכביד QA',crim_count:'1',crim_detail:'רישום פלילי QA',req_prison:'10',req_disq:'36'},
    multi:true
  },
  {
    name:'10a',route:'10a',
    vals:{case_num:'PAR-10A',traffic_count:'3',traffic_detail:'עבר 10א',prior_10a:'2',no_fix_10a:true,req_prison:'6',req_disq:'18'}
  },
  {
    name:'67+10a',route:'67+10a',
    vals:{case_num:'PAR-COMB',traffic_count:'6',traffic_detail:'עבר משולב',ps67s_prior_67_count:'2',prior_10a:'1',no_fix_10a:true,req_prison:'9',req_disq:'30'}
  },
  {
    name:'shichrut',route:'shichrut',
    vals:{case_num:'PAR-SH',traffic_count:'4',traffic_detail:'עבר שכרות',shich_repeat:'כן',shich_repeat_year:'2024',ps67s_alcohol_level:'850',ps67s_prior_shich_count:'1',req_prison:'5',req_disq:'24'}
  },
  {
    name:'67_shichrut',route:'67_shichrut',
    vals:{case_num:'PAR-67SH',ps67s_prior_67_count:'2',shich_repeat:'כן',ps67s_alcohol_level:'900',req_prison:'10',req_disq:'36'}
  },
  {
    name:'10a_shichrut',route:'10a_shichrut',
    vals:{case_num:'PAR-10SH',prior_10a:'1',shich_repeat:'כן',ps67s_alcohol_level:'760',req_prison:'8',req_disq:'30'}
  },
  {
    name:'67_10a_shichrut',route:'67_10a_shichrut',
    vals:{case_num:'PAR-ALL',ps67s_prior_67_count:'2',prior_10a:'1',no_fix_10a:true,shich_repeat:'כן',ps67s_alcohol_level:'880',ps67s_prior_shich_count:'1',req_prison:'12',req_disq:'42',req_fine:'5000'}
  },
  {
    name:'accident',route:'accident_injury',
    vals:{case_num:'PAR-ACC',acc_injury:'hard',acc_negligence:'high',acc_placement:'center',acc_prison_min:'3',acc_prison_max:'6',acc_disq_min:'24',acc_disq_max:'48',acc_victim_count:'2',acc_description:'תאונת QA',acc_prior_10a:true,acc_agg_crosswalk:true,acc_p_prison_m:'4',acc_p_disq_m:'36'}
  }
];

const reports=[];

for(const sc of scenarios){
  const p1=await page();
  await choose(p1,sc.route);
  await seed(p1,sc.vals);
  if(sc.multi){
    await p1.evaluate(async ()=>{
      const set=(id,v)=>{const e=document.getElementById(id);if(!e)return;if(e.type==='checkbox'||e.type==='radio')e.checked=!!v;else e.value=String(v);e.dispatchEvent(new Event('change',{bubbles:true}));};
      set('has_multiple_yes',true); set('multi_proc_type','consol'); set('multi_count','3');
      if(typeof window.toggleMultipleUI==='function') window.toggleMultipleUI();
      if(typeof window.buildMultiCards==='function') window.buildMultiCards();
      await new Promise(r=>setTimeout(r,180));
      set('m_case_1','PAR-MAIN'); set('m_case_2','PAR-J2'); set('m_case_3','PAR-J3');
      set('m_date_1','2026-01-01'); set('m_date_2','2026-02-02'); set('m_date_3','2026-03-03');
      if(typeof window.addConditionalItem==='function') window.addConditionalItem(3);
      if(typeof window.addDisqualificationItem==='function') window.addDisqualificationItem(2);
      if(typeof window.addBondItem==='function') window.addBondItem(4);
      await new Promise(r=>setTimeout(r,100));
      set('cond_case_3','COND-3'); set('cond_months_3','6');
      set('disq_case_2','DISQ-2'); set('disq_months_2','12');
      set('bond_case_4','BOND-4'); set('bond_amount_4','9000');
    });
  }

  const model1=await p1.evaluate(()=>window.V94CaseModel.buildCaseModelFromCurrentState(window,document));
  const state1=await legacyState(p1);
  const gen1=await gen(p1);
  await p1.close();

  const p2=await page();
  await p2.evaluate(async m=>{ await window.V94CaseModelWriter.applyCaseModelToDocument(m,window,document); },model1);
  await p2.waitForTimeout(550);
  await waitRouteReady(p2,sc.route);

  const model2=await p2.evaluate(()=>window.V94CaseModel.buildCaseModelFromCurrentState(window,document));
  const state2=await legacyState(p2);
  const gen2=await gen(p2);
  await p2.close();

  const m1=stripVolatile(model1), m2=stripVolatile(model2);
  if(m1.metadata) m1.metadata.source='legacy-dom-readonly';
  if(m2.metadata) m2.metadata.source='legacy-dom-readonly';

  const stateKeys=['case_num','traffic_count','crim_count','m_min','m_max','pos','req_prison','req_disq','req_fine','req_bond',
    'ps67s_prior_67_count','prior_10a','no_fix_10a','shich_repeat','ps67s_alcohol_level','ps67s_prior_shich_count',
    'acc_injury','acc_negligence','acc_placement','acc_prison_min','acc_prison_max','acc_disq_min','acc_disq_max','acc_victim_count','acc_p_prison_m','acc_p_disq_m'];
  const stateDiff=[];
  for(const k of stateKeys){
    if(Object.prototype.hasOwnProperty.call(state1,k)||Object.prototype.hasOwnProperty.call(state2,k)){
      const a=String(state1[k]??''),b=String(state2[k]??'');
      if(a!==b) stateDiff.push([k,a,b]);
    }
  }

  const modelEqual=stable(m1)===stable(m2);
  const htmlEqual=normalizeHtml(gen1.paper)===normalizeHtml(gen2.paper);
  const textEqual=String(gen1.text||'').replace(/s+/g,' ').trim()===String(gen2.text||'').replace(/s+/g,' ').trim();

  reports.push({name:sc.name,route:sc.route,modelEqual,stateDiffCount:stateDiff.length,stateDiff,htmlEqual,textEqual,gen1Err:gen1.err,gen2Err:gen2.err,len1:gen1.paper.length,len2:gen2.paper.length});
}

await browser.close();

const failed=reports.filter(r=>!r.modelEqual||r.stateDiffCount||!r.textEqual||r.gen1Err||r.gen2Err);
console.log(JSON.stringify(reports,null,2));
if(failed.length) throw new Error('migration harness failures: '+failed.map(x=>x.name).join(', '));
console.log('PASS migration harness '+reports.length+'/'+reports.length+' scenarios');
