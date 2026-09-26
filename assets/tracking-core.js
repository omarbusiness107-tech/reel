(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ReelTrackingCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const key=(season,episode)=>`${Number(season)}:${Number(episode)}`;
  const validDate=value=>{const n=Date.parse(value);return Number.isFinite(n)?n:null};
  const episodeList=(title,at=Date.now())=>{
    const details=Array.isArray(title.episodeCatalog)?title.episodeCatalog:[];
    const byKey=new Map(details.map(ep=>[key(ep.season,ep.number),ep]));
    const guide=Array.isArray(title.seasonGuide)?title.seasonGuide:title.type==='anime'&&Number(title.pages)>0?[{number:1,episodes:Array.from({length:Math.min(10000,Math.floor(Number(title.pages)))},(_,i)=>i+1)}]:[];
    return guide.flatMap(season=>
      (season.episodes||[]).map(number=>{
        const detail=byKey.get(key(season.number,number))||{};
        return {season:Number(season.number),number:Number(number),title:detail.title||'',airdate:detail.airdate||'',airstamp:detail.airstamp||'',runtime:Number(detail.runtime)||null,summary:detail.summary||'',image:detail.image||''};
      })
    ).filter(ep=>{
      const date=validDate(ep.airstamp||ep.airdate);
      return date===null||date<=at;
    }).sort((a,b)=>a.season-b.season||a.number-b.number);
  };
  const baselineKeys=title=>{
    if(Array.isArray(title.watchedEpisodes))return [...new Set(title.watchedEpisodes.map(String))];
    const season=Number(title.season)||1,episode=Number(title.episode)||0;
    return episodeList(title).filter(ep=>ep.season<season||(ep.season===season&&ep.number<=episode)).map(ep=>key(ep.season,ep.number));
  };
  const watchedSet=title=>new Set(baselineKeys(title));
  const progress=title=>{
    const episodes=episodeList(title),seen=watchedSet(title),watched=episodes.filter(ep=>seen.has(key(ep.season,ep.number))).length;
    return {watched,total:episodes.length,percent:episodes.length?Math.round(watched/episodes.length*100):0,next:episodes.find(ep=>!seen.has(key(ep.season,ep.number)))||null};
  };
  const seasonProgress=(title,season)=>{
    const episodes=episodeList(title).filter(ep=>ep.season===Number(season)),seen=watchedSet(title);
    return {watched:episodes.filter(ep=>seen.has(key(ep.season,ep.number))).length,total:episodes.length};
  };
  const eventDate=event=>validDate(event.watchedAt||event.watched_at);
  const watchEvents=events=>(events||[]).filter(event=>['movie_watched','episode_watched','rewatch'].includes(event.eventType||event.event_type)&&eventDate(event)!==null);
  const dayKey=(date,timezone)=>{
    const d=new Date(date);
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone||Intl.DateTimeFormat().resolvedOptions().timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
    const part=type=>parts.find(row=>row.type===type)?.value||'';
    return `${part('year')}-${part('month')}-${part('day')}`;
  };
  const overview=(events,{start=-Infinity,end=Infinity,type='all',timezone}={})=>{
    const selected=watchEvents(events).filter(event=>{
      const date=eventDate(event),media=event.mediaType||event.media_type;
      return date>=start&&date<end&&(type==='all'||media===type||(type==='series'&&media==='anime'));
    });
    const movies=selected.filter(event=>(event.mediaType||event.media_type)==='movie').length;
    const episodes=selected.filter(event=>['series','anime'].includes(event.mediaType||event.media_type)).length;
    const known=selected.filter(event=>Number(event.runtimeMinutes??event.runtime_minutes)>0);
    const minutes=known.reduce((sum,event)=>sum+Number(event.runtimeMinutes??event.runtime_minutes),0);
    const days=new Set(selected.map(event=>dayKey(eventDate(event),timezone)));
    return {events:selected,movies,episodes,minutes,knownRuntimes:known.length,unknownRuntimes:selected.length-known.length,activeDays:days.size};
  };
  const series=(events,{start,end,metric='minutes',unit='day',timezone}={})=>{
    const buckets=new Map();
    for(const event of overview(events,{start,end,timezone}).events){
      const date=new Date(eventDate(event)),day=dayKey(date,timezone),bucket=unit==='month'?day.slice(0,7):unit==='week'?day.slice(0,7)+' W'+Math.ceil(date.getDate()/7):day;
      const value=metric==='movies'?(event.mediaType||event.media_type)==='movie'?1:0:metric==='episodes'?['series','anime'].includes(event.mediaType||event.media_type)?1:0:Number(event.runtimeMinutes??event.runtime_minutes)||0;
      buckets.set(bucket,(buckets.get(bucket)||0)+value);
    }
    return [...buckets].sort(([a],[b])=>a.localeCompare(b)).map(([label,value])=>({label,value}));
  };
  const upcoming=(titles,{at=Date.now(),days=90}={})=>{
    const end=at+days*86400000;
    return (titles||[]).filter(it=>['series','anime'].includes(it.type)).flatMap(it=>(it.episodeCatalog||[]).map(ep=>{
      const date=validDate(ep.airstamp||ep.airdate);
      return date!==null&&date>at&&date<=end?{title:it,episode:ep,date}:null;
    }).filter(Boolean)).sort((a,b)=>a.date-b.date);
  };
  const genreStats=(events,titles,options={})=>{
    const byId=new Map((titles||[]).map(item=>[item.id,item]));
    const counts=new Map();
    for(const event of overview(events,options).events){
      for(const genre of byId.get(event.titleId||event.user_title_id)?.genres||[]){
        const name=String(genre).trim();if(name)counts.set(name,(counts.get(name)||0)+1);
      }
    }
    return [...counts].sort((a,b)=>b[1]-a[1]).map(([genre,count])=>({genre,count}));
  };
  const activityDays=(events,options={})=>{
    const days=new Map();
    for(const event of overview(events,options).events){const day=dayKey(eventDate(event),options.timezone);days.set(day,(days.get(day)||0)+1);}
    return days;
  };
  const peopleStats=(events,titles,options={})=>{
    const byId=new Map((titles||[]).map(item=>[item.id,item])),actors=new Map(),creators=new Map();
    const add=(map,value)=>{
      const name=String(typeof value==='string'?value:value?.name||'').trim();
      if(name)map.set(name,(map.get(name)||0)+1);
    };
    for(const event of overview(events,options).events){
      const item=byId.get(event.titleId||event.user_title_id);if(!item)continue;
      const seen=new Set();
      for(const person of item.cast||[]){
        const name=String(typeof person==='string'?person:person?.name||'').trim();
        if(name&&!seen.has(name)){add(actors,name);seen.add(name);}
      }
      if(item.type==='movie'&&item.creator)add(creators,item.creator);
    }
    const ranked=map=>[...map].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([name,count])=>({name,count}));
    return {actors:ranked(actors),creators:ranked(creators)};
  };
  return {key,episodeList,baselineKeys,watchedSet,progress,seasonProgress,overview,series,upcoming,genreStats,peopleStats,activityDays,dayKey};
});
