(function(root){
  'use strict';
  const core=root.ReelTrackingCore;
  let api, page='library', month=new Date(), calFilter='all', statsRange='30', statsType='all', statsMetric='minutes', preparing=false, loadingHistory=false, activityFilter='all', activityVisible=50;
  const $=(selector,scope=document)=>scope.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const dateLabel=value=>new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(new Date(value));
  const timeLabel=value=>new Intl.DateTimeFormat(undefined,{timeStyle:'short'}).format(new Date(value));
  const eventTitle=event=>api.items().find(item=>item.id===event.titleId);
  const mediaIcon=type=>type==='movie'?'film':type==='anime'?'sparkles':'tv';
  const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
  const itemArt=item=>item?.cover?`<img src="${esc(item.cover)}" alt="" loading="lazy">`:`<span class="tracking-art-fallback">${esc((item?.title||'?').slice(0,1))}</span>`;
  const section=(eyebrow,title,body,aside='')=>`<div class="tracking-section-head"><div><p class="tracking-eyebrow">${eyebrow}</p><h2>${title}</h2></div>${aside}</div>${body}`;
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
    const upcoming=core.upcoming(api.items(),{days:45}).slice(0,4);
    if(!c.items)return `<header class="tracking-page-hero"><p class="tracking-eyebrow">Your space</p><h1>Start your story.</h1><p>Add a title to your library, or explore what to watch next. Reel will keep your progress here.</p></header><div class="tracking-first-steps"><button class="btn" data-track-explore>${icon('globe-2')}<span>Explore titles</span></button><button class="btn ghost" data-track-pick>${icon('sparkles')}<span>Pick 4 me</span></button></div>`;
    return `<header class="tracking-page-hero"><p class="tracking-eyebrow">Your space</p><h1>Keep the story going.</h1><p>Your next episode, recent watches, and what is coming soon, together.</p></header>
      <div class="tracking-metrics"><div><span>In your library</span><strong>${c.items}</strong></div><div><span>In progress</span><strong>${c.ongoing}</strong></div><div><span>Episodes · 30 days</span><strong>${c.episodes}</strong></div><div><span>Movies · 30 days</span><strong>${c.movies}</strong></div></div>
      <div class="tracking-home-grid"><section class="tracking-panel">${section('Continue watching','Up next',next.length?next.map(({item,progress})=>itemButton(item,`S${progress.next.season} E${progress.next.number}${progress.next.title?' · '+esc(progress.next.title):''} · ${progress.watched} / ${progress.total} watched<span class="tracking-progress-mini" role="meter" aria-label="${progress.percent}% watched" aria-valuenow="${progress.percent}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress.percent}%"></i></span>`,`<button type="button" class="btn sm tracking-watch" data-track-watch="${esc(item.id)}" data-season="${progress.next.season}" data-episode="${progress.next.number}">${icon('check')}<span>Watched</span></button>`)).join(''):`<div class="tracking-empty">Nothing queued yet. Start a series from your library and its next episode will appear here.</div>`,`<button class="btn sm ghost" data-track-page="library">Open library</button>`)}</section>
      <section class="tracking-panel">${section('Your history','Recent activity',events.length?events.map(event=>activityRow(event,false)).join(''):`<div class="tracking-empty">Your watches will appear here once you mark a movie or episode watched.</div>`,`<button class="btn sm ghost" data-track-page="activity">View all</button>`)}</section></div>
      <section class="tracking-panel tracking-upcoming">${section('Ahead','Upcoming episodes',upcoming.length?upcoming.map(({title,episode,date})=>itemButton(title,`S${episode.season} E${episode.number}${episode.title?' · '+esc(episode.title):''}`,`<time datetime="${esc(new Date(date).toISOString())}">${dateLabel(date)}</time>`)).join(''):`<div class="tracking-empty">No upcoming episode dates are available for your tracked shows yet.</div>`,`<button class="btn sm ghost" data-track-page="calendar">Calendar</button>`)}</section>`;
  }
  function activityRow(event,editable=true){
    const item=eventTitle(event),label=item?.title||'Title removed from library';
    const detail=event.mediaType==='movie'?'Movie watched':`S${event.season} · E${event.episode}${event.eventType==='rewatch'?' · Rewatch':''}`;
    const when=new Date(event.watchedAt),inputDate=Number.isNaN(+when)?'':new Date(+when-when.getTimezoneOffset()*60000).toISOString().slice(0,16);
    return `<article class="tracking-event"><span class="tracking-event-icon">${icon(mediaIcon(event.mediaType))}</span><div>${item?`<button type="button" class="tracking-title-link" data-track-detail="${esc(item.id)}">${esc(label)}</button>`:`<strong>${esc(label)}</strong>`}<span>${esc(detail)} · ${esc(timeLabel(event.watchedAt))}</span></div>${editable?`<button class="btn sm ghost tracking-edit-date" data-track-edit="${esc(event.id)}" aria-label="Edit watch date for ${esc(label)}">${icon('calendar-clock')}</button><label class="tracking-event-date" hidden><span class="sr-only">Watch date for ${esc(label)}</span><input type="datetime-local" data-track-date="${esc(event.id)}" value="${inputDate}"></label>`:''}</article>`;
  }
  function activity(){
    const all=[...api.events()].sort((a,b)=>Date.parse(b.watchedAt)-Date.parse(a.watchedAt));
    const filtered=all.filter(event=>activityFilter==='all'||activityFilter==='movie'&&event.mediaType==='movie'||activityFilter==='episode'&&event.mediaType!=='movie'||activityFilter==='rewatch'&&event.eventType==='rewatch');
    const events=filtered.slice(0,activityVisible);
    const groups=new Map();for(const event of events){const day=core.dayKey(event.watchedAt);if(!groups.has(day))groups.set(day,[]);groups.get(day).push(event);}
    return `<header class="tracking-page-hero"><p class="tracking-eyebrow">Watch journal</p><h1>Activity</h1><p>A dated record of what you watched. Earlier library progress is kept, but has no invented dates.</p></header><div class="tracking-filter-group tracking-activity-filters" aria-label="Activity type">${[['all','All'],['movie','Movies'],['episode','Episodes'],['rewatch','Rewatches']].map(([key,label])=>`<button data-track-activity="${key}" aria-pressed="${activityFilter===key}">${label}</button>`).join('')}</div><div class="tracking-activity-list">${events.length?[...groups].map(([day,rows])=>`<section class="tracking-panel"><h2>${esc(dateLabel(day+'T12:00:00'))}</h2>${rows.map(event=>activityRow(event)).join('')}</section>`).join(''):`<div class="tracking-panel tracking-empty">No watch activity in this view yet.</div>`}${filtered.length>events.length?`<button class="btn ghost tracking-more" data-track-more>Show more · ${filtered.length-events.length} remaining</button>`:''}</div>`;
  }
  function calendar(){
    const y=month.getFullYear(),m=month.getMonth(),start=new Date(y,m,1),end=new Date(y,m+1,0),offset=start.getDay(),days=end.getDate();
    const episodes=core.upcoming(api.items(),{at:new Date(y,m,1).getTime()-1,days:days+1});
    const events=api.events();const cells=[];
    for(let i=0;i<offset;i++)cells.push('<div class="tracking-cal-blank" aria-hidden="true"></div>');
    for(let day=1;day<=days;day++){
      const key=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const watched=calFilter==='episodes'?[]:events.filter(event=>core.dayKey(event.watchedAt)===key),airing=calFilter==='watched'?[]:episodes.filter(entry=>core.dayKey(entry.date)===key);
      const chips=[...watched.slice(0,2).map(event=>`<button type="button" class="tracking-cal-chip watched" data-track-detail="${esc(event.titleId)}">${esc(eventTitle(event)?.title||'Watched')}</button>`),...airing.slice(0,2).map(entry=>`<button type="button" class="tracking-cal-chip release" data-track-detail="${esc(entry.title.id)}">${esc(entry.title.title)} · E${entry.episode.number}</button>`)];
      cells.push(`<div class="tracking-cal-day ${key===core.dayKey(Date.now())?'today':''}"><time datetime="${key}">${day}</time>${chips.join('')}${watched.length+airing.length>4?`<small>+${watched.length+airing.length-4} more</small>`:''}</div>`);
    }
    const label=new Intl.DateTimeFormat(undefined,{month:'long',year:'numeric'}).format(start);
    const monthEvents=events.filter(event=>{const date=new Date(event.watchedAt);return date.getFullYear()===y&&date.getMonth()===m;});
    const agendaEntries=[...(calFilter==='watched'?[]:episodes).map(entry=>({kind:'release',date:entry.date,title:entry.title,episode:entry.episode})),...(calFilter==='episodes'?[]:monthEvents).map(event=>({kind:'watched',date:Date.parse(event.watchedAt),title:eventTitle(event),event}))].filter(entry=>entry.title).sort((a,b)=>a.date-b.date);
    const agenda=agendaEntries.length?agendaEntries.map(entry=>`<article class="tracking-agenda-row"><time datetime="${esc(new Date(entry.date).toISOString())}">${dateLabel(entry.date)}</time>${itemButton(entry.title,entry.kind==='release'?`S${entry.episode.season} E${entry.episode.number}${entry.episode.title?' · '+esc(entry.episode.title):''} · Episode release`:`${entry.event.mediaType==='movie'?'Movie watched':`S${entry.event.season} E${entry.event.episode} watched`}`)}</article>`).join(''):`<div class="tracking-empty">No watched dates or known episode releases for this month.</div>`;
    return `<header class="tracking-page-hero"><p class="tracking-eyebrow">Dates & releases</p><h1>Calendar</h1><p>Your watched days and upcoming episodes with known release dates.</p></header><div class="tracking-filter-group tracking-calendar-filters" aria-label="Calendar events">${[['all','All'],['episodes','Episodes'],['watched','Watched']].map(([key,label])=>`<button data-track-cal-filter="${key}" aria-pressed="${calFilter===key}">${label}</button>`).join('')}</div><div class="tracking-panel"><div class="tracking-cal-toolbar"><h2>${esc(label)}</h2><div><button class="btn sm ghost" data-track-month="-1" aria-label="Previous month">${icon('chevron-left')}</button><button class="btn sm ghost" data-track-month="0">Today</button><button class="btn sm ghost" data-track-month="1" aria-label="Next month">${icon('chevron-right')}</button></div></div><div class="tracking-cal-weekdays">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>`<span>${x}</span>`).join('')}</div><div class="tracking-calendar">${cells.join('')}</div><div class="tracking-calendar-key"><span><i class="watched"></i> Watched</span><span><i class="release"></i> Episode release</span></div><div class="tracking-agenda">${agenda}</div></div>`;
  }
  function stats(){
    const end=Date.now()+1,start=statsRange==='all'?-Infinity:end-Number(statsRange)*86400000;
    const summary=core.overview(api.events(),{start,end,type:statsType});
    if(!api.events().length)return `<header class="tracking-page-hero"><p class="tracking-eyebrow">Your viewing</p><h1>Stats</h1><p>Your viewing story grows from the movies and episodes you log.</p></header><div class="tracking-panel tracking-empty"><h2>Nothing to chart yet</h2><p>Mark a movie or episode watched. Reel will build your activity and watch-time picture from dated events.</p><button class="btn" data-track-page="library">Open library</button></div>`;
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
  function navigate(target,{historyMode='push'}={}){
    if(!['home','library','calendar','activity','stats'].includes(target))return;
    page=target;
    $('#trackingView').hidden=target==='library';$('#libraryView').hidden=target!=='library';
    document.body.dataset.reelPage=target;
    if(target!=='library')render();
    if(!api.loading()&&['activity','calendar','stats'].includes(target)&&!api.historyReady()){
      loadingHistory=true;render();api.loadHistory().finally(()=>{loadingHistory=false;if(page===target)render();});
    }
    if(!api.loading()&&['home','calendar'].includes(target)&&!preparing){
      preparing=true;api.prepare().finally(()=>{preparing=false;if(page===target)render();});
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
    const episodes=core.episodeList(item),seen=core.watchedSet(item),seasons=[...new Set(episodes.map(ep=>ep.season))];
    if(!seasons.length)return `<section class="tracking-season-explorer"><div class="tracking-section-head"><div><p class="tracking-eyebrow">Episode tracker</p><h3>Seasons & episodes</h3></div></div><p class="hint">Episode information is not available yet. Refresh title details to load it.</p></section>`;
    return `<section class="tracking-season-explorer"><div class="tracking-section-head"><div><p class="tracking-eyebrow">Episode tracker</p><h3>Seasons & episodes</h3></div><span>${core.progress(item).watched} / ${episodes.length} watched</span></div><label class="tracking-backdate">Watched on (optional)<input type="datetime-local" data-track-watched-at></label>${seasons.map(season=>{const rows=episodes.filter(ep=>ep.season===season),count=rows.filter(ep=>seen.has(core.key(ep.season,ep.number))).length;return `<details class="tracking-season"><summary><span>Season ${season}</span><small>${count} / ${rows.length} watched</small>${icon('chevron-down')}</summary>${Array.isArray(item.seasonGuide)?`<div class="tracking-season-actions"><button class="btn sm ghost" data-track-season="${season}" data-track-action="watch">Mark season watched</button><button class="btn sm ghost" data-track-season="${season}" data-track-action="unwatch">Clear season</button></div>`:`<p class="hint">Release dates are unverified, so whole-season actions are unavailable. Track episodes individually.</p>`}<div class="tracking-episode-list">${rows.map(ep=>`<div class="tracking-episode"><button type="button" data-track-episode="${ep.season}:${ep.number}" data-track-action="${seen.has(core.key(ep.season,ep.number))?'unwatch':'watch'}" aria-pressed="${seen.has(core.key(ep.season,ep.number))}" aria-label="${seen.has(core.key(ep.season,ep.number))?'Unmark':'Mark'} season ${ep.season} episode ${ep.number} watched">${icon(seen.has(core.key(ep.season,ep.number))?'check':'circle')}</button><span><b>${String(ep.number).padStart(2,'0')}</b> ${esc(ep.title||`Episode ${ep.number}`)}</span>${seen.has(core.key(ep.season,ep.number))?`<button class="btn sm ghost" data-track-episode="${ep.season}:${ep.number}" data-track-action="rewatch">Rewatch</button>`:''}</div>`).join('')}</div></details>`}).join('')}</section>`;
  }
  function init(bridge){
    api=bridge;
    const view=$('#trackingView');
    view.addEventListener('click',async event=>{
      const button=event.target.closest('button');if(!button)return;
      if(button.dataset.trackPage){navigate(button.dataset.trackPage);return;}
      if(button.hasAttribute('data-track-explore')){api.explore();return;}
      if(button.hasAttribute('data-track-pick')){api.pick();return;}
      if(button.dataset.trackDetail){api.details(button.dataset.trackDetail);return;}
      if(button.dataset.trackWatch){const item=api.items().find(it=>it.id===button.dataset.trackWatch);if(item)await api.action(item,[{season:Number(button.dataset.season),number:Number(button.dataset.episode),runtime:item.runtime}], 'watch');return;}
      if(button.dataset.trackMonth){month=button.dataset.trackMonth==='0'?new Date():new Date(month.getFullYear(),month.getMonth()+Number(button.dataset.trackMonth),1);render();return;}
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
  root.ReelTrackingUI={init,navigate,refresh:render,seasonExplorer,get page(){return page}};
})(window);
