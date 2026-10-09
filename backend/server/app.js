import express from 'express';
import {installAuth} from './auth.js';
import { randomBytes } from 'node:crypto';

export const checklist = ['Sweep and mop accessible floors', 'Wipe desks and accessible surfaces', 'Empty room trash', 'Tidy common room areas'];
const prices = {small: 300, standard: 450};
const addons = {laundry:{name:'Laundry fold',price:80}, dishes:{name:'Dishes',price:50}, fridge:{name:'Fridge clean',price:200}};
const payments = [
  {id:'cash',name:'Cash on service',note:'Pay after your cleaning visit'},
  {id:'gcash',name:'GCash',note:'Our team sends payment details after confirming'},
  {id:'card',name:'Card',note:'Our team arranges card payment after confirming'}
];
const paymentIds = payments.map(p=>p.id);
const services = [
  {id:'basic',name:'Basic dorm cleaning',category:'Dorm',desc:'About 1 hour · One-time clean',hours:'about 1 hour',sized:true,included:null},
  {id:'dorm_deep',name:'Dorm deep clean',category:'Dorm',desc:'1-2 hrs · Single room',hours:'1-2 hours',price:499,included:['Dusting, sweeping, mopping','Bed making and linen change','Trash removal and disinfecting']},
  {id:'home_regular',name:'Regular home cleaning',category:'Home',desc:'2-3 hrs · Homes and apartments',hours:'2-3 hours',price:699,included:['Dusting, sweeping, mopping','Kitchen and bathroom wipe-down','Trash removal']},
  {id:'move',name:'Move-in / move-out',category:'Home',desc:'3-4 hrs · Deep sanitation',hours:'3-4 hours',price:1299,included:['Deep sanitation of all rooms','Kitchen and bathroom scrub','Floor mopping and trash removal']}
];
const slots = ['09:00', '11:00', '13:00', '15:00'];
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
  const admin = (req,res,next) => req.headers.authorization === `Bearer ${adminKey}` ? next() : res.status(401).json({error:'Enter the correct administrator key.'});
  const requireAuth = (req,res,next) => req.user ? next() : res.status(401).json({error:'Please log in or sign up to book a clean.'});
  const publicBooking = b => {const {_id,token,userId,...safe}=b; return safe;};
  app.get('/api/config', (req,res)=>res.json({prices,services,addons:Object.entries(addons).map(([id,a])=>({id,...a})),paymentMethods:payments,slots,checklist,today:dateToday(),demo:process.argv.includes('--demo')}));
  app.get('/api/availability', async(req,res,next)=>{try {
 const {date}=req.query;
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date<=dateToday())return res.status(400).json({error:'Choose a valid future date.'});
 const occupied=await bookings.find({date,status:{$in:['confirmed','completed']}}).project({time:1,_id:0}).toArray();
 res.json({date,slots:slots.filter(slot=>!occupied.some(b=>b.time===slot))});
 }catch(e){next(e)}});
  app.post('/api/bookings', requireAuth, async (req,res,next)=> {
    try {
      const {name,contact,room,size,date,time,notes='',serviceId='basic',addons:chosen=[],paymentMethod='cash'}=req.body;
      const service=services.find(s=>s.id===serviceId);
      const validDate=typeof date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0,10)===date && date>dateToday();
      const validAddons=Array.isArray(chosen) && new Set(chosen).size===chosen.length && chosen.every(id=>Object.hasOwn(addons,id));
      if (![name,contact,room].every(v=>typeof v==='string' && v.trim().length>=2 && v.length<=100) || !service || (service.sized && !Object.hasOwn(prices,size)) || !slots.includes(time) || !validDate || typeof notes!=='string' || notes.length>500 || !validAddons || !paymentIds.includes(paymentMethod)) return res.status(400).json({error:'Complete all fields and choose a valid date from tomorrow onward.'});
      if(await bookings.findOne({date,time,status:{$in:['confirmed','completed']}})) return res.status(409).json({error:'This slot is already confirmed. Choose another slot.'});
      const price=(service.sized?prices[size]:service.price)+chosen.reduce((sum,id)=>sum+addons[id].price,0);
      const b={userId:req.user.id,id:randomBytes(5).toString('hex').toUpperCase(),name:name.trim(),contact:contact.trim(),room:room.trim(),size:service.sized?size:null,date,time,notes:notes.trim(),price,service:service.name,serviceId:service.id,addons:chosen.map(id=>({id,name:addons[id].name,price:addons[id].price})),paymentMethod,status:'pending',cleaner:null,completedChecklist:[],createdAt:new Date().toISOString()};
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
  app.post('/api/bookings/:id/cancel',own,async(req,res,next)=>{try{const r=await bookings.updateOne({id:req.params.id,userId:req.user.id,status:{$in:['pending','confirmed']}},{$set:{status:'cancelled'}});if(!r.modifiedCount)return res.status(409).json({error:'Only pending or confirmed bookings can be cancelled.'});res.json(publicBooking(await bookings.findOne({id:req.params.id})));}catch(e){next(e);}});
  app.post('/api/bookings/:id/feedback',own,async(req,res,next)=>{try{const {rating,comment=''}=req.body;if(!Number.isInteger(rating)||rating<1||rating>5||typeof comment!=='string'||comment.length>500)return res.status(400).json({error:'Choose a rating from 1 to 5; comments have a 500-character limit.'});const r=await bookings.updateOne({id:req.params.id,userId:req.user.id,status:'completed',feedback:{$exists:false}},{$set:{feedback:{rating,comment:comment.trim(),createdAt:new Date().toISOString()}}});if(!r.modifiedCount)return res.status(409).json({error:'Feedback is available once, after completion.'});res.json(publicBooking(await bookings.findOne({id:req.params.id})));}catch(e){next(e);}});
  app.get('/api/admin/bookings',admin,async(req,res,next)=>{try{res.json((await bookings.find().sort({createdAt:-1}).toArray()).map(publicBooking));}catch(e){next(e);}});
  app.patch('/api/admin/bookings/:id',admin,async(req,res,next)=>{try{
    const b=await bookings.findOne({id:req.params.id});if(!b)return res.status(404).json({error:'Booking not found.'});
    const {status,cleaner,completedChecklist=[]}=req.body;
    const allowed={pending:['confirmed','cancelled'],confirmed:['completed','cancelled'],completed:[],cancelled:[]};
    if(!allowed[b.status].includes(status))return res.status(409).json({error:'Invalid booking status change.'});
    const update={status};
    if(status==='confirmed'){if(typeof cleaner!=='string'||cleaner.trim().length<2||cleaner.length>100)return res.status(400).json({error:'Enter a cleaner name after manually checking their ID and background.'});update.cleaner=cleaner.trim();}
    if(status==='completed'){if(!Array.isArray(completedChecklist)||checklist.some(c=>!completedChecklist.includes(c)))return res.status(400).json({error:'Complete all cleaning checklist items first.'});update.completedChecklist=checklist;update.completedAt=new Date().toISOString();}
    const r=await bookings.updateOne({id:b.id,status:b.status},{$set:update});if(!r.modifiedCount)return res.status(409).json({error:'Booking changed. Refresh and try again.'});
    res.json(publicBooking(await bookings.findOne({id:b.id})));
  }catch(e){if(e.code===11000)return res.status(409).json({error:'Another booking is confirmed for this slot.'});next(e);}});
  app.use((err,req,res,next)=>{console.error(err.message);res.status(err.status===400?400:500).json({error:err.status===400?'Invalid JSON request.':'Unable to save changes. Please try again.'});});
  return app;
}