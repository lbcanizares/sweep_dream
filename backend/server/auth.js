import {randomBytes,scrypt as derive,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(derive);
const digest=token=>createHash('sha256').update(token).digest('hex');
const safe=user=>({id:user.id,name:user.name,email:user.email});
export async function installAuth(app,db) {
 const users=db.collection('users'),sessions=db.collection('sessions');
 await users.createIndex({email:1},{unique:true});
 await sessions.createIndex({expiresAt:1},{expireAfterSeconds:0});
 await sessions.createIndex({tokenHash:1},{unique:true});
 const cookieToken=req=>req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('sweep_session='))?.slice(14);
 const cookieOptions={httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:7*86400000};
 app.use('/api',async(req,res,next)=>{try {
  if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin&&req.headers.origin!==req.protocol+'://'+req.get('host'))return res.status(403).json({error:'Please submit from this website.'});
  const token=cookieToken(req);
  if(token){const session=await sessions.findOne({tokenHash:digest(token),expiresAt:{$gt:new Date()}});if(session)req.user=await users.findOne({id:session.userId});}
  next();
 }catch(e){next(e)}});
 const limits=new Map();
 const limit=(req,res,next)=>{const now=Date.now();for(const [ip,v] of limits)if(v.until<now)limits.delete(ip);const ip=req.ip;const v=limits.get(ip)||{count:0,until:now+600000};v.count++;limits.set(ip,v);if(v.count>30)return res.status(429).json({error:'Too many attempts. Please try again in ten minutes.'});next()};
 async function session(req,res,user){const old=cookieToken(req);if(old)await sessions.deleteOne({tokenHash:digest(old)});const token=randomBytes(32).toString('hex');await sessions.insertOne({tokenHash:digest(token),userId:user.id,expiresAt:new Date(Date.now()+7*86400000)});res.cookie('sweep_session',token,cookieOptions);return safe(user)}
 app.get('/api/auth/me',(req,res)=>res.json({user:req.user?safe(req.user):null}));
 app.post('/api/auth/signup',limit,async(req,res,next)=>{try {
  const {name,email,password}=req.body||{};
  if(typeof name!=='string'||name.trim().length<2||name.length>100||typeof email!=='string'||email.length>254||!/^\S+@\S+\.\S+$/.test(email.trim())||typeof password!=='string'||password.length<8||password.length>128)return res.status(400).json({error:'Enter your name, a valid email, and a password of 8–128 characters.'});
  const salt=randomBytes(16).toString('hex');const passwordHash=(await scrypt(password,salt,64)).toString('hex');
  const user={id:randomBytes(16).toString('hex'),name:name.trim(),email:email.trim().toLowerCase(),salt,passwordHash,createdAt:new Date()};
  await users.insertOne(user);res.status(201).json({user:await session(req,res,user)});
 }catch(e){if(e.code===11000)return res.status(409).json({error:'This email already has an account. Please log in.'});next(e)}});
 app.post('/api/auth/login',limit,async(req,res,next)=>{try {
  const {email,password}=req.body||{};
  if(typeof email!=='string'||typeof password!=='string'||email.length>254||password.length>128)return res.status(400).json({error:'Enter your email and password.'});
  const user=await users.findOne({email:email.trim().toLowerCase()});
  const hash=await scrypt(password,user?.salt||'missing-user-salt',64);
  if(!user||!timingSafeEqual(hash,Buffer.from(user.passwordHash,'hex')))return res.status(401).json({error:'Email or password is incorrect.'});
  res.json({user:await session(req,res,user)});
 }catch(e){next(e)}});
 app.post('/api/auth/logout',async(req,res,next)=>{try {const token=cookieToken(req);if(token)await sessions.deleteOne({tokenHash:digest(token)});res.clearCookie('sweep_session',{httpOnly:true,sameSite:'lax',secure:cookieOptions.secure,path:'/'});res.json({ok:true});}catch(e){next(e)}});
}
