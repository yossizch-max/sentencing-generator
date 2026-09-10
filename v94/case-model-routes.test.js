const fs=require('fs'),vm=require('vm');
const {mkEl,mkDoc}=require('./test-utils');
const src=fs.readFileSync('v94/case-model-adapter.js','utf8');
const ctx={globalThis:{},module:{exports:{}},exports:{},Date}; vm.createContext(ctx); vm.runInContext(src,ctx);
const api=ctx.module.exports;
const routes=['67','10a','67+10a','shichrut','67_shichrut','10a_shichrut','67_10a_shichrut','accident_injury'];
for(const route of routes){
  const map={_mashlul:mkEl(route),case_num:mkEl('CASE-'+route),m_min:mkEl('1'),m_max:mkEl('9'),pos:mkEl('center')};
  if(route==='accident_injury'){map.acc_injury_level=mkEl('hard');map.acc_negligence=mkEl('high');map.acc_placement=mkEl('center');map.acc_placement_manual=mkEl('0');}
  const model=api.buildCaseModelFromCurrentState({_mashlul:route},mkDoc(map));
  if(model.route!==route) throw new Error('route mismatch '+route);
  if((route==='accident_injury')!==!!model.accident) throw new Error('accident mismatch '+route);
  if(model.proceeding.leadCaseNumber!=='CASE-'+route) throw new Error('case mismatch '+route);
}
console.log('PASS routes 8/8');
if(api.normalizeRoute('accident_below_real')!=='accident_injury') throw new Error('accident_below_real alias');
console.log('PASS accident subroute normalization');
