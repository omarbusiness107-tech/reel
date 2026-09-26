const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../assets/tracking-core.js');

const title={type:'series',season:2,episode:1,seasonGuide:[{number:1,episodes:[1,2]},{number:2,episodes:[1,2]}],episodeCatalog:[
  {season:1,number:1,title:'Pilot',airdate:'2020-01-01',runtime:42},
  {season:1,number:2,title:'Second',airdate:'2020-01-08',runtime:42},
  {season:2,number:1,title:'Return',airdate:'2021-01-01',runtime:48},
  {season:2,number:2,title:'Finale',airdate:'2021-01-08',runtime:48}
]};

test('legacy cursor becomes an undated progress baseline',()=>{
  assert.deepEqual(core.baselineKeys(title),['1:1','1:2','2:1']);
  assert.deepEqual(core.progress(title).next,{season:2,number:2,title:'Finale',airdate:'2021-01-08',airstamp:'',runtime:48,summary:'',image:''});
});

test('explicit watched episodes support gaps without assuming preceding episodes',()=>{
  const item={...title,watchedEpisodes:['1:2','2:1']};
  assert.deepEqual(core.progress(item).watched,2);
  assert.equal(core.progress(item).next.number,1);
  assert.equal(core.progress(item).next.season,1);
  assert.deepEqual(core.seasonProgress(item,1),{watched:1,total:2});
});

test('watch event statistics count rewatches and report unknown runtime',()=>{
  const events=[
    {eventType:'movie_watched',mediaType:'movie',watchedAt:'2026-09-20T11:00:00Z',runtimeMinutes:120,titleId:'a'},
    {eventType:'episode_watched',mediaType:'series',watchedAt:'2026-09-20T12:00:00Z',runtimeMinutes:null,titleId:'b'},
    {eventType:'rewatch',mediaType:'series',watchedAt:'2026-09-21T12:00:00Z',runtimeMinutes:45,titleId:'b'}
  ];
  assert.deepEqual(((overview)=>({movies:overview.movies,episodes:overview.episodes,minutes:overview.minutes,unknown:overview.unknownRuntimes,days:overview.activeDays}))(core.overview(events,{timezone:'UTC'})),{movies:1,episodes:2,minutes:165,unknown:1,days:2});
});

test('upcoming excludes items without dates and past episodes',()=>{
  const items=[{...title,episodeCatalog:[{season:3,number:1,airdate:'2026-10-01'},{season:3,number:2,airdate:''},{season:2,number:2,airdate:'2021-01-08'}]}];
  assert.equal(core.upcoming(items,{at:Date.parse('2026-09-25T00:00:00Z'),days:20}).length,1);
});

test('anime with a known episode count can still show next up without TVMaze',()=>{
  const anime={type:'anime',pages:3,season:1,episode:1,watchedEpisodes:null};
  assert.deepEqual(core.episodeList(anime).map(ep=>ep.number),[1,2,3]);
  assert.equal(core.progress(anime).next.number,2);
});

test('people insights come from personal watch events and deduplicate a cast credit',()=>{
  const items=[{id:'a',type:'movie',creator:'Jane Director',cast:[{name:'Alex Actor'},{name:'Alex Actor'}]}];
  const events=[{titleId:'a',mediaType:'movie',eventType:'movie_watched',watchedAt:'2026-09-20T10:00:00Z',runtimeMinutes:90}];
  assert.deepEqual(core.peopleStats(events,items),{actors:[{name:'Alex Actor',count:1}],creators:[{name:'Jane Director',count:1}]});
});
