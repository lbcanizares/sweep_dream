import React from 'react';
import {pesos} from './api.js';
import {PromoBanner,ServiceCatalog} from './Services.jsx';
import {pesosFrom} from './ui.jsx';
// Public marketing home for guests; signed-in customers are redirected to #dashboard.
export default function HomeView({config,go,choose}){
 return <div className="landing">
  <section className="landing-hero"><div className="landing-copy"><h1>A clean room, on your schedule.</h1><p className="lead">Book a dorm or home clean in three steps, from {pesos(pesosFrom(config))}. More time for classes, practice and everything in between.</p><div className="landing-actions"><button className="primary" onClick={()=>go('signup')}>Create an account</button><button className="secondary" onClick={()=>go('login')}>Log in</button></div><p className="fine">An account keeps your bookings in one place, on every device.</p></div><PromoBanner config={config}/></section>
  <ServiceCatalog config={config} choose={choose} title="What we clean"/>
 </div>;
}
