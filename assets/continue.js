(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ReelContinue=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function ordered(items,preference){
    const active=items.filter(item=>item.status==='going').slice().sort((a,b)=>(Number(b.updated)||0)-(Number(a.updated)||0));
    const ranks=new Map();
    if(Array.isArray(preference))for(const id of preference)if(typeof id==='string'&&!ranks.has(id))ranks.set(id,ranks.size);
    return active.sort((a,b)=>(ranks.get(a.id)??Infinity)-(ranks.get(b.id)??Infinity));
  }
  function move(ids,id,target){
    const next=[...ids],from=next.indexOf(id),to=next.indexOf(target);
    if(from<0||to<0||from===to)return next;
    next.splice(from,1);next.splice(to,0,id);return next;
  }
  // Presentation only: the cursor and the total completed count are different facts.
  function progressParts(item,core){
    if(item.type==='series'||item.type==='anime'){
      const continuous=!!core.continuousAnime(item),progress=core.progress(item);
      return {unit:'episodes',current:continuous?core.episodeNumber(item):Math.max(0,Number(item.episode)||0),season:!continuous&&Number(item.season)>0&&Number(item.season)<1900?Number(item.season):null,completed:progress.watched,total:progress.total||null};
    }
    if(item.type==='book')return {unit:'pageUnit',current:Number(item.page)||0,completed:Number(item.page)||0,total:Number(item.pages)||null};
    if(item.type==='manga'||item.type==='manhwa')return {unit:'chapterUnit',current:Number(item.chapter)||0,completed:Number(item.chapter)||0,total:Number(item.chapters)||null};
    return null;
  }
  const COPY={
    en:{title:'Continue',view:'View all',close:'Close',count:'{n} in progress',hint:'Drag the handles to reorder. You can also use arrow keys on a handle or the move buttons.',handle:'Reorder {title}',details:'Details',finish:'Finish',watching:'Watching',started:'Started',pages:'+10 pages',chapter:'+1 chapter',episode:'+1 episode',search:'Filter in-progress titles',empty:'Nothing in progress',emptyBody:'Start a title in your library and it will appear here.',noMatch:'No titles match your search.',earlier:'Move {title} earlier',later:'Move {title} later',moved:'{title}, position {n} of {total}',keys:'Use arrow keys to move this title. Home moves it first; End moves it last.',resume:'Resume at {time}',notes:'Your notes',progress:'Progress',all:'All in-progress titles',cancelled:'Reordering cancelled.'},
    fr:{title:'Continuer',view:'Tout voir',close:'Fermer',count:'{n} en cours',hint:'Faites glisser les poignées pour réorganiser, ou utilisez les flèches du clavier et les boutons de déplacement.',handle:'Réorganiser {title}',details:'Détails',finish:'Terminer',watching:'En cours',started:'Commencé',pages:'+10 pages',chapter:'+1 chapitre',episode:'+1 épisode',search:'Filtrer les titres en cours',empty:'Aucun titre en cours',emptyBody:'Commencez un titre dans votre bibliothèque pour le retrouver ici.',noMatch:'Aucun titre ne correspond à votre recherche.',earlier:'Déplacer {title} avant',later:'Déplacer {title} après',moved:'{title}, position {n} sur {total}',keys:'Utilisez les flèches pour déplacer ce titre. Début le place en premier, Fin en dernier.',resume:'Reprendre à {time}',notes:'Vos notes',progress:'Progression',all:'Tous les titres en cours',cancelled:'Réorganisation annulée.'},
    ar:{title:'متابعة',view:'عرض الكل',close:'إغلاق',count:'{n} قيد المتابعة',hint:'اسحب المقابض لإعادة الترتيب، أو استخدم مفاتيح الأسهم وأزرار التحريك.',handle:'إعادة ترتيب {title}',details:'التفاصيل',finish:'إنهاء',watching:'قيد المشاهدة',started:'بدأت المتابعة',pages:'+10 صفحات',chapter:'+1 فصل',episode:'+1 حلقة',search:'تصفية العناوين قيد المتابعة',empty:'لا توجد عناوين قيد المتابعة',emptyBody:'ابدأ عنوانًا في مكتبتك ليظهر هنا.',noMatch:'لا توجد عناوين تطابق البحث.',earlier:'تحريك {title} إلى الأمام',later:'تحريك {title} إلى الخلف',moved:'{title}، الموضع {n} من {total}',keys:'استخدم الأسهم للتحريك. Home ينقل العنوان إلى البداية، وEnd إلى النهاية.',resume:'المتابعة من {time}',notes:'ملاحظاتك',progress:'التقدم',all:'كل العناوين قيد المتابعة',cancelled:'تم إلغاء إعادة الترتيب.'}
  };
  Object.assign(COPY.en,{hint:'Drag to reorder, or use the arrow controls.',episodes:'episodes',pageUnit:'pages',chapterUnit:'chapters',pagePosition:'Page {n}',chapterPosition:'Chapter {n}',totalLabel:'{n} of {total} {unit} completed'});
  Object.assign(COPY.fr,{hint:'Glissez pour réorganiser, ou utilisez les flèches.',episodes:'épisodes',pageUnit:'pages',chapterUnit:'chapitres',pagePosition:'Page {n}',chapterPosition:'Chapitre {n}',totalLabel:'{n} sur {total} {unit} terminés'});
  Object.assign(COPY.ar,{hint:'اسحب لإعادة الترتيب، أو استخدم أزرار الأسهم.',episodes:'حلقة',pageUnit:'صفحة',chapterUnit:'فصل',pagePosition:'صفحة {n}',chapterPosition:'فصل {n}',totalLabel:'تم إكمال {n} من {total} {unit}'});
  function mount(api){
    const rail=document.querySelector('#rail'),view=document.querySelector('#continueViewAll'),count=document.querySelector('#continueCount');
    const dialog=document.createElement('dialog');
    dialog.id='continueDialog';dialog.className='continue-dialog';
    dialog.setAttribute('aria-labelledby','continueDialogTitle');
    dialog.innerHTML=`<header class="continue-dialog-head"><div><h2 id="continueDialogTitle"></h2><p id="continueDialogCount"></p></div><button type="button" class="btn icon-btn ghost" data-continue-close></button></header><div class="continue-dialog-tools"><label class="continue-search"><span class="sr-only" id="continueSearchLabel"></span><input type="search" id="continueSearch" aria-labelledby="continueSearchLabel" autocomplete="off"></label><p id="continueHelp"></p></div><div class="continue-list" id="continueList" aria-label=""></div>`;
    document.body.append(dialog);
    const list=dialog.querySelector('#continueList'),search=dialog.querySelector('#continueSearch');
    const live=document.createElement('div');live.className='sr-only';live.setAttribute('role','status');live.setAttribute('aria-live','polite');document.body.append(live);
    const keyHelp=document.createElement('span');keyHelp.id='continueReorderHelp';keyHelp.className='sr-only';document.body.append(keyHelp);
    let drag=null,scope=api.scope(),suppressClickUntil=0;
    const busy=new Set();
    const text=(key,values={})=>{let value=(COPY[api.language()]||COPY.en)[key]||COPY.en[key];for(const [name,replacement]of Object.entries(values))value=value.replaceAll('{'+name+'}',String(replacement));return value;};
    const esc=api.escape;
    const items=()=>ordered(api.items(),api.order());
    const ids=()=>items().map(item=>item.id);
    const announce=message=>{live.textContent='';requestAnimationFrame(()=>{live.textContent=message;});};
    function labels(){
      view.innerHTML=api.icon('expand',14)+`<span>${esc(text('view'))}</span>`;
      view.setAttribute('aria-label',text('all'));view.setAttribute('aria-haspopup','dialog');view.setAttribute('aria-controls',dialog.id);
      dialog.querySelector('h2').textContent=text('title');
      const close=dialog.querySelector('[data-continue-close]');close.innerHTML=api.icon('x',18);close.setAttribute('aria-label',text('close'));
      search.placeholder=text('search');dialog.querySelector('#continueSearchLabel').textContent=text('search');
      dialog.querySelector('#continueHelp').textContent=text('hint');keyHelp.textContent=text('keys');
      list.setAttribute('aria-label',text('all'));
    }
    function card(item,expanded,index,total){
      const {style,art,posterClass}=api.poster(item),id=esc(item.id),title=esc(item.title),pending=busy.has(item.id)||api.pending(item.id);
      const parts=progressParts(item,api.tracking);
      const spot=parts?parts.unit==='episodes'?`${parts.season?`S${parts.season} · `:''}E${parts.current}`:text(parts.unit==='pageUnit'?'pagePosition':'chapterPosition',{n:parts.current}):item.stoppedAtSec?api.timestamp(item.stoppedAtSec):text('watching');
      const reading=['book','manga','manhwa'].includes(item.type);
      const detail=[api.typeName(item.type),item.year,expanded?api.runtime(item):'',expanded?item.genres?.slice(0,2).join(' · '):''].filter(Boolean).join(' · ');
      const pct=Math.max(0,Math.min(100,Number(api.percent(item))||0));
      const handle=`<button type="button" class="continue-handle" data-continue-handle aria-label="${esc(text('handle',{title:item.title}))}" aria-describedby="continueReorderHelp" title="${esc(text('keys'))}">${api.icon('grip-vertical',17)}</button>`;
      const actions=`${item.type==='movie'?'':`<button type="button" class="btn sm" data-continue-action="bump" ${pending?'disabled':''}>${api.icon(reading?'book-plus':'plus',13)}${esc(text(item.type==='book'?'pages':reading?'chapter':'episode'))}</button>`}<button type="button" class="btn sm ghost" data-continue-action="done" ${pending?'disabled':''}>${api.icon('check',13)}${esc(text('finish'))}</button>`;
      const totals=parts?.total?`<span class="continue-total" aria-label="${esc(text('totalLabel',{n:parts.completed,total:parts.total,unit:text(parts.unit)}))}"><b>${parts.completed}</b><span>/ ${parts.total} ${esc(text(parts.unit))}</span></span>`:'';
      const moves=expanded?`<div class="continue-move"><button type="button" class="btn sm ghost" data-continue-move="-1" aria-label="${esc(text('earlier',{title:item.title}))}" ${index===0?'disabled':''}>${api.icon('arrow-up',14)}</button><button type="button" class="btn sm ghost" data-continue-move="1" aria-label="${esc(text('later',{title:item.title}))}" ${index===total-1?'disabled':''}>${api.icon('arrow-down',14)}</button></div>`:'';
      return `<article class="${expanded?'continue-card':'resume'}" data-continue-id="${id}" data-id="${id}">${handle}<div class="thumb ${posterClass}" style="${style}">${art}${api.strip(item)}</div><div class="body"><h${expanded?'3':'4'}><button type="button" class="continue-title" ${expanded?'data-continue-action="open"':'data-act="open"'}>${title}</button></h${expanded?'3':'4'}><p class="continue-meta">${esc(detail)}</p><div class="continue-position"><div class="at">${esc(spot)}</div>${totals}</div>${expanded?`${item.stoppedAtSec&&item.type!=='movie'?`<p class="continue-resume">${esc(text('resume',{time:api.timestamp(item.stoppedAtSec)}))}</p>`:''}<div class="continue-progress" role="progressbar" aria-label="${esc(text('progress'))}" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>${item.notes?`<p class="continue-note" title="${esc(item.notes)}"><b>${esc(text('notes'))}:</b> ${esc(item.notes)}</p>`:''}`:''}</div><div class="continue-footer"><div class="acts">${actions}</div>${moves}</div></article>`;
    }
    function reconcile(host,rows,expanded){
      const scrollLeft=host.scrollLeft,scrollTop=host.scrollTop;
      const existing=new Map([...host.children].map(node=>[node.dataset.continueId,node]));
      const active=document.activeElement,hadFocus=host.contains(active),focusId=active?.closest('[data-continue-id]')?.dataset.continueId;
      const focusAttribute=active?.hasAttribute('data-continue-handle')?'[data-continue-handle]':active?.hasAttribute('data-continue-move')?`[data-continue-move="${active.dataset.continueMove}"]`:null;
      let index=0;
      for(const item of rows){
        const markup=card(item,expanded,ids().indexOf(item.id),items().length);let node=existing.get(item.id);
        if(!node||node._continueMarkup!==markup){const template=document.createElement('template');template.innerHTML=markup;const fresh=template.content.firstElementChild;fresh._continueMarkup=markup;if(node)node.replaceWith(fresh);node=fresh;}
        if(host.children[index]!==node)host.insertBefore(node,host.children[index]||null);
        index++;existing.delete(item.id);
      }
      for(const node of existing.values())node.remove();
      if(hadFocus&&focusId&&focusAttribute&&document.activeElement!==active){const node=[...host.children].find(row=>row.dataset.continueId===focusId);const button=node?.querySelector(focusAttribute);(button?.disabled?node.querySelector('[data-continue-handle]'):button)?.focus({preventScroll:true});}
      host.scrollLeft=scrollLeft;host.scrollTop=scrollTop;
    }
    function render(){
      if(drag)finishDrag(false);
      if(scope!==api.scope()){scope=api.scope();if(dialog.open)dialog.close();search.value='';list.replaceChildren();}
      labels();const rows=items();count.textContent=rows.length?text('count',{n:rows.length}):'';view.hidden=!rows.length;
      if(rows.length)reconcile(rail,rows,false);
      else rail.innerHTML=`<div class="empty-shelf">${api.icon('circle-play',18)}<span><b>${esc(text('empty'))}.</b> ${esc(text('emptyBody'))}</span></div>`;
      dialog.querySelector('#continueDialogCount').textContent=text('count',{n:rows.length});
      if(dialog.open){
        const needle=search.value.trim().toLocaleLowerCase(),shown=rows.filter(item=>[item.title,item.creator,item.type].join(' ').toLocaleLowerCase().includes(needle));
        if(shown.length)reconcile(list,shown,true);
        else list.innerHTML=`<p class="continue-empty" role="status">${esc(text(rows.length?'noMatch':'emptyBody'))}</p>`;
      }
      api.icons();
    }
    function commit(next,id){
      const owner=api.scope();api.saveOrder(next);render();
      if(owner!==api.scope())return;
      const item=api.items().find(row=>row.id===id);if(item)announce(text('moved',{title:item.title,n:next.indexOf(id)+1,total:next.length}));
    }
    function shift(id,step){const order=ids(),at=order.indexOf(id),target=step==='first'?order[0]:step==='last'?order.at(-1):order[at+step];if(target)commit(move(order,id,target),id);}
    function open(){search.value='';labels();dialog.append(live);dialog.showModal();document.body.classList.add('continue-open');render();dialog.querySelector('[data-continue-close]').focus();}
    view.addEventListener('click',open);
    search.addEventListener('input',render);
    dialog.querySelector('[data-continue-close]').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{if(drag)finishDrag(false);document.body.classList.remove('continue-open');document.body.append(live);});
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
    async function click(event){
      if(performance.now()<suppressClickUntil||event.target.closest('[data-continue-handle]')){event.preventDefault();event.stopPropagation();return;}
      const button=event.target.closest('[data-continue-action],[data-continue-move]');if(!button)return;
      event.stopPropagation();const row=button.closest('[data-continue-id]'),item=api.items().find(item=>item.id===row?.dataset.continueId);if(!item)return;
      if(button.hasAttribute('data-continue-move')){shift(item.id,Number(button.dataset.continueMove));return;}
      const action=button.dataset.continueAction;
      if(action==='open'){dialog.close();api.open(item.id);return;}
      if(busy.has(item.id)||api.pending(item.id))return;
      busy.add(item.id);render();
      try{await api.action(item,action);}finally{busy.delete(item.id);render();}
    }
    function keydown(event){
      const handle=event.target.closest('[data-continue-handle]');if(!handle)return;
      const rtl=document.documentElement.dir==='rtl';
      const steps={ArrowUp:-1,ArrowDown:1,ArrowLeft:rtl?1:-1,ArrowRight:rtl?-1:1,Home:'first',End:'last'};
      if(event.key in steps){event.preventDefault();event.stopPropagation();shift(handle.closest('[data-continue-id]').dataset.continueId,steps[event.key]);}
      if(event.key===' '||event.key==='Enter'){event.preventDefault();event.stopPropagation();announce(text('keys'));}
    }
    function pointerdown(event){
      const handle=event.target.closest('[data-continue-handle]');if(!handle||drag||event.button!==0||!event.isPrimary)return;
      const row=handle.closest('[data-continue-id]');
      drag={handle,row,host:row.parentElement,id:row.dataset.continueId,pointer:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,order:ids(),scope:api.scope(),active:false,frame:0};
      handle.setPointerCapture(event.pointerId);
    }
    function startDrag(){
      drag.active=true;drag.handle.focus({preventScroll:true});drag.rect=drag.row.getBoundingClientRect();drag.offsetX=drag.startX-drag.rect.left;drag.offsetY=drag.startY-drag.rect.top;
      drag.ghost=drag.row.cloneNode(true);drag.ghost.classList.add('continue-ghost');drag.ghost.setAttribute('aria-hidden','true');drag.ghost.inert=true;
      Object.assign(drag.ghost.style,{width:drag.rect.width+'px',height:drag.rect.height+'px'});
      (dialog.open?dialog:document.body).append(drag.ghost);drag.row.classList.add('continue-dragging');drag.host.classList.add('continue-sorting');
      tick();
    }
    function tick(){
      if(!drag?.active)return;
      const d=drag;d.ghost.style.transform=`translate3d(${d.x-d.offsetX}px,${d.y-d.offsetY}px,0)`;
      const rect=d.host.getBoundingClientRect(),horizontal=d.host===rail;
      const position=horizontal?d.x:d.y,start=horizontal?rect.left:rect.top,end=horizontal?rect.right:rect.bottom;
      const speed=position<start+44?-Math.min(14,(start+44-position)/4):position>end-44?Math.min(14,(position-end+44)/4):0;
      if(speed)d.host.scrollBy(horizontal?{left:speed}:{top:speed});
      // Hit-test layout boxes, not animated visual boxes, so moving neighbours
      // cannot oscillate under a stationary pointer during their FLIP transition.
      const target=[...d.host.children].find(node=>{
        if(!node.dataset.continueId)return false;
        const left=rect.left+d.host.clientLeft+node.offsetLeft-d.host.scrollLeft;
        const top=rect.top+d.host.clientTop+node.offsetTop-d.host.scrollTop;
        return d.x>=left&&d.x<=left+node.offsetWidth&&d.y>=top&&d.y<=top+node.offsetHeight;
      });
      if(target&&target!==d.row&&target.parentElement===d.host){
        const next=move(d.order,d.id,target.dataset.continueId),positions=new Map([...d.host.children].map(node=>[node,node.getBoundingClientRect()]));
        const scrollLeft=d.host.scrollLeft,scrollTop=d.host.scrollTop;
        d.order=next;for(const id of next){const node=[...d.host.children].find(node=>node.dataset.continueId===id);if(node)d.host.append(node);}
        d.handle.focus({preventScroll:true});d.host.scrollLeft=scrollLeft;d.host.scrollTop=scrollTop;d.handle.setPointerCapture(d.pointer);
        if(!matchMedia('(prefers-reduced-motion: reduce)').matches)for(const [node,before]of positions){if(node===d.row)continue;const after=node.getBoundingClientRect();if(before.x!==after.x||before.y!==after.y){node.getAnimations().forEach(animation=>animation.cancel());node.animate([{transform:`translate(${before.x-after.x}px,${before.y-after.y}px)`},{transform:'translate(0,0)'}],{duration:160,easing:'cubic-bezier(.23,1,.32,1)'});}}
      }
      d.frame=requestAnimationFrame(tick);
    }
    function finishDrag(save){
      if(!drag)return;const d=drag;drag=null;cancelAnimationFrame(d.frame);
      d.ghost?.remove();d.row.classList.remove('continue-dragging');d.host.classList.remove('continue-sorting');
      if(d.handle.hasPointerCapture(d.pointer))d.handle.releasePointerCapture(d.pointer);
      if(d.active){suppressClickUntil=performance.now()+350;if(save&&d.scope===api.scope())commit(d.order,d.id);else{render();announce(text('cancelled'));}}
    }
    for(const host of [rail,list]){host.addEventListener('click',click);host.addEventListener('keydown',keydown);host.addEventListener('pointerdown',pointerdown);host.addEventListener('dragstart',event=>event.preventDefault());}
    document.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.pointer)return;drag.x=event.clientX;drag.y=event.clientY;if(!drag.active&&Math.hypot(drag.x-drag.startX,drag.y-drag.startY)>6)startDrag();if(drag.active)event.preventDefault();},{passive:false});
    document.addEventListener('pointerup',event=>{if(event.pointerId===drag?.pointer)finishDrag(true);});
    document.addEventListener('pointercancel',event=>{if(event.pointerId===drag?.pointer)finishDrag(false);});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&drag){event.preventDefault();event.stopImmediatePropagation();finishDrag(false);}},{capture:true});
    window.addEventListener('blur',()=>finishDrag(false));
    return {render,open,isOpen:()=>dialog.open};
  }
  return {ordered,move,progressParts,mount};
});
