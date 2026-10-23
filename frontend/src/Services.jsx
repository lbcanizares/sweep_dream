import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import NavIcon from './NavIcon.jsx';
import {pesos} from './api.js';
import {pesosFrom} from './ui.jsx';

// Only basic dorm cleaning is bookable in this MVP; the others are shown as "Coming later" with no price.
export const services=[
 {id:'basic',name:'Basic dorm cleaning',cat:'Dorm',time:'About 1 hour · one-time clean',icon:'window',available:true},
 {id:'deep',name:'Dorm deep clean',cat:'Dorm',time:'About 3 hours · bathrooms and windows',icon:'window',available:false},
 {id:'home',name:'Regular home cleaning',cat:'Home',time:'About 2–3 hours · weekly or monthly',icon:'house',available:false}
];
const filters=['All','Dorm','Home'];

export function PromoBanner({config,go}){
 return <section className="promo" aria-label="Offer"><div className="promo-copy"><span className="promo-tag">FROM {pesos(pesosFrom(config))}</span><h2>A fresh room.<br/>A clear mind.</h2><p>Your space, taken care of.</p>{go&&<a className="promo-link" href="#detail" onClick={e=>{e.preventDefault();go('detail')}}>See what's included <NavIcon name="arrow" size={16}/></a>}</div><span className="promo-art" aria-hidden="true"><NavIcon name="broom" size={132} stroke={1.1}/></span></section>;
}

// Pills share one navy thumb that slides to the active pill.
function FilterPills({value,onChange}){
 const wrap=useRef(null),[box,setBox]=useState(null);
 useLayoutEffect(()=>{const measure=()=>{const el=wrap.current?.querySelector('[aria-pressed="true"]');if(el)setBox({x:el.offsetLeft,w:el.offsetWidth})};measure();const ro=new ResizeObserver(measure);ro.observe(wrap.current);document.fonts?.ready.then(measure);return()=>ro.disconnect()},[value]);
 return <div className="filters" ref={wrap} role="group" aria-label="Filter services">{box&&<span className="filter-thumb" style={{width:box.w,transform:`translateX(${box.x}px)`}} aria-hidden="true"/>}{filters.map(f=><button key={f} type="button" aria-pressed={value===f} onClick={()=>onChange(f)}>{f}</button>)}</div>;
}

export function ServiceCatalog({config,go,search='',setSearch,title='Services'}){
 const [category,setCategory]=useState('All'),[shown,setShown]=useState('All'),[fading,setFading]=useState(false);
 useEffect(()=>{if(category===shown)return;setFading(true);const t=setTimeout(()=>{setShown(category);setFading(false)},170);return()=>clearTimeout(t)},[category]);
 const q=search.trim().toLowerCase(),list=services.filter(s=>(shown==='All'||s.cat===shown)&&s.name.toLowerCase().includes(q));
 return <section className="catalog" aria-labelledby="catalog-title"><div className="catalog-head"><h2 id="catalog-title">{title}</h2><FilterPills value={category} onChange={setCategory}/></div>
  <div className={'service-list'+(fading?' is-fading':'')} aria-live="polite">{list.map(s=><button key={s.id} type="button" className="service-card" disabled={!s.available} onClick={()=>go('detail')} aria-label={s.available?undefined:s.name+', coming later'}>
   <span className="service-icon" aria-hidden="true"><NavIcon name={s.icon} size={24} stroke={1.6}/></span>
   <span className="service-copy"><strong>{s.name}</strong><small>{s.time}</small></span>
   <span className="service-price">{s.available?<><small>from</small>{pesos(pesosFrom(config))}</>:<small className="soon">Coming later</small>}</span>
   <span className="service-arrow" aria-hidden="true">{s.available&&<NavIcon name="arrow" size={20}/>}</span>
  </button>)}
  {!list.length&&<div className="empty-row"><p>No services match “{search.trim()}”{shown!=='All'&&' in '+shown}.</p>{setSearch&&q&&<button type="button" className="text-link" onClick={()=>setSearch('')}>Clear search</button>}</div>}</div>
 </section>;
}
