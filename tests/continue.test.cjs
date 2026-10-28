const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ordered,move,progressParts}=require('../assets/continue.js');
const tracking=require('../assets/tracking-core.js');
const items=[{id:'a',status:'going',updated:10},{id:'b',status:'going',updated:30},{id:'c',status:'done',updated:40},{id:'d',status:'going',updated:20}];
test('Continue defaults to most recent, without mutating the library',()=>{
  const before=JSON.stringify(items);
  assert.deepEqual(ordered(items).map(item=>item.id),['b','d','a']);
  assert.equal(JSON.stringify(items),before);
});
test('saved order survives progress updates and ignores duplicates, removed and inactive IDs',()=>{
  const updated=items.map(item=>({...item,updated:item.id==='a'?100:item.updated}));
  assert.deepEqual(ordered(updated,['d','c','d','missing','b']).map(item=>item.id),['d','b','a']);
  assert.deepEqual(ordered(updated,{bad:'preference'}).map(item=>item.id),['a','b','d']);
});
test('new active titles remain visible after manually ordered titles',()=>{
  assert.deepEqual(ordered([...items,{id:'new',status:'going',updated:50}],['d','a','b']).map(item=>item.id),['d','a','b','new']);
});
test('moving either direction keeps the same identities and leaves the source unchanged',()=>{
  const ids=['a','b','d'];
  assert.deepEqual(move(ids,'a','d'),['b','d','a']);
  assert.deepEqual(move(ids,'d','a'),['d','a','b']);
  assert.deepEqual(move(ids,'missing','a'),ids);
  assert.deepEqual(move(ids,'a','a'),ids);
  assert.deepEqual(ids,['a','b','d']);
});
test('episode cursor is separate from completed episodes across all seasons',()=>{
  const item={type:'series',season:2,episode:2,seasonGuide:[{number:1,episodes:[1,2,3]},{number:2,episodes:[1,2,3,4]}],watchedEpisodes:['1:1','2:2']};
  const before=JSON.stringify(item);
  assert.deepEqual(progressParts(item,tracking),{unit:'episodes',current:2,season:2,completed:2,total:7});
  assert.equal(JSON.stringify(item),before);
});
test('continuous anime uses absolute episode numbers, not calendar-year seasons',()=>{
  const item={type:'anime',title:'One Piece',year:1999,season:2000,episode:1,seasonGuide:[{number:1999,episodes:[1,2]},{number:2000,episodes:[1,2]}]};
  assert.deepEqual(progressParts(item,tracking),{unit:'episodes',current:3,season:null,completed:3,total:4});
});
test('unknown episode totals stay absent and reading positions retain their own units',()=>{
  assert.equal(progressParts({type:'series',season:1,episode:4},tracking).total,null);
  assert.deepEqual(progressParts({type:'book',page:50,pages:300},tracking),{unit:'pageUnit',current:50,completed:50,total:300});
  assert.deepEqual(progressParts({type:'manga',chapter:25,chapters:300},tracking),{unit:'chapterUnit',current:25,completed:25,total:300});
  assert.equal(progressParts({type:'movie'},tracking),null);
});
