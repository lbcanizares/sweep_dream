import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {MongoMemoryServer} from 'mongodb-memory-server';
import handler,{closeConnections} from '../../api/handler.js';
test('Vercel API rewrite and database-backed authentication',async()=>{
 const mongo=await MongoMemoryServer.create();process.env.MONGO_URI=mongo.getUri();process.env.ADMIN_KEY='deployment-test-key';process.env.DB_NAME='deployment_test';
 const server=createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/api/handler?__route=';
 try{
  const config=await fetch(base+'config');assert.equal(config.status,200);assert.equal((await config.json()).prices.small,300);
  const signup=await fetch(base+'auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Deployment Demo',email:'vercel@example.test',password:'DemoPassword123!'})});assert.equal(signup.status,201);
  const cookie=signup.headers.get('set-cookie').split(';')[0];const me=await fetch(base+'auth/me',{headers:{Cookie:cookie}});assert.equal((await me.json()).user.email,'vercel@example.test');
  const denied=await fetch(base+'admin/bookings');assert.equal(denied.status,401);
  const desk=await fetch(base+'admin/bookings',{headers:{Authorization:'Bearer deployment-test-key'}});assert.equal(desk.status,200);assert.deepEqual(await desk.json(),[]);
 }finally{await new Promise(resolve=>server.close(resolve));await closeConnections();await mongo.stop();}
});
