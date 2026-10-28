const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../assets/search-core.js');
test('exact primary works outrank franchise films with artificial search-order popularity',()=>{
  const anime={title:'Jujutsu Kaisen',type:'anime',year:2020,userCount:1000000,popularityRank:10,sourceName:'Kitsu'};
  const film={title:'Jujutsu Kaisen 0',type:'movie',year:2021,popularity:112,sourceName:'Wikipedia'};
  assert.equal([film,anime].sort((a,b)=>core.compare(a,b,'jujutsu kaisen'))[0],anime);
  assert.equal(core.popularity(film),0);assert.ok(core.popularity(anime)>0);
  assert.equal(core.exactMatch({title:'Other',alternativeTitles:['Real Title'],type:'anime'},'real title'),true);
});
test('anime spelling and diacritic variants deduplicate across providers',()=>{
  const kitsu={title:'Naruto: Shippuuden',type:'anime',year:2007,kitsu:'1555',catalogId:'kitsu-anime:1555',userCount:400000,alternativeTitles:['Naruto Shippuden']};
  const tv={title:'Naruto: Shippūden',type:'anime',year:2007,tvmaze:488,catalogId:'tvmaze:488'};
  const merged=core.dedupe([tv,kitsu]);
  assert.equal(merged.length,1);assert.equal(merged[0],kitsu);
  assert.ok(core.identities(merged[0]).has('tvmaze:488'));assert.ok(core.identities(merged[0]).has('kitsu-anime:1555'));
  assert.equal(core.dedupe([tv,kitsu]).length,1,'repeated merges are idempotent');
});
test('alternate titles merge localized names without a title-specific exception',()=>{
  const a={title:'呪術廻戦',alternativeTitles:['Jujutsu Kaisen'],type:'anime',year:2020,kitsu:10};
  const b={title:'Jujutsu Kaisen',type:'anime',year:2020,tvmaze:20};
  assert.equal(core.dedupe([a,b]).length,1);
  assert.equal(core.dedupe([{title:'Future Example',type:'series',year:2027,tvmaze:25},{title:'Another Name',alternativeTitles:['Future Example'],type:'series',year:2027,wd:'Q25'}]).length,1);
});
test('movies, manga, sequels, remakes and ambiguous undated works remain separate',()=>{
  const first={title:'Example',type:'anime',year:2020,kitsu:1};
  for(const other of [{title:'Example',type:'movie',year:2020,wd:'Q1'},
    {title:'Example',type:'manga',year:2020,kitsuManga:1},
    {title:'Example',type:'anime',year:2023,kitsu:2},
    {title:'Example',type:'anime',year:2020,kitsu:2},
    {title:'Example',type:'anime',tvmaze:9}])assert.equal(core.dedupe([first,other]).length,2);
});
test('animated movie records and the same film from another provider merge, not the TV anime',()=>{
  const film={title:'Example 0',type:'anime',format:'movie',year:2021,kitsu:2};
  const wiki={title:'Example 0',type:'movie',year:2021,wd:'Q2'};
  assert.equal(core.dedupe([film,wiki]).length,1);
  assert.equal(core.dedupe([film,{title:'Example 0',type:'anime',year:2021,tvmaze:2}]).length,2);
});
test('saved record identity and all private state survive public enrichment',()=>{
  const saved={id:'mine',title:'Example',type:'anime',year:2020,tvmaze:1,catalogId:'tvmaze:1',episode:12,status:'going',notes:'Keep',rating:9,watchedEpisodes:['1:1'],cover:'my-cover'};
  const publicRecord={title:'Example',type:'anime',year:2020,kitsu:2,userCount:100000,cover:'public-cover'};
  const result=core.dedupe([publicRecord,saved],{preferred:new Set([saved])});
  assert.equal(result[0],saved);assert.equal(saved.episode,12);assert.equal(saved.notes,'Keep');assert.equal(saved.cover,'my-cover');
  assert.deepEqual(saved.watchedEpisodes,['1:1']);assert.ok(core.identities(saved).has('kitsu-anime:2'));
});
test('unknown, non-finite and negative popularity do not win; equal scores stay deterministic',()=>{
  for(const popularity of [null,undefined,Infinity,-10,NaN])assert.equal(core.popularity({popularity}),0);
  const a={title:'Star A',type:'movie',popularity:50},b={title:'Star B',type:'movie',popularity:50};
  assert.deepEqual([b,a].sort((x,y)=>core.compare(x,y,'star')),[a,b]);
  assert.ok(core.popularity({popularityRank:10})>core.popularity({popularityRank:1000}));
});
test('a later bilingual record bridges earlier aliases without leaving a duplicate',()=>{
  const records=[{title:'Example',type:'anime',year:2020,tvmaze:1},
    {title:'例',type:'anime',year:2020,wd:'Q1'},
    {title:'例',alternativeTitles:['Example'],type:'anime',year:2020,kitsu:2}];
  assert.equal(core.dedupe(records).length,1);
});
test('shared series aliases do not collapse book volumes or anime specials',()=>{
  const first={title:'Volume One',alternativeTitles:['Series'],type:'book',year:2020,seriesNumber:1};
  const second={title:'Volume Two',alternativeTitles:['Series'],type:'book',year:2020,seriesNumber:2};
  assert.equal(core.dedupe([first,second]).length,2);
  assert.equal(core.dedupe([{title:'Example',type:'anime',year:2020,tvmaze:1,format:'Animation'},
    {title:'Example',type:'anime',year:2020,kitsu:2,format:'OVA'}]).length,2);
});
test('merging providers retains credits and facts instead of discarding the second record',()=>{
  const primary={title:'Example',type:'anime',year:2020,kitsu:1,genres:[],country:'Japan'};
  const secondary={title:'Example',type:'anime',year:2020,tvmaze:2,genres:['Action'],cast:[{name:'Example Actor'}],score:8.5,country:'Other'};
  const merged=core.dedupe([primary,secondary])[0];
  assert.deepEqual(merged.genres,['Action']);assert.deepEqual(merged.cast,[{name:'Example Actor'}]);assert.equal(merged.score,8.5);assert.equal(merged.country,'Japan');
});
