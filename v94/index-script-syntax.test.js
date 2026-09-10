const fs=require('fs'), vm=require('vm');
const s=fs.readFileSync('index.html','utf8');
const blocks=[...s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
let failures=[];
blocks.forEach((code,i)=>{
  try { new vm.Script(code,{filename:'script-'+(i+1)+'.js'}); }
  catch(e){ failures.push({index:i+1,message:e.message}); }
});
if(failures.length) { console.error(JSON.stringify(failures,null,2)); process.exit(1); }
console.log('PASS index script syntax '+blocks.length+'/'+blocks.length);
