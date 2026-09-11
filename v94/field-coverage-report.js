const fs=require('fs');
const inv=JSON.parse(fs.readFileSync('docs/v94-field-inventory.json','utf8'));
const adapter=fs.readFileSync('v94/case-model-adapter.js','utf8');
const writer=fs.readFileSync('v94/case-model-writer.js','utf8');
const keys=inv.allStateKeys||[];
const dynamicMatchers=[/^m_(case|date|disq|disq_details|lic_year|no_insurance|other)_\\d+$/,/^cond_(case|court|date|months|activation)_\\d+$/,/^disq_(case|court|date|months|activation)_\\d+$/,/^bond_(case|court|date|amount|activation)_\\d+$/];
function mentioned(k){if(adapter.includes("'"+k+"'")||adapter.includes('"'+k+'"')||writer.includes("'"+k+"'")||writer.includes('"'+k+'"')) return true; return dynamicMatchers.some(re=>re.test(k));}
const mapped=[],unmapped=[]; for(const k of keys) (mentioned(k)?mapped:unmapped).push(k);
function family(k){const m=k.match(/^([A-Za-z0-9]+_)/); return m?m[1]:'(none)';}
function group(list){const g={}; for(const k of list) (g[family(k)]||(g[family(k)]=[])).push(k); return Object.fromEntries(Object.entries(g).sort((a,b)=>a[0].localeCompare(b[0])));}
const report={total:keys.length,mapped:mapped.length,unmapped:unmapped.length,mappedPercent:keys.length?Math.round(mapped.length*1000/keys.length)/10:100,mappedFamilies:group(mapped),unmappedFamilies:group(unmapped)};
fs.writeFileSync('docs/v94-field-coverage.json',JSON.stringify(report,null,2));
let md='# v94 Legacy Field Coverage\\n\\n';
md+='Approximate coverage against the legacy getAllFields inventory. A key is considered mapped when it is explicitly referenced by the CaseModel adapter/writer or matched by a supported dynamic-list pattern.\\n\\n';
md+='- Total legacy keys: **'+report.total+'**\\n';
md+='- Mapped: **'+report.mapped+'**\\n';
md+='- Unmapped: **'+report.unmapped+'**\\n';
md+='- Approximate mapped coverage: **'+report.mappedPercent+'%**\\n\\n';
md+='## Unmapped by family\\n\\n';
for(const [fam,list] of Object.entries(report.unmappedFamilies)){md+='### '+fam+' ('+list.length+')\\n'; md+=list.map(x=>'- `'+x+'`').join('\\n')+'\\n\\n';}
fs.writeFileSync('docs/v94-field-coverage.md',md);
console.log(JSON.stringify({total:report.total,mapped:report.mapped,unmapped:report.unmapped,mappedPercent:report.mappedPercent,unmappedFamilies:Object.fromEntries(Object.entries(report.unmappedFamilies).map(([k,v])=>[k,v.length]))},null,2));