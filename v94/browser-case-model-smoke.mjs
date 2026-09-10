import { chromium } from 'playwright';

const mode=process.argv[2]||'all';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}});
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{ if(m.type()==='error') errors.push('console:'+m.text()); });

async function boot(){
  await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForTimeout(1200);
  if(errors.length) throw new Error('load errors: '+JSON.stringify(errors.slice(0,10)));
}
async function inject(){
  await page.addScriptTag({url:'http://127.0.0.1:4173/v94/case-model-adapter.js'});
  const ok=await page.evaluate(()=>!!window.V94CaseModel && typeof window.V94CaseModel.buildCaseModelFromCurrentState==='function');
  if(!ok) throw new Error('V94CaseModel API injection failed');
}
async function run(name,fn){
  if(mode==='all'||mode===name){ await fn(); console.log('PASS '+name); }
}
await boot();
await run('load',async()=>{ if(!(await page.locator('body').count())) throw new Error('body missing'); });
await inject();

await run('readonly',async()=>{
  const r=await page.evaluate(()=>{
    const before=document.body.innerHTML;
    const model=window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
    const after=document.body.innerHTML;
    return {same:before===after,schemaVersion:model?.schemaVersion};
  });
  if(!r.same) throw new Error('adapter mutated DOM');
  if(r.schemaVersion!==1) throw new Error('bad schema version '+r.schemaVersion);
});

await run('routes',async()=>{
  const routes=['67','10a','67+10a','shichrut','67_shichrut','10a_shichrut','67_10a_shichrut','accident_injury','accident_below_real'];
  for (const route of routes){
    const result=await page.evaluate(async (r)=>{
      if(typeof window.chooseMashlul==='function'){
        window.chooseMashlul(r);
        await new Promise(resolve=>setTimeout(resolve,450));
      } else {
        window._mashlul=r;
      }
      const m=window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
      return {
        requested:r,
        route:m.route,
        rawMashlul:String(window._mashlul||''),
        routeEngine:(window.RouteEngine&&typeof window.RouteEngine.current==='function')?String(window.RouteEngine.current()||''):'',
        accident:!!m.accident
      };
    },route);
    if(result.route!==route) throw new Error('route capture mismatch '+JSON.stringify(result));
    if((route==='accident_injury'||route==='accident_below_real')!==result.accident) throw new Error('accident mapping mismatch '+JSON.stringify(result));
  }
  const aliases=await page.evaluate(()=>({
    a:window.V94CaseModel.normalizeRoute('67_10a'),
    b:window.V94CaseModel.normalizeRoute('67+shichrut'),
    c:window.V94CaseModel.normalizeRoute('67shichrut')
  }));
  if(aliases.a!=='67+10a'||aliases.b!=='67_shichrut'||aliases.c!=='67_shichrut') throw new Error('route alias normalization failed '+JSON.stringify(aliases));
});

await run('deterministic',async()=>{
  const ok=await page.evaluate(()=>{
    window._mashlul='67';
    const a=window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
    const b=window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
    delete a.metadata.capturedAt; delete b.metadata.capturedAt;
    return JSON.stringify(a)===JSON.stringify(b);
  });
  if(!ok) throw new Error('nondeterministic model capture');
});

await run('parity',async()=>{
  const result=await page.evaluate(()=>{
    window._mashlul='67';
    const set=(id,v)=>{const e=document.getElementById(id); if(e) e.value=v;};
    set('case_num','QA-CASE-94');
    set('traffic_count','5');
    set('crim_count','0');
    set('m_min','6');
    set('m_max','24');
    set('pos','center');
    set('req_prison','8');
    set('req_disq','36');
    const model=window.V94CaseModel.buildCaseModelFromCurrentState(window,document);
    const legacy={
      _mashlul:window._mashlul,
      case_num:document.getElementById('case_num')?.value ?? '',
      traffic_count:document.getElementById('traffic_count')?.value ?? '',
      crim_count:document.getElementById('crim_count')?.value ?? '',
      m_min:document.getElementById('m_min')?.value ?? '',
      m_max:document.getElementById('m_max')?.value ?? '',
      pos:document.getElementById('pos')?.value ?? '',
      req_prison:document.getElementById('req_prison')?.value ?? '',
      req_disq:document.getElementById('req_disq')?.value ?? ''
    };
    return {report:window.V94CaseModel.compareLegacyStateToCaseModel(legacy,model),legacy,model:{
      route:model.route,case_num:model.proceeding.leadCaseNumber,
      traffic_count:model.defendant.record.traffic.count,
      crim_count:model.defendant.record.criminal.count,
      m_min:model.sentencing.range.imprisonmentMin,
      m_max:model.sentencing.range.imprisonmentMax,
      pos:model.sentencing.placement.key,
      req_prison:model.sentencing.petition.imprisonment,
      req_disq:model.sentencing.petition.disqualification
    }};
  });
  if(!result.report.ok) throw new Error('browser parity failed '+JSON.stringify(result));
});

await browser.close();
