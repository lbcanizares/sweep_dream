// Leaflet maps for the booking pin. Loaded lazily (see maps.jsx), so this code and Leaflet's CSS
// only download when a map is on screen. Tiles and search come from OpenStreetMap.
import React,{useEffect,useRef,useState} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TILES='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const CREDIT='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
// Our own pin (Leaflet's default marker images don't survive bundling).
const pinIcon=L.divIcon({className:'map-pin',iconSize:[32,42],iconAnchor:[16,41],
 html:'<svg viewBox="0 0 32 42" width="32" height="42" aria-hidden="true"><path d="M16 1C7.7 1 1 7.6 1 15.8 1 27 16 41 16 41s15-14 15-25.2C31 7.6 24.3 1 16 1z" fill="#0B2763" stroke="#fff" stroke-width="2"/><circle cx="16" cy="16" r="5.5" fill="#FFD23F"/></svg>'});

const inside=(area,{lat,lng})=>lat>=area.bounds[0][0]&&lat<=area.bounds[1][0]&&lng>=area.bounds[0][1]&&lng<=area.bounds[1][1];
const round=n=>+n.toFixed(6);

function useMap(ref,area,location,options){
 const map=useRef(null);
 useEffect(()=>{
  const m=L.map(ref.current,{center:location?[location.lat,location.lng]:area.center,zoom:location?17:area.zoom,minZoom:12,
   maxBounds:L.latLngBounds(area.bounds).pad(0.25),maxBoundsViscosity:0.8,scrollWheelZoom:false,...options});
  L.tileLayer(TILES,{maxZoom:19,attribution:CREDIT}).addTo(m);
  // The container may still be settling into its final size when the map is created.
  const t=setTimeout(()=>m.invalidateSize(),150);
  map.current=m;
  return()=>{clearTimeout(t);m.remove();map.current=null;};
 },[]);
 return map;
}

// Pick a spot: tap the map, drag the pin, use GPS, search, or pin the map centre (keyboard friendly).
export default function MapPicker({area,value,onChange}){
 const box=useRef(null),marker=useRef(null),changeRef=useRef(onChange),lastSearch=useRef(0);
 const [query,setQuery]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState('');
 changeRef.current=onChange;
 const map=useMap(box,area,value,{});
 const place=(latlng,{fly=false,note=''}={})=>{
  const spot={lat:round(latlng.lat),lng:round(latlng.lng)};
  if(!inside(area,spot)){setStatus('That spot is outside '+area.name+', our service area. Choose a place within '+area.name+'.');return false;}
  setStatus(note);changeRef.current(spot);
  if(fly)map.current?.setView([spot.lat,spot.lng],17);
  return true;
 };
 // Keep the marker in step with the chosen spot.
 useEffect(()=>{
  const m=map.current;if(!m)return;
  if(!value){marker.current?.remove();marker.current=null;return;}
  if(!marker.current){
   marker.current=L.marker([value.lat,value.lng],{icon:pinIcon,draggable:true,keyboard:false,title:'Your pin (drag to adjust)'}).addTo(m);
   marker.current.on('dragend',e=>{if(!place(e.target.getLatLng()))e.target.setLatLng([valueRef.current.lat,valueRef.current.lng]);});
  }else marker.current.setLatLng([value.lat,value.lng]);
 },[value?.lat,value?.lng]);
 const valueRef=useRef(value);valueRef.current=value;
 useEffect(()=>{const m=map.current;const click=e=>place(e.latlng);m.on('click',click);return()=>m.off('click',click);},[]);

 const locate=()=>{
  if(!navigator.geolocation){setStatus('Your browser can’t share your location. Tap the map instead.');return;}
  setBusy('locate');setStatus('Finding your location…');
  navigator.geolocation.getCurrentPosition(
   pos=>{setBusy('');place({lat:pos.coords.latitude,lng:pos.coords.longitude},{fly:true,note:'Pinned at your current location. Drag the pin if it’s a little off.'})||setStatus('You seem to be outside '+area.name+'. Move the map and tap where the cleaner should go.');},
   err=>{setBusy('');setStatus(err.code===1?'Location permission was blocked. Tap the map or search instead.':'We couldn’t get your location. Tap the map or search instead.');},
   {enableHighAccuracy:true,timeout:10000,maximumAge:0});
 };
 const search=async()=>{
  const q=query.trim();if(!q||busy)return;
  // OpenStreetMap's free search allows about one request per second.
  const wait=1100-(Date.now()-lastSearch.current);if(wait>0)await new Promise(r=>setTimeout(r,wait));
  lastSearch.current=Date.now();setBusy('search');setStatus('Searching…');
  const [[s,w],[n,e]]=area.bounds;
  try{
   const r=await fetch('https://nominatim.openstreetmap.org/search?'+new URLSearchParams({q,format:'jsonv2',limit:'1',countrycodes:'ph',bounded:'1',viewbox:[w,n,e,s].join(',')}),{headers:{'Accept-Language':'en'}});
   const hits=r.ok?await r.json():[];
   if(!hits.length)setStatus('No results in '+area.name+'. Try a nearby landmark, or tap the map.');
   else place({lat:+hits[0].lat,lng:+hits[0].lon},{fly:true,note:'Moved to “'+hits[0].display_name.split(',').slice(0,2).join(',')+'”. Drag the pin to your exact spot.'});
  }catch{setStatus('Search isn’t available right now. Tap the map instead.');}
  setBusy('');
 };
 const pinCentre=()=>{const c=map.current?.getCenter();if(c)place(c,{note:'Pinned at the centre of the map. Drag the pin to adjust.'});};

 return <div className="map-picker">
  <div className="map-tools">
   <input type="search" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();search();}}} placeholder={'Search a street or landmark in '+area.name} aria-label={'Search a street or landmark in '+area.name}/>
   <button type="button" className="secondary small" disabled={!!busy||!query.trim()} onClick={search}>{busy==='search'?'Searching…':'Search'}</button>
   <button type="button" className="secondary small" disabled={!!busy} onClick={locate}>{busy==='locate'?'Locating…':'Use my location'}</button>
  </div>
  <div ref={box} className="map-box" role="region" aria-label={'Map of '+area.name+'. Tap or click where the cleaner should go.'}/>
  <div className="map-foot"><p className="map-status" aria-live="polite">{value?<><strong>Pinned:</strong> {value.lat.toFixed(5)}, {value.lng.toFixed(5)}</>:'No pin yet. Tap the map where the cleaner should go.'}{status&&<span> {status}</span>}</p>
   <button type="button" className="text-link" onClick={pinCentre}>Pin the map centre</button></div>
 </div>;
}

// Read-only map showing a saved pin.
export function MapView({location,area,label}){
 const box=useRef(null);
 const map=useMap(box,area,location,{dragging:false,touchZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false,zoomControl:false,maxBounds:null});
 useEffect(()=>{const mk=L.marker([location.lat,location.lng],{icon:pinIcon,interactive:false,keyboard:false}).addTo(map.current);return()=>mk.remove();},[location.lat,location.lng]);
 return <div ref={box} className="map-box map-preview" role="img" aria-label={label||'Map showing the pinned location'}/>;
}
