const fs=require('fs'),vm=require('vm');
const {mkEl,mkDoc}=require('./test-utils');
const src=fs.readFileSync('v94/case-model-adapter.js','utf8');
const ctx={globalThis:{},module:{exports:{}},exports:{},Date}; vm.createContext(ctx); vm.runInContext(src,ctx);
const api=ctx.module.exports;

const legacy={_mashlul:'67',case_num:'P-100',traffic_count:'7',crim_count:'2',m_min:'6',m_max:'24',pos:'high',req_prison:'10',req_disq:'36 חודשים'};
const map={};
for(const [k,v] of Object.entries(legacy)) map[k]=mkEl(v);
const model=api.buildCaseModelFromCurrentState({_mashlul:'67'},mkDoc(map));
const report=api.compareLegacyStateToCaseModel(legacy,model);
if(!report.ok) throw new Error('parity failed '+JSON.stringify(report.differences));
console.log('PASS legacy parity core fields');
