const fs=require('fs'),vm=require('vm');
const {mkEl,mkDoc}=require('./test-utils');
const src=fs.readFileSync('v94/case-model-adapter.js','utf8');
const ctx={globalThis:{},module:{exports:{}},exports:{},Date}; vm.createContext(ctx); vm.runInContext(src,ctx);
const api=ctx.module.exports;

const map={
  _mashlul:mkEl('67'),
  traffic_count:mkEl('5'),
  traffic_detail:mkEl(''),
  crim_count:mkEl('2'),
  crim_detail:mkEl(''),
  has_multiple_yes:mkEl('',true),
  multi_proc_type:mkEl('consol'),
  multi_count:mkEl('1'),
  m_case_1:mkEl('MAIN'),
  cond_case_1:mkEl(''),
  acc_placement_manual:mkEl('0')
};
const ids=['cond_item_1'];
const m=api.buildCaseModelFromCurrentState({_mashlul:'67'},mkDoc(map,ids));
const issues=api.validateCaseModel(m);
const codes=issues.map(x=>x.code);
for(const code of ['MULTI_CASE_COUNT_TOO_LOW','TRAFFIC_RECORD_DETAIL_MISSING','CRIMINAL_RECORD_DETAIL_MISSING','CONDITION_SOURCE_CASE_MISSING']){
  if(!codes.includes(code)) throw new Error('missing validation '+code+' got '+JSON.stringify(issues));
}

const accMap={
  _mashlul:mkEl('accident_injury'),
  acc_placement_manual:mkEl('1'),
  acc_placement_manual_reason:mkEl(''),
  acc_victim_count:mkEl('2'),
  acc_description:mkEl('')
};
const a=api.buildCaseModelFromCurrentState({_mashlul:'accident_injury'},mkDoc(accMap));
const acodes=api.validateCaseModel(a).map(x=>x.code);
if(!acodes.includes('ACCIDENT_MANUAL_PLACEMENT_REASON_MISSING')) throw new Error('manual placement warning missing');
if(!acodes.includes('ACCIDENT_DESCRIPTION_EMPTY')) throw new Error('accident description info missing');
console.log('PASS expanded validation diagnostics');
