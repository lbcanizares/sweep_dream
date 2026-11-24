import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {MongoClient} from 'mongodb';
import {createApp,checklist,deepChecklist} from '../server/app.js';

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
    assert.equal((await request('/bookings','POST',{...input,serviceId:'mansion'},{Cookie:cookie})).status,400);
    // Card payment is listed as coming soon and cannot be chosen yet.
    const card=(await request('/config')).data.paymentMethods.find(p=>p.id==='card');
    assert.equal(card.available,false);
    assert.equal((await request('/bookings','POST',{...input,paymentMethod:'card'},{Cookie:cookie})).status,400);

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
    const a=await request('/bookings','POST',{...input,price:1},me);assert.equal(a.status,201);assert.equal(a.data.price,500);assert.equal(a.data.status,'pending');
    const id=a.data.id;
    const b=await request('/bookings','POST',input,me);assert.equal(b.status,201);

    // Feedback and status rules.
    assert.equal((await request('/bookings/'+id+'/feedback','POST',{rating:5},me)).status,409);
    assert.equal((await request('/admin/bookings/'+id,'PATCH',{status:'completed',completedChecklist:checklist},admin)).status,409);

    // Public sign-up always makes customers, even if a role is sent.
    const sneaky=await request('/auth/signup','POST',{name:'Sneaky Demo',email:'sneaky@example.test',password:'SneakyPassword123!',role:'cleaner'});
    assert.equal(sneaky.status,201);assert.equal(sneaky.data.user.role,'customer');

    // Only the admin can create cleaner accounts.
    const cleanerInput={name:'Ana Demo',email:'ana@example.test',password:'CleanerPass123!',phone:'0917 000 0000',photoUrl:'https://example.test/ana.jpg',serviceTypes:['Dorm'],idChecked:true,backgroundChecked:true};
    assert.equal((await request('/admin/cleaners','POST',cleanerInput)).status,401);
    assert.equal((await request('/admin/cleaners','POST',cleanerInput,me)).status,401);
    assert.equal((await request('/admin/cleaners','POST',{...cleanerInput,photoUrl:'javascript:alert(1)'},admin)).status,400);
    const ana=await request('/admin/cleaners','POST',cleanerInput,admin);assert.equal(ana.status,201);assert.equal(ana.data.passwordHash,undefined);
    assert.equal((await request('/admin/cleaners','POST',cleanerInput,admin)).status,409);
    const unscreened=await request('/admin/cleaners','POST',{...cleanerInput,name:'Ben Demo',email:'ben@example.test'},admin);
    assert.equal((await request('/admin/cleaners/'+unscreened.data.id,'PATCH',{idChecked:false,backgroundChecked:false},admin)).status,200);
    assert.equal((await request('/admin/cleaners','GET',undefined,admin)).data.length,2);

    // The cleaner logs in on the same page as customers and gets the cleaner role.
    const anaLogin=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'ana@example.test',password:'CleanerPass123!'})});
    assert.equal(anaLogin.status,200);assert.equal((await anaLogin.json()).user.role,'cleaner');
    const anaCookie={Cookie:anaLogin.headers.get('set-cookie').split(';')[0]};
    assert.equal((await request('/cleaner/jobs','GET',undefined,anaCookie)).data.jobs.length,0);
    assert.equal((await request('/cleaner/jobs','GET',undefined,me)).status,403);
    assert.equal((await request('/cleaner/jobs')).status,401);

    // Assignment needs a screened, active cleaner.
    assert.equal((await request('/admin/bookings/'+id,'PATCH',{status:'confirmed',cleanerId:'missing'},admin)).status,400);
    assert.equal((await request('/admin/bookings/'+id,'PATCH',{status:'confirmed',cleanerId:unscreened.data.id},admin)).status,400);

    // Slot conflicts.
    const confirmed=await request('/admin/bookings/'+id,'PATCH',{status:'confirmed',cleanerId:ana.data.id},admin);
    assert.equal(confirmed.status,200);assert.equal(confirmed.data.cleaner,'Ana Demo');assert.equal(confirmed.data.cleanerPhotoUrl,cleanerInput.photoUrl);
    assert.equal((await request('/admin/bookings/'+b.data.id,'PATCH',{status:'confirmed',cleanerId:ana.data.id},admin)).status,409);

    // A cleaner with an active job can't be deactivated until it is reassigned, finished or cancelled.
    const blocked=await request('/admin/cleaners/'+ana.data.id,'PATCH',{active:false},admin);
    assert.equal(blocked.status,409);assert.deepEqual(blocked.data.activeJobs,[id]);
    assert.equal((await request('/admin/cleaners/'+ana.data.id,'PATCH',{phone:'0917 000 1111'},admin)).status,200);

    // Reassigning a confirmed job: only to another screened, active cleaner.
    const dee=await request('/admin/cleaners','POST',{...cleanerInput,name:'Dee Demo',email:'dee@example.test'},admin);
    assert.equal((await request('/admin/bookings/'+id+'/reassign','POST',{cleanerId:unscreened.data.id},admin)).status,400);
    assert.equal((await request('/admin/bookings/'+id+'/reassign','POST',{cleanerId:ana.data.id},admin)).status,400);
    assert.equal((await request('/admin/bookings/'+id+'/reassign','POST',{cleanerId:dee.data.id},me)).status,401);
    const moved=await request('/admin/bookings/'+id+'/reassign','POST',{cleanerId:dee.data.id},admin);
    assert.equal(moved.status,200);assert.equal(moved.data.cleaner,'Dee Demo');assert.equal(moved.data.status,'confirmed');
    assert.equal((await request('/cleaner/jobs','GET',undefined,anaCookie)).data.jobs.length,0);
    assert.equal((await request('/admin/cleaners/'+ana.data.id,'PATCH',{active:false},admin)).status,200);
    assert.equal((await request('/admin/cleaners/'+ana.data.id,'PATCH',{active:true},admin)).status,200);
    assert.equal((await request('/admin/bookings/'+id+'/reassign','POST',{cleanerId:ana.data.id},admin)).status,200);
    assert.equal((await request('/bookings','POST',input,me)).status,409);
    const available=await request('/availability?date='+date);assert.equal(available.status,200);assert.ok(!available.data.slots.includes('09:00'));assert.equal((await request('/availability?date=bad')).status,400);

    // The cleaner moves their own job forward one step at a time.
    const jobs=await request('/cleaner/jobs','GET',undefined,anaCookie);assert.equal(jobs.data.jobs.length,1);assert.equal(jobs.data.jobs[0].customer,'Dwight Demo');assert.equal(jobs.data.jobs[0].userId,undefined);
    const otherCleaner=await request('/admin/cleaners','POST',{...cleanerInput,name:'Cara Demo',email:'cara@example.test'},admin);
    const caraLogin=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'cara@example.test',password:'CleanerPass123!'})});
    const caraCookie={Cookie:caraLogin.headers.get('set-cookie').split(';')[0]};
    assert.equal((await request('/cleaner/jobs/'+id,'PATCH',{status:'on_the_way'},caraCookie)).status,404);
    assert.equal((await request('/cleaner/jobs/'+id,'PATCH',{status:'in_progress'},anaCookie)).status,409);
    assert.equal((await request('/cleaner/jobs/'+id,'PATCH',{status:'on_the_way'},anaCookie)).data.status,'on_the_way');
    // Once the cleaner has set off, the job can't be reassigned and they still can't be deactivated.
    assert.equal((await request('/admin/bookings/'+id+'/reassign','POST',{cleanerId:dee.data.id},admin)).status,409);
    assert.equal((await request('/admin/cleaners/'+ana.data.id,'PATCH',{active:false},admin)).status,409);
    assert.equal((await request('/bookings/'+id+'/cancel','POST',{},me)).status,409);
    assert.ok(!(await request('/availability?date='+date)).data.slots.includes('09:00'));
    assert.equal((await request('/cleaner/jobs/'+id,'PATCH',{status:'in_progress'},anaCookie)).status,200);

    // Completion requires the full checklist.
    assert.equal((await request('/cleaner/jobs/'+id,'PATCH',{status:'completed',completedChecklist:checklist.slice(1)},anaCookie)).status,400);
    assert.equal((await request('/cleaner/jobs/'+id,'PATCH',{status:'completed',completedChecklist:checklist},anaCookie)).status,200);
    assert.equal((await request('/cleaner/jobs/'+id,'PATCH',{status:'completed',completedChecklist:checklist},anaCookie)).status,409);
    const done=await request('/bookings/'+id,'GET',undefined,me);
    assert.equal(done.data.status,'completed');assert.deepEqual(done.data.statusHistory.map(h=>h.by+':'+h.status),['customer:pending','admin:confirmed','admin:confirmed','admin:confirmed','cleaner:on_the_way','cleaner:in_progress','cleaner:completed']);
    assert.equal(done.data.statusHistory[2].reassignedFrom,ana.data.id);

    // The admin can edit a cleaner's details; customers see the updated name.
    assert.equal((await request('/admin/cleaners/'+ana.data.id,'PATCH',{email:'cara@example.test'},admin)).status,409);
    assert.equal((await request('/admin/cleaners/'+ana.data.id,'PATCH',{photoUrl:'ftp://example.test/a.jpg'},admin)).status,400);
    assert.equal((await request('/admin/cleaners/'+ana.data.id,'PATCH',{name:'Ana'},me)).status,401);
    const edited=await request('/admin/cleaners/'+ana.data.id,'PATCH',{name:'Ana Reyes',phone:'0917 111 2222',email:'ana.reyes@example.test',serviceTypes:['Dorm','Home']},admin);
    assert.equal(edited.status,200);assert.equal(edited.data.email,'ana.reyes@example.test');assert.equal(edited.data.phone,'0917 111 2222');assert.deepEqual(edited.data.serviceTypes,['Dorm','Home']);
    assert.equal((await request('/bookings/'+id,'GET',undefined,me)).data.cleaner,'Ana Reyes');

    // A new password signs the cleaner out; they log back in with the new email and password.
    assert.equal((await request('/admin/cleaners/'+ana.data.id,'PATCH',{password:'NewCleanerPass123!'},admin)).status,200);
    assert.equal((await request('/cleaner/jobs','GET',undefined,anaCookie)).status,401);
    assert.equal((await request('/auth/login','POST',{email:'ana@example.test',password:'CleanerPass123!'})).status,401);
    assert.equal((await request('/auth/login','POST',{email:'ana.reyes@example.test',password:'NewCleanerPass123!'})).status,200);

    // A deactivated cleaner loses access to the portal.
    assert.equal((await request('/admin/cleaners/'+otherCleaner.data.id,'PATCH',{active:false},admin)).status,200);
    assert.equal((await request('/cleaner/jobs','GET',undefined,caraCookie)).status,403);

    // Completion.
    assert.ok(!(await request('/availability?date='+date)).data.slots.includes('09:00'));
    assert.equal((await request('/bookings/'+id+'/cancel','POST',{},me)).status,409);

    // Feedback.
    assert.equal((await request('/bookings/'+id+'/feedback','POST',{rating:5},otherCookie)).status,404);
    assert.equal((await request('/bookings/'+id+'/feedback','POST',{rating:6},me)).status,400);
    assert.equal((await request('/bookings/'+id+'/feedback','POST',{rating:5,comment:'Saved time'},me)).status,200);
    assert.equal((await request('/bookings/'+id+'/feedback','POST',{rating:4},me)).status,409);

    // A dorm deep clean is ₱800 and needs its own checklist (bathroom and linens) to finish.
    const deep=await request('/bookings','POST',{...input,serviceId:'dorm_deep',time:'15:00',price:1},me);
    assert.equal(deep.status,201);assert.equal(deep.data.price,800);
    assert.equal((await request('/admin/bookings/'+deep.data.id,'PATCH',{status:'confirmed',cleanerId:ana.data.id},admin)).status,200);
    assert.equal((await request('/admin/bookings/'+deep.data.id,'PATCH',{status:'completed',completedChecklist:checklist},admin)).status,400);
    const deepDone=await request('/admin/bookings/'+deep.data.id,'PATCH',{status:'completed',completedChecklist:deepChecklist},admin);
    assert.equal(deepDone.status,200);assert.deepEqual(deepDone.data.completedChecklist,deepChecklist);

    // Cancel the other pending booking.
    assert.equal((await request('/bookings/'+b.data.id+'/cancel','POST',{},me)).status,200);
    assert.equal((await request('/admin/bookings','GET',undefined,admin)).data.length,4);
    assert.equal((await client.db('test').collection('bookings').findOne({id})).feedback.rating,5);
  } finally {await new Promise(r=>server.close(r));await client.close();await mongo.stop();}
});