(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ReelReleaseData=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const preciseDates=claims=>(claims?.P577||[]).filter(c=>c.rank!=='deprecated').map(c=>c.mainsnak?.datavalue?.value).filter(v=>v?.precision>=11&&/^\+\d{4}-\d{2}-\d{2}T/.test(v.time)).map(v=>v.time.slice(1,11));
  const idClaim=(claims,key)=>(claims?.[key]||[]).filter(c=>c.rank!=='deprecated').map(c=>c.mainsnak?.datavalue?.value?.id).filter(id=>/^Q\d+$/.test(id));
  async function discover(item,json){
    const releases=[];
    Object.defineProperty(releases,'warnings',{value:[]});
    const kitsu=item.type==='anime'?(item.tvmaze?null:item.kitsu):item.kitsuManga||/^kitsu-manga:(\d+)$/.exec(item.catalogId||'')?.[1];
    if(kitsu&&['anime','manga','manhwa'].includes(item.type)){
      const kind=item.type==='anime'?'anime':'manga',base=`https://kitsu.io/api/edge/${kind}/${encodeURIComponent(kitsu)}`;
      const media=await json(base),attributes=media.data?.attributes||{};
      item.releaseShowStatus=attributes.status||'';
      if(attributes.startDate)releases.push({kind:'premiere',date:attributes.startDate,name:attributes.canonicalTitle||item.title,source:'Kitsu'});
      // Use dated provider records only. Never extrapolate a weekly chapter schedule.
      let url=base+(kind==='anime'?'/episodes':'/chapters')+'?page[limit]=20&sort=-number',pages=0;
      while(url&&pages++<10){
        let data;
        try{data=await json(url);}catch(error){releases.warnings.push('Kitsu chapter or episode schedule unavailable');break;}
        for(const row of data.data||[]){const a=row.attributes||{};releases.push({kind:kind==='anime'?'episode':'chapter',season:kind==='anime'?(a.seasonNumber||1):undefined,number:a.number,name:a.canonicalTitle||'',date:a.airdate||a.published,source:'Kitsu',targetId:`kitsu-${kind}-${kitsu}:${row.id}`});}
        const next=data.links?.next;
        url=typeof next==='string'&&next.startsWith('https://kitsu.io/api/edge/')?next:null;
      }
    }
    if(/^Q\d+$/.test(item.wd||'')&&['movie','book'].includes(item.type)){
      const entities=async ids=>(await json('https://www.wikidata.org/w/api.php?action=wbgetentities&props=claims%7Clabels&languages=en%7Cfr%7Car&format=json&origin=*&ids='+ids.join('%7C'))).entities||{};
      const initial=(await entities([item.wd]))[item.wd];
      const all={[item.wd]:initial},targets=new Set([item.wd]);
      // Follow documented successors past already-released sequels, with cycle and request bounds.
      let frontier=idClaim(initial?.claims,'P156');
      for(let depth=0;frontier.length&&depth<8;depth++){
        const ids=frontier.filter(id=>!targets.has(id)).slice(0,40);
        if(!ids.length)break;
        ids.forEach(id=>targets.add(id));
        let next;
        try{next=await entities(ids);}catch(error){releases.warnings.push('Successor lookup unavailable');break;}
        Object.assign(all,next);
        frontier=Object.values(next).flatMap(entity=>idClaim(entity?.claims,'P156'));
      }
      for(const collection of idClaim(initial?.claims,'P179')){
        // Collection membership is authoritative, not a fuzzy title search.
        const query=`SELECT DISTINCT ?item WHERE { ?item wdt:P179 wd:${collection} . ?item wdt:P577 ?date . FILTER(?date > NOW()) } LIMIT 100`;
        let data;
        try{data=await json('https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(query));}
        catch(error){releases.warnings.push('Collection lookup unavailable');continue;}
        for(const row of data.results?.bindings||[]){const id=row.item?.value?.split('/').pop();if(/^Q\d+$/.test(id||''))targets.add(id);}
      }
      const ids=[...targets].filter(id=>!all[id]);
      for(let i=0;i<ids.length;i+=40){
        try{Object.assign(all,await entities(ids.slice(i,i+40)));}
        catch(error){releases.warnings.push('Collection release dates unavailable');}
      }
      for(const [id,entity] of Object.entries(all)){
        if(!entity)continue;
        const dates=preciseDates(entity.claims).sort();
        // Earliest known release, not a later reissue mistaken for a new film/book.
        if(dates.length)releases.push({kind:item.type,date:dates[0],name:entity.labels?.en?.value||entity.labels?.fr?.value||entity.labels?.ar?.value||item.title,targetId:id,source:'Wikidata'});
        else{
          const windows=(entity.claims?.P577||[]).filter(c=>c.rank!=='deprecated').map(c=>c.mainsnak?.datavalue?.value).filter(v=>v?.precision>=9&&v.precision<11&&/^\+\d{4}-/.test(v.time)).map(v=>v.time.slice(1,v.precision===9?5:8)).sort();
          if(windows.length&&windows[0]>=new Date().toISOString().slice(0,windows[0].length))releases.push({kind:item.type,date:'',announced:true,window:windows[0],name:entity.labels?.en?.value||item.title,targetId:id,source:'Wikidata'});
        }
      }
    }
    return releases;
  }
  return {discover,preciseDates};
});
