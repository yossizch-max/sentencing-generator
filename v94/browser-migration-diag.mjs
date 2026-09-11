import { chromium } from 'playwright';
const name=process.argv[2];
if(!name) throw new Error('scenario name required');
const defs={
  '67-basic':{route:'67',vals:{case_num:'D67',traffic_count:'5',traffic_detail:'עבר',crim_count:'0',req_prison:'8',req_disq:'24'}},
  '67-joined':{route:'67',vals:{case_num:'DJ',traffic_count:'8',traffic_detail:'עבר',crim_count:'1',crim_detail:'פלילי',req_prison:'10',req_disq:'36'},multi:true},
  '10a':{route:'10a',vals:{case_num:'D10',traffic_count:'3',traffic_detail:'עבר',prior_10a:'2',no_fix_10a:true}},
  '67+10a':{route:'67+10a',vals:{case_num:'DC',ps67s_prior_67_count:'2',prior_10a:'1',no_fix_10a:true}},
  'shichrut':{route:'shichrut',vals:{case_num:'DS',shich_repeat:'כן',ps67s_alcohol_level:'850',ps67s_prior_shich_count:'1'}},
  '67_shichrut':{route:'67_shichrut',vals:{case_num:'D67S',ps67s_prior_67_count:'2',shich_repeat:'כן',ps67s_alcohol_level:'900'}},
  '10a_shichrut':{route:'10a_shichrut',vals:{case_num:'D10S',prior_10a:'1',shich_repeat:'כן',ps67s_alcohol_level:'760'}},
  '67_10a_shichrut':{route:'67_10a_shichrut',vals:{case_num:'DALL',ps67s_prior_67_count:'2',prior_10a:'1',no_fix_10a:true,shich_repeat:'כן',ps67s_alcohol_level:'880'}},
  'accident':{route:'accident_injury',vals:{case_num:'DA',acc_injury:'hard',acc_negligence:'high',acc_placement:'center',acc_prison_min:'3',acc_prison_max:'6',acc_disq_min:'24',acc_disq_max:'48',acc_victim_count:'2',acc_description:'תאונה',acc_prior_10a:true,acc_p_prison_m:'4',acc_p_disq_m:'36'}}
};
const sc=defs[name];
if(!sc) throw new Error('unknown '+name);
const browser=await chromium.launch({headless:true});
async function open(){
  const p=await browser.newPage({viewport:{width:1366,height:768}});
  await p.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(800);
  await p.addScriptTag({url:'http://127.0.0.1:4173/v94/case-model-adapter.js'});
  await p.addScriptTag({url:'http://127.0.0.1:4173/v94/case-model-writer.js'});
  return p;
}
async function choose(p,r){await p.evaluate(x=>window.chooseMashlul?window.chooseMashlul(x):(window._mashlul=x),r);await p.waitForTimeout(400);}
async function seed(p,vals){await p.evaluate(v=>{for(const [id,x] of Object.entries(v)){const e=document.getElementById(id);if(!e)continue;if(e.type==='checkbox'||e.type==='radio')e.checked=!!x;else e.value=String(x);e.dispatchEvent(new Event('change',{bubbles:true}));}},vals);await p.waitForTimeout(150);}
async function generate(p){return await p.evaluate(async()=>{try{if(window.safeGenerate)window.safeGenerate();else if(window.generate)window.generate();await new Promise(r=>setTimeout(r,800));return {err:null,text:(document.getElementById('paper')?.innerText||'').replace(/\s+/g,' ').trim()};}catch(e){return {err:String(e),text:''};}});}
const p1=await open();await choose(p1,sc.route);await seed(p1,sc.vals);
if(sc.multi){await p1.evaluate(async()=>{const set=(id,v)=>{const e=document.getElementById(id);if(!e)return;if(e.type==='checkbox')e.checked=!!v;else e.value=String(v);e.dispatchEvent(new Event('change',{bubbles:true}));};set('has_multiple_yes',true);set('multi_proc_type','consol');set('multi_count','3');window.toggleMultipleUI?.();window.buildMultiCards?.();await new Promise(r=>setTimeout(r,150));set('m_case_1','DJ');set('m_case_2','J2');set('m_case_3','J3');});}
const m1=await p1.evaluate(()=>window.V94CaseModel.buildCaseModelFromCurrentState(window,document));
const g1=await generate(p1);await p1.close();
const p2=await open();await p2.evaluate(async m=>window.V94CaseModelWriter.applyCaseModelToDocument(m,window,document),m1);await p2.waitForTimeout(450);
const m2=await p2.evaluate(()=>window.V94CaseModel.buildCaseModelFromCurrentState(window,document));const g2=await generate(p2);await p2.close();await browser.close();
for(const m of [m1,m2]){if(m.metadata){delete m.metadata.capturedAt;m.metadata.source='legacy-dom-readonly';}}
const modelEqual=JSON.stringify(m1)===JSON.stringify(m2),textEqual=g1.text===g2.text;
console.log(JSON.stringify({name,modelEqual,textEqual,g1Err:g1.err,g2Err:g2.err,len1:g1.text.length,len2:g2.text.length},null,2));
if(!modelEqual||!textEqual||g1.err||g2.err) throw new Error('diag failed '+name);
console.log('PASS '+name);
