(function(root){
  'use strict';
  const core=root.ReelTrackingCore;
  let api, page='library', month=new Date(), calFilter='all', statsRange='30', statsType='all', statsMetric='minutes', preparing=false, preparingHistory=false, loadingHistory=false, activityFilter='all', activityVisible=50, upcomingTrackedOnly=false, upcomingVisible=8;
  const $=(selector,scope=document)=>scope.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const dateLabel=value=>new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(new Date(value));
  const timeLabel=value=>new Intl.DateTimeFormat(undefined,{timeStyle:'short'}).format(new Date(value));
  const eventTitle=event=>api.items().find(item=>item.id===event.titleId);
  const isReading=event=>['manga','manhwa','book'].includes(event.mediaType);
  const eventPosition=event=>isReading(event)?`${event.mediaType==='book'?'Page':'Chapter'}${event.readingEnd&&event.readingEnd!==event.readingStart?'s':''} ${event.readingStart||event.page||event.chapter||'?'}${event.readingEnd&&event.readingEnd!==event.readingStart?' → '+event.readingEnd:''}`:event.mediaType==='movie'?'Watched':core.episodeLabel(eventTitle(event)||{},event.season,event.episode);
  const mediaIcon=type=>['manga','manhwa','book'].includes(type)?'book-open':type==='movie'?'film':type==='anime'?'sparkles':'tv';
  const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
  // Verified, full-resolution landscape artwork for titles whose default art is small.
  const historyArtwork=(item,event)=>{
    const title=String(item?.title||'').trim().toLocaleLowerCase();
    if(title==='the machinist'&&(!item.year||[2004,2005].includes(Number(item.year)))&&event.mediaType==='movie')
      return 'https://m.media-amazon.com/images/S/pv-target-images/047b146b27b3fe7b26392475f1c06cc49c3bb06221b637f246f5c366e944d720.png';
    if(title==='man of steel'&&(!item.year||Number(item.year)===2013)&&event.mediaType==='movie')
      return 'https://m.media-amazon.com/images/S/pv-target-images/64be2321f54e278cdb003a39b994b8e108020347494e74b4338612066dc3a89c.jpg';
    if(title==='guns akimbo'&&(!item.year||[2019,2020].includes(Number(item.year)))&&event.mediaType==='movie')
      return 'https://m.media-amazon.com/images/S/pv-target-images/f74dcd11206e4f41e09f244047c6ac440fc99a7084e3fe79bdc411c424c815f1.jpg';
    if(title==='the mentalist'&&(!item.year||Number(item.year)===2008)&&Number(event.season)===2&&Number(event.episode)===2)
      return 'https://pixel.disco.nowtv.com/uuid/fc52aec2-dc5a-4199-9971-7c3a751e4978/LAND_16_9?language=en-GB&proposition=NOWOTT&version=a0146973-97fa-384b-9a0d-2a911f3cfdd1';
    if(['f1','f1: the movie','f1 the movie'].includes(title)&&(!item.year||Number(item.year)===2025)&&event.mediaType==='movie')
      return 'https://media.formula1.com/image/upload/t_16by9Centre/c_lfill,w_3392/q_auto/v1740000001/fom-website/2025/F1%20movie/f1_movie_poster16x9%20(1).webp';
    if(title==='300'&&(!item.year||[2006,2007].includes(Number(item.year)))&&event.mediaType==='movie')
      return 'https://m.media-amazon.com/images/S/pv-target-images/a79e88ddc2aaae5edb1b64ea24f127d47c9a89da91adc4a81100f50cdb788423.jpg';
    if(title==='zodiac'&&(!item.year||Number(item.year)===2007)&&event.mediaType==='movie')
      return 'https://m.media-amazon.com/images/S/pv-target-images/f4055d476fc69bfcfba9c02703e4b70c06057edf117e207865cb370a61722787.jpg';
    return '';
  };
  const itemArt=item=>item?.cover?`<img src="${esc(item.cover)}" alt="" loading="lazy">`:`<span class="tracking-art-fallback">${esc((item?.title||'?').slice(0,1))}</span>`;
  const section=(eyebrow,title,body,aside='')=>`<div class="tracking-section-head"><div><p class="tracking-eyebrow">${eyebrow}</p><h2>${title}</h2></div>${aside}</div>${body}`;
  const releaseLabel=entry=>{
    const r=entry.release;
    const absolute=core.continuousAnime(entry.title)?[...(entry.title.episodeCatalog||[])].sort((a,b)=>a.season-b.season||a.number-b.number).findIndex(ep=>Number(ep.season)===Number(r.season)&&Number(ep.number)===Number(r.number))+1:0;
    return r.kind==='episode'?`${core.continuousAnime(entry.title)?absolute?'E'+absolute:'New episode':`S${r.season||1} E${r.number}`}${r.name?' · '+r.name:''}`:r.kind==='season'?core.continuousAnime(entry.title)?'New episodes announced':`Season ${r.season} premiere`:r.kind==='chapter'?`Chapter ${r.number}${r.name?' · '+r.name:''}`:r.kind==='premiere'?'Premiere':`${r.kind==='book'?'Book':'Movie'} release${r.name&&r.name!==entry.title.title?' · '+r.name:''}`;
  };
  const upcomingFilter=()=>`<button type="button" class="btn sm ghost" data-track-upcoming-filter aria-pressed="${upcomingTrackedOnly}" title="Show only library items marked In progress, Finished, or Caught up">${icon('list-filter')}<span>In progress · Finished · Caught up</span></button>`;
  function upcomingSection(){
    const all=core.upcomingTitles(api.items(),{days:365,trackedOnly:upcomingTrackedOnly}),rows=all.slice(0,upcomingVisible);
    const undated=core.undatedReleases(api.items(),{trackedOnly:upcomingTrackedOnly}),announced=undated.filter(row=>row.confirmed),unavailable=undated.filter(row=>!row.confirmed);
    const progress=api.releaseProgress?.(),checking=preparing&&progress?.total?`Checking titles · ${progress.checked} / ${progress.total}`:preparing?'Checking releases…':'Refresh releases';
    const datedRow=entry=>`<div class="tracking-release-group">${itemButton(entry.title,esc(releaseLabel(entry)),`<time datetime="${esc(new Date(entry.date).toISOString())}">${dateLabel(entry.date)}</time>`)}${entry.releases.length>1?`<details class="tracking-release-dates" data-release-group="${esc(entry.title.id)}"><summary>${entry.releases.length-1} more scheduled ${entry.releases.length===2?'release':'releases'}</summary><ul>${entry.releases.slice(1).map(row=>`<li><span>${esc(releaseLabel(row))}</span><time datetime="${esc(new Date(row.date).toISOString())}">${dateLabel(row.date)}</time></li>`).join('')}</ul></details>`:''}</div>`;
    const unknownRow=entry=>itemButton(entry.title,entry.confirmed?`${esc(entry.release.kind==='season'?`Season ${entry.release.season} announced`:entry.release.name||'Next release announced')}<span class="tracking-release-note">${entry.release.window?esc(entry.release.window)+' · Exact date not announced':'Date not announced'} · ${esc(entry.release.source||'Provider')}</span>`:'No dated chapter schedule supplied by the provider.');
    const failures=api.items().filter(item=>['error','partial'].includes(item.releaseCheck)&&(!upcomingTrackedOnly||['going','done','waiting'].includes(item.status)));
    return `<div class="tracking-section-head"><h2>Upcoming releases</h2><button class="btn sm ghost" data-track-page="calendar">Calendar</button></div><div class="tracking-release-controls">${upcomingFilter()}<button type="button" class="btn sm ghost" data-track-release-refresh ${preparing?'disabled':''}>${icon('refresh-cw')}<span>${checking}</span></button></div><p class="hint">${upcomingTrackedOnly?'For In progress, Finished, and Caught up items. ':'Across your whole library. '}Next confirmed date per title. Expand a title for its other dates in the next year.</p><div class="tracking-dated-releases">${rows.length?rows.map(datedRow).join(''):`<div class="tracking-empty">${preparing?'Checking release dates…':'No confirmed upcoming dates in this view.'}</div>`}</div>${all.length>upcomingVisible?'<button class="btn sm ghost" data-track-upcoming-more>Show more titles</button>':''}${announced.length?`<div class="tracking-release-undated"><h3>Date not announced</h3><p class="hint">Confirmed announcements without an exact release date.</p>${announced.map(unknownRow).join('')}</div>`:''}${unavailable.length?`<details class="tracking-release-unavailable" data-release-group="unavailable"><summary>Chapter schedules unavailable · ${unavailable.length}</summary><p class="hint">These titles are ongoing, but their sources supply no upcoming chapter dates. Reel does not estimate them.</p>${unavailable.map(unknownRow).join('')}</details>`:''}${failures.length?`<details class="tracking-release-unavailable" data-release-group="errors"><summary>Some sources could not be reached · ${failures.length}</summary><p class="hint">Saved dates are still shown. Try Refresh releases again.</p><p class="hint">${failures.map(item=>esc(item.title)).join(', ')}</p></details>`:''}`;
  }
  const itemButton=(item,body,extra='')=>`<article class="tracking-title-row"><button type="button" class="tracking-art" data-track-detail="${esc(item.id)}" aria-label="Details for ${esc(item.title)}">${itemArt(item)}</button><div class="tracking-title-copy"><span class="tracking-kicker">${esc(item.type)}</span><button type="button" class="tracking-title-link" data-track-detail="${esc(item.id)}">${esc(item.title)}</button><p>${body}</p></div>${extra}</article>`;
  function counts(){
    const items=api.items(),events=api.events(),recent=core.overview(events,{start:Date.now()-30*86400000});
    return {items:items.length,ongoing:items.filter(item=>item.status==='going').length,movies:recent.movies,episodes:recent.episodes};
  }
  function nextUp(){
    return api.items().filter(item=>['series','anime'].includes(item.type)&&['going','waiting'].includes(item.status))
      .map(item=>({item,progress:core.progress(item)})).filter(row=>row.progress.next)
      .sort((a,b)=>(b.item.updated||0)-(a.item.updated||0)).slice(0,6);
  }
  function home(){
    const c=counts(),next=nextUp(),events=[...api.events()].sort((a,b)=>Date.parse(b.watchedAt)-Date.parse(a.watchedAt)).slice(0,5);
    if(!c.items)return `<header class="tracking-page-hero"><p class="tracking-eyebrow">Your space</p><h1>Start your story.</h1><p>Add a title to your library, or explore what to watch next. Reel will keep your progress here.</p></header><div class="tracking-first-steps"><button class="btn" data-track-explore>${icon('globe-2')}<span>Explore titles</span></button><button class="btn ghost" data-track-pick>${icon('sparkles')}<span>Pick 4 me</span></button></div>`;
    return `<header class="tracking-page-hero"><p class="tracking-eyebrow">Your space</p><h1>Keep the story going.</h1><p>Your next episode, recent watches, and what is coming soon, together.</p></header>
      <div class="tracking-metrics"><div><span>In your library</span><strong>${c.items}</strong></div><div><span>In progress</span><strong>${c.ongoing}</strong></div><div><span>Episodes · 30 days</span><strong>${c.episodes}</strong></div><div><span>Movies · 30 days</span><strong>${c.movies}</strong></div></div>
      <div class="tracking-home-grid"><section class="tracking-panel">${section('Continue watching','Up next',next.length?next.map(({item,progress})=>itemButton(item,`${core.episodeLabel(item,progress.next.season,progress.next.number)}${progress.next.title?' · '+esc(progress.next.title):''} · ${progress.watched} / ${progress.total} watched<span class="tracking-progress-mini" role="meter" aria-label="${progress.percent}% watched" aria-valuenow="${progress.percent}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress.percent}%"></i></span>`,`<button type="button" class="btn sm tracking-watch" data-track-watch="${esc(item.id)}" data-season="${progress.next.season}" data-episode="${progress.next.number}">${icon('check')}<span>Watched</span></button>`)).join(''):`<div class="tracking-empty">Nothing queued yet. Start a series from your library and its next episode will appear here.</div>`,`<button class="btn sm ghost" data-track-page="library">Open library</button>`)}</section>
      <section class="tracking-panel">${section('Your history','Recent activity',events.length?events.map(event=>activityRow(event,false)).join(''):`<div class="tracking-empty">Your watches will appear here once you mark a movie or episode watched.</div>`,`<button class="btn sm ghost" data-track-page="activity">View all</button>`)}</section></div>
      <section class="tracking-panel tracking-upcoming">${upcomingSection()}</section>`;
  }
  function activityRow(event,editable=true){
    const item=eventTitle(event),label=item?.title||'Title removed from library';
    const detail=event.mediaType==='movie'?'Movie watched':`${eventPosition(event)}${isReading(event)?' read':''}${event.eventType==='rewatch'?' · Rewatch':''}`;
    const when=new Date(event.watchedAt),inputDate=Number.isNaN(+when)?'':new Date(+when-when.getTimezoneOffset()*60000).toISOString().slice(0,16);
    return `<article class="tracking-event"><span class="tracking-event-icon">${icon(mediaIcon(event.mediaType))}</span><div>${item?`<button type="button" class="tracking-title-link" data-track-detail="${esc(item.id)}">${esc(label)}</button>`:`<strong>${esc(label)}</strong>`}<span>${esc(detail)} · ${esc(timeLabel(event.watchedAt))}</span></div>${editable?`<button class="btn sm ghost tracking-edit-date" data-track-edit="${esc(event.id)}" aria-label="Edit watch date for ${esc(label)}">${icon('calendar-clock')}</button><label class="tracking-event-date" hidden><span class="sr-only">Watch date for ${esc(label)}</span><input type="datetime-local" data-track-date="${esc(event.id)}" value="${inputDate}"></label>`:''}</article>`;
  }
  function historyCard(event){
    const item=eventTitle(event),isMovie=event.mediaType==='movie',reading=isReading(event);
    const episode=!isMovie&&!reading&&item?.episodeCatalog?.find(row=>Number(row.season)===Number(event.season)&&Number(row.number)===Number(event.episode));
    const label=item?.title||'Title removed from library';
    const title=isMovie||reading?label:episode?.title||`Episode ${event.episode||'unknown'}`;
    const sources=[item?.historyBanner,historyArtwork(item,event),episode?.image,item?.banner,item?.historyCover,item?.cover].filter(Boolean);
    const artwork=[...new Set(sources)][0]||'';
    const dated=!!event.watchedAt;
    const kind=reading?(event.mediaType==='book'?'Reading':'Chapter'):isMovie?'Movie':event.mediaType==='anime'?'Anime episode':'Episode';
    const position=eventPosition(event);
    const aria=`${label}, ${position}${episode?.title?`, ${episode.title}`:''}${dated?` on ${dateLabel(event.watchedAt)}`:', read date not recorded'}`;
    return `<article class="tracking-history-card${artwork?' has-art':''}${reading?' is-reading':''}">
      ${item?`<button type="button" class="tracking-history-open" data-track-detail="${esc(item.id)}" aria-label="Open details for ${esc(aria)}">`:'<div class="tracking-history-open">'}
        ${artwork?`<img class="tracking-history-image" src="${esc(artwork)}" data-sources="${esc(JSON.stringify([...new Set(sources)]))}" data-source-index="0" alt="" loading="lazy" decoding="async">`:''}
        <span class="tracking-history-content"><span class="tracking-history-meta"><span>${icon(mediaIcon(event.mediaType))}${kind}</span>${event.eventType==='rewatch'?'<span>Rewatch</span>':''}</span><span class="tracking-history-copy"><small>${esc(reading?'Reading progress':isMovie?'Movie watched':label)}</small><strong>${esc(title)}</strong><span>${reading?`<mark class="tracking-reading-range">${esc(position)}</mark>`:esc(position)} <i aria-hidden="true"></i> ${esc(dated?timeLabel(event.watchedAt):'Read date not recorded')}</span><span class="tracking-history-context">${esc([item?.year,...(item?.genres||[]).slice(0,2)].filter(Boolean).join(' · '))}</span></span></span>
      ${item?'</button>':'</div>'}
      ${dated?`<button type="button" class="tracking-history-edit" data-track-edit="${esc(event.id)}" aria-label="Edit activity date for ${esc(label)}">${icon('calendar-clock')}</button>`:''}
      ${artwork?`<button type="button" class="tracking-history-expand" data-track-art aria-label="View full image for ${esc(label)}" hidden>${icon('expand')}</button>`:''}
      ${dated?`<div class="tracking-event-date tracking-history-date-input" hidden>${(event.sessions||[event]).map(session=>{const d=new Date(session.watchedAt),value=new Date(+d-d.getTimezoneOffset()*60000).toISOString().slice(0,16);return `<label><span>${esc(reading?eventPosition(session):'Activity date')}</span><input type="datetime-local" aria-label="Activity date for ${esc(label)}, ${esc(eventPosition(session))}" data-track-date="${esc(session.id)}" value="${value}"></label>`;}).join('')}</div>`:''}
    </article>`;
  }
  function activity(){
    const all=[...api.events()].sort((a,b)=>Date.parse(b.watchedAt)-Date.parse(a.watchedAt));
    const filtered=core.readingDays(all).filter(event=>activityFilter==='all'||activityFilter==='movie'&&event.mediaType==='movie'||activityFilter==='episode'&&['series','anime'].includes(event.mediaType)||activityFilter==='reading'&&isReading(event)||activityFilter==='rewatch'&&event.eventType==='rewatch');
    const events=filtered.slice(0,activityVisible);
    const groups=new Map();for(const event of events){const day=core.dayKey(event.watchedAt);if(!groups.has(day))groups.set(day,[]);groups.get(day).push(event);}
    const earlier=['all','reading'].includes(activityFilter)?api.items().filter(item=>['manga','manhwa','book'].includes(item.type)&&Number(item.type==='book'?item.page:item.chapter)>0&&!all.some(event=>event.titleId===item.id&&isReading(event))):[];
    const earlierVisible=earlier.slice(0,Math.max(0,activityVisible-events.length));
    const days=[...groups].map(([day,rows])=>{const date=new Date(day+'T12:00:00');return `<section class="tracking-history-day"><div class="tracking-history-date"><time datetime="${esc(day)}" aria-label="${esc(dateLabel(date))}"><span>${esc(new Intl.DateTimeFormat(undefined,{month:'short'}).format(date))}</span><strong>${date.getDate()}</strong><span>${esc(new Intl.DateTimeFormat(undefined,{weekday:'short'}).format(date))}</span><small>${date.getFullYear()}</small></time></div><div class="tracking-history-entries">${rows.map(historyCard).join('')}</div></section>`;}).join('');
    const baseline=earlierVisible.length?`<section class="tracking-history-day"><div class="tracking-history-earlier">Earlier</div><div class="tracking-history-entries">${earlierVisible.map(item=>historyCard({titleId:item.id,mediaType:item.type,chapter:item.chapter,page:item.page})).join('')}</div></section>`:'';
    return `<div class="tracking-history-shell"><header class="tracking-page-hero tracking-history-hero"><h1>History</h1><p>Your watches and reading progress, day by day.</p></header>
      <div class="tracking-filter-group tracking-activity-filters" aria-label="Activity type">${[['all','All'],['movie','Movies'],['episode','Episodes'],['reading','Reading'],['rewatch','Rewatches']].map(([key,label])=>`<button data-track-activity="${key}" aria-pressed="${activityFilter===key}">${label}</button>`).join('')}</div>
      <div class="tracking-activity-list${events.length||earlier.length?' has-history':''}">${days}${!events.length&&!earlier.length?'<div class="tracking-panel tracking-empty">No activity in this view yet. Log a movie, episode, chapter, or page to start your history.</div>':''}${baseline}${filtered.length+earlier.length>activityVisible?`<button class="btn ghost tracking-more" data-track-more>Show more · ${filtered.length+earlier.length-activityVisible} remaining</button>`:''}</div></div>`;
  }
  function calendar(){
    const y=month.getFullYear(),m=month.getMonth(),start=new Date(y,m,1),end=new Date(y,m+1,0),offset=start.getDay(),days=end.getDate();
    const episodes=core.upcoming(api.items(),{at:start.getTime()-1,days:days+1,trackedOnly:upcomingTrackedOnly}).filter(entry=>{const date=new Date(entry.date);return date.getFullYear()===y&&date.getMonth()===m;});
    const events=api.events();const cells=[];
    for(let i=0;i<offset;i++)cells.push('<div class="tracking-cal-blank" aria-hidden="true"></div>');
    for(let day=1;day<=days;day++){
      const key=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const watched=calFilter==='episodes'?[]:events.filter(event=>core.dayKey(event.watchedAt)===key),airing=calFilter==='watched'?[]:episodes.filter(entry=>core.dayKey(entry.date)===key);
      const chips=[...watched.slice(0,2).map(event=>`<button type="button" class="tracking-cal-chip watched" data-track-detail="${esc(event.titleId)}">${esc(eventTitle(event)?.title||'Watched')}</button>`),...airing.slice(0,2).map(entry=>`<button type="button" class="tracking-cal-chip release" data-track-detail="${esc(entry.title.id)}">${esc(entry.title.title)} · ${esc(releaseLabel(entry))}</button>`)];
      cells.push(`<div class="tracking-cal-day ${key===core.dayKey(Date.now())?'today':''}"><time datetime="${key}">${day}</time>${chips.join('')}${watched.length+airing.length>4?`<small>+${watched.length+airing.length-4} more</small>`:''}</div>`);
    }
    const label=new Intl.DateTimeFormat(undefined,{month:'long',year:'numeric'}).format(start);
    const monthEvents=events.filter(event=>{const date=new Date(event.watchedAt);return date.getFullYear()===y&&date.getMonth()===m;});
    const agendaEntries=[...(calFilter==='watched'?[]:episodes).map(entry=>({...entry,kind:'release'})),...(calFilter==='episodes'?[]:monthEvents).map(event=>({kind:'watched',date:Date.parse(event.watchedAt),title:eventTitle(event),event}))].filter(entry=>entry.title).sort((a,b)=>a.date-b.date);
    const agenda=agendaEntries.length?agendaEntries.map(entry=>`<article class="tracking-agenda-row"><time datetime="${esc(new Date(entry.date).toISOString())}">${dateLabel(entry.date)}</time>${itemButton(entry.title,entry.kind==='release'?esc(releaseLabel(entry)):entry.event.mediaType==='movie'?'Movie watched':`${eventPosition(entry.event)} ${isReading(entry.event)?'read':'watched'}`)}</article>`).join(''):`<div class="tracking-empty">No activity or confirmed releases for this month.</div>`;
    return `<header class="tracking-page-hero"><h1>Calendar</h1><p>Your watched days and confirmed movie, episode, season, chapter, and book releases.</p></header><div class="tracking-release-controls">${upcomingFilter()}<button class="btn sm ghost" data-track-release-refresh ${preparing?'disabled':''}>${preparing?'Checking releases…':'Refresh releases'}</button></div><div class="tracking-filter-group tracking-calendar-filters" aria-label="Calendar events">${[['all','All'],['episodes','Releases'],['watched','Watched']].map(([key,label])=>`<button data-track-cal-filter="${key}" aria-pressed="${calFilter===key}">${label}</button>`).join('')}</div><div class="tracking-panel"><div class="tracking-cal-toolbar"><h2>${esc(label)}</h2><div><button class="btn sm ghost" data-track-month="-1" aria-label="Previous month">${icon('chevron-left')}</button><button class="btn sm ghost" data-track-month="0">Today</button><button class="btn sm ghost" data-track-month="1" aria-label="Next month">${icon('chevron-right')}</button></div></div><div class="tracking-cal-weekdays">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>`<span>${x}</span>`).join('')}</div><div class="tracking-calendar">${cells.join('')}</div><div class="tracking-calendar-key"><span><i class="watched"></i> Watched</span><span><i class="release"></i> Release</span></div><div class="tracking-agenda">${agenda}</div></div>`;
  }
  function stats(){
    const end=Date.now()+1,start=statsRange==='all'?-Infinity:end-Number(statsRange)*86400000;
    const summary=core.overview(api.events(),{start,end,type:statsType});
    if(!core.overview(api.events()).events.length)return `<header class="tracking-page-hero"><p class="tracking-eyebrow">Your viewing</p><h1>Stats</h1><p>Your viewing story grows from the movies and episodes you log.</p></header><div class="tracking-panel tracking-empty"><h2>Nothing to chart yet</h2><p>Mark a movie or episode watched. Reel will build your activity and watch-time picture from dated events.</p><button class="btn" data-track-page="library">Open library</button></div>`;
    const unit=statsRange==='7'?'day':statsRange==='all'||statsRange==='365'?'month':'week';
    let timeline=core.series(summary.events,{metric:statsMetric,unit}).slice(-16);
    if(statsRange==='7'){const existing=new Map(timeline.map(row=>[row.label,row.value]));timeline=Array.from({length:7},(_,i)=>{const label=core.dayKey(Date.now()-(6-i)*86400000);return {label,value:existing.get(label)||0};});}
    const max=Math.max(1,...timeline.map(row=>row.value));
    const metricLabel={minutes:'Watch time',episodes:'Episodes',movies:'Movies'}[statsMetric];
    const chart=timeline.length?`<div class="tracking-bars" role="img" aria-label="${esc(`${metricLabel} by ${unit}: ${timeline.map(row=>`${row.label} ${row.value}`).join('; ')}`)}">${timeline.map(row=>`<div title="${esc(row.label)}: ${row.value} ${statsMetric==='minutes'?'minutes':metricLabel.toLowerCase()}"><span style="height:${row.value?Math.max(3,row.value/max*100):0}%"></span><small>${esc(row.label.slice(-5))}</small></div>`).join('')}</div>`:`<div class="tracking-empty">No dated watches in this period.</div>`;
    const byTitle=new Map();for(const event of summary.events)byTitle.set(event.titleId,(byTitle.get(event.titleId)||0)+1);
    const top=[...byTitle].sort((a,b)=>b[1]-a[1]).slice(0,5);
    const genres=core.genreStats(summary.events,api.items()).slice(0,5),genreMax=genres[0]?.count||1;
    const people=core.peopleStats(summary.events,api.items());
    const peopleRows=(rows,role)=>rows.length?rows.slice(0,5).map(row=>`<button class="tracking-person-row" data-track-person="${esc(row.name)}" data-track-person-role="${role}"><span>${esc(row.name)}</span><b>${row.count}</b>${icon('arrow-up-right')}</button>`).join(''):`<div class="tracking-empty">No credited ${role.toLowerCase()} data for these watches.</div>`;
    const year=new Date().getFullYear(),days=core.activityDays(api.events(),{start:new Date(year,0,1).getTime(),end:new Date(year+1,0,1).getTime()});
    const heatmap=Array.from({length:(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/86400000},(_,i)=>{const date=new Date(year,0,i+1,12),key=core.dayKey(date),count=days.get(key)||0;return `<span title="${dateLabel(date)}: ${count} ${count===1?'watch':'watches'}" style="--heat:${Math.min(85,Math.round(count/4*85))}%"></span>`;}).join('');
    return `<header class="tracking-page-hero"><p class="tracking-eyebrow">Your viewing</p><h1>Stats</h1><p>Based on dated watch events. Time is counted only when a runtime is known.</p></header>
      <div class="tracking-stat-filters"><div class="tracking-filter-group" aria-label="Time period">${[['7','7 days'],['30','30 days'],['90','3 months'],['365','Year'],['all','All time']].map(([key,label])=>`<button data-track-range="${key}" aria-pressed="${statsRange===key}">${label}</button>`).join('')}</div><div class="tracking-filter-group" aria-label="Media type">${[['all','All'],['movie','Movies'],['series','Shows']].map(([key,label])=>`<button data-track-type="${key}" aria-pressed="${statsType===key}">${label}</button>`).join('')}</div></div>
      <div class="tracking-metrics"><div><span>Movies</span><strong>${summary.movies}</strong></div><div><span>Episodes</span><strong>${summary.episodes}</strong></div><div><span>Known watch time</span><strong>${Math.floor(summary.minutes/60)}<small>h ${summary.minutes%60}m</small></strong></div><div><span>Active days</span><strong>${summary.activeDays}</strong></div></div>
      <div class="tracking-home-grid"><section class="tracking-panel">${section('Trend',metricLabel,`<div class="tracking-filter-group tracking-metric-toggle" aria-label="Chart metric">${[['minutes','Watch time'],['episodes','Episodes'],['movies','Movies']].map(([key,label])=>`<button data-track-metric="${key}" aria-pressed="${statsMetric===key}">${label}</button>`).join('')}</div>${chart}`)}</section><section class="tracking-panel">${section('Most watched','Titles',top.length?top.map(([id,count])=>{const item=api.items().find(row=>row.id===id);return item?itemButton(item,`${count} ${count===1?'watch':'watches'}`):''}).join(''):`<div class="tracking-empty">No titles to rank yet.</div>`)}</section></div>
      <div class="tracking-home-grid tracking-stats-lower"><section class="tracking-panel">${section('Taste','Most watched genres',genres.length?genres.map(row=>`<div class="tracking-genre-row"><span>${esc(row.genre)}</span><div><i style="width:${row.count/genreMax*100}%"></i></div><b>${row.count}</b></div>`).join(''):`<div class="tracking-empty">Genre data is not available for these watches.</div>`)}</section><section class="tracking-panel">${section(String(year),'Active days',`<div class="tracking-heatmap" role="img" aria-label="${days.size} active days in ${year}">${heatmap}</div><p class="tracking-note">Each square represents one day. Color deepens with more watches.</p>`)}</section></div>
      <div class="tracking-home-grid tracking-stats-lower"><section class="tracking-panel">${section('On screen','Most watched actors',peopleRows(people.actors,'Actor'))}</section><section class="tracking-panel">${section('Behind the camera','Most watched directors',peopleRows(people.creators,'Director'))}</section></div>${summary.unknownRuntimes?`<p class="tracking-note">${summary.unknownRuntimes} ${summary.unknownRuntimes===1?'watch has':'watches have'} no runtime, so watch time is a known minimum.</p>`:''}`;
  }
  function render(){
    if(page==='library')return;
    const view=$('#trackingView');view.innerHTML=api.loading()?'<div class="tracking-panel tracking-loading" role="status"><span class="exposure-loader" aria-hidden="true"></span><p>Loading your private Reel…</p></div>':loadingHistory?'<div class="tracking-panel tracking-loading" role="status"><span class="exposure-loader" aria-hidden="true"></span><p>Loading your watch history…</p></div>':({home,activity,calendar,stats}[page]||home)();api.icons(view);
  }
  function prepareHistoryArtwork(){
    if(preparingHistory||page!=='activity')return;
    preparingHistory=true;
    api.prepareHistory().then(changed=>{if(changed&&page==='activity')render();}).finally(()=>{preparingHistory=false;});
  }
  async function prepareReleases(force=false){
    if(preparing)return;
    const updateUpcoming=()=>{
      if(page!=='home')return;
      const panel=$('.tracking-upcoming');if(!panel)return;
      const active=panel.contains(document.activeElement)?document.activeElement:null;
      const focus=active?.hasAttribute('data-track-upcoming-filter')?'[data-track-upcoming-filter]':active?.hasAttribute('data-track-release-refresh')?'[data-track-release-refresh]':active?.hasAttribute('data-track-upcoming-more')?'[data-track-upcoming-more]':null;
      const focusedGroup=active?.matches('summary')?active.parentElement.dataset.releaseGroup:null;
      const focusedTitle=active?.dataset.trackDetail;
      const open=new Set([...panel.querySelectorAll('details[open]')].map(el=>el.dataset.releaseGroup));
      panel.innerHTML=upcomingSection();api.icons(panel);
      panel.querySelectorAll('details').forEach(el=>el.open=open.has(el.dataset.releaseGroup));
      if(focus)panel.querySelector(focus)?.focus({preventScroll:true});
      else if(focusedGroup)[...panel.querySelectorAll('details')].find(el=>el.dataset.releaseGroup===focusedGroup)?.querySelector('summary')?.focus({preventScroll:true});
      else if(focusedTitle)[...panel.querySelectorAll('[data-track-detail]')].find(el=>el.dataset.trackDetail===focusedTitle&&el.className===active.className)?.focus({preventScroll:true});
    };
    preparing=true;
    if(page==='home')updateUpcoming();else render();
    let last=0;
    try{await api.prepare({force,onProgress:()=>{if(Date.now()-last>750){last=Date.now();updateUpcoming();}}});}
    finally{preparing=false;if(page==='home')updateUpcoming();else if(page==='calendar')render();}
  }
  function navigate(target,{historyMode='push'}={}){
    if(!['home','library','calendar','activity','stats'].includes(target))return;
    page=target;
    $('#trackingView').hidden=target==='library';$('#libraryView').hidden=target!=='library';
    document.body.dataset.reelPage=target;
    if(target!=='library')render();
    if(!api.loading()&&['activity','calendar','stats'].includes(target)&&!api.historyReady()){
      loadingHistory=true;render();api.loadHistory().finally(()=>{loadingHistory=false;if(page===target){render();prepareHistoryArtwork();}});
    }
    else if(target==='activity')prepareHistoryArtwork();
    if(!api.loading()&&['home','calendar'].includes(target)&&!preparing){
      prepareReleases();
    }
    document.querySelectorAll('#navDrawer [data-nav-action],#navRail [data-nav-action]').forEach(button=>{
      const current=(target==='library'&&button.dataset.navAction==='list')||button.dataset.navAction===target;
      if(current)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    });
    if(historyMode==='push')try{history.pushState({reelPage:target},'',target==='library'?'#':`#page=${target}`);}catch(e){}
    window.scrollTo({top:0,behavior:'instant'});
  }
  function seasonExplorer(item){
    if(!['series','anime'].includes(item.type))return '';
    const episodes=core.episodeList(item),seen=core.watchedSet(item),continuous=core.continuousAnime(item),groups=core.episodeGroups(item);
    const t=(name,args)=>root.tr('tracking.'+name,args);
    const heading=continuous?t('arcsEpisodes'):'Seasons & episodes';
    if(!episodes.length)return `<section class="tracking-season-explorer"><h3>${heading}</h3><p class="hint">Episode information is not available yet. Refresh title details to load it.</p></section>`;
    const episodeRow=ep=>{
      const watched=seen.has(core.key(ep.season,ep.number)),number=continuous?ep.absoluteNumber:ep.number;
      return `<div class="tracking-episode"><button type="button" data-track-episode="${ep.season}:${ep.number}" data-track-action="${watched?'unwatch':'watch'}" aria-pressed="${watched}" aria-label="${watched?'Unmark':'Mark'} ${continuous?'episode '+number:'season '+ep.season+' episode '+number} watched">${icon(watched?'check':'circle')}</button><span><b>${String(number).padStart(2,'0')}</b> ${esc(ep.title||`Episode ${number}`)}</span>${watched?`<button class="btn sm ghost" data-track-episode="${ep.season}:${ep.number}" data-track-action="rewatch">Rewatch</button>`:''}</div>`;
    };
    return `<section class="tracking-season-explorer"><div class="tracking-section-head"><h3>${esc(heading)}</h3><span>${core.progress(item).watched} / ${episodes.length} watched</span></div>${continuous?`<p class="hint tracking-arc-note">${esc(t('arcNote'))}${core.animeProfile(item)?` <a href="${esc(core.animeProfile(item).source)}" target="_blank" rel="noopener noreferrer">${esc(t('arcGuide'))}${icon('arrow-up-right')}</a>`:' '+esc(t('noArcs'))}</p>`:''}<label class="tracking-backdate">Watched on (optional)<input type="datetime-local" data-track-watched-at></label>${groups.map(group=>{
      const count=group.episodes.filter(ep=>seen.has(core.key(ep.season,ep.number))).length;
      return `<details class="tracking-season" data-episode-group="${group.id}"><summary><span class="tracking-group-name">${esc(group.label==='Additional episodes'?t('additional'):group.label)}${continuous?`<span class="tracking-arc-range">${esc(t('range',{start:group.start,end:group.end??group.episodes.at(-1).absoluteNumber}))}${group.end==null?' · '+esc(t('arcOngoing')):''}</span>`:''}</span><small>${count} / ${group.episodes.length} watched</small>${icon('chevron-down')}</summary>${!continuous&&Array.isArray(item.seasonGuide)?`<div class="tracking-season-actions"><button class="btn sm ghost" data-track-season="${group.season}" data-track-action="watch">Mark season watched</button><button class="btn sm ghost" data-track-season="${group.season}" data-track-action="unwatch">Clear season</button></div>`:''}<div class="tracking-episode-list">${group.episodes.map(episodeRow).join('')}</div></details>`;
    }).join('')}</section>`;
  }
  function init(bridge){
    api=bridge;
    const view=$('#trackingView');
    const showHistoryImage=img=>{
      const sourceRatio=img.naturalWidth/img.naturalHeight;
      const portrait=sourceRatio<1.3;
      const panorama=sourceRatio>2.4;
      const card=img.closest('.tracking-history-card');
      img.dataset.ready=portrait?'portrait':panorama?'panorama':'full';
      card?.classList.toggle('is-art-portrait',portrait);
      card?.classList.toggle('is-art-panorama',panorama);
      card?.classList.add('has-art');
      // Match the card to ordinary landscape art, rather than zooming art into a fixed panorama.
      card?.style.setProperty('--history-ratio',String(portrait?sourceRatio/.44:Math.max(1.3,Math.min(2.4,sourceRatio))));
      card?.style.setProperty('--cover-ratio',String(sourceRatio));
      const expand=card?.querySelector('[data-track-art]');if(expand)expand.hidden=false;
    };
    const showFallbackHistoryImage=img=>{
      showHistoryImage(img);
    };
    const nextHistoryImage=img=>{
      const sources=JSON.parse(img.dataset.sources||'[]'),next=Number(img.dataset.sourceIndex||0)+1;
      img.removeAttribute('data-ready');
      if(next<sources.length){img.dataset.sourceIndex=String(next);img.src=sources[next];return;}
      if(img.dataset.fallbackSrc){
        if(img.src!==img.dataset.fallbackSrc){img.dataset.sourceIndex='fallback';img.src=img.dataset.fallbackSrc;return;}
        showFallbackHistoryImage(img);return;
      }
      img.closest('.tracking-history-card')?.classList.remove('has-art');
      img.remove();
    };
    view.addEventListener('load',event=>{
      const img=event.target;
      if(!img.matches?.('.tracking-history-image'))return;
      if(img.dataset.sourceIndex==='fallback'){showFallbackHistoryImage(img);return;}
      const ratio=img.naturalWidth/img.naturalHeight;
      // Prefer real HD landscape sources with a usable composition, not ultra-wide header strips.
      if(ratio>=1.3&&ratio<=2.4&&img.naturalWidth>=1280&&img.naturalHeight>=600){
        showHistoryImage(img);return;
      }
      const score=img.naturalWidth*img.naturalHeight*(ratio>=1.3&&ratio<=2.4?4:1);
      if(score>Number(img.dataset.fallbackScore||0)){
        img.dataset.fallbackSrc=img.src;
        img.dataset.fallbackScore=String(score);
      }
      nextHistoryImage(img);
    },true);
    view.addEventListener('error',event=>{
      const img=event.target;
      if(!img.matches?.('.tracking-history-image'))return;
      if(img.dataset.sourceIndex==='fallback'){
        img.closest('.tracking-history-card')?.classList.remove('has-art');img.remove();return;
      }
      nextHistoryImage(img);
    },true);
    view.addEventListener('click',async event=>{
      const button=event.target.closest('button');if(!button)return;
      if(button.hasAttribute('data-track-art')){const card=button.closest('.tracking-history-card'),img=card.querySelector('.tracking-history-image');if(img)api.artwork(img.src,card.querySelector('strong')?.textContent||'History artwork');return;}
      if(button.dataset.trackPage){navigate(button.dataset.trackPage);return;}
      if(button.hasAttribute('data-track-explore')){api.explore();return;}
      if(button.hasAttribute('data-track-pick')){api.pick();return;}
      if(button.dataset.trackDetail){api.details(button.dataset.trackDetail);return;}
      if(button.dataset.trackWatch){const item=api.items().find(it=>it.id===button.dataset.trackWatch);if(item)await api.action(item,[{season:Number(button.dataset.season),number:Number(button.dataset.episode),runtime:item.runtime}], 'watch');return;}
      if(button.dataset.trackMonth){month=button.dataset.trackMonth==='0'?new Date():new Date(month.getFullYear(),month.getMonth()+Number(button.dataset.trackMonth),1);render();return;}
      if(button.hasAttribute('data-track-upcoming-filter')){upcomingTrackedOnly=!upcomingTrackedOnly;upcomingVisible=8;render();$('#trackingView [data-track-upcoming-filter]')?.focus({preventScroll:true});return;}
      if(button.hasAttribute('data-track-release-refresh')){await prepareReleases(true);return;}
      if(button.hasAttribute('data-track-upcoming-more')){upcomingVisible+=8;render();return;}
      if(button.dataset.trackCalFilter){calFilter=button.dataset.trackCalFilter;render();return;}
      if(button.dataset.trackRange){statsRange=button.dataset.trackRange;render();return;}
      if(button.dataset.trackType){statsType=button.dataset.trackType;render();}
      if(button.dataset.trackMetric){statsMetric=button.dataset.trackMetric;render();return;}
      if(button.dataset.trackPerson){api.person(button.dataset.trackPerson,button.dataset.trackPersonRole);return;}
      if(button.dataset.trackActivity){activityFilter=button.dataset.trackActivity;activityVisible=50;render();return;}
      if(button.hasAttribute('data-track-more')){activityVisible+=50;render();return;}
      if(button.dataset.trackEdit){const field=button.parentElement.querySelector('.tracking-event-date');if(field){field.hidden=!field.hidden;if(!field.hidden)field.querySelector('input')?.focus();}return;}
    });
    view.addEventListener('change',async event=>{const input=event.target.closest('[data-track-date]');if(input?.value)await api.editEventDate(input.dataset.trackDate,new Date(input.value).toISOString());});
    const initial=/^#page=(home|calendar|activity|stats)$/.exec(location.hash)?.[1]||'library';navigate(initial,{historyMode:'none'});
    root.addEventListener('popstate',()=>{const target=/^#page=(home|calendar|activity|stats)$/.exec(location.hash)?.[1]||'library';navigate(target,{historyMode:'none'});});
  }
  root.ReelTrackingUI={init,navigate,refresh:render,seasonExplorer,artworkFor:item=>historyArtwork(item,{mediaType:item.type}),get page(){return page}};
})(window);
