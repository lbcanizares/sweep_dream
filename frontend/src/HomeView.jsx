import React from 'react';
import {pesos} from './api.js';
import {PromoBanner,ServiceCatalog} from './Services.jsx';
import {pesosFrom} from './ui.jsx';
// Public marketing home for guests; signed-in customers are redirected to #dashboard.
export default function HomeView({config,go}){
 return <div className="landing">
  <section className="landing-hero"><div className="landing-copy"><h1>A clean room, on your schedule.</h1><p className="lead">Book a basic dorm clean in three steps and pay {pesos(pesosFrom(config))} in cash after the visit. More time for classes, practice and everything in between.</p><div className="landing-actions"><button className="primary" onClick={()=>go('signup')}>Create an account</button><button className="secondary" onClick={()=>go('detail')}>Book as a guest</button></div><p className="fine">Already booked? <a className="text-link" href="#bookings" onClick={e=>{e.preventDefault();go('bookings')}}>Find your booking</a> with its reference and private token.</p></div><PromoBanner config={config}/></section>
  <ServiceCatalog config={config} go={go} title="What we clean"/>
 </div>;
}
