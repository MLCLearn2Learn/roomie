const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {PGlite}=require('@electric-sql/pglite');
test('real PostgreSQL migration, grants, non-consuming reads, acknowledgement, expiry and isolation',async()=>{
 const db=new PGlite();try{
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE TABLE public.transfers(id text primary key,blob text); INSERT INTO public.transfers VALUES ('legacy','unchanged'); CREATE FUNCTION public.take_transfer(text) RETURNS text LANGUAGE sql AS $$ SELECT 'legacy-result'::text $$;`);
 const migration=fs.readFileSync('supabase/transfer_v2.sql','utf8');await db.exec(migration);await db.exec(migration);
 const q=async(sql,params=[])=>(await db.query(sql,params)).rows;
 const value=async(sql,params=[])=>(await q(sql,params))[0].value;
 await db.exec('SET ROLE anon');
 for(const operation of ['SELECT * FROM public.transfers_v2',"INSERT INTO public.transfers_v2(id,blob) VALUES ('AAAAAAAAAAAAAAAAAAAAAA','v2.'||repeat('a',40))",'DELETE FROM public.transfers_v2'])await assert.rejects(db.exec(operation),/permission denied/);
 const id='AAAAAAAAAAAAAAAAAAAAAA',blob='v2.r.'+'a'.repeat(40);
 for(const invalid of [null,'short','A'.repeat(23),'!'.repeat(22)])assert.equal(await value('SELECT public.put_transfer_v2($1,$2) AS value',[invalid,blob]),false);
 for(const invalid of [null,'v2.short','v1.'+'a'.repeat(40),'v2.'+'a'.repeat(4000000)])assert.equal(await value('SELECT public.put_transfer_v2($1,$2) AS value',[id,invalid]),false);
 assert.equal(await value('SELECT public.put_transfer_v2($1,$2) AS value',[id,blob]),true);
 assert.equal(await value('SELECT public.put_transfer_v2($1,$2) AS value',[id,blob]),false);
 for(let i=0;i<2;i++)assert.equal(await value('SELECT public.peek_transfer_v2($1) AS value',[id]),blob);
 assert.equal(await value('SELECT public.finish_transfer_v2($1) AS value',[id]),true);
 assert.equal(await value('SELECT public.finish_transfer_v2($1) AS value',[id]),false);
 assert.equal(await value('SELECT public.peek_transfer_v2($1) AS value',[id]),null);
 for(const invalid of [null,'bad']){
 assert.equal(await value('SELECT public.peek_transfer_v2($1) AS value',[invalid]),null);
 assert.equal(await value('SELECT public.finish_transfer_v2($1) AS value',[invalid]),false);}
 await db.exec('RESET ROLE');
 await db.query("INSERT INTO public.transfers_v2(id,blob,created_at) VALUES ($1,$2,now()-interval '31 minutes')",[id,blob]);
 await db.exec('SET ROLE anon');assert.equal(await value('SELECT public.peek_transfer_v2($1) AS value',[id]),null);assert.equal(await value('SELECT public.finish_transfer_v2($1) AS value',[id]),false);
 assert.equal(await value('SELECT public.put_transfer_v2($1,$2) AS value',['B'.repeat(22),blob]),true);
 await db.exec('RESET ROLE');assert.equal(await value('SELECT count(*)::int AS value FROM public.transfers_v2 WHERE id=$1',[id]),0);
 assert.equal(await value('SELECT blob AS value FROM public.transfers WHERE id=\'legacy\''),'unchanged');
 assert.equal(await value("SELECT public.take_transfer('anything') AS value"),'legacy-result');
 assert.equal(await value("SELECT to_regprocedure('public.take_transfer_v2(text)')::text AS value"),null);
 await db.exec('SET ROLE authenticated');await assert.rejects(db.exec("SELECT public.peek_transfer_v2('AAAAAAAAAAAAAAAAAAAAAA')"),/permission denied/);await db.exec('RESET ROLE');
 const funcs=await q("SELECT p.prosecdef,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('put_transfer_v2','peek_transfer_v2','finish_transfer_v2')");
 assert.equal(funcs.length,3);assert.ok(funcs.every(f=>f.prosecdef&&f.proconfig.some(s=>s.startsWith('search_path='))));
 }finally{await db.close();}
});
