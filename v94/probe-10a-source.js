const fs=require('fs');
const s=fs.readFileSync('index.html','utf8');
const needles=['prior_10a','הרשעה קודמת בעבירה לפי סעיף 10','לחובת הנאשם הרשעה קודמת','לא ריפא את הפגם'];
for(const n of needles){
  let pos=0,count=0;
  while((pos=s.indexOf(n,pos))>=0&&count<12){
    console.log('\n=== '+n+' @ '+pos+' ===\n'+s.slice(Math.max(0,pos-900),pos+1800));
    pos+=n.length; count++;
  }
}
