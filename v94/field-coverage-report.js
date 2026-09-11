const fs=require('fs');
const inv=JSON.parse(fs.readFileSync('docs/v94-field-inventory.json','utf8'));
const adapter=fs.readFileSync('v94/case-model-adapter.js','utf8');
const writer=fs.readFileSync('v94/case-model-writer.js','utf8');
const keys=inv.allStateKeys||[];
const dynamicMatchers=[/^m_(case|date|disq_type|disq|disq_details|lic_exp|lic_exp_year|lic_year|no_ins|no_insurance|other_off|other|aggr)_\d+$/,/^cond_(case|court|date|months|activation)_\d+$/,/^disq_(case|court|date|months|activation)_\d+$/,/^bond_(case|court|date|amount|activation)_\d+$/];
function mentioned(k){if(adapter.includes("'"+k+"'")||adapter.includes('"'+k+'"')||writer.includes("'"+k+"'")||writer.includes('"'+k+'"')) return true; return dynamicMatchers.some(re=>re.test(k));}
const ignoredKeys=new Set(['_v','caseDraftSelect']);
const mapped=[],unmapped=[],ignored=[]; for(const k of keys){ if(ignoredKeys.has(k)) ignored.push(k); else (mentioned(k)?mapped:unmapped).push(k); }
function family(k){const m=k.match(/^([A-Za-z0-9]+_)/); return m?m[1]:'(none)';}
function group(list){const g={}; for(const k of list) (g[family(k)]||(g[family(k)]=[])).push(k); return Object.fromEntries(Object.entries(g).sort((a,b)=>a[0].localeCompare(b[0])));}
const effectiveTotal=keys.length-ignored.length;
const report={total:keys.length,effectiveTotal,mapped:mapped.length,unmapped:unmapped.length,ignored:ignored.length,ignoredKeys:ignored,mappedPercent:effectiveTotal?Math.round(mapped.length*1000/effectiveTotal)/10:100,mappedFamilies:group(mapped),unmappedFamilies:group(unmapped)};
fs.writeFileSync('docs/v94-field-coverage.json',JSON.stringify(report,null,2));
let md='# v94 Legacy Field Coverage\\n\\n';
md+='Approximate coverage against the legacy getAllFields inventory. A key is considered mapped when it is explicitly referenced by the CaseModel adapter/writer or matched by a supported dynamic-list pattern.\\n\\n';
md+='- Total legacy keys: **'+report.total+'**\\n';
md+='- Mapped: **'+report.mapped+'**\\n';
md+='- Unmapped: **'+report.unmapped+'**\\n';
md+='- Ignored ephemeral keys: **'+report.ignored+'**\\n';
md+='- Approximate mapped coverage: **'+report.mappedPercent+'%**\\n\\n';
md+='## Unmapped by family\\n\\n';
for(const [fam,list] of Object.entries(report.unmappedFamilies)){md+='### '+fam+' ('+list.length+')\\n'; md+=list.map(x=>'- `'+x+'`').join('\\n')+'\\n\\n';}
fs.writeFileSync('docs/v94-field-coverage.md',md);
console.log(JSON.stringify({total:report.total,effectiveTotal:report.effectiveTotal,mapped:report.mapped,unmapped:report.unmapped,ignored:report.ignored,mappedPercent:report.mappedPercent,unmappedFamilies:Object.fromEntries(Object.entries(report.unmappedFamilies).map(([k,v])=>[k,v.length]))},null,2));
if(report.mappedPercent<95){console.error('Coverage below 95%');process.exit(1);}