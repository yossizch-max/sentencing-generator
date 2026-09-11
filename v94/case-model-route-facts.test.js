const fs=require('fs'),vm=require('vm');
const {mkEl,mkDoc}=require('./test-utils');
const src=fs.readFileSync('v94/case-model-adapter.js','utf8');
const ctx={globalThis:{},module:{exports:{}},exports:{},Date}; vm.createContext(ctx); vm.runInContext(src,ctx);
const api=ctx.module.exports;

const map={
  _mashlul:mkEl('67_10a_shichrut'),
  ps67s_prior_67_count:mkEl('3'),
  ps67s_disq_knowledge:mkEl('ידע מלא'),
  ps67s_disq_source:mkEl('גזר דין'),
  prior_10a:mkEl('2'),
  no_fix_10a:mkEl('',true),
  ps67s_10a_detail:mkEl('פרט 10א'),
  ps67s_10a_related:mkEl('כן'),
  shich_finding:mkEl('שכרות'),
  shich_circ:mkEl('נסיבות'),
  shich_repeat:mkEl('כן'),
  shich_repeat_year:mkEl('2024'),
  shich_accident:mkEl('כן'),
  shich_accident_result:mkEl('נזק'),
  shich_40a:mkEl('כן'),
  shich_40a_detail:mkEl('פרט'),
  ps67s_alcohol_level:mkEl('850'),
  ps67s_shich_type:mkEl('אלכוהול'),
  ps67s_prior_shich_count:mkEl('1'),
  req_fine:mkEl('5000'),
  req_bond:mkEl('10000'),
  req_disq_cond:mkEl('6'),
  req_disq_cond_years:mkEl('3'),
  request_40a:mkEl('כן'),
  request_40a_life:mkEl('לא')
};
const m=api.buildCaseModelFromCurrentState({_mashlul:'67_10a_shichrut'},mkDoc(map));
if(m.currentOffense.routeFacts.section67.prior67Count!==3) throw new Error('67 facts');
if(m.currentOffense.routeFacts.section10a.prior10a!=='2') throw new Error('10a facts');
if(m.currentOffense.routeFacts.section10a.noFix10a!==true) throw new Error('10a checkbox');
if(m.currentOffense.routeFacts.intoxication.priorCount!==1) throw new Error('shichrut prior count');
if(m.currentOffense.routeFacts.intoxication.alcoholLevel!=='850') throw new Error('alcohol level');
if(m.sentencing.petition.fine!=='5000') throw new Error('fine');
if(m.sentencing.specialRequests.section40a.request_40a!=='כן') throw new Error('40a');
console.log('PASS expanded route facts');
