import React from 'react';
import NavIcon from './NavIcon.jsx';
import {pesos} from './api.js';
export default function ServiceView({config,go,user,setStep}){
 return <section className="page detail-page">
  <button className="back-link" onClick={()=>go(user?'dashboard':'home')}><NavIcon name="back" size={18}/>Back</button>
  <div className="detail-grid"><div className="detail-art" aria-hidden="true"><NavIcon name="window" size={150} stroke={1}/></div>
   <div className="panel detail-copy"><h1>Basic dorm clean</h1><p className="lead">A fresh start for your space · about 1 hour</p><p className="detail-price">{pesos(config.prices.small)}<small> from</small></p>
    <h2>What's included</h2><ul className="included">{config.checklist.map(c=><li key={c}><span aria-hidden="true">✓</span>{c}</li>)}</ul>
    <div className="callout"><strong>Simple pricing</strong><p>Small dorm up to 15 m²: {pesos(config.prices.small)}. Standard dorm 16–25 m²: {pesos(config.prices.standard)}. Pay with cash after your clean.</p></div>
    <p className="fine">Basic room cleaning only. Deep cleaning, bathrooms, windows and appliances are outside this pilot.</p>
    <button className="primary wide" onClick={()=>{setStep(1);go('book')}}>Book now</button></div></div>
 </section>;
}
