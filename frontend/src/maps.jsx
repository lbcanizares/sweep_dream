// Lightweight entry point for maps: Leaflet itself is only downloaded when a map is shown.
import React,{Suspense,lazy} from 'react';

const Picker=lazy(()=>import('./MapPicker.jsx'));
const View=lazy(()=>import('./MapPicker.jsx').then(m=>({default:m.MapView})));
const Loading=({tall})=><div className={'map-box map-loading'+(tall?'':' map-preview')} aria-busy="true">Loading map…</div>;

export const MapPicker=props=><Suspense fallback={<Loading tall/>}><Picker {...props}/></Suspense>;
export const MapView=props=><Suspense fallback={<Loading/>}><View {...props}/></Suspense>;

// Google Maps links for a saved pin.
export const mapLink=l=>`https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}`;
export const directionsLink=l=>`https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}`;
