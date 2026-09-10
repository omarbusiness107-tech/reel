const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHandler, schemas } = require('../api/recommend.js');
const env = { OPENAI_API_KEY: 'test-secret', OPENAI_MODEL: 'test-model', REEL_AI_ALLOWED_USER_IDS: 'allowed-user' };
function response() { return { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(s) { this.code = s; return this; }, json(body) { this.body = body; return this; } }; }
async function invoke(handler, body, headers = { authorization: 'Bearer test.token' }, method = 'POST') {
  const res = response(); await handler({ body, headers, method }, res); return res;
}
const valid = { action: 'interpret', message: 'rain', intent: { source: 'library' } };
test('unconfigured service is explicit; no provider calls', async () => {
  const handler = createHandler({ env: {}, request: () => assert.fail('must not fetch') });
  assert.equal((await invoke(handler, valid)).code, 503);
  assert.deepEqual((await invoke(handler, null, {}, 'GET')).body, { configured: false });
});
test('authentication is required before any paid AI call', async () => {
  const handler = createHandler({ env, request: () => assert.fail('must not fetch') });
  assert.equal((await invoke(handler, valid, {})).code, 401);
});
test('valid but unapproved users cannot spend AI credits', async () => {
  let calls = 0;
  const handler = createHandler({ env, request: async () => { calls++; return { ok: true, json: async () => ({ id: 'other-user' }) }; } });
  assert.equal((await invoke(handler, valid)).code, 403); assert.equal(calls, 1);
});
test('rejects malformed, oversized, unknown-method requests', async () => {
  const handler = createHandler({ env, request: () => assert.fail('must not fetch') });
  assert.equal((await invoke(handler, '{')).code, 400);
  assert.equal((await invoke(handler, { action: 'interpret', message: 'a'.repeat(64001) })).code, 413);
  assert.equal((await invoke(handler, { action: 'rank', candidates: [] })).code, 400);
  assert.equal((await invoke(handler, valid, {}, 'DELETE')).code, 405);
});
test('structured interpretation uses server key, no persistence, and strict schema', async () => {
  let sent;
  const handler = createHandler({ env, request: async (url, options) => {
    if (url.includes('/auth/')) return { ok: true, json: async () => ({ id: 'allowed-user' }) };
    sent = JSON.parse(options.body); assert.equal(options.headers.Authorization, 'Bearer test-secret');
    return { ok: true, json: async () => ({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ update: { themes: ['atmospheric'] }, question: null, suggestions: [], searchHints: [{ title: 'Real catalog query', type: 'movie' }] }) }] }] }) };
  } });
  const res = await invoke(handler, valid);
  assert.equal(res.code, 200); assert.equal(sent.store, false); assert.equal(sent.text.format.strict, true);
  assert.equal(sent.model, 'test-model'); assert.ok(!JSON.stringify(res.body).includes('test-secret'));
});
test('Vercel production uses AI Gateway OIDC and the hosted GPT model', async () => {
  let gatewayCall;
  const gatewayEnv = { VERCEL: '1', REEL_AI_MODEL: 'openai/gpt-4.1-mini' };
  const handler = createHandler({ env: gatewayEnv, getOidcToken: async () => 'vercel-oidc-token', request: async (url, options) => {
    if (url.includes('/auth/')) return { ok: true, json: async () => ({ id: 'gateway-user' }) };
    gatewayCall = { url, options, body: JSON.parse(options.body) };
    return { ok: true, json: async () => ({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ update: { themes: ['hopeful'] }, question: null, suggestions: [], searchHints: [] }) }] }] }) };
  } });
  const status = await invoke(handler, null, {}, 'GET');
  const res = await invoke(handler, valid);
  assert.deepEqual(status.body, { configured: true });
  assert.equal(res.code, 200);
  assert.equal(gatewayCall.url, 'https://ai-gateway.vercel.sh/v1/responses');
  assert.equal(gatewayCall.options.headers.Authorization, 'Bearer vercel-oidc-token');
  assert.equal(gatewayCall.options.headers['ai-reporting-user'], 'gateway-user');
  assert.equal(gatewayCall.options.headers['ai-reporting-tags'], 'feature:reel-recommendations');
  assert.equal(gatewayCall.body.model, 'openai/gpt-4.1-mini');
  assert.equal(gatewayCall.body.store, false);
});
test('ranking rejects invented IDs and unsupported evidence', async () => {
  const handler = createHandler({ env, request: async url => {
    if (url.includes('/auth/')) return { ok: true, json: async () => ({ id: 'allowed-user' }) };
    return { ok: true, json: async () => ({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ choices: [
      { id: 'invented', fits: true, why: 'Made up', evidence: { field: 'genres', quote: 'Comedy' } },
      { id: 'real', fits: true, why: 'Made up', evidence: { field: 'synopsis', quote: 'Spaceships everywhere' } },
      { id: 'real', fits: true, why: 'A comedy matches your funny request.', evidence: { field: 'genres', quote: 'Comedy' } }
    ] }) }] }] }) };
  } });
  const res = await invoke(handler, { action: 'rank', intent: { source: 'library' }, candidates: [{ id: 'real', title: 'Real', type: 'movie', genres: ['Comedy'], inLibrary: true }] });
  assert.deepEqual(res.body.choices, [{ id: 'real', why: 'A comedy matches your funny request.' }]);
});
test('provider refusal and incomplete output are recoverable errors', async () => {
  const handler = createHandler({ env, request: async url => url.includes('/auth/') ? { ok: true, json: async () => ({ id: 'allowed-user' }) } : { ok: true, json: async () => ({ status: 'incomplete', output: [] }) } });
  assert.equal((await invoke(handler, valid)).code, 502);
});
test('every structured-output object disallows extra keys and requires all properties', () => {
  function check(s) { if (s.type === 'object') { assert.equal(s.additionalProperties, false); assert.deepEqual(s.required, Object.keys(s.properties)); Object.values(s.properties).forEach(check); } if (s.items) check(s.items); }
  Object.values(schemas).forEach(check);
});
test('per-process rate guard refuses further paid calls after forty requests', async () => {
  let paid = 0;
  const handler = createHandler({ env: { ...env, REEL_AI_ALLOWED_USER_IDS: 'rate-test-user' }, request: async url => {
    if (url.includes('/auth/')) return { ok: true, json: async () => ({ id: 'rate-test-user' }) };
    paid++; return { ok: false, status: 429 };
  } });
  for (let i = 0; i < 40; i++) assert.equal((await invoke(handler, valid)).code, 429);
  const response = await invoke(handler, valid);
  assert.equal(response.code, 429); assert.match(response.body.error, /request limit/); assert.equal(paid, 40);
});
