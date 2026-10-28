(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./anime-arcs.js'):root.ReelAnimeArcs);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ReelTrackingCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(animeArcs){
  'use strict';
  const key=(season,episode)=>`${Number(season)}:${Number(episode)}`;
  const resetProgress=()=>({status:'want',season:1,episode:0,chapter:0,page:0,stoppedAtSec:0,watchedEpisodes:[],startedAt:null,finished:null,completedAt:null});
  const validDate=value=>{const n=Date.parse(value);return Number.isFinite(n)?n:null};
  const animeProfile=title=>animeArcs?.profile(title)||null;
  const continuousAnime=title=>!!(animeProfile(title)||(title.type==='anime'&&(title.continuousEpisodeKeys||title.seasonGuide?.some(season=>Number(season.number)>=1900))));
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
    }).sort((a,b)=>a.season-b.season||a.number-b.number).map((ep,index)=>continuousAnime(title)?{...ep,absoluteNumber:index+1}:ep);
  };
  const episodeNumber=(title,season=title.season,number=title.episode)=>{
    if(!continuousAnime(title))return Number(number)||0;
    if(!Number(number))return episodeList(title).filter(ep=>ep.season<Number(season)).length;
    return episodeList(title).find(ep=>ep.season===Number(season)&&ep.number===Number(number))?.absoluteNumber||0;
  };
  const episodeLabel=(title,season,number)=>continuousAnime(title)?`E${episodeNumber(title,season,number)}`:`S${season} E${number}`;
  const episodeGroups=title=>{
    const episodes=episodeList(title),profile=animeProfile(title);
    if(!continuousAnime(title))return [...new Set(episodes.map(ep=>ep.season))].map(season=>({id:`season-${season}`,season,label:`Season ${season}`,episodes:episodes.filter(ep=>ep.season===season)}));
    const groups=[];
    for(const ep of episodes){
      const arc=profile?.arcs.find(([,start,end])=>ep.absoluteNumber>=start&&(end==null||ep.absoluteNumber<=end));
      const name=arc?.[0]||(profile?'Additional episodes':'Episode guide');
      const previous=groups.at(-1);
      if(previous&&previous.label===name){previous.episodes.push(ep);if(!arc)previous.end=ep.absoluteNumber;}
      else groups.push({id:`arc-${ep.absoluteNumber}`,label:name,start:arc?.[1]||ep.absoluteNumber,end:arc?.[2]??(arc?null:ep.absoluteNumber),episodes:[ep],source:profile?.source});
    }
    return groups;
  };
  // Numeric progress is an undated baseline, never fabricated watch-history events.
  const cursorProgress=(title,{season=title.season,episode=title.episode}={})=>{
    const episodes=episodeList(title),absolute=continuousAnime(title);
    const value=Math.max(0,Math.floor(Number(episode)||0));
    let rows;
    if(absolute)rows=episodes.slice(0,value);
    else{
      const available=[...new Set(episodes.map(ep=>ep.season))];
      season=available.filter(n=>n<=Number(season)).at(-1)||available[0]||1;
      rows=episodes.filter(ep=>ep.season<season||ep.season===season&&ep.number<=value);
    }
    const last=rows.at(-1);
    return {season:absolute?(last?.season||episodes[0]?.season||1):season,
      episode:absolute?(last?.number||0):(rows.filter(ep=>ep.season===season).at(-1)?.number||0),
      watchedEpisodes:rows.map(ep=>key(ep.season,ep.number))};
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
  // Group before pagination so one title's daily reading never splits across cards.
  const correctReading=(events,titleId,mediaType,target)=>{
    const field=mediaType==='book'?'page':'chapter';
    return events.flatMap(event=>{
      if(event.titleId!==titleId||event.mediaType!==mediaType||Number(event[field])<=target)return [event];
      if(target===0||Number(event.readingStart)>target)return [];
      return [{...event,[field]:target}];
    });
  };
  const readingDays=(events,{timezone}={})=>{
    const groups=new Map(),rows=[];
    for(const event of [...(events||[])].sort((a,b)=>Date.parse(b.watchedAt)-Date.parse(a.watchedAt))){
      if(!['manga','manhwa','book'].includes(event.mediaType)||!event.watchedAt){rows.push(event);continue;}
      const id=JSON.stringify([dayKey(event.watchedAt,timezone),event.titleId,event.mediaType]);
      const end=Number(event.page??event.chapter),start=Number(event.readingStart)||end;
      let group=groups.get(id);
      if(!group){group={...event,readingStart:start,readingEnd:end,sessions:[]};groups.set(id,group);rows.push(group);}
      group.readingStart=Math.min(group.readingStart,start);group.readingEnd=Math.max(group.readingEnd,end);group.sessions.push(event);
    }
    return rows;
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
  const upcoming=(titles,{at=Date.now(),days=90,trackedOnly=false}={})=>{
    const end=at+days*86400000;
    const seen=new Set(),rows=[];
    for(const title of titles||[]){
      if(trackedOnly&&!['going','done','waiting'].includes(title.status))continue;
      const releases=[...(title.releaseCatalog||[]),...(title.episodeCatalog||[]).map(episode=>({kind:'episode',season:episode.season,number:episode.number,name:episode.title,date:episode.airstamp||episode.airdate,episode}))];
      if(title.releaseDate||title.premiered)releases.push({kind:title.type==='movie'?'movie':title.type==='book'?'book':'premiere',date:title.releaseDate||title.premiered,name:title.title,targetId:title.wd||title.releaseProvider?.wd||title.id});
      for(const release of releases){
        // Partial years/months are not release dates. Date-only values belong to the user's local day.
        const value=release.date;
        if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value))continue;
        const date=validDate(value.length===10?value+'T00:00:00':value);
        if(date===null||date<=at||date>end)continue;
        const identity=JSON.stringify([release.targetId||title.id,release.kind,release.season||0,release.number||0,value.slice(0,10)]);
        if(seen.has(identity))continue;
        // Episode 1 already communicates a season premiere; don't repeat it as a separate release.
        if(release.kind==='season'&&(title.episodeCatalog||[]).some(ep=>Number(ep.season)===Number(release.season)&&Number(ep.number)===1&&String(ep.airdate||ep.airstamp).slice(0,10)===value.slice(0,10)))continue;
        seen.add(identity);rows.push({title,release,episode:release.episode,date});
      }
    }
    return rows.sort((a,b)=>a.date-b.date||String(a.release.name||a.title.title).localeCompare(String(b.release.name||b.title.title)));
  };
  const upcomingTitles=(titles,options={})=>{
    const groups=new Map();
    for(const row of upcoming(titles,options)){
      const id=row.title.id||row.title.title;
      if(!groups.has(id))groups.set(id,{...row,releases:[]});
      groups.get(id).releases.push(row);
    }
    return [...groups.values()];
  };
  const undatedReleases=(titles,{trackedOnly=false,at=Date.now()}={})=>{
    const dated=new Set(upcoming(titles,{trackedOnly,at,days:365}).map(row=>row.title));
    const seen=new Set();
    return (titles||[]).filter(title=>!trackedOnly||['going','done','waiting'].includes(title.status)).flatMap(title=>{
    const announced=(title.releaseCatalog||[]).filter(release=>{
      if(!release.announced||release.date||release.window&&release.window<new Date(at).toISOString().slice(0,release.window.length))return false;
      if(release.kind==='season'&&(title.episodeCatalog||[]).some(ep=>Number(ep.season)===Number(release.season)&&ep.airdate))return false;
      const id=JSON.stringify([release.targetId||title.id,release.kind,release.season||0]);
      if(seen.has(id))return false;seen.add(id);return true;
    });
    if(announced.length)return announced.map(release=>({title,release,confirmed:true}));
    if(!dated.has(title)&&['manga','manhwa'].includes(title.type)&&/^(current|running|releasing|unreleased)$/i.test(title.releaseShowStatus||title.showStatus||''))
      return [{title,release:{kind:'chapter',source:'Kitsu'},confirmed:false}];
    return [];
    });
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
  return {key,resetProgress,animeProfile,continuousAnime,episodeNumber,episodeLabel,episodeGroups,cursorProgress,episodeList,baselineKeys,watchedSet,progress,seasonProgress,overview,series,upcoming,upcomingTitles,undatedReleases,genreStats,peopleStats,activityDays,dayKey,readingDays,correctReading};
});
