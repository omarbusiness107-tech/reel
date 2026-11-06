import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("additive mobile RPC preserves accounts, memberships and owner isolation in real Postgres", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth,public TO anon,authenticated;
      GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;
      INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');`);
    await db.exec(
      await readFile(
        new URL(
          "../../supabase/migrations/20260923232252_account_library_ownership.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../../supabase/migrations/20261106165224_mobile_add_my_title.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      `SET ROLE authenticated; SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';`,
    );
    const entry = {
      provider: "imdb",
      providerId: "tt1",
      mediaType: "movie",
      title: "Test film",
      status: "suggested",
      metadata: { notes: "must never be public", catalogId: "imdb:tt1" },
    };
    const inserted = await db.query<{ id: string }>(
      "SELECT public.add_my_title($1::jsonb) AS id",
      [JSON.stringify(entry)],
    );
    const id = inserted.rows[0].id;
    await db.query(
      "UPDATE public.user_titles SET status=$1,rating=9,notes=$2 WHERE id=$3",
      ["done", "private A", id],
    );
    const duplicate = await db.query<{ id: string }>(
      "SELECT public.add_my_title($1::jsonb) AS id",
      [JSON.stringify(entry)],
    );
    assert.equal(duplicate.rows[0].id, id);
    const kept = await db.query<{
      status: string;
      rating: string;
      notes: string;
    }>("SELECT status,rating,notes FROM public.user_titles WHERE id=$1", [id]);
    assert.equal(kept.rows[0].status, "done");
    assert.equal(Number(kept.rows[0].rating), 9);
    assert.equal(kept.rows[0].notes, "private A");
    const catalog = await db.query<{ metadata: Record<string, unknown> }>(
      "SELECT metadata FROM public.titles",
    );
    assert.equal(catalog.rows[0].metadata.notes, undefined);
    await db.exec(
      `SET request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';`,
    );
    assert.equal(
      (await db.query("SELECT * FROM public.user_titles")).rows.length,
      0,
    );
    const second = await db.query<{ id: string }>(
      "SELECT public.add_my_title($1::jsonb) AS id",
      [
        JSON.stringify({
          ...entry,
          user_id: "11111111-1111-4111-8111-111111111111",
        }),
      ],
    );
    assert.notEqual(second.rows[0].id, id);
    assert.equal(
      (
        await db.query(
          "UPDATE public.user_titles SET notes=$1 WHERE id=$2 RETURNING id",
          ["attack", id],
        )
      ).rows.length,
      0,
    );
    await db.query("SELECT public.add_my_title($1::jsonb)", [
      JSON.stringify({ ...entry, providerId: "tt2", title: "Another film" }),
    ]);
    assert.equal(
      (await db.query("SELECT * FROM public.user_titles")).rows.length,
      2,
    );
    assert.equal(
      (await db.query("SELECT * FROM public.titles")).rows.length,
      2,
    );
    await db.exec("RESET ROLE; SET ROLE anon;");
    await assert.rejects(
      db.query("SELECT public.add_my_title($1::jsonb)", [
        JSON.stringify(entry),
      ]),
    );
    await db.exec(
      `RESET ROLE; SET ROLE authenticated; SET request.jwt.claim.sub='';`,
    );
    await assert.rejects(
      db.query("SELECT public.add_my_title($1::jsonb)", [
        JSON.stringify(entry),
      ]),
    );
  } finally {
    await db.close();
  }
});
