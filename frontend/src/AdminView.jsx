import React,{useState} from 'react';
import {pesos} from './api.js';
import {Button,StatusPill} from './ui.jsx';
export default function AdminView({config,rows,busyKey,refresh,update}){
 const [cleaners,setCleaners]=useState({}),[checks,setChecks]=useState({});
 const busy=!!busyKey,act=(b,status)=>update(b,status,cleaners[b.id]||'',checks[b.id]||[]);
 return <section className="page admin-page"><div className="page-head row"><div><h1>Booking desk</h1><p className="lead">Manually verify cleaner identity, screening, dorm access, and availability before confirming. Demo assignments are fictional.</p></div><div className="actions"><Button className="secondary" busy={busyKey==='admin-refresh'} disabled={busy} onClick={refresh}>Refresh bookings</Button></div></div>
 <div className="panel stats">{['pending','confirmed','completed','cancelled'].map(s=><div key={s}><small>{s[0].toUpperCase()+s.slice(1)}</small><strong>{rows.filter(b=>b.status===s).length}</strong></div>)}</div>
 {rows.length===0?<div className="panel panel-empty"><p>No bookings yet. Create a request in “Book a clean”.</p></div>:rows.map(b=><article className="panel admin-booking" key={b.id}><div className="booking-heading"><h3>#{b.id} · {b.name}</h3><StatusPill status={b.status}/></div><p>{b.date} · {b.time} · {b.room} · {pesos(b.price)}</p><p className="muted">Contact: {b.contact}{b.notes&&' · Notes: '+b.notes}</p>{b.cleaner&&<p>Cleaner: {b.cleaner}</p>}
  {b.status==='pending'&&<label>Manually screened cleaner name<input value={cleaners[b.id]||''} onChange={e=>setCleaners({...cleaners,[b.id]:e.target.value})} placeholder="Fictional cleaner for class demo"/></label>}
  {b.status==='confirmed'&&<fieldset><legend>Service completion checklist</legend>{config.checklist.map(c=><label className="check" key={c}><input type="checkbox" checked={(checks[b.id]||[]).includes(c)} onChange={e=>setChecks({...checks,[b.id]:e.target.checked?[...(checks[b.id]||[]),c]:(checks[b.id]||[]).filter(x=>x!==c)})}/>{c}</label>)}</fieldset>}
  <div className="actions start">{b.status==='pending'&&<Button busy={busyKey===b.id+'confirmed'} disabled={busy} onClick={()=>act(b,'confirmed')}>Confirm & assign</Button>}{b.status==='confirmed'&&<Button busy={busyKey===b.id+'completed'} disabled={busy} onClick={()=>act(b,'completed')}>Mark completed</Button>}{['pending','confirmed'].includes(b.status)&&<Button className="secondary danger" busy={busyKey===b.id+'cancelled'} disabled={busy} onClick={()=>act(b,'cancelled')}>Cancel</Button>}</div>
  {b.feedback&&<div className="callout">Customer feedback: {b.feedback.rating}/5 · {b.feedback.comment||'No comment'}</div>}</article>)}
 </section>;
}
