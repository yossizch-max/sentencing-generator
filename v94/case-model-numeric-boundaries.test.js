const fs=require('fs'),vm=require('vm');
const {mkEl,mkDoc}=require('./test-utils');
const src=fs.readFileSync('v94/case-model-adapter.js','utf8');
const ctx={globalThis:{},module:{exports:{}},exports:{},Date}; vm.createContext(ctx); vm.runInContext(src,ctx);
const api=ctx.module.exports;

const cases=[
  {_mashlul:'67',m_min:'0',m_max:'24',req_prison:'0',req_disq:'36',traffic_count:'0',crim_count:'0'},
  {_mashlul:'67',m_min:'6',m_max:'24',req_prison:'12',req_disq:'48',traffic_count:'10',crim_count:'2'},
  {_mashlul:'accident_injury',acc_prison_min:'3',acc_prison_max:'6',acc_disq_min:'24',acc_disq_max:'48',acc_victim_count:'0'},
  {_mashlul:'accident_injury',acc_prison_min:'4',acc_prison_max:'12',acc_disq_min:'36',acc_disq_max:'120',acc_victim_count:'3'}
];
for(const [idx,c] of cases.entries()){
  const map={}; for(const [k,v] of Object.entries(c)) map[k]=mkEl(v);
  const m=api.buildCaseModelFromCurrentState({_mashlul:c._mashlul},mkDoc(map));
  if(c._mashlul==='67'){
    if(m.sentencing.range.imprisonmentMin!==c.m_min||m.sentencing.range.imprisonmentMax!==c.m_max) throw new Error('range drift '+idx);
    if(m.sentencing.petition.imprisonment!==c.req_prison||m.sentencing.petition.disqualification!==c.req_disq) throw new Error('petition drift '+idx);
    if(m.defendant.record.traffic.count!==Number(c.traffic_count)||m.defendant.record.criminal.count!==Number(c.crim_count)) throw new Error('record numeric drift '+idx);
  }else{
    if(m.accident.prisonMin!==c.acc_prison_min||m.accident.prisonMax!==c.acc_prison_max) throw new Error('acc prison drift '+idx);
    if(m.accident.disqualificationMin!==c.acc_disq_min||m.accident.disqualificationMax!==c.acc_disq_max) throw new Error('acc disq drift '+idx);
    if(m.accident.victimCount!==Number(c.acc_victim_count)) throw new Error('victim count drift '+idx);
  }
}
console.log('PASS numeric boundary matrix '+cases.length+'/'+cases.length);
