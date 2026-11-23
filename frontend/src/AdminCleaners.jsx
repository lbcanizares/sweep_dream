import React,{useState} from 'react';
import {Button,initials} from './ui.jsx';

const blank={name:'',email:'',password:'',phone:'',photoUrl:'',bio:'',serviceTypes:['Dorm','Home'],idChecked:false,backgroundChecked:false};
export const canAssign=c=>c.active&&c.screening?.idChecked&&c.screening?.backgroundChecked;

function CleanerRow({c,busyKey,updateCleaner}){
 const busy=!!busyKey,key='cleaner-'+c.id;
 const flag=(field,on,label)=><Button className={'secondary small'+(on?' is-on':'')} busy={busyKey===key+field} disabled={busy} aria-pressed={on} onClick={()=>updateCleaner(c,{[field]:!on},field)}>{on?'✓ ':''}{label}</Button>;
 return <li className="cleaner-row">
  <div className="cleaner-who">{c.photoUrl?<img className="avatar photo" src={c.photoUrl} alt=""/>:<span className="avatar" aria-hidden="true">{initials(c.name)}</span>}<div><strong>{c.name}</strong><small>{c.email}{c.phone&&' · '+c.phone}</small><small>{c.serviceTypes?.join(', ')} · {canAssign(c)?'Can be assigned':c.active?'Finish screening to assign':'Inactive'}</small></div></div>
  <div className="cleaner-actions">{flag('idChecked',!!c.screening?.idChecked,'ID checked')}{flag('backgroundChecked',!!c.screening?.backgroundChecked,'Background checked')}
   <Button className={'secondary small'+(c.active?' danger':'')} busy={busyKey===key+'active'} disabled={busy} onClick={()=>updateCleaner(c,{active:!c.active},'active')}>{c.active?'Deactivate':'Reactivate'}</Button></div>
 </li>;
}

export default function AdminCleaners({cleaners,busyKey,createCleaner,updateCleaner}){
 const [form,setForm]=useState(blank);
 const change=e=>setForm({...form,[e.target.name]:e.target.type==='checkbox'?e.target.checked:e.target.value});
 const toggleType=(t,on)=>setForm({...form,serviceTypes:on?[...form.serviceTypes,t]:form.serviceTypes.filter(x=>x!==t)});
 const submit=async e=>{e.preventDefault();if(await createCleaner(form))setForm(blank);};
 return <div className="admin-cleaners">
  <section className="panel"><h2>Cleaners</h2><p className="muted">Only screened, active cleaners can be assigned. Deactivating a cleaner blocks their access to the cleaner portal.</p>
   {cleaners.length?<ul className="cleaner-list">{cleaners.map(c=><CleanerRow key={c.id} c={c} busyKey={busyKey} updateCleaner={updateCleaner}/>)}</ul>:<div className="panel-empty"><p><strong>No cleaners yet.</strong> Add your first cleaner with the form.</p></div>}
  </section>
  <form className="panel" onSubmit={submit}><h2>Add a cleaner</h2><p className="muted">This creates their login. They sign in on the normal login page with this email and temporary password, then land on their jobs page.</p>
   <div className="field-grid">
    <label>Full name<input name="name" required minLength={2} maxLength={100} value={form.name} onChange={change} placeholder="e.g. Ana Cruz"/></label>
    <label>Email<input name="email" type="email" required maxLength={254} value={form.email} onChange={change} autoComplete="off"/></label>
    <label>Temporary password<input name="password" type="text" required minLength={8} maxLength={128} value={form.password} onChange={change} autoComplete="new-password"/><small className="fine">At least 8 characters. Share it with the cleaner privately.</small></label>
    <label>Phone (optional)<input name="phone" maxLength={40} value={form.phone} onChange={change}/></label>
    <label className="wide">Photo link (optional)<input name="photoUrl" type="url" maxLength={500} value={form.photoUrl} onChange={change} placeholder="https://…"/></label>
    <label className="wide">Short bio (optional)<textarea name="bio" maxLength={300} value={form.bio} onChange={change}/></label>
   </div>
   <fieldset><legend>Can clean</legend>{['Dorm','Home'].map(t=><label className="check" key={t}><input type="checkbox" checked={form.serviceTypes.includes(t)} onChange={e=>toggleType(t,e.target.checked)}/>{t} services</label>)}</fieldset>
   <fieldset><legend>Screening done</legend><label className="check"><input type="checkbox" name="idChecked" checked={form.idChecked} onChange={change}/>ID checked</label><label className="check"><input type="checkbox" name="backgroundChecked" checked={form.backgroundChecked} onChange={change}/>Background checked</label></fieldset>
   <div className="actions start"><Button busy={busyKey==='cleaner-create'} disabled={!!busyKey||!form.serviceTypes.length}>Create cleaner account</Button></div>
  </form>
 </div>;
}
