const fs=require('fs'),vm=require('vm');
const {mkEl,mkDoc}=require('./test-utils');
const src=fs.readFileSync('v94/case-model-adapter.js','utf8');
const ctx={globalThis:{},module:{exports:{}},exports:{},Date}; vm.createContext(ctx); vm.runInContext(src,ctx);
const api=ctx.module.exports;

const map={
  _mashlul:mkEl('accident_injury'),
  acc_injury:mkEl('hard'),
  acc_injury_type:mkEl('חבלה קשה'),
  acc_negligence:mkEl('high'),
  acc_negligence_reason:mkEl('מעבר חציה'),
  acc_placement:mkEl('high'),
  acc_placement_manual:mkEl('1'),
  acc_placement_manual_reason:mkEl('נסיבות מיוחדות'),
  acc_prison_min:mkEl('3'),
  acc_prison_max:mkEl('6'),
  acc_disq_min:mkEl('24'),
  acc_disq_max:mkEl('48'),
  acc_victim_count:mkEl('2'),
  acc_victim_status:mkEl('מאושפז'),
  acc_victim_type:mkEl('הולך רגל'),
  acc_description:mkEl('תיאור תאונה'),
  acc_relevant_history_detail:mkEl('עבר רלוונטי'),
  acc_prior_10a:mkEl('',true),
  acc_prior_shichrut:mkEl('',false),
  acc_agg_crosswalk:mkEl('',true),
  acc_agg_speed:mkEl('',true),
  acc_mit_self:mkEl('',true),
  acc_p_prison_m:mkEl('4'),
  acc_p_disq_m:mkEl('36'),
  acc_p_fine_a:mkEl('2500')
};
const m=api.buildCaseModelFromCurrentState({_mashlul:'accident_injury'},mkDoc(map));
if(!m.accident) throw new Error('accident missing');
if(m.accident.injuryLevel!=='hard') throw new Error('injury');
if(m.accident.negligence!=='high') throw new Error('negligence');
if(m.accident.placementManual!==true) throw new Error('manual flag');
if(m.accident.victimCount!==2) throw new Error('victim count');
if(m.accident.priorSignals.acc_prior_10a!==true) throw new Error('prior signal');
if(m.accident.aggravating.acc_agg_crosswalk!==true) throw new Error('aggravating');
if(m.accident.mitigating.acc_mit_self!==true) throw new Error('mitigating');
if(m.accident.petition.acc_p_prison_m!=='4') throw new Error('petition');
console.log('PASS accident canonical facts');
