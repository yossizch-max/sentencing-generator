const fs=require('fs'),vm=require('vm');
const {mkEl,mkDoc}=require('./test-utils');
const src=fs.readFileSync('v94/case-model-adapter.js','utf8');
const ctx={globalThis:{},module:{exports:{}},exports:{},Date}; vm.createContext(ctx); vm.runInContext(src,ctx);
const api=ctx.module.exports;
const map={
  _mashlul:mkEl('67'), court_name:mkEl('ירושלים'), judge:mkEl('השופט QA'), lawyer_name:mkEl('עו״ד QA'), lawyer_office:mkEl('משרד QA'),
  defarg_admission:mkEl('',true,{type:'checkbox'}), defarg_custom:mkEl('טענה'),
  defense_custom_response:mkEl('מענה'), defense_delay_due_defendant:mkEl('',true,{type:'checkbox'}),
  psdef_admission:mkEl('',true,{type:'checkbox'}), psdef_custom_text:mkEl('תשובת תביעה'),
  has_probation:mkEl('',true,{type:'checkbox'}), probation_details:mkEl('תסקיר'), probation_findings:mkEl('ממצאים'),
  include_policy:mkEl('',true,{type:'checkbox'}), policy_text:mkEl('מדיניות'), include_bombastic:mkEl('',false,{type:'checkbox'}),
  conviction_type:mkEl('הודאה'), prison_type:mkEl('עבודות שירות'), criminal_prison_type:mkEl('מאסר')
};
const m=api.buildCaseModelFromCurrentState({_mashlul:'67'},mkDoc(map));
if(m.proceeding.caseContext.court_name!=='ירושלים') throw new Error('court');
if(m.currentOffense.defenseArguments.standard.defarg_admission!==true) throw new Error('defarg');
if(m.currentOffense.defenseArguments.response.defense_delay_due_defendant!==true) throw new Error('defense response');
if(m.currentOffense.defenseArguments.prosecutorResponse.psdef_custom_text!=='תשובת תביעה') throw new Error('psdef');
if(m.sentencing.context.probation.has_probation!==true) throw new Error('probation');
if(m.sentencing.context.policy.policy_text!=='מדיניות') throw new Error('policy');
if(m.sentencing.context.conviction.prison_type!=='עבודות שירות') throw new Error('conviction');
console.log('PASS defense policy probation case context');