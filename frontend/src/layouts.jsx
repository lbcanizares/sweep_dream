import React,{useEffect,useRef,useState} from 'react';
import NavIcon from './NavIcon.jsx';
import {Button,Sk,initials} from './ui.jsx';

const link=(go,id)=>e=>{e.preventDefault();go(id)};
export function Brand({go,to}){return <a className="brand" href={'#'+to} onClick={link(go,to)}><span className="brand-mark" aria-hidden="true"><NavIcon name="broom" size={20} stroke={1.9}/></span><span className="brand-name">Sweep Dreams</span></a>;}

function AccountMenu({user,go,logout,busy}){
 const [open,setOpen]=useState(false),ref=useRef(null);
 useEffect(()=>{if(!open)return;const out=e=>{if(!ref.current?.contains(e.target))setOpen(false)},key=e=>{if(e.key==='Escape')setOpen(false)};document.addEventListener('pointerdown',out);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',out);document.removeEventListener('keydown',key)}},[open]);
 if(!user)return <Sk w={40} h={40} r={999}/>;
 const pick=id=>e=>{e.preventDefault();setOpen(false);go(id)};
 return <div className="account" ref={ref}><button className="account-toggle" aria-haspopup="menu" aria-expanded={open} onClick={()=>setOpen(!open)}><span className="avatar" aria-hidden="true">{initials(user.name)}</span><span className="account-name">{user.name.split(' ')[0]}</span><NavIcon name="chevron" size={16}/><span className="sr-only">Account menu</span></button>
  {open&&<div className="account-menu" role="menu"><div className="account-who"><strong>{user.name}</strong><small>{user.email}</small></div><a role="menuitem" href="#bookings" onClick={pick('bookings')}>My bookings</a><a role="menuitem" href="#book" onClick={pick('book')}>Book a clean</a><Button role="menuitem" className="menu-danger" busy={busy} onClick={logout}>Log out</Button></div>}
 </div>;
}

const appNav=[['dashboard','Home','home'],['book','Book a clean','book'],['bookings','My bookings','track']];

// Authenticated shell: fixed top bar, persistent 250px sidebar on desktop/tablet, off-canvas drawer below 768px.
export function ProtectedLayout({tab,go,user,logout,loggingOut,children}){
 const [open,setOpen]=useState(false),toggle=useRef(null),drawer=useRef(null);
 const active=tab==='detail'?'dashboard':tab;
 useEffect(()=>setOpen(false),[tab]);
 useEffect(()=>{if(!open)return;const key=e=>{if(e.key==='Escape')setOpen(false)};document.addEventListener('keydown',key);document.body.classList.add('no-scroll');const f=requestAnimationFrame(()=>drawer.current?.querySelector('.side-link')?.focus());return()=>{cancelAnimationFrame(f);document.removeEventListener('keydown',key);document.body.classList.remove('no-scroll');toggle.current?.focus({preventScroll:true})}},[open]);
 return <div className={'shell shell-app'+(open?' drawer-open':'')}>
  <header className="topbar">
   <button ref={toggle} className="icon-button menu-toggle" aria-label="Open menu" aria-expanded={open} aria-controls="app-sidebar" onClick={()=>setOpen(true)}><NavIcon name="menu"/></button>
   <Brand go={go} to="dashboard"/>
   <AccountMenu user={user} go={go} logout={logout} busy={loggingOut}/>
  </header>
  <div className="backdrop" onClick={()=>setOpen(false)} aria-hidden="true"/>
  <aside id="app-sidebar" ref={drawer} className="sidebar" aria-label="Main navigation">
   <div className="drawer-head"><Brand go={go} to="dashboard"/><button className="icon-button" aria-label="Close menu" onClick={()=>setOpen(false)}><NavIcon name="close"/></button></div>
   <nav>{appNav.map(([id,label,icon])=><a key={id} href={'#'+id} className={'side-link'+(active===id?' active':'')} aria-current={active===id?'page':undefined} onClick={link(go,id)}><NavIcon name={icon} size={20}/><span>{label}</span></a>)}</nav>
   <div className="sidebar-foot">{user&&<div className="side-user"><span className="avatar" aria-hidden="true">{initials(user.name)}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div>}<Button className="side-link side-logout" busy={loggingOut} onClick={logout}><NavIcon name="logout" size={20}/>Log out</Button></div>
  </aside>
  <main id="main-content" className="content" tabIndex={-1}>{children}</main>
 </div>;
}

export function PublicLayout({go,children}){
 return <div className="shell shell-public">
  <header className="topbar"><Brand go={go} to="home"/><nav className="public-nav" aria-label="Main navigation"><a className="text-link" href="#login" onClick={link(go,'login')}>Log in</a><a className="primary small" href="#signup" onClick={link(go,'signup')}>Sign up</a></nav></header>
  <main id="main-content" className="content" tabIndex={-1}>{children}</main>
  <footer className="site-foot"><span>Sweep Dreams · We clean. You relax.</span><span>Classroom MVP · one service, one campus pilot</span></footer>
 </div>;
}

export function StaffLayout({go,adminKey,adminLogout,children}){
 return <div className="shell shell-public shell-staff">
  <header className="topbar"><Brand go={go} to="home"/><nav className="public-nav" aria-label="Staff navigation"><span className="staff-tag">Administrator portal</span>{adminKey&&<button className="secondary small" onClick={adminLogout}>Admin log out</button>}<a className="text-link" href="#login" onClick={link(go,'login')}>Customer login</a></nav></header>
  <main id="main-content" className="content" tabIndex={-1}>{children}</main>
 </div>;
}
