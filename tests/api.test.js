import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {MongoClient} from 'mongodb';
import {createApp,checklist} from '../server/app.js';

test('MERN booking lifecycle, ownership, validation, and slot conflicts',async()=>{
  const mongo=await MongoMemoryServer.create();
  const client=new MongoClient(mongo.getUri());await client.connect();
  const app=await createApp(client.db('test'),'test-key');const server=app.listen(0,'127.0.0.1');
  await new Promise(r=>server.once('listening',r));
  const request=async(path,method='GET',body,headers={})=>{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api'+path,{method,headers:{'Content-Type':'application/json',...headers},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};
  const admin={Authorization:'Bearer test-key'};
  const date=new Date(Date.now()+3*86400000).toISOString().slice(0,10);
  const input={name:'Dwight Demo',contact:'demo@example.test',room:'Demo Dorm 204',size:'small',date,time:'09:00'};
  try{
    assert.equal((await request('/admin/bookings')).status,401);
    assert.equal((await request('/bookings','POST',{...input,date:'2026-02-30'})).status,400);
    assert.equal((await request('/bookings','POST',{...input,size:'mansion'})).status,400);
    const a=await request('/bookings','POST',{...input,price:1});assert.equal(a.status,201);assert.equal(a.data.price,300);assert.equal(a.data.status,'pending');
    const id=a.data.id,owner={'x-booking-token':a.data.token};
    const b=await request('/bookings','POST',input);assert.equal(b.status,201);
    assert.equal((await request('/bookings/'+id)).status,404);
    const read=await request('/bookings/'+id,'GET',undefined,owner);assert.equal(read.status,200);assert.equal(read.data.token,undefined);
    assert.equal((await request('/bookings/'+id+'/feedback','POST',{rating:5},owner)).status,409);
    assert.equal((await request('/admin/bookings/'+id,'PATCH',{status:'completed',completedChecklist:checklist},admin)).status,409);
    assert.equal((await request('/admin/bookings/'+id,'PATCH',{status:'confirmed',cleaner:'Demo Cleaner'},admin)).status,200);
    assert.equal((await request('/admin/bookings/'+b.data.id,'PATCH',{status:'confirmed',cleaner:'Demo Cleaner'},admin)).status,409);
    assert.equal((await request('/bookings','POST',input)).status,409);
    assert.equal((await request('/admin/bookings/'+id,'PATCH',{status:'completed',completedChecklist:[]},admin)).status,400);
    assert.equal((await request('/admin/bookings/'+id,'PATCH',{status:'completed',completedChecklist:checklist},admin)).status,200);
    assert.equal((await request('/bookings/'+id+'/cancel','POST',{},owner)).status,409);
    assert.equal((await request('/bookings/'+id+'/feedback','POST',{rating:6},owner)).status,400);
    assert.equal((await request('/bookings/'+id+'/feedback','POST',{rating:5,comment:'Saved time'},owner)).status,200);
    assert.equal((await request('/bookings/'+id+'/feedback','POST',{rating:4},owner)).status,409);
    assert.equal((await request('/bookings/'+b.data.id+'/cancel','POST',{}, {'x-booking-token':b.data.token})).status,200);
    assert.equal((await request('/admin/bookings','GET',undefined,admin)).data.length,2);
    assert.equal((await client.db('test').collection('bookings').findOne({id})).feedback.rating,5);
  } finally {await new Promise(r=>server.close(r));await client.close();await mongo.stop();}
});
