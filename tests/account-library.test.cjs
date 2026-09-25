const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const AccountLibrary = require('../assets/account-library.js');

const migrationPath = path.resolve(__dirname,'../supabase/migrations/20260923232252_account_library_ownership.sql');
const migration = fs.readFileSync(migrationPath,'utf8');
const identityMigration = fs.readFileSync(path.resolve(__dirname,'../supabase/migrations/20260923233255_normalize_manual_title_identity.sql'),'utf8');

test('global metadata and private state cross the persistence boundary separately', () => {
  const entry = AccountLibrary.toSyncEntry({
    id:'browser-only',title:'Interstellar',type:'movie',year:2014,catalogId:'wikidata:Q13417189',
    cover:'poster.jpg',genres:['Science Fiction'],score:8.7,status:'done',rating:9,fav:true,
    notes:'Loved it',season:1,episode:0,added:1700000000000,updated:1700000100000,finished:1700000200000
  });
  assert.deepEqual([entry.provider,entry.providerId],['wikidata','Q13417189']);
  assert.equal(entry.metadata.status,undefined);
  assert.equal(entry.metadata.rating,undefined);
  assert.equal(entry.metadata.notes,undefined);
  assert.equal(entry.status,'done');
  assert.equal(entry.rating,9);
  assert.equal(entry.favorite,true);
  assert.equal(entry.notes,'Loved it');
});

test('same provider title has one catalog identity but independent account relationships', () => {
  const titleA={title:'Interstellar',type:'movie',year:2014,catalogId:'wikidata:Q13417189',status:'done',rating:9};
  const titleB={title:'Interstellar',type:'movie',year:2014,catalogId:'wikidata:Q13417189',status:'want',rating:0};
  const a=AccountLibrary.toSyncEntry(titleA),b=AccountLibrary.toSyncEntry(titleB);
  assert.equal(`${a.provider}:${a.providerId}`,`${b.provider}:${b.providerId}`);
  assert.deepEqual([a.status,a.rating,b.status,b.rating],['done',9,'want',0]);
});

test('joined rows restore only that relationship personal state', () => {
  const shared={id:'title-1',provider:'wikidata',provider_id:'Q13417189',media_type:'movie',title:'Interstellar',release_year:2014,genres:['Sci-Fi'],metadata:{catalogId:'wikidata:Q13417189'}};
  const [a,b]=AccountLibrary.fromRows([
    {id:'a-entry',title_id:'title-1',status:'done',rating:9,favorite:true,current_season:1,current_episode:0,current_page:0,current_chapter:0,stopped_at_sec:0,notes:'A',tags:[],created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-02T00:00:00Z',title:shared},
    {id:'b-entry',title_id:'title-1',status:'want',rating:0,favorite:false,current_season:1,current_episode:0,current_page:0,current_chapter:0,stopped_at_sec:0,notes:'B',tags:[],created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-03T00:00:00Z',title:shared}
  ]);
  assert.equal(a.titleId,b.titleId);
  assert.deepEqual([a.id,a.status,a.rating,a.notes],['a-entry','done',9,'A']);
  assert.deepEqual([b.id,b.status,b.rating,b.notes],['b-entry','want',0,'B']);
});

test('migration enforces ownership, uniqueness, restricted RPC execution, and safe legacy retention', () => {
  assert.match(migration,/unique \(user_id, title_id\)/i);
  for(const operation of ['select','insert','update','delete']) assert.match(migration,new RegExp(`Users ${operation} own library`,`i`));
  assert.match(migration,/using \(\(select auth\.uid\(\)\) is not null and \(select auth\.uid\(\)\) = user_id\)/i);
  assert.match(migration,/with check \(\(select auth\.uid\(\)\) is not null and \(select auth\.uid\(\)\) = user_id\)/i);
  assert.match(migration,/revoke execute on function public\.sync_my_library\(jsonb,jsonb\) from public, anon/i);
  assert.match(migration,/grant execute on function public\.sync_my_library\(jsonb,jsonb\) to authenticated/i);
  assert.doesNotMatch(migration,/sync_my_library\s*\([^)]*user_id/i);
  assert.doesNotMatch(migration,/drop table\s+(if exists\s+)?public\.user_libraries/i);
  assert.match(migration,/select user_id, state from public\.user_libraries/i);
  assert.match(identityMigration,/if new\.provider = 'reel'/i);
  assert.match(identityMigration,/new\.provider_id := md5/i);
});

test('frontend sync never sends an owner id and does not persist signed-in state in the guest key', () => {
  const html=fs.readFileSync(path.resolve(__dirname,'../reel.html'),'utf8');
  assert.match(html,/rpc\('sync_my_library',\{p_entries:entries,p_preferences:state\.ui\}\)/);
  assert.doesNotMatch(html,/rpc\('sync_my_library',[^\n]*user[_A-Z]?id/i);
  assert.match(html,/if\(cloud\.user\)\{scheduleCloudSync\(\);return;\}/);
  assert.match(html,/localStorage\.setItem\(GUEST_KEY/);
  assert.doesNotMatch(html,/localStorage\.setItem\([^,]+,\s*JSON\.stringify\(state\)\)[\s\S]{0,80}scheduleCloudSync/);
});
