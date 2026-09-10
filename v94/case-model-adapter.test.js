const fs = require('fs');
const vm = require('vm');

const src = fs.readFileSync('v94/case-model-adapter.js','utf8');

function mkEl(value='', checked=false){
  return {value:String(value), checked:!!checked};
}
function mkDoc(map, ids=[]){
  return {
    getElementById(id){ return map[id] || null; },
    querySelectorAll(sel){
      if(sel.startsWith('[id^="')){
        const prefix=sel.slice(6,-2);
        return ids.filter(id=>id.startsWith(prefix)).map(id=>({id}));
      }
      return [];
    }
  };
}

const ctx={globalThis:{},module:{exports:{}},exports:{},Date};
vm.createContext(ctx);
vm.runInContext(src,ctx);
const api=ctx.module.exports;

const map={
  _mashlul:mkEl('67'),
  case_num:mkEl('MAIN-1'),
  traffic_count:mkEl('5'),
  traffic_detail:mkEl('שתי הרשעות קודמות בנהיגה בזמן פסילה'),
  crim_count:mkEl('0'),
  has_multiple_yes:mkEl('',true),
  multi_proc_type:mkEl('consol'),
  multi_count:mkEl('2'),
  m_case_1:mkEl('MAIN-1'),
  m_case_2:mkEl('JOIN-2'),
  m_date_1:mkEl('2026-01-01'),
  m_date_2:mkEl('2026-02-02'),
  m_min:mkEl('6'),m_max:mkEl('24'),pos:mkEl('high'),
  req_prison:mkEl('8'),req_disq:mkEl('36 חודשים'),
  cond_case_1:mkEl('C1'),cond_months_1:mkEl('4'),
  cond_case_3:mkEl('C3'),cond_months_3:mkEl('6')
};
const ids=['cond_item_1','cond_item_3'];
const model=api.buildCaseModelFromCurrentState({_mashlul:'67'},mkDoc(map,ids));

if(model.route!=='67') throw new Error('route');
if(model.proceeding.mode!=='joined') throw new Error('mode');
if(model.proceeding.cases[1].caseNumber!=='JOIN-2') throw new Error('joined case');
if(model.defendant.record.traffic.count!==5) throw new Error('traffic count');
if(model.defendant.record.criminal.count!==0) throw new Error('criminal zero');
if(model.defendant.record.pendingConditions.imprisonment.length!==2) throw new Error('sparse cond list');
if(model.defendant.record.pendingConditions.imprisonment[1].index!==3) throw new Error('sparse index');

console.log('PASS v94 CaseModel read-only adapter');
