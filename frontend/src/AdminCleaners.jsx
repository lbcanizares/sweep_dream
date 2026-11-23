import React,{useEffect,useRef,useState} from 'react';
import {Button,initials} from './ui.jsx';

const blank={name:'',email:'',password:'',phone:'',photoUrl:'',bio:'',serviceTypes:['Dorm','Home'],idChecked:false,backgroundChecked:false};
const fromCleaner=c=>({name:c.name||'',email:c.email||'',password:'',phone:c.phone||'',photoUrl:c.photoUrl||'',bio:c.bio||'',serviceTypes:c.serviceTypes?.length?c.serviceTypes:['Dorm','Home'],idChecked:!!c.screening?.idChecked,backgroundChecked:!!c.screening?.backgroundChecked});
export const canAssign=c=>c.active&&c.screening?.idChecked&&c.screening?.backgroundChecked;
const screeningText=c=>c.screening?.idChecked&&c.screening?.backgroundChecked?'Screening complete':!c.screening?.idChecked&&!c.screening?.backgroundChecked?'Screening not started':c.screening?.idChecked?'Background check pending':'ID check pending';

function CleanerRow({c,editing,busyKey,edit,updateCleaner}){
 const key='cleaner-'+c.id;
 return <li className={'cleaner-row'+(editing?' editing':'')}>
  <div className="cleaner-who">{c.photoUrl?<img className="avatar photo" src={c.photoUrl} alt=""/>:<span className="avatar" aria-hidden="true">{initials(c.name)}</span>}<div><strong>{c.name}</strong><small>{c.email}{c.phone&&' · '+c.phone}</small><small>{c.serviceTypes?.join(', ')} · {screeningText(c)}{!c.active&&' · Inactive'}</small></div></div>
  <div className="cleaner-actions">
   <button type="button" className="text-link" disabled={!!busyKey} onClick={()=>edit(c)} aria-label={'Edit '+c.name}>{editing?'Editing…':'Edit details'}</button>
   <Button className={'secondary small'+(c.active?' danger':'')} busy={busyKey===key+'active'} disabled={!!busyKey} onClick={()=>updateCleaner(c,{active:!c.active},'active')}>{c.active?'Deactivate':'Reactivate'}</Button>
  </div>
 </li>;
}

export default function AdminCleaners({cleaners,busyKey,createCleaner,updateCleaner}){
 const [form,setForm]=useState(blank),[editing,setEditing]=useState(null),formRef=useRef(null);
 // If the cleaner being edited disappears from the list (e.g. after a refresh), leave edit mode.
 useEffect(()=>{if(editing&&!cleaners.some(c=>c.id===editing.id)){setEditing(null);setForm(blank)}},[cleaners,editing]);
 const change=e=>setForm({...form,[e.target.name]:e.target.type==='checkbox'?e.target.checked:e.target.value});
 const toggleType=(t,on)=>setForm({...form,serviceTypes:on?[...form.serviceTypes,t]:form.serviceTypes.filter(x=>x!==t)});
 const edit=c=>{setEditing(c);setForm(fromCleaner(c));requestAnimationFrame(()=>{formRef.current?.scrollIntoView({behavior:'smooth',block:'start'});formRef.current?.querySelector('input[name=name]')?.focus({preventScroll:true})});};
 const stopEditing=()=>{setEditing(null);setForm(blank);};
 const submit=async e=>{e.preventDefault();
  if(!editing){if(await createCleaner(form))setForm(blank);return;}
  // Send only what changed, so unchanged screening keeps its original check date.
  const {password,...details}=form,before=fromCleaner(editing);
  const patch=Object.fromEntries(Object.entries(details).filter(([k,v])=>JSON.stringify(v)!==JSON.stringify(before[k])));
  if(password)patch.password=password;
  if(!Object.keys(patch).length)return stopEditing();
  if(await updateCleaner(editing,patch,'edit'))stopEditing();
 };
 const busy=!!busyKey,saving=busyKey===(editing?'cleaner-'+editing.id+'edit':'cleaner-create');
 return <div className="admin-cleaners">
  <section className="panel"><h2>All cleaners</h2><p className="muted">Only screened, active cleaners can be assigned. Deactivating a cleaner blocks their access to the cleaner portal.</p>
   {cleaners.length?<ul className="cleaner-list">{cleaners.map(c=><CleanerRow key={c.id} c={c} editing={editing?.id===c.id} busyKey={busyKey} edit={edit} updateCleaner={updateCleaner}/>)}</ul>:<div className="panel-empty"><p><strong>No cleaners yet.</strong> Add your first cleaner with the form.</p></div>}
  </section>
  <form ref={formRef} className={'panel cleaner-form'+(editing?' is-editing':'')} onSubmit={submit}>
   <h2>{editing?'Edit '+editing.name:'Add a cleaner'}</h2>
   <p className="muted">{editing?'Changes to the name or photo also show on their customers’ bookings. Setting a new password signs them out everywhere.':'This creates their login. They sign in on the normal login page with this email and temporary password, then land on their jobs page.'}</p>
   <div className="field-grid">
    <label>Full name<input name="name" required minLength={2} maxLength={100} value={form.name} onChange={change} placeholder="e.g. Ana Cruz"/></label>
    <label>Email<input name="email" type="email" required maxLength={254} value={form.email} onChange={change} autoComplete="off"/></label>
    <label>{editing?'New password (optional)':'Temporary password'}<input name="password" type="text" required={!editing} minLength={8} maxLength={128} value={form.password} onChange={change} autoComplete="new-password"/><small className="fine">{editing?'Leave blank to keep their current password.':'At least 8 characters. Share it with the cleaner privately.'}</small></label>
    <label>Phone (optional)<input name="phone" maxLength={40} value={form.phone} onChange={change}/></label>
    <label className="wide">Photo link (optional)<input name="photoUrl" type="url" maxLength={500} value={form.photoUrl} onChange={change} placeholder="https://…"/></label>
    <label className="wide">Short bio (optional)<textarea name="bio" maxLength={300} value={form.bio} onChange={change}/></label>
   </div>
   <fieldset><legend>Can clean</legend>{['Dorm','Home'].map(t=><label className="check" key={t}><input type="checkbox" checked={form.serviceTypes.includes(t)} onChange={e=>toggleType(t,e.target.checked)}/>{t} services</label>)}</fieldset>
   <fieldset><legend>Screening done</legend><label className="check"><input type="checkbox" name="idChecked" checked={form.idChecked} onChange={change}/>ID checked</label><label className="check"><input type="checkbox" name="backgroundChecked" checked={form.backgroundChecked} onChange={change}/>Background checked</label></fieldset>
   <div className="actions start"><Button busy={saving} disabled={busy||!form.serviceTypes.length}>{editing?'Save changes':'Create cleaner account'}</Button>{editing&&<button type="button" className="secondary" disabled={busy} onClick={stopEditing}>Cancel</button>}</div>
  </form>
 </div>;
}
