import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}});
await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForTimeout(1000);
await page.addScriptTag({url:'http://127.0.0.1:4173/v94/case-model-adapter.js'});

async function choose(route){
  await page.evaluate(r=>{ if(typeof window.chooseMashlul==='function') window.chooseMashlul(r); else window._mashlul=r; },route);
  await page.waitForTimeout(450);
}
async function set(vals){
  await page.evaluate(values=>{
    for(const [id,v] of Object.entries(values)){
      const e=document.getElementById(id);
      if(!e) continue;
      if(e.type==='checkbox'||e.type==='radio') e.checked=!!v;
      else e.value=String(v);
      e.dispatchEvent(new Event('change',{bubbles:true}));
    }
  },vals);
}
async function roundtrip(route,vals,pick){
  await choose(route);
  await set(vals);
  const before=await page.evaluate(fnSrc=>{
    const m=window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
    const fn=eval('('+fnSrc+')');
    return fn(m);
  },pick.toString());
  const support=await page.evaluate(()=>({get:typeof window.getAllFields==='function',set:typeof window.setAllFields==='function'}));
  if(!support.get||!support.set) throw new Error('legacy state functions missing');
  await page.evaluate(async ()=>{
    const state=window.getAllFields();
    window.setAllFields(state);
    await new Promise(r=>setTimeout(r,500));
  });
  const after=await page.evaluate(fnSrc=>{
    const m=window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
    const fn=eval('('+fnSrc+')');
    return fn(m);
  },pick.toString());
  if(JSON.stringify(before)!==JSON.stringify(after)) throw new Error('roundtrip drift '+route+' '+JSON.stringify({before,after}));
}

await roundtrip('67_10a_shichrut',{
  ps67s_prior_67_count:'3',
  ps67s_disq_knowledge:'ידע',
  ps67s_disq_source:'גזר דין',
  prior_10a:'2',
  no_fix_10a:true,
  shich_repeat:'כן',
  shich_repeat_year:'2024',
  ps67s_alcohol_level:'850',
  ps67s_prior_shich_count:'1',
  req_fine:'5000',
  req_bond:'10000',
  request_40a:'כן'
},m=>({
  route:m.route,
  s67:m.currentOffense.routeFacts.section67,
  s10:m.currentOffense.routeFacts.section10a,
  shich:m.currentOffense.routeFacts.intoxication,
  petition:m.sentencing.petition,
  special:m.sentencing.specialRequests.section40a
}));

await roundtrip('accident_injury',{
  acc_injury:'hard',
  acc_injury_type:'חבלה קשה',
  acc_negligence:'high',
  acc_negligence_reason:'מעבר חציה',
  acc_placement:'high',
  acc_placement_manual:'1',
  acc_placement_manual_reason:'נימוק QA',
  acc_prison_min:'3',
  acc_prison_max:'6',
  acc_disq_min:'24',
  acc_disq_max:'48',
  acc_victim_count:'2',
  acc_description:'תיאור QA',
  acc_prior_10a:true,
  acc_agg_crosswalk:true,
  acc_mit_self:true,
  acc_p_prison_m:'4',
  acc_p_disq_m:'36'
},m=>({
  route:m.route,
  accident:m.accident
}));

await browser.close();
console.log('PASS route-specific legacy roundtrip');
