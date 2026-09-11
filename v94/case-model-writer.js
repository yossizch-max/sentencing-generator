/* v94 Phase 2: test-only CaseModel -> legacy DOM writer.
   NOT wired into index.html. No production behavior changes.
   Purpose: prove canonical model can reconstruct a clean legacy form without data loss. */
(function(root){
  'use strict';

  function el(doc,id){ return doc&&doc.getElementById?doc.getElementById(id):null; }
  function setValueSilent(doc,id,value){
    const e=el(doc,id); if(!e) return false;
    e.value=value==null?'':String(value);
    return true;
  }
  function setCheckedSilent(doc,id,value){
    const e=el(doc,id); if(!e) return false;
    e.checked=!!value;
    return true;
  }

  function setValue(doc,id,value){
    const e=el(doc,id); if(!e) return false;
    e.value=value==null?'':String(value);
    try{ e.dispatchEvent(new Event('input',{bubbles:true})); }catch(_){}
    try{ e.dispatchEvent(new Event('change',{bubbles:true})); }catch(_){}
    return true;
  }
  function setChecked(doc,id,value){
    const e=el(doc,id); if(!e) return false;
    e.checked=!!value;
    try{ e.dispatchEvent(new Event('change',{bubbles:true})); }catch(_){}
    return true;
  }
  function setSmart(doc,id,value){
    const e=el(doc,id); if(!e) return false;
    const t=String(e.type||'').toLowerCase();
    return (t==='checkbox'||t==='radio') ? setChecked(doc,id,value) : setValue(doc,id,value);
  }
  function firstExisting(doc,ids){
    for(const id of ids){ if(el(doc,id)) return id; }
    return null;
  }
  function setAlias(doc,ids,value){
    const id=firstExisting(doc,ids);
    return id ? setSmart(doc,id,value) : false;
  }
  function eachMap(doc,obj){
    if(!obj||typeof obj!=='object') return;
    Object.keys(obj).forEach(id=>setSmart(doc,id,obj[id]));
  }
  async function tick(ms){
    await new Promise(r=>setTimeout(r,ms||0));
  }

  async function applyRoute(win,doc,route){
    const legacyRoute=(route==='accident_injury' && win && win.__v94LegacyAccidentRoute) ? win.__v94LegacyAccidentRoute : route;
    if(win && typeof win.chooseMashlul==='function'){
      win.chooseMashlul(legacyRoute);
      await tick(2150);
    } else {
      if(win) win._mashlul=legacyRoute;
      setValue(doc,'_mashlul',legacyRoute);
    }
  }

  function clearContainer(doc,id){
    const e=el(doc,id); if(e && 'innerHTML' in e) e.innerHTML='';
  }

  function clearDynamicLists(doc){
    ['conditional_items','conditional_list','conditionalItems',
     'disqualification_items','disqualification_list','disqualificationItems',
     'bond_items','bond_list','bondItems'].forEach(id=>clearContainer(doc,id));
  }

  function rebuildSparseList(win,doc,items,kind){
    const configs={
      imprisonment:{
        add:'addConditionalItem', itemPrefix:'cond_item_',
        fields:{
          sourceCase:i=>'cond_case_'+i, court:i=>'cond_court_'+i, date:i=>'cond_date_'+i,
          months:i=>'cond_months_'+i, activation:i=>'cond_activation_'+i
        }
      },
      disqualification:{
        add:'addDisqualificationItem', itemPrefix:'disq_item_',
        fields:{
          sourceCase:i=>'disq_case_'+i, court:i=>'disq_court_'+i, date:i=>'disq_date_'+i,
          months:i=>'disq_months_'+i, activation:i=>'disq_activation_'+i
        }
      },
      bonds:{
        add:'addBondItem', itemPrefix:'bond_item_',
        fields:{
          sourceCase:i=>'bond_case_'+i, court:i=>'bond_court_'+i, date:i=>'bond_date_'+i,
          amount:i=>'bond_amount_'+i, activation:i=>'bond_activation_'+i
        }
      }
    };
    const c=configs[kind];
    if(!c) return;
    const list=Array.isArray(items)?items:[];
    for(const item of list){
      const i=Number(item.index);
      if(!Number.isFinite(i)||i<1) continue;
      if(!el(doc,c.itemPrefix+i) && win && typeof win[c.add]==='function'){
        win[c.add](i);
      }
      Object.keys(c.fields).forEach(k=>{
        if(Object.prototype.hasOwnProperty.call(item,k)) setValue(doc,c.fields[k](i),item[k]);
      });
    }
  }

  async function rebuildMultiple(win,doc,proceeding){
    const mode=proceeding&&proceeding.mode||'single';
    const cases=Array.isArray(proceeding&&proceeding.cases)?proceeding.cases:[];
    const enabled=mode==='multiple'||mode==='joined';
    setChecked(doc,'has_multiple_yes',enabled);
    setChecked(doc,'has_multiple',enabled);
    if(!enabled) return;

    setValue(doc,'multi_proc_type',mode==='joined'?'consol':'same');
    setValue(doc,'multi_count',String(cases.length||2));
    if(win && typeof win.toggleMultipleUI==='function') win.toggleMultipleUI();
    if(win && typeof win.buildMultiCards==='function') win.buildMultiCards();
    await tick(120);

    for(const c of cases){
      const i=Number(c.index)||1;
      if(i===1 && proceeding.leadCaseNumber) setValue(doc,'case_num',proceeding.leadCaseNumber);
      setAlias(doc,['m_case_'+i],c.caseNumber);
      setAlias(doc,['m_date_'+i],c.date);
      setAlias(doc,['m_disq_type_'+i,'m_disqtype_'+i],c.disqualificationType);
      setAlias(doc,['m_disq_'+i,'m_disq_details_'+i],c.disqualificationDetails);
      setAlias(doc,['m_lic_exp_'+i,'m_license_expired_'+i],c.licenseExpired);
      setAlias(doc,['m_lic_exp_year_'+i,'m_lic_year_'+i],c.licenseExpiryYear);
      setAlias(doc,['m_no_ins_'+i,'m_no_insurance_'+i],c.noInsurance);
      setAlias(doc,['m_other_off_'+i,'m_other_'+i],c.freeText);
      setAlias(doc,['m_aggr_'+i],c.aggravating);
    }
  }

  async function applyCaseModelToDocument(model,win,doc){
    win=win||(typeof window!=='undefined'?window:null);
    doc=doc||(win&&win.document)||(typeof document!=='undefined'?document:null);
    if(!model||typeof model!=='object') throw new Error('CaseModel required');
    if(!doc) throw new Error('Document required');

    await applyRoute(win,doc,model.route||'');

    const def=model.defendant||{}, record=def.record||{}, proceeding=model.proceeding||{};
    setValue(doc,'def_name',def.name);
    setValue(doc,'def_id',def.id);
    setValue(doc,'case_num',proceeding.leadCaseNumber);

    const tr=record.traffic||{}, cr=record.criminal||{};
    setValue(doc,'traffic_count',tr.count==null?'':tr.count);
    setValue(doc,'traffic_detail',tr.detail);
    setChecked(doc,'has_heavy_traffic',tr.heavy);
    setValue(doc,'crim_count',cr.count==null?'':cr.count);
    setValue(doc,'crim_detail',cr.detail);
    setChecked(doc,'has_heavy_criminal',cr.heavy);

    const pp=record.priorPrison||{};
    setChecked(doc,'has_prior_prison',pp.traffic);
    setChecked(doc,'has_prior_criminal_prison',pp.criminal);

    const cond=record.pendingConditions||{};
    clearDynamicLists(doc);
    rebuildSparseList(win,doc,cond.imprisonment,'imprisonment');
    rebuildSparseList(win,doc,cond.disqualification,'disqualification');
    rebuildSparseList(win,doc,cond.bonds,'bonds');
    eachMap(doc,cond.flags);

    await rebuildMultiple(win,doc,proceeding);

    const cur=model.currentOffense||{}, ancillary=cur.ancillaryOffenses||{}, facts=cur.facts||{};
    setChecked(doc,'off_no_insurance',ancillary.noInsurance);
    setChecked(doc,'off_license_expired',ancillary.licenseExpired);
    setValue(doc,'off_license_expired_year',ancillary.licenseExpiryYear);
    setValue(doc,'off_other_text',ancillary.other);
    setValue(doc,'disq_type',facts.disqualificationType);
    setValue(doc,'disq_details',facts.disqualificationDetails);
    setValue(doc,'disq_origin_gmr',facts.disqualificationOrigin);
    setValue(doc,'lic_year',facts.licenseYear);
    setChecked(doc,'aggravating_extra_enabled',facts.aggravatingExtraEnabled);
    setValue(doc,'aggravating_extra_text',facts.aggravatingExtraText);

    const rf=cur.routeFacts||{}, s67=rf.section67||{}, s10=rf.section10a||{}, sh=rf.intoxication||{};
    setValue(doc,'ps67s_prior_67_count',s67.prior67Count==null?'':s67.prior67Count);
    setValue(doc,'ps67s_disq_knowledge',s67.disqualificationKnowledge);
    setValue(doc,'ps67s_disq_source',s67.disqualificationSource);
    setChecked(doc,'prior_10a',s10.prior10a);
    setChecked(doc,'no_fix_10a',s10.noFix10a);
    setValue(doc,'ps67s_10a_detail',s10.relatedDetail);
    setValue(doc,'ps67s_10a_related',s10.related);
    setValue(doc,'shich_finding',sh.finding);
    setValue(doc,'shich_circ',sh.circumstances);
    setChecked(doc,'shich_repeat',sh.repeat);
    setValue(doc,'shich_repeat_year',sh.repeatYear);
    setChecked(doc,'shich_accident',sh.accident);
    setValue(doc,'shich_accident_result',sh.accidentResult);
    setChecked(doc,'shich_40a',sh.section40a);
    setValue(doc,'shich_40a_detail',sh.section40aDetail);
    setValue(doc,'ps67s_alcohol_level',sh.alcoholLevel);
    setValue(doc,'ps67s_shich_type',sh.type);
    setValue(doc,'ps67s_prior_shich_count',sh.priorCount==null?'':sh.priorCount);

    const defense=cur.defenseArguments||{};
    eachMap(doc,defense.standard);
    eachMap(doc,defense.response);
    eachMap(doc,defense.prosecutorResponse);

    const sent=model.sentencing||{}, range=sent.range||{}, placement=sent.placement||{}, petition=sent.petition||{};
    setValue(doc,'m_min',range.imprisonmentMin);
    setValue(doc,'m_max',range.imprisonmentMax);
    setValue(doc,'pos',placement.key);
    setChecked(doc,'heavy_case',placement.heavyCase);
    setValue(doc,'req_prison',petition.imprisonment);
    setValue(doc,'req_disq',petition.disqualification);
    setValue(doc,'req_fine',petition.fine);
    setValue(doc,'req_bond',petition.bond);
    setValue(doc,'req_disq_cond',petition.disqualificationCondition);
    setValue(doc,'req_disq_cond_years',petition.disqualificationConditionYears);
    const special=sent.specialRequests||{};
    eachMap(doc,special.section40a);
    eachMap(doc,special.conditionalPetition);
    const ctx=sent.context||{};
    eachMap(doc,ctx.probation);
    eachMap(doc,ctx.policy);
    eachMap(doc,ctx.conviction);

    const caseContext=proceeding.caseContext||{};
    const normalizedCaseContext=Object.assign({},caseContext);
    if(String(def.name||'').trim()) normalizedCaseContext.v91_basic_def=def.name;
    if(String(proceeding.leadCaseNumber||'').trim()) normalizedCaseContext.v91_basic_case=proceeding.leadCaseNumber;
    if(String(caseContext.court_name||'').trim()) normalizedCaseContext.v91_basic_court=caseContext.court_name;
    if(String(caseContext.judge||'').trim()) normalizedCaseContext.v91_basic_judge=caseContext.judge;
    eachMap(doc,normalizedCaseContext);

    if(model.accident){
      const a=model.accident;
      setValue(doc,'acc_injury',a.injuryLevel);
      setValue(doc,'acc_injury_type',a.injuryType);
      setValue(doc,'acc_negligence',a.negligence);
      setValue(doc,'acc_negligence_reason',a.negligenceReason);
      setValue(doc,'acc_placement',a.placement);
      setValue(doc,'acc_placement_manual',a.placementManual?'1':'0');
      setValue(doc,'acc_placement_manual_reason',a.placementManualReason);
      setValue(doc,'acc_prison_min',a.prisonMin);
      setValue(doc,'acc_prison_max',a.prisonMax);
      setValue(doc,'acc_disq_min',a.disqualificationMin);
      setValue(doc,'acc_disq_max',a.disqualificationMax);
      setValue(doc,'acc_victim_count',a.victimCount==null?'':a.victimCount);
      setValue(doc,'acc_victim_status',a.victimStatus);
      setValue(doc,'acc_victim_type',a.victimType);
      setValue(doc,'acc_description',a.description);
      setValue(doc,'acc_relevant_history_detail',a.relevantHistoryDetail);
      eachMap(doc,a.priorSignals);
      eachMap(doc,a.aggravating);
      eachMap(doc,a.mitigating);
      eachMap(doc,a.petition);
      eachMap(doc,a.legacyDetails);
    }

    // v94 test-writer late stabilization pass:
    // Some legacy route/UI wrappers perform delayed writes after route selection or sibling-field changes.
    // Re-apply user-owned values that must win over those derived/default writes.
    await tick(450);
    // Lead identity fields are written silently here on purpose: in the legacy UI their change
    // handlers can synchronously rebuild/synchronize the multiple-case UI and overwrite the value.
    setValueSilent(doc,'def_name',def.name);
    setValueSilent(doc,'def_id',def.id);
    setValueSilent(doc,'case_num',proceeding.leadCaseNumber);
    if((proceeding.mode==='joined'||proceeding.mode==='multiple') && Array.isArray(proceeding.cases)){
      for(const c of proceeding.cases){
        const i=Number(c.index)||1;
        if(i===1 && proceeding.leadCaseNumber) setValueSilent(doc,'m_case_'+i,proceeding.leadCaseNumber);
        else setValueSilent(doc,'m_case_'+i,c.caseNumber);
      }
    }
    eachMap(doc,normalizedCaseContext);
    eachMap(doc,defense.standard);
    eachMap(doc,defense.response);
    eachMap(doc,defense.prosecutorResponse);
    // These two are derived automatically by parts of the legacy UI; explicit CaseModel values are authoritative.
    if(defense.response && Object.prototype.hasOwnProperty.call(defense.response,'defense_custom_response')){
      setSmart(doc,'defense_custom_response',defense.response.defense_custom_response);
    }
    if(defense.prosecutorResponse && Object.prototype.hasOwnProperty.call(defense.prosecutorResponse,'psdef_custom_response')){
      setSmart(doc,'psdef_custom_response',defense.prosecutorResponse.psdef_custom_response);
    }
    await tick(80);

    return true;
  }

  const api={applyCaseModelToDocument};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  if(root) root.V94CaseModelWriter=api;
})(typeof globalThis!=='undefined'?globalThis:this);
