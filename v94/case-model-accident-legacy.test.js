const fs=require('fs'),vm=require('vm');
const {mkEl,mkDoc}=require('./test-utils');
const src=fs.readFileSync('v94/case-model-adapter.js','utf8');
const ctx={globalThis:{},module:{exports:{}},exports:{},Date}; vm.createContext(ctx); vm.runInContext(src,ctx);
const api=ctx.module.exports;
const map={
  _mashlul:mkEl('accident_injury'),
  acc_38b2_manual:mkEl('כן'), acc_accident_date:mkEl('2026-01-01'), acc_add_10a:mkEl('',true,{type:'checkbox'}),
  acc_add_67:mkEl('',true,{type:'checkbox'}), acc_add_hitnaslut:mkEl('',false,{type:'checkbox'}), acc_add_shichrut:mkEl('',true,{type:'checkbox'}),
  acc_base_offense:mkEl('קלות ראש'), acc_breach:mkEl('הפרה'), acc_breach_citation:mkEl('תקנה'), acc_breach_other:mkEl('אחר'),
  acc_case:mkEl('תד QA'), acc_conviction_type:mkEl('הודאה'), acc_court:mkEl('ירושלים'), acc_def:mkEl('נאשם'),
  acc_driver_type:mkEl('פרטי'), acc_driving_years:mkEl('15'), acc_medical:mkEl('חבלה'), acc_review_depth:mkEl('מלא'),
  acc_shichrut_basis:mkEl('בדיקה'), acc_shichrut_finding:mkEl('חיובי'), acc_p_cs:mkEl('כן'), acc_p_cs_h:mkEl('120')
};
const m=api.buildCaseModelFromCurrentState({_mashlul:'accident_injury'},mkDoc(map));
if(m.accident.legacyDetails.acc_case!=='תד QA') throw new Error('case');
if(m.accident.legacyDetails.acc_add_67!==true) throw new Error('add67');
if(m.accident.legacyDetails.acc_add_hitnaslut!==false) throw new Error('hitnaslut');
if(m.accident.legacyDetails.acc_shichrut_finding!=='חיובי') throw new Error('shichrut finding');
if(m.accident.petition.acc_p_cs!=='כן'||m.accident.petition.acc_p_cs_h!=='120') throw new Error('cs petition');
console.log('PASS accident legacy detail coverage');