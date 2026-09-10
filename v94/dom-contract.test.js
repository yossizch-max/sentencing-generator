const fs=require('fs');
const s=fs.readFileSync('index.html','utf8');
const ids=[...s.matchAll(/\bid=["']([^"']+)["']/gi)].map(m=>m[1]);
const counts={}; ids.forEach(id=>counts[id]=(counts[id]||0)+1);
const dups=Object.entries(counts).filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]);
const critical=['splash','paper','case_num','traffic_count','crim_count','has_multiple_yes','multi_proc_type','multi_count','acc_placement','acc_placement_manual'];
const missing=critical.filter(id=>!counts[id]);
if(missing.length){ console.error('Missing critical IDs',missing); process.exit(1); }
console.log('DOM ids:',ids.length,'unique:',Object.keys(counts).length,'duplicates:',dups.length);
if(dups.length) console.log('Duplicate sample:',JSON.stringify(dups.slice(0,25)));
console.log('PASS critical DOM contract');
