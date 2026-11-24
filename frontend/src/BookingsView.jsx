import React,{useEffect,useState} from 'react';
import {pesos} from './api.js';
import {googleCalendarUrl} from './calendar.js';
import {MapView,mapLink} from './maps.jsx';
import {ACTIVE_STATUSES,Button,Sk,Spinner,StatusPill,extrasText,fmtDate,paymentName} from './ui.jsx';
const titles={confirmed:'Booking confirmed',on_the_way:'Your cleaner is on the way',in_progress:'Cleaning in progress',completed:'Your room, refreshed',cancelled:'Booking cancelled',pending:'Request received'};
const notes={pending:'Your request is saved. The team will contact you using your supplied details after checking the schedule.',confirmed:'Your cleaner and requested schedule have been confirmed by the pilot team.',on_the_way:'Your cleaner has set off. Please make sure they can get into your building.',in_progress:'Your cleaner has started. They will mark the job complete when the checklist is done.',completed:'Cleaning marked complete. Tell us how it went.',cancelled:'This booking is cancelled. If you added it to your calendar, remember to delete it there.'};
// Pending and confirmed bookings are still active; completed and cancelled ones are history.
const isUpcoming=b=>ACTIVE_STATUSES.includes(b.status);
// Customer-facing progress steps; cleaners move the booking through the middle ones.
const steps=[['pending','Request received'],['confirmed','Cleaner assigned'],['on_the_way','On the way'],['in_progress','Cleaning'],['completed','Completed']];
const when=b=>b.date+' '+b.time;
const tabs=[['upcoming','Upcoming'],['history','History']];
// Link back to this site from calendar events.
const site=()=>location.origin+location.pathname;
const empty={upcoming:'No upcoming cleans. Book one and it will show up here.',history:'No past bookings yet. Completed and cancelled cleans will show up here.'};

export default function BookingsView({config,accountBookings,booking,load,cancel,feedback,busyKey,go}){
 const [rating,setRating]=useState(5),[comment,setComment]=useState('');
 const [tab,setTab]=useState('upcoming');
 const busy=!!busyKey;
 // Keep the open booking's tab in view, e.g. after cancelling it or opening it from the dashboard.
 useEffect(()=>{if(booking)setTab(isUpcoming(booking)?'upcoming':'history')},[booking?.id,booking?.status]);
 // The open booking has the freshest status (e.g. just cancelled), so it wins over the loaded list.
 const list=(accountBookings||[]).map(b=>booking&&b.id===booking.id?{...b,status:booking.status}:b);
 const groups={
  upcoming:list.filter(isUpcoming).sort((a,b)=>when(a).localeCompare(when(b))),
  history:list.filter(b=>!isUpcoming(b)).sort((a,b)=>when(b).localeCompare(when(a)))
 };
 const rows=groups[tab];
 // Only show the open booking's details while its own tab is selected.
 const shown=booking&&isUpcoming(booking)===(tab==='upcoming')?booking:null;
 return <section className="page bookings-page"><div className="page-head"><h1>My bookings</h1><p className="lead">Upcoming cleans first, soonest at the top. Past bookings are under History.</p></div>
 <section className="panel account-list" aria-label="Your bookings">
  <div className="booking-tabs" role="tablist" aria-label="Booking lists">{tabs.map(([id,label])=><button key={id} type="button" role="tab" id={'tab-'+id} aria-controls="booking-list" aria-selected={tab===id} onClick={()=>setTab(id)}>{label}{accountBookings&&<span className="tab-count">{groups[id].length}</span>}</button>)}</div>
  <div id="booking-list" role="tabpanel" aria-labelledby={'tab-'+tab}>{accountBookings===null?[0,1,2].map(i=><div className="sk-row" key={i}><Sk w="40%" h={16}/><Sk w="58%" h={12}/></div>):rows.length?<ul className="booking-rows">{rows.map(b=><li key={b.id}><button className={booking?.id===b.id?'selected':''} disabled={busy} onClick={()=>load(b.id)}><span><strong>{fmtDate(b.date)} · {b.time}</strong><small>{b.service} · {b.room} · {pesos(b.price)}</small></span>{busyKey==='open-'+b.id?<Spinner size={18} label="Opening booking"/>:<StatusPill status={b.status}/>}</button></li>)}</ul>:<div className="panel-empty"><p><strong>{tab==='upcoming'?'Nothing scheduled.':'Nothing here yet.'}</strong> {empty[tab]}</p>{tab==='upcoming'&&<button className="secondary small" onClick={()=>go('book')}>Book a clean</button>}</div>}</div></section>
 {shown&&<article className="panel booking-detail"><div className={'confirmation-mark '+booking.status} aria-hidden="true">{booking.status==='cancelled'?'×':booking.status==='pending'?'◷':'✓'}</div><h2 className="confirmation-title">{titles[booking.status]}</h2>
  <div className="booking-heading"><h3>Booking #{booking.id}</h3><StatusPill status={booking.status}/></div>
  <dl className="summary"><div><dt>Schedule</dt><dd>{booking.date} · {booking.time} (PH)</dd></div><div><dt>Location</dt><dd>{booking.room}</dd></div><div><dt>Service / price</dt><dd>{booking.service} · {pesos(booking.price)}</dd></div>{booking.extras?.length>0&&<div><dt>Extra areas</dt><dd>{extrasText(booking)}</dd></div>}{booking.addons?.length>0&&<div><dt>Add-ons</dt><dd>{booking.addons.map(a=>a.name).join(', ')}</dd></div>}<div><dt>Payment</dt><dd>{paymentName(config,booking.paymentMethod)}</dd></div><div><dt>Assigned cleaner</dt><dd>{booking.cleaner||'Awaiting manual assignment'}</dd></div></dl>
  {booking.location&&<div className="booking-map"><MapView area={config.serviceArea} location={booking.location} label={'Your pin for '+booking.room}/><a className="text-link" href={mapLink(booking.location)} target="_blank" rel="noopener noreferrer">Open in Google Maps</a></div>}
  <ol className="booking-timeline" aria-label="Booking progress">{steps.map(([state,label],i)=>{const index=steps.findIndex(([s])=>s===booking.status);return <li key={state} className={index>=i?'reached':''}><span aria-hidden="true">{index>=i?'✓':''}</span><div><strong>{label}</strong>{state===booking.status&&<small>Current status</small>}</div></li>})}</ol>
  {booking.cleaner&&<div className="cleaner-card">{booking.cleanerPhotoUrl?<img className="avatar photo" src={booking.cleanerPhotoUrl} alt=""/>:<span className="avatar" aria-hidden="true">{booking.cleaner[0]}</span>}<div><strong>{booking.cleaner}</strong><small>Your assigned cleaner</small></div></div>}
  <p className="muted">{notes[booking.status]}</p>
  {['pending','confirmed'].includes(booking.status)&&<div className="calendar-add"><div><strong>Get a reminder</strong><small>{booking.status==='pending'?'Save your requested time to Google Calendar now. The team will confirm it.':'Save this clean to Google Calendar so it reminds you before the visit.'}</small></div>
   <div className="calendar-buttons"><a className="secondary small" href={googleCalendarUrl(booking,config,site())} target="_blank" rel="noopener noreferrer">Add to Google Calendar</a></div></div>}
  <div className="actions"><Button className="secondary" busy={busyKey==='refresh'} disabled={busy} onClick={()=>load(booking.id,'refresh')}>Refresh status</Button>{['pending','confirmed'].includes(booking.status)&&<Button className="secondary danger" busy={busyKey==='cancel'} disabled={busy} onClick={cancel}>Cancel booking</Button>}</div>
  {booking.status==='completed'&&(booking.feedback?<div className="callout">Thank you! Your {booking.feedback.rating}/5 feedback has been saved.</div>:<form className="feedback" onSubmit={e=>{e.preventDefault();feedback(rating,comment)}}><h3>How was your experience?</h3><div className="star-rating" role="group" aria-label="Choose a rating">{[1,2,3,4,5].map(n=><button type="button" key={n} aria-label={n+' star'+(n>1?'s':'')} aria-pressed={rating===n} onClick={()=>setRating(n)}>{n<=rating?'★':'☆'}</button>)}</div><label>Your feedback<textarea maxLength={500} value={comment} onChange={e=>setComment(e.target.value)}/></label><Button className="primary wide" busy={busyKey==='feedback'} disabled={busy}>Submit feedback</Button></form>)}
 </article>}
 </section>;
}
