const fs=require('fs'),vm=require('vm');
const {mkEl,mkDoc}=require('./test-utils');
const src=fs.readFileSync('v94/case-model-adapter.js','utf8');
const ctx={globalThis:{},module:{exports:{}},exports:{},Date}; vm.createContext(ctx); vm.runInContext(src,ctx);
const api=ctx.module.exports;

const legacy={
  _mashlul:'67_10a_shichrut',
  case_num:'PAR-94',
  traffic_count:'4',
  crim_count:'0',
  req_prison:'8',
  req_disq:'24',
  req_fine:'5000',
  req_bond:'10000',
  disq_type:'court',
  disq_details:'פרטים',
  lic_year:'2020',
  off_no_insurance:true,
  off_license_expired:false,
  off_license_expired_year:'',
  off_other_text:'',
  ps67s_prior_67_count:'3',
  prior_10a:true,
  no_fix_10a:true,
  shich_finding:'finding',
  shich_repeat:true,
  ps67s_alcohol_level:'850',
  ps67s_prior_shich_count:'1'
};
const map={};
for(const [k,v] of Object.entries(legacy)){
  const isBool=typeof v==='boolean';
  map[k]=mkEl(isBool?'':v,isBool?v:false,isBool?{type:'checkbox'}:{});
}
const model=api.buildCaseModelFromCurrentState({_mashlul:'67_10a_shichrut'},mkDoc(map));
const report=api.compareLegacyStateToCaseModel(legacy,model);
if(!report.ok) throw new Error('expanded parity failed '+JSON.stringify(report.differences));

const accLegacy={
  _mashlul:'accident_injury',
  acc_injury:'hard',
  acc_negligence:'high',
  acc_placement:'center',
  acc_prison_min:'3',
  acc_prison_max:'6',
  acc_disq_min:'24',
  acc_disq_max:'48',
  acc_victim_count:'2',
  acc_p_prison_m:'4',
  acc_p_disq_m:'36'
};
const accMap={};
for(const [k,v] of Object.entries(accLegacy)) accMap[k]=mkEl(v);
const accModel=api.buildCaseModelFromCurrentState({_mashlul:'accident_injury'},mkDoc(accMap));
const accReport=api.compareLegacyStateToCaseModel(accLegacy,accModel);
if(!accReport.ok) throw new Error('accident parity failed '+JSON.stringify(accReport.differences));
console.log('PASS expanded legacy parity');
