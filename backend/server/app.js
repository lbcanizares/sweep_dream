import express from 'express';
import {installAuth,hashPassword,validEmail,validPassword} from './auth.js';
import { randomBytes } from 'node:crypto';

// Cleaner checklist for a basic clean; services can add their own items (see dorm_deep).
export const checklist = ['Sweep and mop the room and common area', 'Wipe tables and desks', 'Empty the trash', 'Tidy the common area'];
export const deepChecklist = [...checklist, 'Clean and disinfect the bathroom (toilet, sink, shower, floor)', 'Make the bed and change the linens'];
const prices = {small: 300, standard: 450};
const addons = {laundry:{name:'Laundry fold',price:80}, dishes:{name:'Dishes',price:50}, fridge:{name:'Fridge clean',price:200}};
const payments = [
  {id:'cash',name:'Cash on service',note:'Pay after your cleaning visit',available:true},
  {id:'gcash',name:'GCash',note:'Our team sends payment details after confirming',available:true},
  {id:'card',name:'Card',note:'Card payments are not available yet',available:false}
];
// Only methods marked available can be chosen for a new booking.
const paymentIds = payments.filter(p=>p.available).map(p=>p.id);
// minutes: the longest a visit usually takes, used as the length of calendar reminders.
const services = [
  {id:'basic',minutes:90,name:'Basic dorm cleaning',category:'Dorm',desc:'1 room + common area · about 1–1.5 hrs',hours:'1–1.5 hours',price:500,included:['Sweeping and mopping (1 room and the common area)','Wiping tables and desks','Emptying the trash']},
  {id:'dorm_deep',minutes:150,name:'Dorm deep clean',category:'Dorm',desc:'Basic clean + bathroom and linens · about 2–2.5 hrs',hours:'2–2.5 hours',price:800,included:['Everything in Basic dorm cleaning (1 room and the common area)','Bathroom cleaning and disinfecting (your unit’s own bathroom)','Bed making and linen change (using your own clean sheets)'],checklist:deepChecklist},
  {id:'home_regular',minutes:180,name:'Regular home cleaning',category:'Home',desc:'2-3 hrs · Homes and apartments',hours:'2-3 hours',price:699,included:['Dusting, sweeping, mopping','Kitchen and bathroom wipe-down','Trash removal']},
  {id:'move',minutes:240,name:'Move-in / move-out',category:'Home',desc:'3-4 hrs · Deep sanitation',hours:'3-4 hours',price:1299,included:['Deep sanitation of all rooms','Kitchen and bathroom scrub','Floor mopping and trash removal']}
];
const slots = ['09:00', '11:00', '13:00', '15:00'];
// Statuses that hold a time slot: once a cleaner is assigned until the job is done.
const RESERVED = ['confirmed','on_the_way','in_progress','completed'];
// The only moves a cleaner may make on their own job, one step at a time.
const CLEANER_NEXT = {confirmed:'on_the_way', on_the_way:'in_progress', in_progress:'completed'};
const SERVICE_TYPES = ['Dorm','Home'];
// A cleaner is responsible for these jobs until they are finished, cancelled or reassigned.
const ACTIVE_JOBS = ['confirmed','on_the_way','in_progress'];
// Each service's cleaner checklist (its own, or the basic one).
const checklistFor = serviceId => services.find(s=>s.id===serviceId)?.checklist || checklist;
const checklistDone = (list,serviceId) => Array.isArray(list) && checklistFor(serviceId).every(c=>list.includes(c));
const optionalText = (v,max) => v===undefined || v==='' || (typeof v==='string' && v.length<=max);
const validPhotoUrl = v => v===undefined || v==='' || (typeof v==='string' && v.length<=500 && /^https?:\/\/\S+$/.test(v));
const dateToday = () => new Date().toLocaleDateString('en-CA', {timeZone: 'Asia/Manila'});
export async function createApp(db, adminKey) {
  const app = express();
  app.use(express.json({limit:'16kb'}));
  await installAuth(app,db);
  const bookings = db.collection('bookings');
  await bookings.createIndex({id:1}, {unique:true});
  // One manually assigned cleaner per confirmed slot in this small pilot.
  await bookings.createIndex({date:1,time:1}, {unique:true,partialFilterExpression:{status:'confirmed'}});
  await bookings.createIndex({date:1,time:1}, {name:'reserved_slots',unique:true,partialFilterExpression:{status:{$in:['confirmed','completed']}}});
  // New name so existing databases get it alongside the older index instead of an options conflict.
  await bookings.createIndex({date:1,time:1}, {name:'reserved_slots_v2',unique:true,partialFilterExpression:{status:{$in:RESERVED}}});
  await bookings.createIndex({cleanerId:1,date:1});
  const users = db.collection('users'), cleaners = db.collection('cleaners'), sessions = db.collection('sessions');
  await cleaners.createIndex({id:1}, {unique:true});
  await cleaners.createIndex({userId:1}, {unique:true});
  const admin = (req,res,next) => req.headers.authorization === `Bearer ${adminKey}` ? next() : res.status(401).json({error:'Enter the correct administrator key.'});
  const requireAuth = (req,res,next) => req.user ? next() : res.status(401).json({error:'Please log in or sign up to book a clean.'});
  const publicBooking = b => {const {_id,token,userId,...safe}=b; return safe;};
  const publicCleaner = c => {const {_id,...safe}=c; return safe;};
  // What a cleaner needs for a visit; no account ids, feedback or customer history.
  const jobView = b => ({id:b.id,date:b.date,time:b.time,status:b.status,service:b.service,serviceId:b.serviceId,size:b.size,addons:b.addons,room:b.room,notes:b.notes,customer:b.name,contact:b.contact,price:b.price,paymentMethod:b.paymentMethod,completedChecklist:b.completedChecklist||[],completedAt:b.completedAt||null});
  const historyEntry = (status,by) => ({status,by,at:new Date().toISOString()});
  const assignable = c => c.active && c.screening?.idChecked && c.screening?.backgroundChecked;
  // Cleaner routes: a logged-in cleaner account with an active profile.
  const requireCleaner = async(req,res,next)=>{try{
    if(!req.user)return res.status(401).json({error:'Please log in to see your jobs.'});
    if(req.user.role!=='cleaner')return res.status(403).json({error:'This page is for Sweep Dreams cleaners.'});
    req.cleaner=await cleaners.findOne({userId:req.user.id});
    if(!req.cleaner?.active)return res.status(403).json({error:'Your cleaner account is inactive. Please contact the Sweep Dreams team.'});
    next();
  }catch(e){next(e)}};
  app.get('/api/config', (req,res)=>res.json({prices,services,addons:Object.entries(addons).map(([id,a])=>({id,...a})),paymentMethods:payments,slots,checklist,today:dateToday(),demo:process.argv.includes('--demo')}));
  app.get('/api/availability', async(req,res,next)=>{try {
 const {date}=req.query;
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date<=dateToday())return res.status(400).json({error:'Choose a valid future date.'});
 const occupied=await bookings.find({date,status:{$in:RESERVED}}).project({time:1,_id:0}).toArray();
 res.json({date,slots:slots.filter(slot=>!occupied.some(b=>b.time===slot))});
 }catch(e){next(e)}});
  app.post('/api/bookings', requireAuth, async (req,res,next)=> {
    try {
      const {name,contact,room,size,date,time,notes='',serviceId='basic',addons:chosen=[],paymentMethod='cash'}=req.body;
      const service=services.find(s=>s.id===serviceId);
      const validDate=typeof date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0,10)===date && date>dateToday();
      const validAddons=Array.isArray(chosen) && new Set(chosen).size===chosen.length && chosen.every(id=>Object.hasOwn(addons,id));
      if (![name,contact,room].every(v=>typeof v==='string' && v.trim().length>=2 && v.length<=100) || !service || (service.sized && !Object.hasOwn(prices,size)) || !slots.includes(time) || !validDate || typeof notes!=='string' || notes.length>500 || !validAddons || !paymentIds.includes(paymentMethod)) return res.status(400).json({error:'Complete all fields and choose a valid date from tomorrow onward.'});
      if(await bookings.findOne({date,time,status:{$in:RESERVED}})) return res.status(409).json({error:'This slot is already confirmed. Choose another slot.'});
      const price=(service.sized?prices[size]:service.price)+chosen.reduce((sum,id)=>sum+addons[id].price,0);
      const b={userId:req.user.id,id:randomBytes(5).toString('hex').toUpperCase(),name:name.trim(),contact:contact.trim(),room:room.trim(),size:service.sized?size:null,date,time,notes:notes.trim(),price,service:service.name,serviceId:service.id,addons:chosen.map(id=>({id,name:addons[id].name,price:addons[id].price})),paymentMethod,status:'pending',cleaner:null,cleanerId:null,completedChecklist:[],statusHistory:[historyEntry('pending','customer')],createdAt:new Date().toISOString()};
      await bookings.insertOne(b);
      res.status(201).json(publicBooking(b));
    }catch(e){next(e);}
  });
  app.get('/api/account/bookings',requireAuth,async(req,res,next)=>{try{res.json((await bookings.find({userId:req.user.id}).sort({createdAt:-1}).toArray()).map(publicBooking))}catch(e){next(e)}});
  const own = async(req,res,next)=>{try{
    if(!req.user)return res.status(401).json({error:'Please log in to view your bookings.'});
    req.booking=await bookings.findOne({id:req.params.id,userId:req.user.id});
    if(!req.booking)return res.status(404).json({error:'Booking not found.'});
    next();
  }catch(e){next(e)}};
  app.get('/api/bookings/:id',own,(req,res)=>res.json(publicBooking(req.booking)));
  app.post('/api/bookings/:id/cancel',own,async(req,res,next)=>{try{const r=await bookings.updateOne({id:req.params.id,userId:req.user.id,status:{$in:['pending','confirmed']}},{$set:{status:'cancelled'},$push:{statusHistory:historyEntry('cancelled','customer')}});if(!r.modifiedCount)return res.status(409).json({error:'Only pending or confirmed bookings can be cancelled.'});res.json(publicBooking(await bookings.findOne({id:req.params.id})));}catch(e){next(e);}});
  app.post('/api/bookings/:id/feedback',own,async(req,res,next)=>{try{const {rating,comment=''}=req.body;if(!Number.isInteger(rating)||rating<1||rating>5||typeof comment!=='string'||comment.length>500)return res.status(400).json({error:'Choose a rating from 1 to 5; comments have a 500-character limit.'});const r=await bookings.updateOne({id:req.params.id,userId:req.user.id,status:'completed',feedback:{$exists:false}},{$set:{feedback:{rating,comment:comment.trim(),createdAt:new Date().toISOString()}}});if(!r.modifiedCount)return res.status(409).json({error:'Feedback is available once, after completion.'});res.json(publicBooking(await bookings.findOne({id:req.params.id})));}catch(e){next(e);}});
  app.get('/api/admin/bookings',admin,async(req,res,next)=>{try{res.json((await bookings.find().sort({createdAt:-1}).toArray()).map(publicBooking));}catch(e){next(e);}});
  app.patch('/api/admin/bookings/:id',admin,async(req,res,next)=>{try{
    const b=await bookings.findOne({id:req.params.id});if(!b)return res.status(404).json({error:'Booking not found.'});
    const {status,cleanerId,completedChecklist=[]}=req.body;
    // The admin assigns and can override: finish or cancel a job at any active stage.
    const allowed={pending:['confirmed','cancelled'],confirmed:['completed','cancelled'],on_the_way:['completed','cancelled'],in_progress:['completed','cancelled'],completed:[],cancelled:[]};
    if(!allowed[b.status]?.includes(status))return res.status(409).json({error:'Invalid booking status change.'});
    const update={status};
    if(status==='confirmed'){
      const c=typeof cleanerId==='string'?await cleaners.findOne({id:cleanerId}):null;
      if(!c||!assignable(c))return res.status(400).json({error:'Choose an active cleaner whose ID and background checks are done.'});
      Object.assign(update,{cleanerId:c.id,cleaner:c.name,cleanerPhotoUrl:c.photoUrl||null});
    }
    if(status==='completed'){if(!checklistDone(completedChecklist,b.serviceId))return res.status(400).json({error:'Complete all cleaning checklist items first.'});update.completedChecklist=checklistFor(b.serviceId);update.completedAt=new Date().toISOString();}
    const r=await bookings.updateOne({id:b.id,status:b.status},{$set:update,$push:{statusHistory:historyEntry(status,'admin')}});if(!r.modifiedCount)return res.status(409).json({error:'Booking changed. Refresh and try again.'});
    res.json(publicBooking(await bookings.findOne({id:b.id})));
  }catch(e){if(e.code===11000)return res.status(409).json({error:'Another booking is confirmed for this slot.'});next(e);}});

  // Move a confirmed job that hasn't started to another screened cleaner (e.g. before deactivating the first one).
  app.post('/api/admin/bookings/:id/reassign',admin,async(req,res,next)=>{try{
    const b=await bookings.findOne({id:req.params.id});if(!b)return res.status(404).json({error:'Booking not found.'});
    if(b.status!=='confirmed')return res.status(409).json({error:'Only confirmed jobs that haven’t started can be reassigned. Finish or cancel jobs already underway.'});
    const {cleanerId}=req.body||{};
    const c=typeof cleanerId==='string'?await cleaners.findOne({id:cleanerId}):null;
    if(!c||!assignable(c))return res.status(400).json({error:'Choose an active cleaner whose ID and background checks are done.'});
    if(c.id===b.cleanerId)return res.status(400).json({error:'This job is already assigned to '+c.name+'.'});
    const r=await bookings.updateOne({id:b.id,status:'confirmed',cleanerId:b.cleanerId},{$set:{cleanerId:c.id,cleaner:c.name,cleanerPhotoUrl:c.photoUrl||null},$push:{statusHistory:{...historyEntry('confirmed','admin'),reassignedFrom:b.cleanerId||null}}});
    if(!r.modifiedCount)return res.status(409).json({error:'Booking changed. Refresh and try again.'});
    res.json(publicBooking(await bookings.findOne({id:b.id})));
  }catch(e){next(e)}});

  // Cleaner accounts: created by the admin only (public sign-up always makes customers).
  app.get('/api/admin/cleaners',admin,async(req,res,next)=>{try{
    const list=await cleaners.find().sort({createdAt:-1}).toArray();
    const emails=new Map((await users.find({id:{$in:list.map(c=>c.userId)}}).toArray()).map(u=>[u.id,u.email]));
    res.json(list.map(c=>({...publicCleaner(c),email:emails.get(c.userId)||null})));
  }catch(e){next(e)}});
  app.post('/api/admin/cleaners',admin,async(req,res,next)=>{try{
    const {name,email,password,phone='',photoUrl='',bio='',serviceTypes=SERVICE_TYPES,idChecked=false,backgroundChecked=false}=req.body||{};
    if(typeof name!=='string'||name.trim().length<2||name.length>100||!validEmail(email)||!validPassword(password)||!optionalText(phone,40)||!optionalText(bio,300)||!validPhotoUrl(photoUrl)||!Array.isArray(serviceTypes)||!serviceTypes.length||!serviceTypes.every(t=>SERVICE_TYPES.includes(t))||typeof idChecked!=='boolean'||typeof backgroundChecked!=='boolean')
      return res.status(400).json({error:'Enter a name, a valid email, a temporary password of 8–128 characters, and at least one service type. Photo links must start with http:// or https://.'});
    const now=new Date();
    const user={id:randomBytes(16).toString('hex'),name:name.trim(),email:email.trim().toLowerCase(),role:'cleaner',...await hashPassword(password),createdAt:now};
    await users.insertOne(user);
    const screened=idChecked||backgroundChecked;
    const c={id:randomBytes(5).toString('hex').toUpperCase(),userId:user.id,name:user.name,phone:phone.trim(),photoUrl:photoUrl.trim(),bio:bio.trim(),serviceTypes:[...new Set(serviceTypes)],screening:{idChecked,backgroundChecked,checkedAt:screened?now.toISOString():null},active:true,createdAt:now.toISOString()};
    try{await cleaners.insertOne(c);}catch(e){await users.deleteOne({id:user.id});throw e;}
    res.status(201).json({...publicCleaner(c),email:user.email});
  }catch(e){if(e.code===11000)return res.status(409).json({error:'An account already uses this email.'});next(e)}});
  app.patch('/api/admin/cleaners/:id',admin,async(req,res,next)=>{try{
    const c=await cleaners.findOne({id:req.params.id});if(!c)return res.status(404).json({error:'Cleaner not found.'});
    const {name,email,password,phone,photoUrl,bio,serviceTypes,active,idChecked,backgroundChecked}=req.body||{};
    // Every field is optional; only the ones sent are checked and changed.
    const bad=(name!==undefined&&(typeof name!=='string'||name.trim().length<2||name.length>100))||(email!==undefined&&!validEmail(email))||(password!==undefined&&!validPassword(password))
      ||!optionalText(phone,40)||!optionalText(bio,300)||!validPhotoUrl(photoUrl)||(serviceTypes!==undefined&&(!Array.isArray(serviceTypes)||!serviceTypes.length||!serviceTypes.every(t=>SERVICE_TYPES.includes(t))))
      ||[active,idChecked,backgroundChecked].some(v=>v!==undefined&&typeof v!=='boolean');
    if(bad)return res.status(400).json({error:'Check the details: name of 2+ characters, a valid email, a password of 8–128 characters, at least one service type, and a photo link starting with http:// or https://.'});
    // Deactivating would strand customers mid-booking, so active jobs must be cleared first.
    if(active===false&&c.active){
      const open=await bookings.find({cleanerId:c.id,status:{$in:ACTIVE_JOBS}}).sort({date:1,time:1}).toArray();
      if(open.length)return res.status(409).json({error:`${c.name} still has ${open.length} active job${open.length>1?'s':''} (${open.map(b=>'#'+b.id+' on '+b.date+' '+b.time).join(', ')}). Finish, cancel or reassign ${open.length>1?'them':'it'} on Bookings first.`,activeJobs:open.map(b=>b.id)});
    }
    const set={},userSet={};
    if(name!==undefined)set.name=userSet.name=name.trim();
    if(email!==undefined)userSet.email=email.trim().toLowerCase();
    if(password!==undefined)Object.assign(userSet,await hashPassword(password));
    if(phone!==undefined)set.phone=phone.trim();
    if(photoUrl!==undefined)set.photoUrl=photoUrl.trim();
    if(bio!==undefined)set.bio=bio.trim();
    if(serviceTypes!==undefined)set.serviceTypes=[...new Set(serviceTypes)];
    if(active!==undefined)set.active=active;
    if(idChecked!==undefined)set['screening.idChecked']=idChecked;
    if(backgroundChecked!==undefined)set['screening.backgroundChecked']=backgroundChecked;
    if(idChecked!==undefined||backgroundChecked!==undefined)set['screening.checkedAt']=new Date().toISOString();
    if(Object.keys(userSet).length)await users.updateOne({id:c.userId},{$set:userSet});
    // A new password signs the cleaner out everywhere.
    if(password!==undefined)await sessions.deleteMany({userId:c.userId});
    if(Object.keys(set).length)await cleaners.updateOne({id:c.id},{$set:set});
    // Keep the name and photo customers see on their bookings in step with the profile.
    if(set.name!==undefined||set.photoUrl!==undefined){const shown={};if(set.name!==undefined)shown.cleaner=set.name;if(set.photoUrl!==undefined)shown.cleanerPhotoUrl=set.photoUrl||null;await bookings.updateMany({cleanerId:c.id},{$set:shown});}
    const updated=await cleaners.findOne({id:c.id});const u=await users.findOne({id:c.userId});
    res.json({...publicCleaner(updated),email:u?.email||null});
  }catch(e){if(e.code===11000)return res.status(409).json({error:'An account already uses this email.'});next(e)}});

  // Cleaner portal: a cleaner sees and updates only the jobs assigned to them.
  app.get('/api/cleaner/jobs',requireCleaner,async(req,res,next)=>{try{
    const jobs=await bookings.find({cleanerId:req.cleaner.id,status:{$in:RESERVED}}).sort({date:1,time:1}).toArray();
    res.json({cleaner:publicCleaner(req.cleaner),jobs:jobs.map(jobView),today:dateToday()});
  }catch(e){next(e)}});
  app.patch('/api/cleaner/jobs/:id',requireCleaner,async(req,res,next)=>{try{
    const b=await bookings.findOne({id:req.params.id,cleanerId:req.cleaner.id});if(!b)return res.status(404).json({error:'Job not found.'});
    const {status,completedChecklist=[]}=req.body||{};
    if(!CLEANER_NEXT[b.status]||CLEANER_NEXT[b.status]!==status)return res.status(409).json({error:'This job has already moved on. Refresh your jobs and try again.'});
    const update={status};
    if(status==='completed'){if(!checklistDone(completedChecklist,b.serviceId))return res.status(400).json({error:'Tick every checklist item before marking the job complete.'});update.completedChecklist=checklistFor(b.serviceId);update.completedAt=new Date().toISOString();}
    const r=await bookings.updateOne({id:b.id,cleanerId:req.cleaner.id,status:b.status},{$set:update,$push:{statusHistory:historyEntry(status,'cleaner')}});
    if(!r.modifiedCount)return res.status(409).json({error:'This job has already moved on. Refresh your jobs and try again.'});
    res.json(jobView(await bookings.findOne({id:b.id})));
  }catch(e){next(e)}});
  app.use((err,req,res,next)=>{console.error(err.message);res.status(err.status===400?400:500).json({error:err.status===400?'Invalid JSON request.':'Unable to save changes. Please try again.'});});
  return app;
}