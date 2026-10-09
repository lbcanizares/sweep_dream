import { MongoClient } from 'mongodb';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const frontend=resolve(root,'frontend'),dist=resolve(frontend,'dist');
try { process.loadEnvFile(resolve(root,'.env')); } catch {}
const demo=process.argv.includes('--demo');
let mongo;
let uri=process.env.MONGO_URI;
if(demo){const {MongoMemoryServer}=await import('mongodb-memory-server');mongo=await MongoMemoryServer.create();uri=mongo.getUri();}
if(!uri)throw new Error('Set MONGO_URI in .env, or use npm run demo for a temporary local MongoDB.');
const client=new MongoClient(uri);await client.connect();
const key=process.env.ADMIN_KEY || (demo?'sweep-dreams-class-demo':randomBytes(24).toString('hex'));
const app=await createApp(client.db(process.env.DB_NAME||'sweep_dreams'),key);
if(existsSync(resolve(dist,'index.html'))){const {default:express}=await import('express');app.use(express.static(dist));app.get('/',(req,res)=>res.sendFile(resolve(dist,'index.html')));}
else {const {createServer}=await import('vite');const vite=await createServer({root:frontend,server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}
const server=app.listen(Number(process.env.PORT||5173),'127.0.0.1',()=>{console.log('Sweep Dreams: http://127.0.0.1:'+ (process.env.PORT||5173));if(!process.env.ADMIN_KEY)console.log('Local admin key: '+key);if(demo)console.log('CLASS DEMO: temporary real MongoDB; data resets when stopped. Use fictional details.');});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{server.close();await client.close();if(mongo)await mongo.stop();process.exit(0);});
