// Leaflet maps for the booking pin. Loaded lazily (see maps.jsx), so this code and Leaflet's CSS
// only download when a map is on screen. Tiles and search come from OpenStreetMap.
import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TILES='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const CREDIT='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const PIN_SVG='<svg viewBox="0 0 32 42" width="32" height="42" aria-hidden="true"><path d="M16 1C7.7 1 1 7.6 1 15.8 1 27 16 41 16 41s15-14 15-25.2C31 7.6 24.3 1 16 1z" fill="#0B2763" stroke="#fff" stroke-width="2"/><circle cx="16" cy="16" r="5.5" fill="#FFD23F"/></svg>';
// Our own pin (Leaflet's default marker images don't survive bundling).
const pinIcon=L.divIcon({className:'map-pin',iconSize:[32,42],iconAnchor:[16,41],html:PIN_SVG});

const inside=(area,{lat,lng})=>lat>=area.bounds[0][0]&&lat<=area.bounds[1][0]&&lng>=area.bounds[0][1]&&lng<=area.bounds[1][1];
const round=n=>+n.toFixed(6);

function useMap(ref,area,location,options){
 const map=useRef(null);
 useEffect(()=>{
  const m=L.map(ref.current,{center:location?[location.lat,location.lng]:area.center,zoom:location?17:area.zoom,minZoom:12,
   maxBounds:L.latLngBounds(area.bounds).pad(0.25),maxBoundsViscosity:0.8,scrollWheelZoom:false,...options});
  L.tileLayer(TILES,{maxZoom:19,attribution:CREDIT}).addTo(m);
  // The container may still be settling into its final size when the map is created.
  const t=setTimeout(()=>m.invalidateSize(),250);
  map.current=m;
  return()=>{clearTimeout(t);m.remove();map.current=null;};
 },[]);
 return map;
}

// Full-screen (phones) / pop-up (larger screens) map with a fixed centre pin, like ride-hailing apps:
// the customer moves the map under the pin, then confirms. Search and "Use my location" move the map.
export default function MapDialog({area,value,onConfirm,onClose}){
 const box=useRef(null),dialog=useRef(null),search=useRef(null),lastSearch=useRef(0);
 const [centre,setCentre]=useState(value||{lat:area.center[0],lng:area.center[1]});
 const [moving,setMoving]=useState(false),[query,setQuery]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState('');
 const map=useMap(box,area,value,{scrollWheelZoom:true});
 const ok=inside(area,centre);

 useEffect(()=>{
  const m=map.current,read=()=>{const c=m.getCenter();setCentre({lat:round(c.lat),lng:round(c.lng)});};
  const start=()=>setMoving(true),end=()=>{setMoving(false);read();},drag=()=>setStatus(''),tap=e=>m.panTo(e.latlng);
  m.on('movestart',start).on('move',read).on('moveend',end).on('dragstart',drag).on('click',tap);
  return()=>{m.off('movestart',start).off('move',read).off('moveend',end).off('dragstart',drag).off('click',tap);};
 },[]);
 // Lock page scroll, focus the search box, and hand focus back to the opening button on close.
 useEffect(()=>{
  const opener=document.activeElement;document.body.classList.add('no-scroll');
  const f=requestAnimationFrame(()=>search.current?.focus());
  return()=>{cancelAnimationFrame(f);document.body.classList.remove('no-scroll');opener?.focus?.({preventScroll:true});};
 },[]);
 const keys=e=>{
  if(e.key==='Escape'){e.stopPropagation();onClose();return;}
  if(e.key!=='Tab')return;
  // Keep Tab inside the dialog.
  const items=[...dialog.current.querySelectorAll('button:not(:disabled),input,a[href],[tabindex="0"]')].filter(el=>el.offsetParent!==null);
  const first=items[0],last=items.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 };

 const goTo=(lat,lng,note)=>{if(!inside(area,{lat,lng}))return false;map.current.setView([lat,lng],17);setStatus(note);return true;};
 const locate=()=>{
  if(!navigator.geolocation){setStatus('Your browser can’t share your location. Move the map instead.');return;}
  setBusy('locate');setStatus('Finding your location…');
  navigator.geolocation.getCurrentPosition(
   pos=>{setBusy('');goTo(pos.coords.latitude,pos.coords.longitude,'Centred on your current location. Nudge the map if the pin is a little off.')||setStatus('You seem to be outside '+area.name+'. Move the map to where the cleaner should go.');},
   err=>{setBusy('');setStatus(err.code===1?'Location permission was blocked. Search or move the map instead.':'We couldn’t get your location. Search or move the map instead.');},
   {enableHighAccuracy:true,timeout:10000,maximumAge:0});
 };
 const find=async()=>{
  const q=query.trim();if(!q||busy)return;
  // OpenStreetMap's free search allows about one request per second.
  const wait=1100-(Date.now()-lastSearch.current);if(wait>0)await new Promise(r=>setTimeout(r,wait));
  lastSearch.current=Date.now();setBusy('search');setStatus('Searching…');
  const [[s,w],[n,e]]=area.bounds;
  try{
   const r=await fetch('https://nominatim.openstreetmap.org/search?'+new URLSearchParams({q,format:'jsonv2',limit:'1',countrycodes:'ph',bounded:'1',viewbox:[w,n,e,s].join(',')}),{headers:{'Accept-Language':'en'}});
   const hits=r.ok?await r.json():[];
   if(!hits.length||!goTo(+hits[0].lat,+hits[0].lon,'Moved to “'+hits[0].display_name.split(',').slice(0,2).join(',')+'”. Move the map so the pin sits on your building.'))
    setStatus('No results in '+area.name+'. Try a nearby landmark, or move the map.');
  }catch{setStatus('Search isn’t available right now. Move the map instead.');}
  setBusy('');
 };

 return createPortal(<div className="map-dialog-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <div ref={dialog} className="map-dialog" role="dialog" aria-modal="true" aria-labelledby="map-dialog-title" onKeyDown={keys}>
   <div className="map-dialog-head"><h2 id="map-dialog-title">Pin your location</h2><button type="button" className="icon-button" aria-label="Close map" onClick={onClose}><span aria-hidden="true">×</span></button></div>
   <div className="map-tools">
    <input ref={search} type="search" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();find();}}} placeholder={'Search a street or landmark in '+area.name} aria-label={'Search a street or landmark in '+area.name}/>
    <button type="button" className="secondary small" disabled={!!busy||!query.trim()} onClick={find}>{busy==='search'?'Searching…':'Search'}</button>
    <button type="button" className="secondary small" disabled={!!busy} onClick={locate}>{busy==='locate'?'Locating…':'Use my location'}</button>
   </div>
   <div className="map-dialog-map">
    <div ref={box} className="map-box" role="region" aria-label={'Map of '+area.name+'. Drag, scroll or use the arrow keys to move the map under the pin.'}/>
    <span className="centre-dot" aria-hidden="true"/>
    <span className={'centre-pin'+(moving?' lifted':'')} aria-hidden="true" dangerouslySetInnerHTML={{__html:PIN_SVG}}/>
   </div>
   <div className="map-dialog-foot">
    <p className="map-status" aria-live="polite">{ok?<><strong>{centre.lat.toFixed(5)}, {centre.lng.toFixed(5)}</strong> {status||'Move the map so the pin sits on your building.'}</>:<strong className="map-warning">This spot is outside {area.name}, our service area.</strong>}</p>
    <div className="actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button type="button" className="primary" disabled={!ok||moving} onClick={()=>onConfirm(centre)}>Confirm this location</button></div>
   </div>
  </div>
 </div>,document.body);
}

// Read-only map showing a saved pin.
export function MapView({location,area,label}){
 const box=useRef(null);
 const map=useMap(box,area,location,{dragging:false,touchZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false,zoomControl:false,maxBounds:null});
 useEffect(()=>{const mk=L.marker([location.lat,location.lng],{icon:pinIcon,interactive:false,keyboard:false}).addTo(map.current);return()=>mk.remove();},[location.lat,location.lng]);
 return <div ref={box} className="map-box map-preview" role="img" aria-label={label||'Map showing the pinned location'}/>;
}
