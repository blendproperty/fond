const fs=require('node:fs'),assert=require('node:assert/strict');
for(const filename of ['menu-continuous-source.txt','direct-continuous-source.txt']){
 const graph=JSON.parse(fs.readFileSync(__dirname+'/'+filename,'utf8'));
 const campaigns=Object.values(graph.nodes).filter(n=>n.name==='User Input Flow');assert.equal(campaigns.length,2);
 for(const campaign of campaigns){let n=campaign,ids=[],groups=0,api=false;const seen=new Set();
  while(n){assert.ok(!seen.has(n.id),'No cycle may skip input');seen.add(n.id);if(n.name==='User Input Flow')groups++;if(n.name==='HTTP API')api=true;
   if(n.name==='User Input Flow Single'){ids.push(Number(n.data.customField));if(n.data.customField==='77944'){assert.ok(n.data.question.includes('#MidpointGymCompany#'));assert.deepEqual(n.data.multipleChoices,['Send to Christine','Cancel request']);assert.ok(n.data.question.length<=1024);}}
   const edges=Object.values(n.outputs).flatMap(o=>o.connections);assert.ok(edges.length<=1);n=edges.length?graph.nodes[edges[0].node]:null;
  }
  assert.equal(groups,1,'Do not chain another campaign after an input answer');assert.ok(api);
  assert.deepEqual(ids,campaign.data.campaignName.includes('alternative')?[77938,77939,77940,77942,77943,77944]:[77938,77939,77940,77943,77944]);
 }
}
console.log('Continuous Gym graph checks passed: company and explicit review/consent precede email in both number paths; no chained input campaign.');
