import { chromium } from 'playwright';

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
async function setup(p){
  await p.evaluate(()=>{ if(window.chooseMashlul) window.chooseMashlul('67'); else window._mashlul='67'; });
  await p.waitForTimeout(400);
  await p.evaluate(async()=>{
    const set=(id,v)=>{const e=document.getElementById(id);if(!e)return false;if(e.type==='checkbox'||e.type==='radio')e.checked=!!v;else e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true;};
    set('case_num','MC-MAIN');
    set('has_multiple_yes',true); set('multi_proc_type','consol'); set('multi_count','3');
    window.toggleMultipleUI?.(); window.buildMultiCards?.();
    await new Promise(r=>setTimeout(r,180));
    for(const [id,v] of Object.entries({
      m_case_1:'MC-MAIN',m_case_2:'MC-J2',m_case_3:'MC-J3',
      m_date_1:'2026-01-01',m_date_2:'2026-02-02',m_date_3:'2026-03-03',
      m_disq_type_1:'פסילת בית משפט',m_disq_type_2:'פסילה מנהלית (קצין משטרה)',m_disq_type_3:'פסילת משרד הרישוי',
      m_disq_1:'פרטי פסילה 1',m_disq_2:'פרטי פסילה 2',m_disq_3:'פרטי פסילה 3',
      m_lic_exp_1:true,m_lic_exp_2:false,m_lic_exp_3:true,
      m_lic_exp_year_1:'2019',m_lic_exp_year_2:'',m_lic_exp_year_3:'2020',
      m_no_ins_1:false,m_no_ins_2:true,m_no_ins_3:true,
      m_other_off_1:'אחר 1',m_other_off_2:'אחר 2',m_other_off_3:'אחר 3',
      m_aggr_1:'מחמיר 1',m_aggr_2:'מחמיר 2',m_aggr_3:'מחמיר 3'
    })) set(id,v);
  });
}
function pick(m){return m.proceeding.cases.map(c=>({
  index:c.index,caseNumber:c.caseNumber,date:c.date,disqualificationType:c.disqualificationType,
  disqualificationDetails:c.disqualificationDetails,licenseExpired:c.licenseExpired,
  licenseExpiryYear:c.licenseExpiryYear,noInsurance:c.noInsurance,freeText:c.freeText,aggravating:c.aggravating
}));}

const p1=await open(); await setup(p1);
const a=await p1.evaluate(()=>window.V94CaseModel.buildCaseModelFromCurrentState(window,document));
const pa=pick(a);
if(pa.length!==3) throw new Error('expected 3 cards '+JSON.stringify(pa));
if(pa[1].disqualificationType!=='פסילה מנהלית (קצין משטרה)') throw new Error('type card2 '+JSON.stringify(pa[1]));
if(pa[1].disqualificationDetails!=='פרטי פסילה 2') throw new Error('details card2');
if(pa[1].noInsurance!==true) throw new Error('insurance card2');
if(pa[2].licenseExpired!==true||pa[2].licenseExpiryYear!=='2020') throw new Error('license card3');
if(pa[2].freeText!=='אחר 3'||pa[2].aggravating!=='מחמיר 3') throw new Error('text card3');
await p1.close();

const p2=await open();
await p2.evaluate(async m=>{await window.V94CaseModelWriter.applyCaseModelToDocument(m,window,document);},a);
await p2.waitForTimeout(500);
const b=await p2.evaluate(()=>window.V94CaseModel.buildCaseModelFromCurrentState(window,document));
const pb=pick(b);
await p2.close(); await browser.close();

if(JSON.stringify(pa)!==JSON.stringify(pb)) throw new Error('multi-card writer fidelity drift '+JSON.stringify({pa,pb}));
console.log('PASS full multi-card fidelity 3/3');
