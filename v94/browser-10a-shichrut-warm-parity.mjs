import { chromium } from 'playwright';
import fs from 'fs';
const browser=await chromium.launch({headless:true});
const base='http://127.0.0.1:4173/index.html';
async function open(){const p=await browser.newPage({viewport:{width:1366,height:768}});await p.goto(base,{waitUntil:'domcontentloaded',timeout:30000});await p.waitForTimeout(900);await p.addScriptTag({url:base.replace('index.html','v94/case-model-adapter.js')});await p.addScriptTag({url:base.replace('index.html','v94/case-model-writer.js')});return p;}
async function choose(p){await p.evaluate(()=>window.chooseMashlul?window.chooseMashlul('10a_shichrut'):(window._mashlul='10a_shichrut'));await p.waitForTimeout(900);}
async function seed(p){await p.evaluate(()=>{const set=(id,v)=>{const e=document.getElementById(id);if(!e)return;if(e.type==='checkbox'||e.type==='radio')e.checked=!!v;else e.value=String(v);e.dispatchEvent(new Event('change',{bubbles:true}));};set('case_num','WARM-10SH');set('prior_10a',true);set('no_fix_10a',true);set('shich_repeat',true);set('shich_repeat_year','2024');set('ps67s_alcohol_level','760');set('ps67s_prior_shich_count','1');set('req_prison','8');set('req_disq','30');});await p.waitForTimeout(600);}
async function out(p){return await p.evaluate(async()=>{const fire=()=>{const a=window['safe'+'Generate'];const b=window['generate'];if(typeof a==='function')a();else if(typeof b==='function')b();};const read=()=>String(document.getElementById('paper')?.innerText||'').replace(/\\s+/g,' ').trim();fire();await new Promise(r=>setTimeout(r,3300));fire();await new Promise(r=>setTimeout(r,1800));return read();});}
const p1=await open();await choose(p1);await seed(p1);const m1=await p1.evaluate(()=>window.V94CaseModel.buildCaseModelFromCurrentState(window,document));const t1=await out(p1);await p1.close();
const p2=await open();await p2.evaluate(async m=>window.V94CaseModelWriter.applyCaseModelToDocument(m,window,document),m1);await p2.waitForTimeout(900);const m2=await p2.evaluate(()=>window.V94CaseModel.buildCaseModelFromCurrentState(window,document));const t2=await out(p2);await p2.close();await browser.close();
for(const m of [m1,m2]){if(m.metadata){delete m.metadata.capturedAt;m.metadata.source='legacy-dom-readonly';}}
const modelEqual=JSON.stringify(m1)===JSON.stringify(m2),textEqual=t1===t2;
const report={modelEqual,textEqual,len1:t1.length,len2:t2.length,text1:t1,text2:t2};
fs.mkdirSync('docs',{recursive:true});
fs.writeFileSync('docs/v94-10a-shichrut-warm-parity.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({modelEqual,textEqual,len1:t1.length,len2:t2.length},null,2));