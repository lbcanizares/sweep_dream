import React from 'react';
import NavIcon from './NavIcon.jsx';
import {pesos} from './api.js';
import {PromoBanner,ServiceCatalog} from './Services.jsx';
import {Sk,StatusPill,fmtDate,pesosFrom} from './ui.jsx';

const upcoming=(rows,today)=>rows.filter(b=>['pending','confirmed'].includes(b.status)&&b.date>=today).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))[0];

function BookingsPanel({bookings,config,go,open}){
 const next=upcoming(bookings,config.today),rest=bookings.filter(b=>b!==next).slice(0,next?3:4);
 return <section className="panel bookings-panel" aria-labelledby="your-bookings"><div className="panel-head"><h2 id="your-bookings">Your bookings</h2>{bookings.length>0&&<a className="text-link" href="#bookings" onClick={e=>{e.preventDefault();go('bookings')}}>View all {bookings.length}</a>}</div>
  {!bookings.length?<div className="panel-empty"><p><strong>No bookings yet.</strong> Cleans start at {pesos(pesosFrom(config))}.</p><button className="secondary small" onClick={()=>go('book')}>Book a clean</button></div>:<>
   {next&&<button className="next-clean" onClick={()=>open(next)}><small>Next clean</small><strong>{fmtDate(next.date)} · {next.time}</strong><span>{next.room}</span><StatusPill status={next.status}/></button>}
   <ul className="booking-rows">{rest.map(b=><li key={b.id}><button onClick={()=>open(b)}><span><strong>{fmtDate(b.date)} · {b.time}</strong><small>#{b.id} · {pesos(b.price)}</small></span><StatusPill status={b.status}/></button></li>)}</ul>
  </>}
 </section>;
}

export function DashboardSkeleton(){
 return <div className="dashboard" aria-busy="true" aria-label="Loading your dashboard">
  <div className="dash-main"><div className="dash-head"><Sk w="62%" h={34}/><Sk w="44%" h={16}/><Sk w="100%" h={52} r={999} className="sk-search"/></div><section className="catalog"><div className="catalog-head"><Sk w={92} h={20}/><Sk w={220} h={40} r={999}/></div><div className="service-list">{[0,1,2].map(i=><div className="service-card sk-card" key={i}><Sk w={48} h={48} r={12}/><span className="service-copy"><Sk w="58%" h={16}/><Sk w="40%" h={12}/></span><Sk w={64} h={18}/></div>)}</div></section></div>
  <div className="dash-aside"><Sk className="sk-promo" w="100%" h={214} r={16}/><section className="panel bookings-panel"><div className="panel-head"><Sk w={130} h={18}/></div>{[0,1,2].map(i=><div className="sk-row" key={i}><Sk w="55%" h={14}/><Sk w="35%" h={12}/></div>)}</section></div>
 </div>;
}

export default function Dashboard({user,config,bookings,go,choose,search,setSearch,open}){
 return <div className="dashboard">
  <div className="dash-main"><div className="dash-head"><h1>Welcome back, {user.name.split(' ')[0]}</h1><p>What needs a sweep today?</p><label className="search"><NavIcon name="search" size={20}/><span className="sr-only">Search cleaning services</span><input type="search" placeholder="Search services" value={search} onChange={e=>setSearch(e.target.value)}/></label></div><ServiceCatalog config={config} choose={choose} search={search} setSearch={setSearch}/></div>
  <div className="dash-aside"><PromoBanner config={config} go={go}/><BookingsPanel bookings={bookings} config={config} go={go} open={open}/></div>
 </div>;
}
