import React,{useState} from 'react';
import {pesos} from './api.js';
import {Button,StatusPill} from './ui.jsx';
import AdminCleaners,{canAssign} from './AdminCleaners.jsx';
const ASSIGNED=['confirmed','on_the_way','in_progress'];
const stats=[['Pending',['pending']],['Assigned',ASSIGNED],['Completed',['completed']],['Cancelled',['cancelled']]];
export default function AdminView({section,config,rows,cleaners,busyKey,refresh,update,createCleaner,updateCleaner}){
 const [assign,setAssign]=useState({}),[checks,setChecks]=useState({});
 const busy=!!busyKey,act=(b,status)=>update(b,status,assign[b.id]||'',checks[b.id]||[]);
 // Only screened, active cleaners who do this kind of service can be picked.
 const choices=b=>{const type=config.services.find(s=>s.id===b.serviceId)?.category;return cleaners.filter(c=>canAssign(c)&&(!type||c.serviceTypes?.includes(type)));};
 const refreshButton=<div className="actions"><Button className="secondary" busy={busyKey==='admin-refresh'} disabled={busy} onClick={refresh}>Refresh</Button></div>;
 if(section==='cleaners')return <section className="page admin-page"><div className="page-head row"><div><h1>Cleaners</h1><p className="lead">Create cleaner accounts, keep their details up to date, and record their screening.</p></div>{refreshButton}</div>
  <AdminCleaners cleaners={cleaners} busyKey={busyKey} createCleaner={createCleaner} updateCleaner={updateCleaner}/></section>;
 return <section className="page admin-page"><div className="page-head row"><div><h1>Bookings</h1><p className="lead">Assign a screened cleaner to each request. Cleaners update their own jobs from the cleaner portal; you can still finish or cancel any job here.</p></div>{refreshButton}</div>
 <>
 <div className="panel stats">{stats.map(([label,list])=><div key={label}><small>{label}</small><strong>{rows.filter(b=>list.includes(b.status)).length}</strong></div>)}</div>
 {rows.length===0?<div className="panel panel-empty"><p>No bookings yet. Create a request in “Book a clean”.</p></div>:rows.map(b=>{const options=b.status==='pending'?choices(b):[];return <article className="panel admin-booking" key={b.id}><div className="booking-heading"><h3>#{b.id} · {b.name}</h3><StatusPill status={b.status}/></div><p>{b.date} · {b.time} · {b.service} · {b.room} · {pesos(b.price)}</p><p className="muted">Contact: {b.contact}{b.notes&&' · Notes: '+b.notes}</p>{b.cleaner&&<p>Cleaner: {b.cleaner}</p>}
  {b.status==='pending'&&(options.length?<label>Assign a cleaner<select value={assign[b.id]||''} onChange={e=>setAssign({...assign,[b.id]:e.target.value})}><option value="">Choose a screened cleaner…</option>{options.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>:<p className="fine">No screened, active cleaners for this service yet. Add or finish screening one under Cleaners.</p>)}
  {ASSIGNED.includes(b.status)&&<details><summary>Finish this job for the cleaner</summary><fieldset><legend>Service completion checklist</legend>{config.checklist.map(c=><label className="check" key={c}><input type="checkbox" checked={(checks[b.id]||[]).includes(c)} onChange={e=>setChecks({...checks,[b.id]:e.target.checked?[...(checks[b.id]||[]),c]:(checks[b.id]||[]).filter(x=>x!==c)})}/>{c}</label>)}</fieldset><Button className="secondary" busy={busyKey===b.id+'completed'} disabled={busy} onClick={()=>act(b,'completed')}>Mark completed</Button></details>}
  <div className="actions start">{b.status==='pending'&&<Button busy={busyKey===b.id+'confirmed'} disabled={busy||!assign[b.id]} onClick={()=>act(b,'confirmed')}>Confirm & assign</Button>}{['pending',...ASSIGNED].includes(b.status)&&<Button className="secondary danger" busy={busyKey===b.id+'cancelled'} disabled={busy} onClick={()=>act(b,'cancelled')}>Cancel</Button>}</div>
  {b.feedback&&<div className="callout">Customer feedback: {b.feedback.rating}/5 · {b.feedback.comment||'No comment'}</div>}</article>})}
 </>
 </section>;
}
