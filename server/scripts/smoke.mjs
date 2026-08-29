/**
 * Black-box smoke test. Hits a running server and checks the critical paths:
 * catalog, auth (login / me / refresh / logout), the OTP sign-up flow, and
 * signature CRUD + publish. No dependencies — just built-in fetch.
 *
 *   npm run smoke                 # against http://localhost:5000
 *   BASE=https://api.example.com npm run smoke
 *
 * Exit code is 0 on all-pass, 1 otherwise.
 */

const BASE = (process.env.BASE || 'http://localhost:5000').replace(/\/$/, '') + '/api';
const DEMO = { email: 'demo@signoff.app', password: 'Signoff123' };

let pass = 0;
let fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) {
    pass += 1;
    console.log('  ✓ ' + name);
  } else {
    fail += 1;
    console.log('  ✗ ' + name + (extra ? '  — ' + extra : ''));
  }
};

const cookies = {};
async function req(method, path, { body, auth } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = 'Bearer ' + auth;
  const ck = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  if (ck) headers.Cookie = ck;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const m = setCookie.match(/sg_rt=([^;]+)/);
    if (m) cookies.sg_rt = m[1];
  }
  let json = {};
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, body: json };
}

async function run() {
  console.log(`\nsmoke: ${BASE}\n`);

  ok('GET /health', (await req('GET', '/health')).status === 200);

  const cat = await req('GET', '/signatures/catalog');
  ok('GET /signatures/catalog', cat.status === 200);
  ok('catalog: templates present', Array.isArray(cat.body.templates) && cat.body.templates.length > 0);
  ok('catalog: animations present', Array.isArray(cat.body.animations) && cat.body.animations.length > 0);

  ok('login rejects bad creds', (await req('POST', '/auth/login', { body: { email: 'no@no.no', password: 'x' } })).status === 401);
  ok('register/start rejects bad email', (await req('POST', '/auth/register/start', { body: { name: 'a', email: 'nope', password: 'Password1' } })).status === 422);

  const login = await req('POST', '/auth/login', { body: DEMO });
  ok('demo login', login.status === 200 && !!login.body.accessToken, JSON.stringify(login.body).slice(0, 120));
  const token = login.body.accessToken;

  ok('GET /auth/me with token', (await req('GET', '/auth/me', { auth: token })).status === 200);
  ok('GET /auth/me without token 401', (await req('GET', '/auth/me')).status === 401);

  const refresh = await req('POST', '/auth/refresh');
  ok('POST /auth/refresh via cookie', refresh.status === 200 && !!refresh.body.accessToken);
  const token2 = refresh.body.accessToken || token;

  const list = await req('GET', '/signatures', { auth: token2 });
  ok('GET /signatures', list.status === 200 && Array.isArray(list.body.signatures));
  ok('GET /signatures without auth 401', (await req('GET', '/signatures')).status === 401);

  const sig = list.body.signatures[0];
  if (sig) {
    const original = { ...sig };
    const upd = await req('PUT', `/signatures/${sig.id}`, { auth: token2, body: { ...sig, role: 'Smoke Test' } });
    ok('PUT /signatures/:id', upd.status === 200 && upd.body.signature.role === 'Smoke Test');

    const pub = await req('POST', `/signatures/${sig.id}/publish`, { auth: token2 });
    ok('POST /signatures/:id/publish', pub.status === 200 && typeof pub.body.html === 'string' && pub.body.bytes > 0);

    await req('PUT', `/signatures/${sig.id}`, { auth: token2, body: original }); // restore
  } else {
    ok('demo signature exists', false, 'run: npm run seed');
  }

  ok('publish unknown id 404', (await req('POST', '/signatures/000000000000000000000000/publish', { auth: token2 })).status === 404);

  // OTP sign-up flow. The full send/verify path runs only when SMTP is off
  // (the server hands back the code); with SMTP on we do a single start call
  // and stop, so a smoke run doesn't spew verification emails.
  const email = `smoke+${Date.now()}@example.com`;
  const probe = await req('POST', '/auth/register/start', { body: { name: 'Smoke', email, password: 'Password1' } });
  ok('register/start returns 202', probe.status === 202);
  if (probe.body.devCode) {
    ok('register/start returns a dev code (SMTP off)', /^\d{6}$/.test(probe.body.devCode));
    ok('verify rejects wrong code', (await req('POST', '/auth/register/verify', { body: { email, code: '000000' } })).status === 400);
    const verified = await req('POST', '/auth/register/verify', { body: { email, code: probe.body.devCode } });
    ok('verify accepts correct code + issues session', verified.status === 201 && !!verified.body.accessToken);
    ok('re-registering same email 409', (await req('POST', '/auth/register/start', { body: { name: 'x', email, password: 'Password1' } })).status === 409);
  } else {
    console.log('  (SMTP enabled — skipping the OTP send/verify assertions)');
  }

  ok('POST /auth/logout', (await req('POST', '/auth/logout')).status === 200);

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
}

run().catch((err) => {
  console.error('\nsmoke run failed:', err.message);
  process.exit(1);
});
