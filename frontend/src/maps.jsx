// Lightweight entry point for maps: Leaflet itself is only downloaded when a map is shown.
import React,{Suspense,lazy,useState} from 'react';

const Dialog=lazy(()=>import('./MapPicker.jsx'));
const View=lazy(()=>import('./MapPicker.jsx').then(m=>({default:m.MapView})));

// Read-only map of a saved pin. Keyed by the spot so it re-centres when the pin changes.
export const MapView=props=><Suspense fallback={<div className="map-box map-preview map-loading" aria-busy="true">Loading map…</div>}><View key={props.location.lat+','+props.location.lng} {...props}/></Suspense>;

// Booking form card: shows the chosen pin and opens the full-screen map to set or change it.
export function PinField({area,value,onChange}){
 const [open,setOpen]=useState(false);
 return <div className="pin-card">
  {value&&<MapView area={area} location={value} label="Your pinned location"/>}
  <div className="pin-card-row">
   <p>{value?<><strong>Pinned ✓</strong> {value.lat.toFixed(5)}, {value.lng.toFixed(5)}</>:'No pin yet. Open the map and place the pin on your building.'}</p>
   <button type="button" className={(value?'secondary':'primary')+' small'} aria-haspopup="dialog" onClick={()=>setOpen(true)}>{value?'Change pin':'Set pin on map'}</button>
  </div>
  {open&&<Suspense fallback={<div className="map-dialog-backdrop"><div className="map-dialog map-loading" aria-busy="true">Loading map…</div></div>}>
   <Dialog area={area} value={value} onClose={()=>setOpen(false)} onConfirm={spot=>{onChange(spot);setOpen(false);}}/>
  </Suspense>}
 </div>;
}

// Google Maps links for a saved pin.
export const mapLink=l=>`https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}`;
export const directionsLink=l=>`https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}`;
