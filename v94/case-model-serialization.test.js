const fs=require('fs'),vm=require('vm');
const {mkEl,mkDoc}=require('./test-utils');
const src=fs.readFileSync('v94/case-model-adapter.js','utf8');
const ctx={globalThis:{},module:{exports:{}},exports:{},Date}; vm.createContext(ctx); vm.runInContext(src,ctx);
const api=ctx.module.exports;

const map={
  _mashlul:mkEl('67'),
  case_num:mkEl('SER-94'),
  traffic_count:mkEl('4'),
  crim_count:mkEl('0'),
  m_min:mkEl('6'),m_max:mkEl('18'),pos:mkEl('center'),
  req_prison:mkEl('8'),req_disq:mkEl('24')
};
const model=api.buildCaseModelFromCurrentState({_mashlul:'67'},mkDoc(map));
const serialized1=api.serializeCaseModel(model);
const serialized2=api.serializeCaseModel(model);
if(serialized1!==serialized2) throw new Error('serialization is not stable');
if(serialized1.includes('capturedAt')) throw new Error('portable serialization leaked capturedAt');

const restored=api.deserializeCaseModel(serialized1);
const serialized3=api.serializeCaseModel(restored);
if(serialized1!==serialized3) throw new Error('roundtrip drift');

let rejected=false;
try{ api.deserializeCaseModel(JSON.stringify({schemaVersion:999})); }catch(e){ rejected=true; }
if(!rejected) throw new Error('unsupported schema version accepted');

console.log('PASS portable serialization stable + roundtrip + schema guard');
