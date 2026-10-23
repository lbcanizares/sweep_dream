import React from 'react';
const paths={
 home:<><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-7h6v7"/></>,
 book:<><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 10h16m-8 3v5m-2.5-2.5h5"/></>,
 track:<><rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 8 1 1 2-2m2 1h3m-8 5h8m-8 4h5"/></>,
 admin:<><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
 menu:<path d="M4 7h16M4 12h16M4 17h16"/>,
 close:<path d="M6 6l12 12M18 6 6 18"/>,
 search:<><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></>,
 arrow:<path d="M5 12h14m-5-5 5 5-5 5"/>,
 back:<path d="M19 12H5m5-5-5 5 5 5"/>,
 chevron:<path d="m7 10 5 5 5-5"/>,
 window:<><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 4v16M4 12h16"/></>,
 house:<><path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5.5h4V20"/></>,
 logout:<><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="m9 16-4-4 4-4M5 12h10"/></>,
 broom:<><path d="M19 3.5 12.5 11"/><path d="m9.6 9.6 4.8 4.8c-.4 2.9-2 5.3-4.4 6.6-2.6-.8-4.9-2.6-6.5-5 1.6-3.3 3.6-5.4 6.1-6.4Z"/><path d="m7.3 17.6 2.3-2.6M5.6 15.3l2.2-2"/></>
};
export default function NavIcon({name,size=22,stroke=1.7}){return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;}
