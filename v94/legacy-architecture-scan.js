const fs=require('fs');
const s=fs.readFileSync('index.html','utf8');
const symbols=['chooseMashlul','safeGenerate','generate67_core','generateMultiple','generate10a','generate67_10a','generate67ShichrutV66','generateV74Route','generateAccidentInjury','getAllFields','setAllFields','RouteFieldStateManager','buildPastRecordSection','buildPlacementSection'];
const report={};
for(const sym of symbols){
  const refs=s.split(sym).length-1;
  const functionDecls=s.split('function '+sym+'(').length-1;
  const windowAssignments=s.split('window.'+sym+' =').length-1 + s.split('window.'+sym+'=').length-1;
  report[sym]={refs,functionDecls,windowAssignments};
  if(refs===0) throw new Error('required symbol missing: '+sym);
}
report.scriptTags=(s.match(/<script\b/gi)||[]).length;
report.mutationObservers=(s.match(/MutationObserver/g)||[]).length;
report.timeouts=(s.match(/setTimeout\s*\(/g)||[]).length;
report.chooseMashlulAssignments=(s.match(/window\.chooseMashlul\s*=/g)||[]).length;
report.safeGenerateAssignments=(s.match(/window\.safeGenerate\s*=/g)||[]).length;
console.log(JSON.stringify(report,null,2));
console.log('PASS architecture scan');
