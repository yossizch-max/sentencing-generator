function mkEl(value='', checked=false, extra={}) {
  return Object.assign({value:String(value), checked:!!checked, dataset:{}}, extra);
}
function mkDoc(map, nodeIds=[]) {
  const nodes=nodeIds.map(id=>({id}));
  return {
    getElementById(id){ return map[id] || null; },
    querySelectorAll(sel){
      const m=String(sel).match(/^\[id\^="([^"]+)"\]$/);
      if(m) return nodes.filter(n=>n.id.startsWith(m[1]));
      return [];
    }
  };
}
function deepClone(v){ return JSON.parse(JSON.stringify(v)); }
module.exports={mkEl,mkDoc,deepClone};