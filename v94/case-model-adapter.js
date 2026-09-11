/* v94 Phase 1: read-only canonical CaseModel adapter.
   IMPORTANT: This file is NOT wired into index.html and therefore cannot affect production/runtime behavior.
   It is intentionally side-effect free. */

(function(root){
  'use strict';

  const SCHEMA_VERSION = 1;

  function el(doc, id){ return doc && doc.getElementById ? doc.getElementById(id) : null; }
  function val(doc, id){ const e=el(doc,id); return e && 'value' in e ? String(e.value||'') : ''; }
  function checked(doc, id){ const e=el(doc,id); return !!(e && e.checked); }
  function valFirst(doc, ids){
    for(const id of ids){ const e=el(doc,id); if(e && 'value' in e) return String(e.value||''); }
    return '';
  }
  function checkedFirst(doc, ids){
    for(const id of ids){ const e=el(doc,id); if(e) return !!e.checked; }
    return false;
  }
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

  function readFieldMap(doc, ids){
    const out={};
    ids.forEach(id=>{
      const e=el(doc,id);
      if(!e) return;
      out[id]=(e.type==='checkbox'||e.type==='radio') ? !!e.checked : String(e.value||'');
    });
    return out;
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
        disqualificationType: valFirst(doc,['m_disq_type_'+i,'m_disqtype_'+i]),
        disqualificationDetails: valFirst(doc,['m_disq_'+i,'m_disq_details_'+i]),
        licenseExpired: checkedFirst(doc,['m_lic_exp_'+i,'m_license_expired_'+i]),
        licenseExpiryYear: valFirst(doc,['m_lic_exp_year_'+i,'m_lic_year_'+i]),
        noInsurance: checkedFirst(doc,['m_no_ins_'+i,'m_no_insurance_'+i]),
        freeText: valFirst(doc,['m_other_off_'+i,'m_other_'+i]),
        aggravating: valFirst(doc,['m_aggr_'+i])
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
        cases,
        caseContext: readFieldMap(doc,[
          'court_name','judge','lawyer_name','lawyer_office',
          'v91_basic_case','v91_basic_court','v91_basic_def','v91_basic_judge'
        ])
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
          disqualificationOrigin: val(doc,'disq_origin_gmr'),
          licenseYear: val(doc,'lic_year'),
          aggravatingExtraEnabled: checked(doc,'aggravating_extra_enabled'),
          aggravatingExtraText: val(doc,'aggravating_extra_text')
        },
        routeFacts: {
          section67: {
            prior67Count: intOrNull(val(doc,'ps67s_prior_67_count')),
            disqualificationKnowledge: val(doc,'ps67s_disq_knowledge'),
            disqualificationSource: val(doc,'ps67s_disq_source')
          },
          section10a: {
            prior10a: checked(doc,'prior_10a'),
            noFix10a: checked(doc,'no_fix_10a'),
            relatedDetail: val(doc,'ps67s_10a_detail'),
            related: val(doc,'ps67s_10a_related')
          },
          intoxication: {
            finding: val(doc,'shich_finding'),
            circumstances: val(doc,'shich_circ'),
            repeat: checked(doc,'shich_repeat'),
            repeatYear: val(doc,'shich_repeat_year'),
            accident: checked(doc,'shich_accident'),
            accidentResult: val(doc,'shich_accident_result'),
            section40a: checked(doc,'shich_40a'),
            section40aDetail: val(doc,'shich_40a_detail'),
            alcoholLevel: val(doc,'ps67s_alcohol_level'),
            type: val(doc,'ps67s_shich_type'),
            priorCount: intOrNull(val(doc,'ps67s_prior_shich_count'))
          }
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
          disqualification: val(doc,'req_disq'),
          fine: val(doc,'req_fine'),
          bond: val(doc,'req_bond'),
          disqualificationCondition: val(doc,'req_disq_cond'),
          disqualificationConditionYears: val(doc,'req_disq_cond_years')
        },
        specialRequests: {
          section40a: readFieldMap(doc,[
            'request_40a','request_40a_b_10a','request_40a_b_10a_before_disq',
            'request_40a_b_10a_detail','request_40a_life','request_40a_life_detail',
            'v75_40a_10y','v75_40a_10y_detail','v75_40a_life','v75_40a_life_detail',
            'ps67s_life_40a','ps67s_life_40a_detail'
          ]),
          conditionalPetition: readFieldMap(doc,[
            'req_cond_enabled','req_cond_months','req_cond_years','req_cond_off_10a',
            'req_cond_off_67','req_cond_off_other','req_cond_off_other_text',
            'req_cond2_months','req_cond2_years','req_cond2_off_10a',
            'req_cond2_off_67','req_cond2_off_other','req_cond2_off_other_text'
          ])
        },
        context: {
          probation: readFieldMap(doc,['has_probation','probation_details','probation_findings']),
          policy: readFieldMap(doc,['include_policy','policy_text','include_bombastic']),
          conviction: readFieldMap(doc,['conviction_type','prison_type','criminal_prison_type'])
        }
      },
      accident: route==='accident_injury' ? {
        injuryLevel: val(doc,'acc_injury_level') || val(doc,'acc_injury'),
        injuryType: val(doc,'acc_injury_type'),
        negligence: val(doc,'acc_negligence'),
        negligenceReason: val(doc,'acc_negligence_reason'),
        placement: val(doc,'acc_placement'),
        placementManual: val(doc,'acc_placement_manual')==='1',
        placementManualReason: val(doc,'acc_placement_manual_reason'),
        prisonMin: val(doc,'acc_prison_min'),
        prisonMax: val(doc,'acc_prison_max'),
        disqualificationMin: val(doc,'acc_disq_min'),
        disqualificationMax: val(doc,'acc_disq_max'),
        victimCount: intOrNull(val(doc,'acc_victim_count')),
        victimStatus: val(doc,'acc_victim_status'),
        victimType: val(doc,'acc_victim_type'),
        description: val(doc,'acc_description'),
        relevantHistoryDetail: val(doc,'acc_relevant_history_detail'),
        priorSignals: readFieldMap(doc,[
          'acc_prior_10a','acc_prior_accident','acc_prior_disq','acc_prior_shichrut',
          'acc_prior_traffic_prison','acc_similar_conv','acc_safety_conv','acc_criminal',
          'acc_criminal_prison','acc_traffic_count'
        ]),
        aggravating: readFieldMap(doc,[
          'acc_agg_conditions','acc_agg_crosswalk','acc_agg_divider','acc_agg_flee',
          'acc_agg_opposite','acc_agg_red_light','acc_agg_sensitive_area','acc_agg_speed'
        ]),
        mitigating: readFieldMap(doc,[
          'acc_mit_comp','acc_mit_contrib','acc_mit_invest','acc_mit_report',
          'acc_mit_self','acc_mit_time','acc_personal','acc_personal_mitigating'
        ]),
        petition: readFieldMap(doc,[
          'acc_p_prison','acc_p_prison_m','acc_p_sw','acc_p_sw_m','acc_p_sw_super',
          'acc_p_disq','acc_p_disq_m','acc_p_disq_admin','acc_p_disqcond',
          'acc_p_disqcond_m','acc_p_disqcond_y','acc_p_fine','acc_p_fine_a',
          'acc_p_comp','acc_p_comp_a','acc_p_comp_to','acc_p_undertake',
          'acc_p_undertake_a','acc_p_undertake_y','acc_p_probation','acc_p_probation_m',
          'acc_p_cond','acc_p_cond_m','acc_p_cond_y','acc_p_activate_disq',
          'acc_p_activate_disq_case','acc_p_activate_disq_m','acc_p_activate_disq_mode',
          'acc_p_cs','acc_p_cs_h'
        ]),
        legacyDetails: readFieldMap(doc,[
          'acc_38b2_manual','acc_accident_date','acc_add_10a','acc_add_67',
          'acc_add_hitnaslut','acc_add_shichrut','acc_base_offense','acc_breach',
          'acc_breach_citation','acc_breach_other','acc_case','acc_conviction_type',
          'acc_court','acc_def','acc_driver_type','acc_driving_years','acc_medical',
          'acc_review_depth','acc_shichrut_basis','acc_shichrut_finding'
        ])
      } : null,
      metadata: {
        source: 'legacy-dom-readonly',
        legacyRoute,
        capturedAt: new Date().toISOString()
      }
    };
  }

  function stableClone(value){
    if(Array.isArray(value)) return value.map(stableClone);
    if(value && typeof value==='object'){
      const out={};
      Object.keys(value).sort().forEach(k=>{ out[k]=stableClone(value[k]); });
      return out;
    }
    return value;
  }

  function toPortableCaseModel(model){
    const copy=stableClone(model||{});
    if(copy.metadata && typeof copy.metadata==='object') delete copy.metadata.capturedAt;
    return copy;
  }

  function serializeCaseModel(model){
    return JSON.stringify(toPortableCaseModel(model));
  }

  function deserializeCaseModel(serialized){
    const parsed=typeof serialized==='string' ? JSON.parse(serialized) : stableClone(serialized);
    if(!parsed || parsed.schemaVersion!==SCHEMA_VERSION) {
      throw new Error('Unsupported CaseModel schemaVersion');
    }
    return parsed;
  }

  function validateCaseModel(model){
    const issues=[];
    if(!model || typeof model!=='object') return [{level:'error',code:'MODEL_MISSING'}];
    if(!model.route) issues.push({level:'warning',code:'ROUTE_MISSING'});

    const proceeding=model.proceeding||{};
    const cases=Array.isArray(proceeding.cases)?proceeding.cases:[];
    if(proceeding.mode==='joined'){
      cases.forEach(c=>{
        if(c.index>1 && !String(c.caseNumber||'').trim()){
          issues.push({level:'warning',code:'JOINED_CASE_NUMBER_MISSING',index:c.index});
        }
      });
    }
    if((proceeding.mode==='joined'||proceeding.mode==='multiple') && cases.length<2){
      issues.push({level:'warning',code:'MULTI_CASE_COUNT_TOO_LOW',count:cases.length});
    }

    const record=(model.defendant&&model.defendant.record)||{};
    if(record.traffic && Number(record.traffic.count)>0 && !String(record.traffic.detail||'').trim()){
      issues.push({level:'warning',code:'TRAFFIC_RECORD_DETAIL_MISSING',count:record.traffic.count});
    }
    if(record.criminal && Number(record.criminal.count)>0 && !String(record.criminal.detail||'').trim()){
      issues.push({level:'warning',code:'CRIMINAL_RECORD_DETAIL_MISSING',count:record.criminal.count});
    }

    const cond=(record.pendingConditions)||{};
    [['imprisonment',cond.imprisonment],['disqualification',cond.disqualification],['bonds',cond.bonds]].forEach(([type,list])=>{
      (Array.isArray(list)?list:[]).forEach(item=>{
        if(!String(item.sourceCase||'').trim()){
          issues.push({level:'warning',code:'CONDITION_SOURCE_CASE_MISSING',type,index:item.index});
        }
      });
    });

    if(model.route==='67'){
      const facts=model.currentOffense&&model.currentOffense.facts;
      if(facts && !String(facts.disqualificationType||'').trim() && !String(facts.disqualificationDetails||'').trim()){
        issues.push({level:'info',code:'DISQUALIFICATION_DETAIL_EMPTY'});
      }
    }

    if(model.accident){
      if(model.accident.placementManual && !String(model.accident.placementManualReason||'').trim()){
        issues.push({level:'warning',code:'ACCIDENT_MANUAL_PLACEMENT_REASON_MISSING'});
      }
      if(Number(model.accident.victimCount)>0 && !String(model.accident.description||'').trim()){
        issues.push({level:'info',code:'ACCIDENT_DESCRIPTION_EMPTY'});
      }
    }

    return issues;
  }

  function compareLegacyStateToCaseModel(legacyState, model){
    const report={ok:true,differences:[]};
    function norm(v){
      if(v===true) return 'true';
      if(v===false) return 'false';
      return String(v==null?'':v);
    }
    function diff(path,a,b){
      if(norm(a)!==norm(b)){
        report.ok=false;
        report.differences.push({path,legacy:a,model:b});
      }
    }
    function diffIfPresent(key,path,b){
      if(Object.prototype.hasOwnProperty.call(legacyState,key)) diff(path,legacyState[key],b);
    }

    legacyState=legacyState||{};
    diffIfPresent('_mashlul','route',model.route);
    if(!Object.prototype.hasOwnProperty.call(legacyState,'_mashlul')) diffIfPresent('route','route',model.route);
    diffIfPresent('case_num','case_num',model.proceeding.leadCaseNumber);
    diffIfPresent('traffic_count','traffic_count',model.defendant.record.traffic.count);
    diffIfPresent('crim_count','crim_count',model.defendant.record.criminal.count);
    diffIfPresent('m_min','m_min',model.sentencing.range.imprisonmentMin);
    diffIfPresent('m_max','m_max',model.sentencing.range.imprisonmentMax);
    diffIfPresent('pos','pos',model.sentencing.placement.key);
    diffIfPresent('req_prison','req_prison',model.sentencing.petition.imprisonment);
    diffIfPresent('req_disq','req_disq',model.sentencing.petition.disqualification);
    diffIfPresent('req_fine','req_fine',model.sentencing.petition.fine);
    diffIfPresent('req_bond','req_bond',model.sentencing.petition.bond);

    const facts=(model.currentOffense&&model.currentOffense.facts)||{};
    const ancillary=(model.currentOffense&&model.currentOffense.ancillaryOffenses)||{};
    const routeFacts=(model.currentOffense&&model.currentOffense.routeFacts)||{};
    diffIfPresent('disq_type','disq_type',facts.disqualificationType);
    diffIfPresent('disq_details','disq_details',facts.disqualificationDetails);
    diffIfPresent('lic_year','lic_year',facts.licenseYear);
    diffIfPresent('off_no_insurance','off_no_insurance',ancillary.noInsurance);
    diffIfPresent('off_license_expired','off_license_expired',ancillary.licenseExpired);
    diffIfPresent('off_license_expired_year','off_license_expired_year',ancillary.licenseExpiryYear);
    diffIfPresent('off_other_text','off_other_text',ancillary.other);

    diffIfPresent('ps67s_prior_67_count','ps67s_prior_67_count',routeFacts.section67&&routeFacts.section67.prior67Count);
    diffIfPresent('prior_10a','prior_10a',routeFacts.section10a&&routeFacts.section10a.prior10a);
    diffIfPresent('no_fix_10a','no_fix_10a',routeFacts.section10a&&routeFacts.section10a.noFix10a);
    diffIfPresent('shich_finding','shich_finding',routeFacts.intoxication&&routeFacts.intoxication.finding);
    diffIfPresent('shich_repeat','shich_repeat',routeFacts.intoxication&&routeFacts.intoxication.repeat);
    diffIfPresent('ps67s_alcohol_level','ps67s_alcohol_level',routeFacts.intoxication&&routeFacts.intoxication.alcoholLevel);
    diffIfPresent('ps67s_prior_shich_count','ps67s_prior_shich_count',routeFacts.intoxication&&routeFacts.intoxication.priorCount);

    if(model.accident){
      diffIfPresent('acc_injury','acc_injury',model.accident.injuryLevel);
      diffIfPresent('acc_negligence','acc_negligence',model.accident.negligence);
      diffIfPresent('acc_placement','acc_placement',model.accident.placement);
      diffIfPresent('acc_prison_min','acc_prison_min',model.accident.prisonMin);
      diffIfPresent('acc_prison_max','acc_prison_max',model.accident.prisonMax);
      diffIfPresent('acc_disq_min','acc_disq_min',model.accident.disqualificationMin);
      diffIfPresent('acc_disq_max','acc_disq_max',model.accident.disqualificationMax);
      diffIfPresent('acc_victim_count','acc_victim_count',model.accident.victimCount);
      diffIfPresent('acc_p_prison_m','acc_p_prison_m',model.accident.petition&&model.accident.petition.acc_p_prison_m);
      diffIfPresent('acc_p_disq_m','acc_p_disq_m',model.accident.petition&&model.accident.petition.acc_p_disq_m);
    }
    return report;
  }

  const api={
    SCHEMA_VERSION,
    detectRawRoute,
    normalizeRoute,
    buildCaseModelFromCurrentState,
    toPortableCaseModel,
    serializeCaseModel,
    deserializeCaseModel,
    validateCaseModel,
    compareLegacyStateToCaseModel
  };

  if(typeof module!=='undefined' && module.exports) module.exports=api;
  if(root) root.V94CaseModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
