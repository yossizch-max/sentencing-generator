/* v94 Phase 1: read-only canonical CaseModel adapter.
   IMPORTANT: This file is NOT wired into index.html and therefore cannot affect production/runtime behavior.
   It is intentionally side-effect free. */

(function(root){
  'use strict';

  const SCHEMA_VERSION = 1;

  function el(doc, id){ return doc && doc.getElementById ? doc.getElementById(id) : null; }
  function val(doc, id){ const e=el(doc,id); return e && 'value' in e ? String(e.value||'') : ''; }
  function checked(doc, id){ const e=el(doc,id); return !!(e && e.checked); }
  function intOrNull(v){
    const s=String(v==null?'':v).trim();
    if(!/^\d+$/.test(s)) return null;
    return Number(s);
  }
  function arr(q){ return Array.prototype.slice.call(q||[]); }

  function readSparseList(doc, prefix, fields){
    const nodes = arr(doc.querySelectorAll ? doc.querySelectorAll('[id^="'+prefix+'_item_"]') : []);
    const indexes = nodes.map(n => {
      const m=String(n.id||'').match(/_(\d+)$/);
      return m ? Number(m[1]) : null;
    }).filter(n => n!=null).sort((a,b)=>a-b);

    return indexes.map(i => {
      const out={ index:i };
      fields.forEach(f => out[f.key]=val(doc, f.id(i)));
      return out;
    });
  }

  function readMultipleCases(doc){
    const enabled=checked(doc,'has_multiple_yes');
    const proc=val(doc,'multi_proc_type') || 'same';
    const count=intOrNull(val(doc,'multi_count')) || 0;
    if(!enabled || count < 1) return [];

    const out=[];
    for(let i=1;i<=count;i++){
      out.push({
        index:i,
        caseNumber: val(doc,'m_case_'+i),
        date: val(doc,'m_date_'+i),
        disqualificationType: val(doc,'m_disq_'+i),
        disqualificationDetails: val(doc,'m_disq_details_'+i),
        licenseExpiryYear: val(doc,'m_lic_year_'+i),
        noInsurance: checked(doc,'m_no_insurance_'+i),
        freeText: val(doc,'m_other_'+i)
      });
    }
    return out;
  }

  function normalizeRoute(route){
    const r=String(route||'').trim();
    const aliases={
      '67_10a':'67+10a',
      '67+shichrut':'67_shichrut',
      '67shichrut':'67_shichrut',
      'accident_below_real':'accident_injury'
    };
    return aliases[r] || r;
  }

  function detectRawRoute(win, doc){
    try{
      if(win && win.RouteEngine && typeof win.RouteEngine.current==='function'){
        const r=String(win.RouteEngine.current()||'').trim();
        if(r) return r;
      }
    }catch(e){}
    try{
      const r=String((win&&win._mashlul)||'').trim();
      if(r) return r;
    }catch(e){}
    return val(doc,'_mashlul');
  }

  function detectRoute(win, doc){
    return normalizeRoute(detectRawRoute(win,doc));
  }

  function buildCaseModelFromCurrentState(win, doc){
    win=win || (typeof window!=='undefined'?window:null);
    doc=doc || (win&&win.document) || (typeof document!=='undefined'?document:null);
    if(!doc) throw new Error('Document is required');

    const legacyRoute=detectRawRoute(win,doc);
    const route=normalizeRoute(legacyRoute);
    const multipleEnabled=checked(doc,'has_multiple_yes');
    const proc=val(doc,'multi_proc_type') || 'single';

    const condImprisonment = readSparseList(doc,'cond',[
      {key:'sourceCase', id:i=>'cond_case_'+i},
      {key:'court', id:i=>'cond_court_'+i},
      {key:'date', id:i=>'cond_date_'+i},
      {key:'months', id:i=>'cond_months_'+i},
      {key:'activation', id:i=>'cond_activation_'+i}
    ]);

    const condDisq = readSparseList(doc,'disq',[
      {key:'sourceCase', id:i=>'disq_case_'+i},
      {key:'court', id:i=>'disq_court_'+i},
      {key:'date', id:i=>'disq_date_'+i},
      {key:'months', id:i=>'disq_months_'+i},
      {key:'activation', id:i=>'disq_activation_'+i}
    ]);

    const bonds = readSparseList(doc,'bond',[
      {key:'sourceCase', id:i=>'bond_case_'+i},
      {key:'court', id:i=>'bond_court_'+i},
      {key:'date', id:i=>'bond_date_'+i},
      {key:'amount', id:i=>'bond_amount_'+i},
      {key:'activation', id:i=>'bond_activation_'+i}
    ]);

    const cases = readMultipleCases(doc);

    return {
      schemaVersion: SCHEMA_VERSION,
      route,
      defendant: {
        name: val(doc,'def_name'),
        id: val(doc,'def_id'),
        record: {
          traffic: {
            count: intOrNull(val(doc,'traffic_count')),
            detail: val(doc,'traffic_detail'),
            heavy: checked(doc,'has_heavy_traffic')
          },
          criminal: {
            count: intOrNull(val(doc,'crim_count')),
            detail: val(doc,'crim_detail'),
            heavy: checked(doc,'has_heavy_criminal')
          },
          priorPrison: {
            traffic: checked(doc,'has_prior_prison'),
            criminal: checked(doc,'has_prior_criminal_prison')
          },
          pendingConditions: {
            imprisonment: condImprisonment,
            disqualification: condDisq,
            bonds
          }
        }
      },
      proceeding: {
        leadCaseNumber: val(doc,'case_num'),
        mode: multipleEnabled ? (proc==='consol'?'joined':'multiple') : 'single',
        cases
      },
      currentOffense: {
        ancillaryOffenses: {
          noInsurance: checked(doc,'off_no_insurance'),
          licenseExpired: checked(doc,'off_license_expired'),
          licenseExpiryYear: val(doc,'off_license_expired_year'),
          other: val(doc,'off_other_text')
        },
        facts: {
          disqualificationType: val(doc,'disq_type'),
          disqualificationDetails: val(doc,'disq_details'),
          licenseYear: val(doc,'lic_year'),
          aggravatingExtraEnabled: checked(doc,'aggravating_extra_enabled'),
          aggravatingExtraText: val(doc,'aggravating_extra_text')
        }
      },
      sentencing: {
        range: {
          imprisonmentMin: val(doc,'m_min'),
          imprisonmentMax: val(doc,'m_max')
        },
        placement: {
          key: val(doc,'pos'),
          heavyCase: checked(doc,'heavy_case')
        },
        petition: {
          imprisonment: val(doc,'req_prison'),
          disqualification: val(doc,'req_disq')
        }
      },
      accident: route==='accident_injury' ? {
        injuryLevel: val(doc,'acc_injury_level'),
        negligence: val(doc,'acc_negligence'),
        placement: val(doc,'acc_placement'),
        placementManual: val(doc,'acc_placement_manual')==='1'
      } : null,
      metadata: {
        source: 'legacy-dom-readonly',
        legacyRoute,
        capturedAt: new Date().toISOString()
      }
    };
  }

  function validateCaseModel(model){
    const issues=[];
    if(!model || typeof model!=='object') return [{level:'error',code:'MODEL_MISSING'}];
    if(!model.route) issues.push({level:'warning',code:'ROUTE_MISSING'});
    if(model.proceeding && model.proceeding.mode==='joined'){
      (model.proceeding.cases||[]).forEach(c=>{
        if(c.index>1 && !String(c.caseNumber||'').trim()){
          issues.push({level:'warning',code:'JOINED_CASE_NUMBER_MISSING',index:c.index});
        }
      });
    }
    return issues;
  }

  function compareLegacyStateToCaseModel(legacyState, model){
    const report={ok:true,differences:[]};
    function diff(path,a,b){
      if(String(a==null?'':a)!==String(b==null?'':b)){
        report.ok=false;
        report.differences.push({path,legacy:a,model:b});
      }
    }
    legacyState=legacyState||{};
    diff('route', legacyState._mashlul || legacyState.route, model.route);
    diff('case_num', legacyState.case_num, model.proceeding.leadCaseNumber);
    diff('traffic_count', legacyState.traffic_count, model.defendant.record.traffic.count);
    diff('crim_count', legacyState.crim_count, model.defendant.record.criminal.count);
    diff('m_min', legacyState.m_min, model.sentencing.range.imprisonmentMin);
    diff('m_max', legacyState.m_max, model.sentencing.range.imprisonmentMax);
    diff('pos', legacyState.pos, model.sentencing.placement.key);
    diff('req_prison', legacyState.req_prison, model.sentencing.petition.imprisonment);
    diff('req_disq', legacyState.req_disq, model.sentencing.petition.disqualification);
    return report;
  }

  const api={
    SCHEMA_VERSION,
    detectRawRoute,
    normalizeRoute,
    buildCaseModelFromCurrentState,
    validateCaseModel,
    compareLegacyStateToCaseModel
  };

  if(typeof module!=='undefined' && module.exports) module.exports=api;
  if(root) root.V94CaseModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
