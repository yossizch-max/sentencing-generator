import { chromium } from 'playwright';
import fs from 'fs';
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
async function gen(p){return await p.evaluate(async()=>{let err=null;try{if(window.safeGenerate)window.safeGenerate();else if(window.generate)window.generate();await new Promise(r=>setTimeout(r,800));}catch(e){err=String(e);}return {err,text:(document.getElementById('paper')?.innerText||'').replace(/\s+/g,' ').trim()};});}
const vals={case_num:'D10',traffic_count:'3',traffic_detail:'עבר',prior_10a:'2',no_fix_10a:true};
const p1=await open();await choose(p1,'10a');await seed(p1,vals);
const m1=await p1.evaluate(()=>window.V94CaseModel.buildCaseModelFromCurrentState(window,document));const g1=await gen(p1);await p1.close();
const p2=await open();await p2.evaluate(async m=>window.V94CaseModelWriter.applyCaseModelToDocument(m,window,document),m1);await p2.waitForTimeout(450);
const m2=await p2.evaluate(()=>window.V94CaseModel.buildCaseModelFromCurrentState(window,document));const g2=await gen(p2);
const dom2=await p2.evaluate(()=>{const ids=['prior_10a','no_fix_10a','traffic_count','traffic_detail','case_num'];const o={};for(const id of ids){const e=document.getElementById(id);o[id]=e?(e.type==='checkbox'?e.checked:e.value):null;}return o;});
await p2.close();await browser.close();
for(const m of [m1,m2]){if(m.metadata){delete m.metadata.capturedAt;m.metadata.source='legacy-dom-readonly';}}
function diff(a,b,path='',out=[]){
 if(typeof a!==typeof b){out.push({path,a,b});return out;}
 if(a&&typeof a==='object'){
   const keys=new Set([...Object.keys(a),...Object.keys(b||{})]);
   for(const k of keys) diff(a[k],b?b[k]:undefined,path?path+'.'+k:k,out);
 }else if(String(a??'')!==String(b??'')) out.push({path,a,b});
 return out;
}
const report={modelDiff:diff(m1,m2).slice(0,100),textEqual:g1.text===g2.text,text1:g1.text,text2:g2.text,g1Err:g1.err,g2Err:g2.err,dom2};
fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/v94-diag-10a.json',JSON.stringify(report,null,2));
console.log('wrote 10a diagnostic',report.modelDiff.length,report.textEqual);
