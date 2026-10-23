import React from 'react';
import NavIcon from './NavIcon.jsx';
import {pesos} from './api.js';
import {servicePrice} from './ui.jsx';
export default function ServiceView({config,serviceId,go,user,setStep}){
 const s=config.services.find(x=>x.id===serviceId)||config.services[0];
 return <section className="page detail-page">
  <button className="back-link" onClick={()=>go(user?'dashboard':'home')}><NavIcon name="back" size={18}/>Back</button>
  <div className="detail-grid"><div className="detail-art" aria-hidden="true"><NavIcon name={s.category==='Home'?'house':'window'} size={150} stroke={1}/></div>
   <div className="panel detail-copy"><h1>{s.name}</h1><p className="lead">{s.desc}</p><p className="detail-price">{pesos(servicePrice(config,s))}<small> {s.sized?'from · ':''}{s.hours}</small></p>
    <h2>What's included</h2><ul className="included">{(s.included||config.checklist).map(c=><li key={c}><span aria-hidden="true">✓</span>{c}</li>)}</ul>
    {s.sized&&<div className="callout"><strong>Simple pricing</strong><p>Small dorm up to 15 m²: {pesos(config.prices.small)}. Standard dorm 16–25 m²: {pesos(config.prices.standard)}.</p></div>}
    <p className="fine">Optional add-ons when you book: {config.addons.map(a=>a.name+' (+'+pesos(a.price)+')').join(', ')}.</p>
    <button className="primary wide" onClick={()=>{setStep(1);go('book')}}>{user?'Book now':'Log in to book'}</button></div></div>
 </section>;
}
