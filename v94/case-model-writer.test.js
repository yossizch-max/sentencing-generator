const fs=require('fs'),vm=require('vm');
const {mkEl,mkDoc}=require('./test-utils');

function load(path){
  const src=fs.readFileSync(path,'utf8');
  const ctx={globalThis:{},module:{exports:{}},exports:{},Date,setTimeout,clearTimeout};
  vm.createContext(ctx); vm.runInContext(src,ctx); return ctx.module.exports;
}
const adapter=load('v94/case-model-adapter.js');
const writer=load('v94/case-model-writer.js');

const map={};
const ids=[];
const add=(id,el)=>{map[id]=el||mkEl(''); if(!ids.includes(id)) ids.push(id);};
[
  '_mashlul','def_name','def_id','case_num','traffic_count','traffic_detail','crim_count','crim_detail',
  'has_heavy_traffic','has_heavy_criminal','has_prior_prison','has_prior_criminal_prison',
  'has_multiple_yes','has_multiple','multi_proc_type','multi_count',
  'off_no_insurance','off_license_expired','off_license_expired_year','off_other_text',
  'disq_type','disq_details','disq_origin_gmr','lic_year','aggravating_extra_enabled','aggravating_extra_text',
  'ps67s_prior_67_count','ps67s_disq_knowledge','ps67s_disq_source','prior_10a','no_fix_10a',
  'ps67s_10a_detail','ps67s_10a_related','shich_finding','shich_circ','shich_repeat','shich_repeat_year',
  'shich_accident','shich_accident_result','shich_40a','shich_40a_detail','ps67s_alcohol_level',
  'ps67s_shich_type','ps67s_prior_shich_count','m_min','m_max','pos','heavy_case','req_prison','req_disq',
  'req_fine','req_bond','req_disq_cond','req_disq_cond_years'
].forEach(id=>add(id,mkEl('',false,(id.startsWith('has_')||id==='off_no_insurance'||id==='off_license_expired'||id==='no_fix_10a'||id==='heavy_case'||id==='aggravating_extra_enabled')?{type:'checkbox'}:{})));

const doc={
  getElementById(id){return map[id]||null;},
  querySelectorAll(sel){
    const m=String(sel).match(/^\[id\^="([^"]+)"\]$/);
    return m ? ids.filter(id=>id.startsWith(m[1])).map(id=>({id})) : [];
  }
};
const win={
  _mashlul:'',
  chooseMashlul(r){this._mashlul=r; map._mashlul.value=r;},
  toggleMultipleUI(){},
  buildMultiCards(){
    const n=Number(map.multi_count.value||0);
    for(let i=1;i<=n;i++){
      ['m_case_','m_date_','m_disq_type_','m_disq_','m_lic_exp_','m_lic_exp_year_','m_no_ins_','m_other_off_','m_aggr_'].forEach(p=>{
        const id=p+i;
        const isCheck=(p==='m_lic_exp_'||p==='m_no_ins_');
        if(!map[id]) add(id,mkEl('',false,isCheck?{type:'checkbox'}:{}));
      });
    }
  },
  addConditionalItem(i){
    add('cond_item_'+i,mkEl('')); ['case','court','date','months','activation'].forEach(k=>add('cond_'+k+'_'+i,mkEl('')));
  },
  addDisqualificationItem(i){
    add('disq_item_'+i,mkEl('')); ['case','court','date','months','activation'].forEach(k=>add('disq_'+k+'_'+i,mkEl('')));
  },
  addBondItem(i){
    add('bond_item_'+i,mkEl('')); ['case','court','date','amount','activation'].forEach(k=>add('bond_'+k+'_'+i,mkEl('')));
  }
};

const model={
  schemaVersion:1,route:'67',
  defendant:{
    name:'נאשם בדיקה',id:'123',
    record:{
      traffic:{count:7,detail:'עבר תעבורתי',heavy:true},
      criminal:{count:0,detail:'',heavy:false},
      priorPrison:{traffic:true,criminal:false},
      pendingConditions:{
        imprisonment:[{index:1,sourceCase:'C1',court:'ירושלים',date:'2025-01-01',months:'4',activation:'חופף'}],
        disqualification:[{index:3,sourceCase:'D3',court:'תא',date:'2025-02-02',months:'8',activation:'מצטבר'}],
        bonds:[{index:2,sourceCase:'B2',court:'מרכז',date:'2025-03-03',amount:'5000',activation:'הפעלה'}]
      }
    }
  },
  proceeding:{
    leadCaseNumber:'MAIN-94',mode:'joined',
    cases:[
      {index:1,caseNumber:'MAIN-94',date:'2026-01-01',disqualificationType:'court',disqualificationDetails:'ראשי',licenseExpired:true,licenseExpiryYear:'2020',noInsurance:false,freeText:'',aggravating:'מחמיר 1'},
      {index:2,caseNumber:'JOIN-2',date:'2026-02-02',disqualificationType:'police',disqualificationDetails:'מצורף',licenseExpired:true,licenseExpiryYear:'2019',noInsurance:true,freeText:'עבירה נוספת',aggravating:'מחמיר 2'}
    ]
  },
  currentOffense:{
    ancillaryOffenses:{noInsurance:true,licenseExpired:true,licenseExpiryYear:'2018',other:'אחר'},
    facts:{disqualificationType:'court',disqualificationDetails:'פירוט',disqualificationOrigin:'gmr',licenseYear:'2020',aggravatingExtraEnabled:true,aggravatingExtraText:'מחמיר'},
    routeFacts:{
      section67:{prior67Count:2,disqualificationKnowledge:'מלא',disqualificationSource:'גזר דין'},
      section10a:{prior10a:'1',noFix10a:true,relatedDetail:'פרט',related:'כן'},
      intoxication:{finding:'',circumstances:'',repeat:'',repeatYear:'',accident:'',accidentResult:'',section40a:'',section40aDetail:'',alcoholLevel:'',type:'',priorCount:null}
    }
  },
  sentencing:{
    range:{imprisonmentMin:'6',imprisonmentMax:'24'},
    placement:{key:'high',heavyCase:true},
    petition:{imprisonment:'10',disqualification:'36',fine:'5000',bond:'10000',disqualificationCondition:'6',disqualificationConditionYears:'3'},
    specialRequests:{section40a:{},conditionalPetition:{}}
  },
  accident:null,metadata:{source:'test'}
};

(async()=>{
  await writer.applyCaseModelToDocument(model,win,doc);
  const rebuilt=adapter.buildCaseModelFromCurrentState(win,doc);

  if(rebuilt.route!=='67') throw new Error('route');
  if(rebuilt.proceeding.mode!=='joined') throw new Error('mode');
  if(rebuilt.proceeding.cases.length!==2||rebuilt.proceeding.cases[1].caseNumber!=='JOIN-2') throw new Error('cases');
  if(rebuilt.defendant.record.traffic.count!==7||!rebuilt.defendant.record.traffic.heavy) throw new Error('traffic');
  if(rebuilt.defendant.record.pendingConditions.imprisonment[0].sourceCase!=='C1') throw new Error('cond');
  if(rebuilt.defendant.record.pendingConditions.disqualification[0].index!==3) throw new Error('sparse disq');
  if(rebuilt.defendant.record.pendingConditions.bonds[0].index!==2) throw new Error('sparse bond');
  if(rebuilt.currentOffense.ancillaryOffenses.noInsurance!==true) throw new Error('insurance');
  if(rebuilt.sentencing.petition.fine!=='5000') throw new Error('fine');
  console.log('PASS writer unit roundtrip canonical -> fake DOM -> canonical');
})().catch(e=>{console.error(e);process.exit(1);});
