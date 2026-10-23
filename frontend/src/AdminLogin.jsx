import React,{useState} from 'react';
import {Button} from './ui.jsx';
export default function AdminLogin({onLogin,go,busy}) {
 const [key,setKey]=useState('');
 return <section className="panel auth-card admin-login"><h1>Administrator login</h1><p className="muted">Use your administrator key to manage cleaning requests. Customer accounts cannot access the booking desk.</p><form onSubmit={e=>{e.preventDefault();onLogin(key)}}><label>Administrator key<input type="password" autoComplete="off" required value={key} onChange={e=>setKey(e.target.value)}/></label><Button className="primary wide" busy={busy}>{busy?'Checking…':'Log in as administrator'}</Button></form><button className="secondary wide" onClick={()=>go('login')}>Back to customer login</button></section>;
}
