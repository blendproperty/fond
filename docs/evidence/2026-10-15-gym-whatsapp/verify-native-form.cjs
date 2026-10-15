const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,n),'utf8'));
const menu=read('native-menu-source.txt'),direct=read('native-direct-source.txt'),old=read('menu-continuous-source.txt'),fields=read('native-form-fields.json');
for(const [g,count,edges] of [[menu,63,62],[direct,28,27]]){
 assert.equal(Object.keys(g.nodes).length,count);
 assert.equal(Object.values(g.nodes).flatMap(n=>Object.values(n.outputs)).reduce((s,o)=>s+o.connections.length,0),edges);
 assert(!Object.values(g.nodes).some(n=>/User Input Flow/.test(n.name)));
 assert.equal(Object.values(g.nodes).filter(n=>n.data.dropdownFlowId==='42767').length,2);
 for(const n of Object.values(g.nodes))for(const [out,v] of Object.entries(n.outputs))for(const c of v.connections)assert(g.nodes[c.node]?.inputs[c.input]?.connections.some(i=>i.node===n.id&&i.output===out));
}
for(const n of Object.values(menu.nodes)){
 if(n.id===1||n.id>=113)continue;
 const a=structuredClone(n),b=structuredClone(old.nodes[n.id]);
 for(const k of ['uniqueId','postbackId','xitFbpostbackId','newPostbackId']){delete a.data[k];delete b.data[k];}
 assert.deepEqual(a,b,'Unrelated menu branch changed: '+n.id);
}
assert.deepEqual(fields.fields.filter(f=>f.required).map(f=>f.name),['first_name','surname','email','company','consent']);
assert.equal(new Set(fields.fields.map(f=>f.custom)).size,6);
assert.equal(fields.fields.find(f=>f.name==='consent').selected,null);
console.log('Native graph connections, campaign exclusion, field mappings and preserved non-Gym branches passed.');
