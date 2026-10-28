(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ReelSearchCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const positive=value=>Number.isFinite(Number(value))&&Number(value)>0?Number(value):0;
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g,'')
    .toLowerCase().replace(/[إأآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/^(the|a|an) /,'');
  const kind=record=>record.type==='anime'&&/^(movie|film)$/i.test(record.format||'')?'movie':record.type;
  const names=record=>new Set([record.title,...(record.alternativeTitles||[])].filter(Boolean).map(value=>{
    const name=normalize(value);
    // Common long-vowel romanizations, only for Japanese animated works.
    return record.type==='anime'||record.kitsu?name.replace(/uu/g,'u'):name;
  }).filter(Boolean));
  const identities=record=>new Set([record.catalogId,...(record.catalogAliases||[]),record.wd&&`wikidata:${record.wd}`,
    record.tvmaze&&`tvmaze:${record.tvmaze}`,record.kitsu&&`kitsu-anime:${record.kitsu}`,record.kitsuManga&&`kitsu-manga:${record.kitsuManga}`,
    record.imdb&&`imdb:${record.imdb}`].filter(Boolean).map(String));
  function sameWork(a,b){
    if(!a.title||!b.title||kind(a)!==kind(b))return false;
    const ai=identities(a),bi=identities(b);
    if([...ai].some(id=>bi.has(id)))return true;
    // Distinct provider entries may be seasons, editions or adaptations.
    for(const provider of ['tvmaze:','kitsu-anime:','kitsu-manga:','wikidata:','openlibrary:']){
      const av=[...ai].filter(id=>id.startsWith(provider)),bv=[...bi].filter(id=>id.startsWith(provider));
      if(av.length&&bv.length&&!av.some(id=>bv.includes(id)))return false;
    }
    const ay=positive(a.year),by=positive(b.year);
    if(positive(a.seriesNumber)&&positive(b.seriesNumber)&&Number(a.seriesNumber)!==Number(b.seriesNumber))return false;
    const special=record=>/^(ova|oav|special|music)$/i.test(record.format||'')?String(record.format).toLowerCase():'';
    if(special(a)!==special(b))return false;
    if(!ay||!by||ay!==by)return !ai.size&&!bi.size&&ay===by&&normalize(a.title)===normalize(b.title);
    const an=names(a),bn=names(b);
    return [...an].some(name=>bn.has(name));
  }
  function popularity(record){
    const readers=positive(record.ratingsCount)+positive(record.wantToReadCount)+positive(record.alreadyReadCount);
    const audience=Math.max(positive(record.userCount),readers);
    if(audience)return Math.min(100,Math.log10(audience+1)*16);
    if(positive(record.popularityRank))return Math.max(1,100-Math.log10(positive(record.popularityRank))*18);
    const links=positive(record.sitelinkCount)||Object.keys(record.sitelinks||{}).length;
    if(links)return Math.min(100,Math.log10(links+1)*32);
    // Historical Wikipedia scores used result position, not audience popularity.
    if(record.sourceName==='Wikipedia'||record.popularitySource==='search-order')return 0;
    return Math.min(100,positive(record.popularity));
  }
  const exactMatch=(record,query)=>names(record).has([...names({title:query,type:record.type,kitsu:record.kitsu})][0]);
  const compare=(a,b,query)=>Number(exactMatch(b,query))-Number(exactMatch(a,query))||popularity(b)-popularity(a)||normalize(a.title||a.name).localeCompare(normalize(b.title||b.name));
  const quality=record=>Number(!!record.kitsu||!!record.kitsuManga)*8+Number(!!record.tvmaze)*4+Number(!!record.userCount||!!record.popularityRank)*4+Number(!!record.cover);
  function merge(primary,secondary){
    // Preserve the selected record's object identity and all private state.
    const aliases=new Set([...identities(primary),...identities(secondary)]);
    primary.catalogAliases=[...aliases];
    primary.alternativeTitles=[...new Set([...(primary.alternativeTitles||[]),secondary.title,...(secondary.alternativeTitles||[])].filter(value=>value&&value!==primary.title))];
    for(const field of ['tvmaze','kitsu','kitsuManga','wd','imdb','userCount','popularityRank','ratingsCount','wantToReadCount','alreadyReadCount','sitelinkCount'])
      if(!primary[field]&&secondary[field])primary[field]=secondary[field];
    for(const field of ['cover','banner','synopsis','runtime','sourceUrl','format','creator'])if(!primary[field]&&secondary[field])primary[field]=secondary[field];
    for(const field of ['genres','cast','writers','searchTerms'])if(!primary[field]?.length&&Array.isArray(secondary[field]))primary[field]=[...secondary[field]];
    for(const field of ['score','country','language','showStatus','ageRating','premiered','ended'])if((primary[field]==null||primary[field]==='')&&secondary[field]!=null)primary[field]=secondary[field];
    if(popularity(secondary)>popularity(primary))primary.popularity=popularity(secondary);
    return primary;
  }
  function dedupe(records,{preferred=new Set()}={}){
    const result=[];
    for(const record of records){
      if(!record?.title)continue;
      const index=result.findIndex(existing=>sameWork(existing,record));
      if(index<0){result.push(record);continue;}
      const existing=result[index];
      const keep=preferred.has(existing)?existing:preferred.has(record)?record:quality(record)>quality(existing)?record:existing;
      result[index]=merge(keep,keep===record?existing:record);
    }
    // A later bilingual/provider-linked entry can bridge two earlier records.
    for(let i=0;i<result.length;i++)for(let j=i+1;j<result.length;j++){
      if(!sameWork(result[i],result[j]))continue;
      const a=result[i],b=result[j],keep=preferred.has(a)?a:preferred.has(b)?b:quality(b)>quality(a)?b:a;
      result[i]=merge(keep,keep===a?b:a);result.splice(j,1);j=i;
    }
    return result;
  }
  return {normalize,kind,identities,sameWork,popularity,exactMatch,compare,dedupe};
});
