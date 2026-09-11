import { chromium } from 'playwright';
import fs from 'fs';

const browser=await chromium.launch({headless:true});
const base='http://127.0.0.1:4173/index.html';
async function open(){
  const p=await browser.newPage({viewport:{width:1366,height:768}});
  await p.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  await p.waitForTimeout(900);
  await p.addScriptTag({url:'http://127.0.0.1:4173/v94/case-model-adapter.js'});
  await p.addScriptTag({url:'http://127.0.0.1:4173/v94/case-model-writer.js'});
  return p;
}
async function choose(p,r){await p.evaluate(x=>window.chooseMashlul?window.chooseMashlul(x):(window._mashlul=x),r);await p.waitForTimeout(450);}
async function seed(p){
  await p.evaluate(()=>{
    const set=(id,v)=>{const e=document.getElementById(id);if(!e)return;if(e.type==='checkbox'||e.type==='radio')e.checked=!!v;else e.value=String(v);e.dispatchEvent(new Event('change',{bubbles:true}));};
    set('case_num','D10S');
    set('prior_10a',true);
    set('no_fix_10a',true);
    set('ps67s_10a_detail','פרט 10א');
    set('ps67s_10a_related','on');
    set('shich_repeat',true);
    set('shich_repeat_year','2024');
    set('shich_accident',false);
    set('shich_accident_result','damage');
    set('shich_40a',false);
    set('ps67s_alcohol_level','760');
    set('ps67s_shich_type','alcohol');
    set('ps67s_prior_shich_count','1');
    set('req_prison','8');
    set('req_disq','30');
  });
  await p.waitForTimeout(200);
}
async function generate(p){
  return await p.evaluate(async()=>{
    let err=null;
    try{window.safeGenerate?window.safeGenerate():window.generate?.();}catch(e){err=String(e);}
    const read=()=>String(document.getElementById('paper')?.innerText||'').replace(/\s+/g,' ').trim();
    let prev='',stable=0,last='';
    for(let i=0;i<24;i++){await new Promise(r=>setTimeout(r,150));last=read();if(last===prev&&last.length>0)stable++;else stable=0;if(stable>=3)break;prev=last;}
    return {err,text:last};
  });
}
function clean(m){const x=structuredClone(m);if(x.metadata){delete x.metadata.capturedAt;x.metadata.source='legacy-dom-readonly';}return x;}
function diff(a,b,path='',out=[]){if(out.length>=200)return out;if(typeof a!==typeof b){out.push({path,a,b});return out;}if(a&&typeof a==='object'){for(const k of new Set([...Object.keys(a||{}),...Object.keys(b||{})]))diff(a?.[k],b?.[k],path?path+'.'+k:k,out);}else if(String(a??'')!==String(b??''))out.push({path,a,b});return out;}

const p1=await open();await choose(p1,'10a_shichrut');await seed(p1);
const before=await p1.evaluate(()=>({
  model:window.V94CaseModel.buildCaseModelFromCurrentState(window,document),
  ids:Array.from(document.querySelectorAll('input[id],select[id],textarea[id]')).reduce((o,e)=>{o[e.id]=(e.type==='checkbox'||e.type==='radio')?!!e.checked:String(e.value||'');return o;},{})
}));
const g1=await generate(p1);await p1.close();

const p2=await open();
await p2.evaluate(async m=>{await window.V94CaseModelWriter.applyCaseModelToDocument(m,window,document);},before.model);
await p2.waitForTimeout(800);
const after=await p2.evaluate(()=>({
  model:window.V94CaseModel.buildCaseModelFromCurrentState(window,document),
  ids:Array.from(document.querySelectorAll('input[id],select[id],textarea[id]')).reduce((o,e)=>{o[e.id]=(e.type==='checkbox'||e.type==='radio')?!!e.checked:String(e.value||'');return o;},{})
}));
const g2=await generate(p2);await p2.close();await browser.close();

const a=clean(before.model),b=clean(after.model);
const ids=['case_num','prior_10a','no_fix_10a','ps67s_10a_detail','ps67s_10a_related','shich_repeat','shich_repeat_year','shich_accident','shich_accident_result','shich_40a','ps67s_alcohol_level','ps67s_shich_type','ps67s_prior_shich_count','req_prison','req_disq'];
const idDiff=ids.filter(k=>String(before.ids[k]??'')!==String(after.ids[k]??'')).map(k=>({id:k,before:before.ids[k],after:after.ids[k]}));
const allIds=[...new Set([...Object.keys(before.ids||{}),...Object.keys(after.ids||{})])].sort();
const allIdDiff=allIds.filter(k=>String(before.ids[k]??'')!==String(after.ids[k]??'')).map(k=>({id:k,before:before.ids[k],after:after.ids[k]}));
const report={modelEqual:JSON.stringify(a)===JSON.stringify(b),modelDiff:diff(a,b),idDiff,allIdDiff,textEqual:g1.text===g2.text,g1Err:g1.err,g2Err:g2.err,len1:g1.text.length,len2:g2.text.length,text1:g1.text,text2:g2.text};
fs.mkdirSync('docs',{recursive:true});
fs.writeFileSync('docs/v94-10a-shichrut-diff.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({modelEqual:report.modelEqual,modelDiff:report.modelDiff.slice(0,30),idDiff:report.idDiff,allIdDiff:report.allIdDiff.slice(0,80),textEqual:report.textEqual,g1Err:g1.err,g2Err:g2.err,len1:report.len1,len2:report.len2},null,2));
