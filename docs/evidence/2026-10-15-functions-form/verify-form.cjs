const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=f=>JSON.parse(fs.readFileSync(path.join(__dirname,f),'utf8'));
const menu=read('menu-source.txt'),previous=read('../2026-10-15-gym-whatsapp/native-menu-source.txt'),form=read('fields.json'),api=read('api-body-map.json');
assert.equal(Object.keys(menu.nodes).length,63);
assert(!Object.values(menu.nodes).some(n=>/User Input Flow/.test(n.name)));
for(const n of Object.values(menu.nodes)){
 for(const [out,v] of Object.entries(n.outputs))for(const c of v.connections)assert(menu.nodes[c.node]?.inputs[c.input]?.connections.some(i=>i.node===n.id&&i.output===out));
 if([1,44,66].includes(n.id))continue;
 const a=structuredClone(n),b=structuredClone(previous.nodes[n.id]);
 for(const k of ['uniqueId','postbackId','xitFbpostbackId','newPostbackId']){delete a.data[k];delete b.data[k];}
 assert.deepEqual(a,b,'Unrelated menu/Gym node changed: '+n.id);
}
assert.equal(menu.nodes[66].data.dropdownFlowId,'42768');
const fields=form.fields.filter(f=>f.custom),ids=new Set(fields.map(f=>f.custom));assert.equal(ids.size,12);
for(const f of fields)assert(api.fields.some(a=>'custom_'+a.value===f.custom),'Unmapped native field: '+f.name);
assert.equal(api.fields.find(f=>f.key==='senderPhone').value,'chat_id');
assert.deepEqual(fields.find(f=>f.name==='consent').selected,[false,false]);
const code=fs.readFileSync(path.join(__dirname,'receiver.js'),'utf8');
const run=body=>vm.runInNewContext('(function(){'+code+'})()',{Date,$input:{first:()=>({json:{body}})}})[0].json;
const date=new Date(Date.now()+86400000*10).toISOString().slice(0,10);
const sample={senderPhone:'27000000000',session:'2026101509000001',date,style:'Buffet',guests:'50',contactPerson:'TEST native enquiry',email:'test@example.com',phoneChoice:'Use this number',alternativePhone:'',company:'Private',budget:'',budgetBasis:'Not sure',occasion:'',consent:'Send to Michelle'};
assert.equal(run(sample).status,'ready');assert.equal(run(sample).replyPhone,'+27000000000');assert.equal(run(sample).payload.budget,'Not provided');
assert.equal(run({...sample,phoneChoice:'Use another number',alternativePhone:'27000000001'}).replyPhone,'+27000000001');
assert.equal(run({...sample,phoneChoice:'Use another number'}).status,'incomplete');
assert.equal(run({...sample,consent:''}).status,'incomplete');assert.equal(run({...sample,consent:'Cancel enquiry'}).status,'cancelled');
assert.equal(run({...sample,date:'2020-01-01'}).status,'incomplete');assert.equal(run({...sample,budget:'10000',budgetBasis:'Total budget'}).status,'ready');assert.equal(run({...sample,guests:'not a number'}).status,'incomplete');
const fallback=read('compatibility-launch-source.txt'),compat=read('compatibility-readback.json');
assert.equal(Object.keys(fallback.nodes).length,3);
assert.equal(fallback.nodes[1].outputs.referenceOutput.connections[0].node,65);
assert.equal(fallback.nodes[65].data.customFieldId,'custom_77886');
assert.equal(fallback.nodes[65].outputs.randomNumberGeneratorOutput.connections[0].node,66);
assert.equal(fallback.nodes[66].data.dropdownFlowId,'42768');
assert(!Object.values(fallback.nodes).some(n=>/HTTP API|User Input Flow/.test(n.name)));
assert.equal(compat.oldDateCallback.reply,'3532289');assert.equal(compat.oldDateCallback.httpApi,'');
assert.deepEqual(compat.retainedMenus.map(m=>m.id),['2169642','2169549','2169454','2168591']);
for(const m of compat.retainedMenus){assert(m.forms.includes('Midpoint Functions Enquiry'));assert(!m.forms.includes('Midpoint Functions Date'));}
console.log('Native field/API contracts, validation, preserved routes and fresh-session legacy-card fallback passed.');
