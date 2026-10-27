const test=require('node:test');const assert=require('node:assert/strict');const http=require('node:http');const app=require('../server');let server;let port;
test.before(async()=>{server=http.createServer(app);await new Promise(r=>server.listen(0,r));port=server.address().port});
test.after(()=>server.close());
test('home page renders catalog',async()=>{const r=await fetch(`http://localhost:${port}/`);assert.equal(r.status,200);assert.match(await r.text(),/SecureCart/);});
test('unknown route returns branded 404',async()=>{const r=await fetch(`http://localhost:${port}/does-not-exist`);assert.equal(r.status,404);assert.match(await r.text(),/Page not found/);});
test('login page exposes CSRF token',async()=>{const r=await fetch(`http://localhost:${port}/login`);assert.equal(r.status,200);assert.match(await r.text(),/_csrf/);});
