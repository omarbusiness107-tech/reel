(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ReelDetailArtwork=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const isLandscape=(width,height)=>width>=1280&&height>=360&&width/height>=1.3;
  const normalize=value=>String(value||'').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,' ').trim();
  const exact=(item,names,year)=>names.some(name=>normalize(name)===normalize(item.title))&&(!item.year||Number(year)===Number(item.year));
  const safeURL=value=>typeof value==='string'&&/^https:\/\//i.test(value);
  async function discover(item,json){
    const images=[];
    const add=(url,source,sourceUrl,width,height)=>{
      if(safeURL(url)&&url!==item.cover&&(!width||!height||isLandscape(width,height)))images.push({url,source,sourceUrl});
    };
    let imdb=/^tt\d+$/.test(item.imdb||'')?item.imdb:null;
    let tvmaze=item.tvmaze||/^tvmaze:(\d+)$/.exec(item.catalogId||'')?.[1];
    if(['series','anime'].includes(item.type)){
      try{
        if(!tvmaze){
          const shows=await json('https://api.tvmaze.com/search/shows?q='+encodeURIComponent(item.title));
          const matches=(shows||[]).map(row=>row.show).filter(show=>show&&exact(item,[show.name],show.premiered?.slice(0,4)));
          if(matches.length===1)tvmaze=matches[0].id;
        }
        if(tvmaze){
          const rows=await json(`https://api.tvmaze.com/shows/${encodeURIComponent(tvmaze)}/images`);
          const backgrounds=(rows||[]).filter(row=>['background','banner',null].includes(row.type)&&row.resolutions?.original)
            .sort((a,b)=>(a.type==='background'?0:1)-(b.type==='background'?0:1)||(b.resolutions.original.width*b.resolutions.original.height)-(a.resolutions.original.width*a.resolutions.original.height));
          for(const row of backgrounds.slice(0,8)){const image=row.resolutions.original;add(image.url,'TVMaze',`https://www.tvmaze.com/shows/${tvmaze}`,image.width,image.height);}
          if(!images.length&&!imdb){const show=await json(`https://api.tvmaze.com/shows/${tvmaze}`);imdb=show.externals?.imdb;}
        }
      }catch(error){/* Try another independent artwork source, without changing title identity. */}
    }
    if(['anime','manga','manhwa'].includes(item.type)){
      try{
        const kind=item.type==='anime'?'anime':'manga';
        const id=(kind==='anime'?item.kitsu:item.kitsuManga)||new RegExp(`^kitsu-${kind}:(\\d+)$`).exec(item.catalogId||'')?.[1];
        let media;
        if(id)media=(await json(`https://kitsu.io/api/edge/${kind}/${encodeURIComponent(id)}`)).data;
        else{
          const data=await json(`https://kitsu.io/api/edge/${kind}?filter[text]=${encodeURIComponent(item.title)}&page[limit]=10`);
          const matches=(data.data||[]).filter(row=>exact(item,[row.attributes?.canonicalTitle,...Object.values(row.attributes?.titles||{})],row.attributes?.startDate?.slice(0,4)));
          if(matches.length===1)media=matches[0];
        }
        const image=media?.attributes?.coverImage,dimensions=image?.meta?.dimensions?.original;
        add(image?.original,'Kitsu',`https://kitsu.app/${kind}/${media?.id}`,dimensions?.width,dimensions?.height);
      }catch(error){/* A cover image is optional; never substitute the portrait poster. */}
    }
    if(item.type==='movie'||!images.length&&['series','anime'].includes(item.type)){
      try{
        const wd=item.wd||item.releaseProvider?.wd||/^wikidata:(Q\d+)$/.exec(item.catalogId||'')?.[1];
        if(!imdb&&/^Q\d+$/.test(wd||'')){
          const data=await json(`https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&origin=*&property=P345&entity=${wd}`);
          imdb=(data.claims?.P345||[]).find(row=>row.rank!=='deprecated')?.mainsnak?.datavalue?.value;
        }
        if(/^tt\d+$/.test(imdb||'')){
          const type=item.type==='movie'?'movie':'series';
          const {meta}=await json(`https://v3-cinemeta.strem.io/meta/${type}/${imdb}.json`);
          if(meta?.id===imdb)add(meta.background,'Cinemeta',`https://www.imdb.com/title/${imdb}/`);
        }
      }catch(error){/* Missing source data stays unavailable, never invented or upscaled. */}
    }
    return [...new Map(images.map(image=>[image.url,image])).values()];
  }
  return {discover,isLandscape};
});
