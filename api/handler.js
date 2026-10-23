import {MongoClient} from 'mongodb';
import {createApp} from '../backend/server/app.js';
let initialization;
let databaseClient;
async function initialize() {
 if(!process.env.MONGO_URI||!process.env.ADMIN_KEY)throw Error('MONGO_URI and ADMIN_KEY must be configured.');
 const client=new MongoClient(process.env.MONGO_URI,{maxPoolSize:5,serverSelectionTimeoutMS:8000});
 try{await client.connect();databaseClient=client;const app=await createApp(client.db(process.env.DB_NAME||'sweep_dreams'),process.env.ADMIN_KEY);app.set('trust proxy',1);return app;}catch(e){await client.close();throw e;}
}
export default async function handler(req,res) {
 try {
  if(!initialization)initialization=initialize().catch(e=>{initialization=undefined;throw e});
  const app=await initialization;
  const url=new URL(req.url,'http://localhost');
  const route=url.searchParams.get('__route');
  if(route!==null){url.searchParams.delete('__route');req.url='/api/'+route+(url.search?'?'+url.searchParams.toString():'');}
  app(req,res);
 }catch(e){console.error('API initialization failed:',e.name);res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'Backend unavailable. Check MONGO_URI, ADMIN_KEY and MongoDB network access in deployment settings.'}));}
}

export async function closeConnections(){if(databaseClient)await databaseClient.close();databaseClient=undefined;initialization=undefined;}
