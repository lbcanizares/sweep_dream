import React from 'react';
const paths={
 home:<><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-7h6v7"/></>,
 book:<><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 10h16m-8 3v5m-2.5-2.5h5"/></>,
 track:<><rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 8 1 1 2-2m2 1h3m-8 5h8m-8 4h5"/></>,
 admin:<><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>
};
export default function NavIcon({name}){return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;}
