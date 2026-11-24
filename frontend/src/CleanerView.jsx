import React,{useState} from 'react';
import {pesos} from './api.js';
import {Button,StatusPill,checklistFor,extrasText,fmtDate,initials,paymentName} from './ui.jsx';

// The one next step a cleaner can take on a job, in order.
const nextStep={confirmed:['on_the_way',"I'm on my way"],on_the_way:['in_progress','Start cleaning'],in_progress:['completed','Mark job complete']};
const progress=[['confirmed','Assigned'],['on_the_way','On the way'],['in_progress','Cleaning'],['completed','Done']];
const tabs=[['active','My jobs'],['done','Completed']];

function CleanerAvatar({cleaner,size=''}){
 return cleaner.photoUrl?<img className={'avatar photo '+size} src={cleaner.photoUrl} alt=""/>:<span className={'avatar '+size} aria-hidden="true">{initials(cleaner.name)}</span>;
}

function JobCard({job,config,today,busyKey,advance}){
 const [checks,setChecks]=useState([]);
 const [status,label]=nextStep[job.status]||[];
 const items=checklistFor(config,job.serviceId),needsChecklist=status==='completed',allChecked=items.every(c=>checks.includes(c));
 const at=progress.findIndex(([s])=>s===job.status);
 const toggle=(c,on)=>setChecks(on?[...checks,c]:checks.filter(x=>x!==c));
 return <article className="panel job-card">
  <div className="job-head"><div><strong>{fmtDate(job.date)} · {job.time}</strong>{job.date===today&&<span className="today-tag">Today</span>}</div><StatusPill status={job.status}/></div>
  <p className="job-service">{job.service}{job.size&&' · '+(job.size==='small'?'Small':'Standard')+' dorm'}{job.extras?.length>0&&' · '+extrasText(job)}{job.addons?.length>0&&' · + '+job.addons.map(a=>a.name).join(', ')}</p>
  <ol className="job-progress" aria-label="Job progress">{progress.map(([s,l],i)=><li key={s} className={i<=at?'reached':''} aria-current={s===job.status?'step':undefined}>{l}</li>)}</ol>
  <dl className="summary job-summary">
   <div><dt>Location</dt><dd>{job.room}</dd></div>
   <div><dt>Customer</dt><dd>{job.customer} · {job.contact}</dd></div>
   <div><dt>Payment</dt><dd>{job.paymentMethod==='cash'?'Collect '+pesos(job.price)+' in cash':paymentName(config,job.paymentMethod)+' · arranged by the team'}</dd></div>
   {job.notes&&<div className="wide"><dt>Customer notes</dt><dd>{job.notes}</dd></div>}
  </dl>
  {needsChecklist&&<fieldset><legend>Before you finish, tick every item</legend>{items.map(c=><label className="check" key={c}><input type="checkbox" checked={checks.includes(c)} onChange={e=>toggle(c,e.target.checked)}/>{c}</label>)}</fieldset>}
  {status&&<div className="actions start"><Button busy={busyKey===job.id+status} disabled={!!busyKey||(needsChecklist&&!allChecked)} onClick={()=>advance(job,status,needsChecklist?checks:undefined)}>{label}</Button>{needsChecklist&&!allChecked&&<span className="fine">Tick all {items.length} items to finish.</span>}</div>}
 </article>;
}

export default function CleanerView({user,config,data,busyKey,advance,refresh}){
 const [tab,setTab]=useState('active');
 if(data.blocked)return <section className="page cleaner-page"><div className="page-head"><h1>My jobs</h1></div><div className="panel panel-empty"><p><strong>Your jobs can't be shown right now.</strong> If your account was paused, please contact the Sweep Dreams team.</p><Button className="secondary small" busy={busyKey==='cleaner-refresh'} onClick={refresh}>Try again</Button></div></section>;
 const {cleaner,jobs,today}=data;
 const groups={active:jobs.filter(j=>j.status!=='completed'),done:jobs.filter(j=>j.status==='completed').reverse()};
 const screened=cleaner.screening?.idChecked&&cleaner.screening?.backgroundChecked;
 return <section className="page cleaner-page">
  <div className="page-head row"><div><h1>My jobs</h1><p className="lead">Hi {user.name.split(' ')[0]}. Update each job as you go, so the customer and the team can follow along.</p></div><div className="actions"><Button className="secondary" busy={busyKey==='cleaner-refresh'} disabled={!!busyKey} onClick={refresh}>Refresh jobs</Button></div></div>
  <div className="panel cleaner-profile"><CleanerAvatar cleaner={cleaner} size="lg"/><div><strong>{cleaner.name}</strong><small>{cleaner.serviceTypes?.join(' and ')} cleaning{cleaner.phone&&' · '+cleaner.phone}</small></div><span className={'status '+(screened?'completed':'pending')}>{screened?'Screening complete':'Screening in progress'}</span></div>
  <section className="panel account-list" aria-label="Your jobs">
   <div className="booking-tabs" role="tablist" aria-label="Job lists">{tabs.map(([id,label])=><button key={id} type="button" role="tab" id={'jobs-tab-'+id} aria-controls="job-list" aria-selected={tab===id} onClick={()=>setTab(id)}>{label}<span className="tab-count">{groups[id].length}</span></button>)}</div>
   <div id="job-list" role="tabpanel" aria-labelledby={'jobs-tab-'+tab}>
    {tab==='active'?(groups.active.length?<div className="job-list">{groups.active.map(j=><JobCard key={j.id+j.status} job={j} config={config} today={today} busyKey={busyKey} advance={advance}/>)}</div>:<div className="panel-empty"><p><strong>No jobs assigned yet.</strong> When the team assigns you a clean, it will show up here with the address and checklist.</p></div>)
    :(groups.done.length?<ul className="booking-rows">{groups.done.map(j=><li key={j.id}><div className="row-static"><span><strong>{fmtDate(j.date)} · {j.time}</strong><small>{j.service} · {j.room}</small></span><StatusPill status={j.status}/></div></li>)}</ul>:<div className="panel-empty"><p><strong>Nothing here yet.</strong> Jobs you finish will show up here.</p></div>)}
   </div>
  </section>
 </section>;
}
