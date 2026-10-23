import React,{useEffect,useState} from 'react';
export const servicePrice=(config,s)=>s.sized?config.prices.small:s.price;
export const pesosFrom=config=>config?.services?Math.min(...config.services.map(s=>servicePrice(config,s))):300;
// Mirrors the server's calculation for display only; the server recalculates the price it saves.
export const bookingTotal=(config,form)=>{const s=config.services.find(x=>x.id===form.serviceId);return s?(s.sized?config.prices[form.size]:s.price)+form.addons.reduce((n,id)=>n+(config.addons.find(a=>a.id===id)?.price||0),0):0};
export const paymentName=(config,id)=>config?.paymentMethods.find(p=>p.id===id)?.name||'Cash on service';
export const fmtDate=d=>new Date(d+'T12:00:00').toLocaleDateString('en-PH',{weekday:'short',day:'numeric',month:'short'});
export const initials=name=>(name||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
export const statusLabel={pending:'Pending confirmation',confirmed:'Confirmed',completed:'Completed',cancelled:'Cancelled'};

// Navy ring spinner; inherits currentColor inside buttons so it reads on navy and on white.
export function Spinner({size=18,label}){return <span className="spinner" style={{width:size,height:size}} role={label?'status':undefined} aria-label={label} aria-hidden={label?undefined:true}/>;}

// A button that owns its pending state: disabled + inline spinner, label kept so the width barely moves.
export function Button({busy,disabled,className='primary',children,...props}){return <button className={className+(busy?' is-busy':'')} disabled={busy||disabled} aria-busy={busy||undefined} {...props}>{busy&&<Spinner size={16}/>}<span>{children}</span></button>;}

export function StatusPill({status}){return <span className={'status '+status}>{statusLabel[status]||status}</span>;}

// Slim bar at the very top: creeps to ~80% while a route loads, then completes and fades.
export function RouteProgress({active}){
 const [state,setState]=useState('idle');
 useEffect(()=>{if(active){setState('running');return}setState(s=>s==='running'?'done':s);const t=setTimeout(()=>setState(s=>s==='done'?'idle':s),450);return()=>clearTimeout(t)},[active]);
 return <div className={'route-progress '+state} aria-hidden="true"><span/></div>;
}

export const Sk=({w,h=14,r,className=''})=><span className={'sk '+className} style={{width:w,height:h,borderRadius:r}}/>;

export function PageSkeleton(){return <div className="page" aria-busy="true" aria-label="Loading"><div className="page-head"><Sk w={220} h={32}/><Sk w={320} h={16}/></div><div className="panel sk-panel">{[0,1,2].map(i=><div className="sk-row" key={i}><Sk w="38%" h={16}/><Sk w="60%" h={12}/></div>)}</div></div>;}
