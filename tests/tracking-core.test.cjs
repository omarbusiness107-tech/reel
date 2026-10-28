const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../assets/tracking-core.js');

const yearAnime=()=>({type:'anime',title:'One Piece',year:1999,tvmaze:1505,season:1999,episode:2,
  seasonGuide:[{number:1999,episodes:Array.from({length:8},(_,i)=>i+1)},{number:2000,episodes:Array.from({length:60},(_,i)=>i+1)}]});
test('continuous anime hides calendar-year numbering without changing saved episode identities',()=>{
  const title=yearAnime();
  assert.equal(core.continuousAnime(title),true);assert.equal(core.episodeNumber(title),2);
  assert.deepEqual(core.baselineKeys(title),['1999:1','1999:2']);
  assert.equal(core.episodeNumber(title,2000,1),9);assert.equal(core.episodeLabel(title,2000,2),'E10');
  assert.equal(core.episodeGroups(title)[0].label,'East Blue');
  assert.deepEqual(core.episodeGroups(title).map(group=>[group.start,group.end]),[[1,61],[62,130]]);
});
test('episode cursor checks preceding episodes, supports corrections and clamps to released episodes',()=>{
  const title=yearAnime();
  Object.assign(title,core.cursorProgress(title,{episode:65}));
  assert.deepEqual([title.season,title.episode,title.watchedEpisodes.length],[2000,57,65]);
  Object.assign(title,core.cursorProgress(title,{episode:10}));
  assert.deepEqual([title.season,title.episode,title.watchedEpisodes.length],[2000,2,10]);
  assert.equal(title.watchedEpisodes.includes('2000:57'),false);
  assert.equal(core.cursorProgress(title,{episode:9999}).watchedEpisodes.length,68);
  Object.assign(title,core.cursorProgress(title,{episode:0}));
  assert.equal(core.progress(title).watched,0);assert.equal(core.episodeNumber(title),0);
});
test('arcs cover every episode exactly once, including additional episodes and future extensions',()=>{
  const title={type:'anime',title:'One Piece',year:1999,pages:1180};
  const groups=core.episodeGroups(title),numbers=groups.flatMap(group=>group.episodes.map(ep=>ep.absoluteNumber));
  assert.equal(numbers.length,1180);assert.equal(new Set(numbers).size,1180);
  assert.equal(groups.find(group=>group.start===131).label,'Additional episodes');
  assert.equal(groups.at(-1).label,'Elbaph');assert.equal(groups.at(-1).end,null);
  title.pages=1181;assert.equal(core.episodeGroups(title).at(-1).episodes.at(-1).absoluteNumber,1181);
});
test('Naruto uses arcs; season-based anime and similarly named adaptations keep seasons',()=>{
  assert.equal(core.episodeGroups({type:'anime',title:'Naruto',year:2002,pages:220})[2].label,'Chunin Exams');
  const shippuden=core.episodeGroups({type:'anime',title:'Naruto: Shippūden',year:2007,pages:500});
  assert.equal(shippuden[0].label,'Kazekage Rescue');assert.equal(shippuden.at(-1).end,500);
  assert.equal(new Set(shippuden.flatMap(group=>group.episodes.map(ep=>ep.absoluteNumber))).size,500);
  for(const title of [{type:'anime',title:'Jujutsu Kaisen',year:2020},{type:'anime',title:'My Hero Academia',year:2016},
    {type:'series',title:'One Piece',year:2023,tvmaze:46065},{type:'anime',title:'The One Piece',year:2026}])assert.equal(core.continuousAnime(title),false);
  const title={type:'anime',title:'Jujutsu Kaisen',season:1,episode:1,seasonGuide:[{number:1,episodes:[1,2]},{number:2,episodes:[1,2]}]};
  assert.deepEqual(core.cursorProgress(title,{season:2,episode:1}),{season:2,episode:1,watchedEpisodes:['1:1','1:2','2:1']});
  assert.deepEqual(core.cursorProgress(title,{season:1,episode:1}).watchedEpisodes,['1:1']);
});

test('reset progress clears personal cursors but retains ratings, notes, title facts and History',()=>{
  const item={title:'Example',rating:8,notes:'Keep',pages:300,chapters:400,status:'done',season:5,episode:12,page:200,chapter:258,stoppedAtSec:123,watchedEpisodes:['1:1'],finished:1};
  Object.assign(item,core.resetProgress());
  assert.deepEqual([item.status,item.season,item.episode,item.page,item.chapter,item.stoppedAtSec],['want',1,0,0,0,0]);
  assert.deepEqual(item.watchedEpisodes,[]);assert.equal(item.finished,null);
  assert.deepEqual([item.rating,item.notes,item.pages,item.chapters],[8,'Keep',300,400]);
  assert.notEqual(core.resetProgress().watchedEpisodes,core.resetProgress().watchedEpisodes,'resets do not share mutable state');
});

test('reading corrections trim ranges and remove unread sessions without touching other titles',()=>{
  const events=[{id:'old',titleId:'m',mediaType:'manga',chapter:200,readingStart:1,watchedAt:'2026-10-05T10:00:00Z'},
    {id:'range',titleId:'m',mediaType:'manga',chapter:258,readingStart:201,watchedAt:'2026-10-06T10:00:00Z'},
    {id:'later',titleId:'m',mediaType:'manga',chapter:259,readingStart:259,watchedAt:'2026-10-06T11:00:00Z'},
    {id:'other',titleId:'other',mediaType:'manga',chapter:300,readingStart:1,watchedAt:'2026-10-06T11:00:00Z'}];
  const corrected=core.correctReading(events,'m','manga',255);
  assert.deepEqual(corrected.map(e=>e.id),['old','range','other']);
  assert.equal(corrected[1].chapter,255);assert.equal(events[1].chapter,258);
  assert.equal(core.readingDays(corrected,{timezone:'UTC'}).find(e=>e.id==='range').readingEnd,255);
  assert.equal(core.correctReading(corrected,'m','manga',0).length,1);
  assert.equal(core.correctReading([{titleId:'b',mediaType:'book',page:258,readingStart:4}],'b','book',255)[0].page,255);
});

test('daily reading groups chapter and page ranges by local day and title',()=>{
  const events=[
    {id:'a',titleId:'m',mediaType:'manga',chapter:13,readingStart:11,watchedAt:'2026-10-05T10:00:00Z'},
    {id:'b',titleId:'m',mediaType:'manga',chapter:16,readingStart:14,watchedAt:'2026-10-05T20:00:00Z'},
    {id:'c',titleId:'m',mediaType:'manga',chapter:17,readingStart:17,watchedAt:'2026-10-06T10:00:00Z'},
    {id:'d',titleId:'book',mediaType:'book',page:20,readingStart:1,watchedAt:'2026-10-05T10:00:00Z'},
    {id:'e',titleId:'book',mediaType:'book',page:40,readingStart:21,watchedAt:'2026-10-05T20:00:00Z'},
    {id:'f',titleId:'movie',mediaType:'movie',watchedAt:'2026-10-05T20:00:00Z'}
  ];
  const rows=core.readingDays(events,{timezone:'UTC'});
  assert.equal(rows.length,4);
  const manga=rows.find(row=>row.sessions?.length===2&&row.mediaType==='manga');
  assert.equal(manga.readingStart,11);assert.equal(manga.readingEnd,16);assert.equal(manga.id,'b');
  const book=rows.find(row=>row.mediaType==='book');
  assert.equal(book.readingStart,1);assert.equal(book.readingEnd,40);assert.equal(book.sessions.length,2);
  assert.equal(events[0].sessions,undefined,'grouping must not mutate stored events');
});

test('legacy endpoints and timezone midnight boundaries are kept accurate',()=>{
  const events=[{titleId:'m',mediaType:'manga',chapter:12,watchedAt:'2026-10-05T23:30:00Z'},{titleId:'m',mediaType:'manga',chapter:14,watchedAt:'2026-10-06T00:30:00Z'}];
  assert.equal(core.readingDays(events,{timezone:'UTC'}).length,2);
  const rows=core.readingDays(events,{timezone:'Africa/Casablanca'});
  assert.equal(rows.length,1);assert.equal(rows[0].readingStart,12);assert.equal(rows[0].readingEnd,14);
});

test('reading history does not inflate movie, episode, or viewing-time statistics',()=>{
  const result=core.overview([{eventType:'chapter_read',mediaType:'manga',chapter:13,watchedAt:'2026-10-05T12:00:00Z',runtimeMinutes:null}]);
  assert.equal(result.movies,0);assert.equal(result.episodes,0);assert.equal(result.minutes,0);assert.equal(result.unknownRuntimes,0);
});

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

test('upcoming covers every media type, seasons and sequels, with a status-only toggle',()=>{
  const at=Date.parse('2026-10-01T00:00:00Z'),date='2026-10-12';
  const items=[
    {id:'movie',title:'First film',type:'movie',status:'done',releaseCatalog:[{kind:'movie',name:'Sequel',targetId:'Q2',date}]},
    {id:'manga',type:'manga',status:'going',releaseCatalog:[{kind:'chapter',number:300,date}]},
    {id:'manhwa',type:'manhwa',status:'waiting',releaseCatalog:[{kind:'chapter',number:12,date}]},
    {id:'book',type:'book',status:'want',releaseDate:date},
    {id:'anime',type:'anime',status:'paused',releaseCatalog:[{kind:'season',season:2,date}]},
    {id:'series',type:'series',status:'dropped',episodeCatalog:[{season:2,number:1,airdate:date}]}
  ];
  assert.equal(core.upcoming(items,{at}).length,6);
  assert.deepEqual(new Set(core.upcoming(items,{at,trackedOnly:true}).map(row=>row.title.id)),new Set(['movie','manga','manhwa']));
});

test('upcoming deduplicates seasons and same sequels across library entries and rejects partial dates',()=>{
  const at=Date.parse('2026-10-01'),date='2026-10-12';
  const sequel={kind:'movie',targetId:'Q100',date};
  const items=[{id:'a',type:'movie',releaseCatalog:[sequel,{kind:'movie',date:'2027'},{kind:'movie',date:'2026-11'}]},
    {id:'b',type:'movie',releaseCatalog:[sequel]},
    {id:'c',type:'series',releaseCatalog:[{kind:'season',season:2,date}],episodeCatalog:[{season:2,number:1,airdate:date}]}];
  assert.equal(core.upcoming(items,{at}).length,2);
});

test('release discovery uses exact provider IDs, paginates chapter records and accepts only precise movie dates',async()=>{
  const provider=require('../assets/release-data.js');
  const claim=(time,precision=11)=>({mainsnak:{datavalue:{value:{time,precision}}}});
  assert.deepEqual(provider.preciseDates({P577:[claim('+2027-01-01T00:00:00Z',9),claim('+2027-03-12T00:00:00Z')]}),['2027-03-12']);
  const urls=[];
  const chapters=await provider.discover({type:'manhwa',catalogId:'kitsu-manga:123',title:'Example'},async url=>{
    urls.push(url);
    return url.endsWith('/123')?{data:{attributes:{startDate:'2020-01-01'}}}:url.endsWith('page2')?{data:[{id:'c2',attributes:{number:21,published:'2027-01-12'}}]}:{data:[{id:'c1',attributes:{number:20,published:'2027-01-05'}}],links:{next:'https://kitsu.io/api/edge/page2'}};
  });
  assert.equal(chapters.filter(row=>row.kind==='chapter').length,2);assert.equal(urls.length,3);
  const movies=await provider.discover({type:'movie',wd:'Q1',title:'First'},async url=>({entities:url.endsWith('ids=Q2')?{Q2:{claims:{P577:[claim('+2027-06-01T00:00:00Z')]},labels:{en:{value:'Second'}}}}:{Q1:{claims:{P156:[{mainsnak:{datavalue:{value:{id:'Q2'}}}}]}}}}));
  assert.equal(movies.find(row=>row.targetId==='Q2').name,'Second');
});

test('upcoming preview groups busy shows without hiding other library titles',()=>{
  const at=Date.parse('2026-10-01');
  const shows=[{id:'tulsa',type:'series',episodeCatalog:Array.from({length:10},(_,i)=>({season:4,number:i+1,airdate:`2026-10-${String(10+i).padStart(2,'0')}`}))},{id:'other',type:'book',releaseDate:'2026-11-01'}];
  const rows=core.upcomingTitles(shows,{at});
  assert.deepEqual(rows.map(row=>row.title.id),['tulsa','other']);
  assert.equal(rows[0].releases.length,10);
});

test('confirmed undated seasons and unavailable manga schedules stay distinct and status-filtered',()=>{
  const at=Date.parse('2026-10-10');
  const items=[{id:'from',type:'series',status:'done',releaseCatalog:[{kind:'season',season:5,date:'',announced:true,source:'TVMaze'}]},
    {id:'berserk',type:'manga',status:'going',releaseShowStatus:'current',releaseCatalog:[{kind:'chapter',number:5000,date:null}]},
    {id:'book',type:'book',status:'want',releaseCatalog:[{kind:'book',targetId:'Q2',date:'',announced:true,window:'2027'}]},
    {id:'dated',type:'manhwa',releaseShowStatus:'current',releaseCatalog:[{kind:'chapter',number:1,date:'2026-10-12'}]}];
  const rows=core.undatedReleases(items,{at});
  assert.equal(rows.length,3);assert.equal(rows[0].release.season,5);assert.equal(rows[0].confirmed,true);
  assert.equal(rows[1].confirmed,false);assert.equal(rows[1].release.number,undefined,'do not invent the next chapter from bogus undated records');
  assert.equal(core.undatedReleases(items,{at,trackedOnly:true}).length,2);
  assert.equal(core.upcoming(items,{at}).length,1,'undated announcements do not acquire fake dates');
});

test('successor discovery follows released sequels, stops cycles, and survives collection outages',async()=>{
  const provider=require('../assets/release-data.js'),urls=[];
  const q=id=>({mainsnak:{datavalue:{value:{id}}}}),date=(time,precision=11)=>({mainsnak:{datavalue:{value:{time,precision}}}});
  const data={Q1:{claims:{P156:[q('Q2')],P179:[q('Q9')],P577:[date('+2000-01-01T00:00:00Z')]}},Q2:{claims:{P156:[q('Q3')],P577:[date('+2020-01-01T00:00:00Z')]}},Q3:{claims:{P156:[q('Q1')],P577:[date('+2027-04-02T00:00:00Z')]}}};
  const rows=await provider.discover({wd:'Q1',type:'movie'},async url=>{
    urls.push(url);if(url.includes('sparql'))throw new Error('Unavailable');
    const ids=new URL(url).searchParams.get('ids').split('|');return {entities:Object.fromEntries(ids.map(id=>[id,data[id]]))};
  });
  assert.equal(rows.find(row=>row.targetId==='Q3').date,'2027-04-02');
  assert.equal(urls.length,4,'cycle never refetches the original title');
  assert.equal(rows.warnings.length,1);
  const partial=await provider.discover({wd:'Q7',type:'book'},async()=>({entities:{Q7:{claims:{P577:[date('+2099-01-01T00:00:00Z',9)]}}}}));
  assert.equal(partial[0].date,'');assert.equal(partial[0].window,'2099');assert.equal(partial[0].announced,true);
});

test('Kitsu missing publication dates retain ongoing status without fabricating chapter dates',async()=>{
  const provider=require('../assets/release-data.js'),item={type:'manga',kitsuManga:8};
  const rows=await provider.discover(item,async url=>url.endsWith('/8')?{data:{attributes:{status:'current'}}}:{data:[{id:'bogus',attributes:{number:5000,published:null}}]});
  assert.equal(item.releaseShowStatus,'current');assert.equal(core.upcoming([{...item,releaseCatalog:rows}]).length,0);
  assert.equal(core.undatedReleases([{...item,releaseCatalog:rows}])[0].confirmed,false);
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
