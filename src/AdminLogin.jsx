import React,{useState} from 'react';
export default function AdminLogin({onLogin,go,busy}) {
 const [key,setKey]=useState('');
 return <section className="card admin-login auth-card"><div className="eyebrow">STAFF ACCESS ONLY</div><h1>Administrator login</h1><p className="muted">Use your administrator key to manage cleaning requests. Customer accounts cannot access the booking desk.</p><form onSubmit={e=>{e.preventDefault();onLogin(key)}}><label>Administrator key<input type="password" autoComplete="off" required value={key} onChange={e=>setKey(e.target.value)}/></label><button className="primary wide" disabled={busy}>{busy?'Checking…':'Log in as administrator'}</button></form><button className="secondary wide" onClick={()=>go('login')}>Back to customer login</button></section>;
}
