const {test}=require('node:test');
const assert=require('node:assert/strict');
const art=require('../assets/detail-artwork.js');

test('detail banners accept genuine HD panoramas but reject portrait and low-resolution art',()=>{
  assert.equal(art.isLandscape(3840,2160),true);
  assert.equal(art.isLandscape(1500,500),true);
  assert.equal(art.isLandscape(1728,504),true);
  assert.equal(art.isLandscape(1000,1500),false);
  assert.equal(art.isLandscape(640,360),false);
  assert.equal(art.isLandscape(2000,200),false);
});
test('TVMaze discovery prefers the largest native background and never its portrait poster',async()=>{
  const original=(url,width,height)=>({url,width,height});
  const item={title:'From',type:'series',tvmaze:54723,status:'done',season:4,episode:10},before=structuredClone(item);
  const images=await art.discover(item,async url=>{
    assert.equal(url,'https://api.tvmaze.com/shows/54723/images');
    return [{type:'poster',resolutions:{original:original('https://example.com/poster',2700,4000)}},
      {type:'background',resolutions:{original:original('https://example.com/hd',1920,1080)}},
      {type:'background',resolutions:{original:original('https://example.com/4k',3840,2160)}},
      {type:'banner',resolutions:{original:original('https://example.com/panorama',1728,504)}}];
  });
  assert.deepEqual(images.map(row=>row.url),['https://example.com/4k','https://example.com/hd','https://example.com/panorama']);
  assert.deepEqual(item,before,'artwork discovery leaves identity and progress untouched');
});
test('ambiguous show matches are not attached to a different remake',async()=>{
  const urls=[];
  const result=await art.discover({title:'Suits',type:'series'},async url=>{
    urls.push(url);return [{show:{id:1,name:'Suits',premiered:'2011-01-01'}},{show:{id:2,name:'Suits',premiered:'2018-01-01'}}];
  });
  assert.deepEqual(result,[]);assert.equal(urls.length,1);
});
test('Kitsu uses landscape coverImage.original, never posterImage',async()=>{
  const records=await art.discover({title:'Berserk',type:'manga',kitsuManga:8},async()=>({data:{id:'8',attributes:{posterImage:{original:'https://example.com/poster'},coverImage:{original:'https://example.com/banner',meta:{dimensions:{original:{width:1500,height:500}}}}}}}));
  assert.equal(records[0].url,'https://example.com/banner');
});
test('movie backgrounds use the exact Wikidata IMDb identifier and recover provider errors safely',async()=>{
  const records=await art.discover({title:'Goblet of Fire',type:'movie',wd:'Q102244'},async url=>{
    if(url.includes('wikidata.org'))return {claims:{P345:[{mainsnak:{datavalue:{value:'tt0330373'}}}]}};
    assert.equal(url,'https://v3-cinemeta.strem.io/meta/movie/tt0330373.json');
    return {meta:{id:'tt0330373',background:'https://images.metahub.space/background/medium/tt0330373/img'}};
  });
  assert.equal(records[0].source,'Cinemeta');
  assert.deepEqual(await art.discover({type:'movie',wd:'Q102244'},async()=>{throw new Error('offline')}),[]);
  assert.deepEqual(await art.discover({type:'movie',imdb:'tt0330373'},async()=>({meta:{id:'tt0000000',background:'https://example.com/wrong'}})),[]);
});
