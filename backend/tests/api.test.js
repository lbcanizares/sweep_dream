import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {MongoClient} from 'mongodb';
import {createApp,checklist} from '../server/app.js';

test('MERN booking lifecycle, login requirement, ownership, validation, and slot conflicts',async()=>{
  const mongo=await MongoMemoryServer.create();
  const client=new MongoClient(mongo.getUri());await client.connect();
  const app=await createApp(client.db('test'),'test-key');const server=app.listen(0,'127.0.0.1');
  await new Promise(r=>server.once('listening',r));
  const base='http://127.0.0.1:'+server.address().port+'/api';
  const request=async(path,method='GET',body,headers={})=>{const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...headers},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};
  const admin={Authorization:'Bearer test-key'};
  const date=new Date(Date.now()+3*86400000).toISOString().slice(0,10);
  const input={name:'Dwight Demo',contact:'demo@example.test',room:'Demo Dorm 204',size:'small',date,time:'09:00'};
  try{
    // Admin routes stay protected.
    assert.equal((await request('/admin/bookings')).status,401);

    // Login is required to book.
    assert.equal((await request('/bookings','POST',input)).status,401);
    assert.equal((await request('/account/bookings')).status,401);

    // Sign up and get a session cookie.
    const signup=await fetch(base+'/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Dwight Demo',email:'dwight@example.test',password:'DemoPassword123!'})});
    assert.equal(signup.status,201);const cookie=signup.headers.get('set-cookie').split(';')[0];
    const account=await signup.json();assert.equal(account.user.passwordHash,undefined);
    assert.ok(signup.headers.get('set-cookie').includes('HttpOnly'));
    assert.equal((await request('/auth/me','GET',undefined,{Cookie:cookie})).data.user.name,'Dwight Demo');
    assert.equal((await request('/auth/signup','POST',{name:'Other Demo',email:'DWIGHT@example.test',password:'DemoPassword123!'})).status,409);
    assert.equal((await request('/auth/login','POST',{email:'dwight@example.test',password:'incorrect'})).status,401);

    // Validation (logged in).
    assert.equal((await request('/bookings','POST',{...input,date:'2026-02-30'},{Cookie:cookie})).status,400);
    assert.equal((await request('/bookings','POST',{...input,size:'mansion'},{Cookie:cookie})).status,400);

    // Booking belongs to the logged-in account.
    const signed=await request('/bookings','POST',{...input,time:'11:00'},{Cookie:cookie});assert.equal(signed.status,201);
    assert.equal(signed.data.token,undefined);assert.equal(signed.data.userId,undefined);
    assert.equal((await request('/account/bookings','GET',undefined,{Cookie:cookie})).data.length,1);
    assert.equal((await request('/bookings/'+signed.data.id,'GET',undefined,{Cookie:cookie})).status,200);
    assert.equal((await request('/bookings/'+signed.data.id)).status,401);

    // Logout and log back in.
    assert.equal((await request('/auth/logout','POST',{}, {Cookie:cookie})).status,200);
    assert.equal((await request('/auth/me','GET',undefined,{Cookie:cookie})).data.user,null);
    assert.equal((await request('/bookings','POST',input,{Cookie:cookie})).status,401);
    const login=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'dwight@example.test',password:'DemoPassword123!'})});assert.equal(login.status,200);
    const me={Cookie:login.headers.get('set-cookie').split(';')[0]};
    assert.equal((await request('/account/bookings','GET',undefined,me)).data.length,1);

    // A different user cannot see or change this booking.
    const other=await fetch(base+'/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Other Demo',email:'other@example.test',password:'OtherPassword123!'})});assert.equal(other.status,201);
    const otherCookie={Cookie:other.headers.get('set-cookie').split(';')[0]};
    assert.equal((await request('/bookings/'+signed.data.id,'GET',undefined,otherCookie)).status,404);
    assert.equal((await request('/bookings/'+signed.data.id+'/cancel','POST',{},otherCookie)).status,404);
    assert.equal((await request('/account/bookings','GET',undefined,otherCookie)).data.length,0);

    // Passwords are stored hashed.
    const storedUser=await client.db('test').collection('users').findOne({email:'dwight@example.test'});assert.notEqual(storedUser.passwordHash,'DemoPassword123!');assert.equal(storedUser.password,undefined);

    // Server calculates the price; client-supplied price is ignored.
    const a=await request('/bookings','POST',{...input,price:1},me);assert.equal(a.status,201);assert.equal(a.data.price,300);assert.equal(a.data.status,'pending');
    const id=a.data.id;
    const b=await request('/bookings','POST',input,me);assert.equal(b.status,201);

    // Feedback and status rules.
    assert.equal((await request('/bookings/'+id+'/feedback','POST',{rating:5},me)).status,409);
    assert.equal((await request('/admin/bookings/'+id,'PATCH',{status:'completed',completedChecklist:checklist},admin)).status,409);

    // Slot conflicts.
    assert.equal((await request('/admin/bookings/'+id,'PATCH',{status:'confirmed',cleaner:'Demo Cleaner'},admin)).status,200);
    assert.equal((await request('/admin/bookings/'+b.data.id,'PATCH',{status:'confirmed',cleaner:'Demo Cleaner'},admin)).status,409);
    assert.equal((await request('/bookings','POST',input,me)).status,409);
    const available=await request('/availability?date='+date);assert.equal(available.status,200);assert.ok(!available.data.slots.includes('09:00'));assert.equal((await request('/availability?date=bad')).status,400);

    // Completion.
    assert.equal((await request('/admin/bookings/'+id,'PATCH',{status:'completed',completedChecklist:[]},admin)).status,400);
    assert.equal((await request('/admin/bookings/'+id,'PATCH',{status:'completed',completedChecklist:checklist},admin)).status,200);
    assert.ok(!(await request('/availability?date='+date)).data.slots.includes('09:00'));
    assert.equal((await request('/bookings/'+id+'/cancel','POST',{},me)).status,409);

    // Feedback.
    assert.equal((await request('/bookings/'+id+'/feedback','POST',{rating:5},otherCookie)).status,404);
    assert.equal((await request('/bookings/'+id+'/feedback','POST',{rating:6},me)).status,400);
    assert.equal((await request('/bookings/'+id+'/feedback','POST',{rating:5,comment:'Saved time'},me)).status,200);
    assert.equal((await request('/bookings/'+id+'/feedback','POST',{rating:4},me)).status,409);

    // Cancel the other pending booking.
    assert.equal((await request('/bookings/'+b.data.id+'/cancel','POST',{},me)).status,200);
    assert.equal((await request('/admin/bookings','GET',undefined,admin)).data.length,3);
    assert.equal((await client.db('test').collection('bookings').findOne({id})).feedback.rating,5);
  } finally {await new Promise(r=>server.close(r));await client.close();await mongo.stop();}
});