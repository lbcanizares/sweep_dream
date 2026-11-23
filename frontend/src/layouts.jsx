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
  {open&&<div className="account-menu" role="menu"><div className="account-who"><strong>{user.name}</strong><small>{user.email}</small></div>{menuFor(user).map(([id,label])=><a key={id} role="menuitem" href={'#'+id} onClick={pick(id)}>{label}</a>)}<Button role="menuitem" className="menu-danger" busy={busy} onClick={logout}>Log out</Button></div>}
 </div>;
}

const appNav=[['dashboard','Home','home'],['book','Book a clean','book'],['bookings','My bookings','track']];
const cleanerNav=[['cleaner','My jobs','track']];
// Cleaners and customers share the login and the shell, but each sees only their own pages.
export const homeFor=user=>user?.role==='cleaner'?'cleaner':'dashboard';
const navFor=user=>user?.role==='cleaner'?cleanerNav:appNav;
const menuFor=user=>user?.role==='cleaner'?[['cleaner','My jobs']]:[['bookings','My bookings'],['book','Book a clean']];

// Signed-in shell: fixed top bar, persistent 250px sidebar on desktop/tablet, off-canvas drawer below 768px.
// Shared by customers, cleaners and the admin; each passes its own nav, top-right control and sidebar footer.
function AppShell({tab,go,home,nav,active=tab,topRight,sideFoot,label='Main navigation',children}){
 const [open,setOpen]=useState(false),toggle=useRef(null),drawer=useRef(null);
 useEffect(()=>setOpen(false),[tab]);
 useEffect(()=>{if(!open)return;const key=e=>{if(e.key==='Escape')setOpen(false)};document.addEventListener('keydown',key);document.body.classList.add('no-scroll');const f=requestAnimationFrame(()=>drawer.current?.querySelector('.side-link')?.focus());return()=>{cancelAnimationFrame(f);document.removeEventListener('keydown',key);document.body.classList.remove('no-scroll');toggle.current?.focus({preventScroll:true})}},[open]);
 return <div className={'shell shell-app'+(open?' drawer-open':'')}>
  <header className="topbar">
   <button ref={toggle} className="icon-button menu-toggle" aria-label="Open menu" aria-expanded={open} aria-controls="app-sidebar" onClick={()=>setOpen(true)}><NavIcon name="menu"/></button>
   <Brand go={go} to={home}/>
   {topRight}
  </header>
  <div className="backdrop" onClick={()=>setOpen(false)} aria-hidden="true"/>
  <aside id="app-sidebar" ref={drawer} className="sidebar" aria-label={label}>
   <div className="drawer-head"><Brand go={go} to={home}/><button className="icon-button" aria-label="Close menu" onClick={()=>setOpen(false)}><NavIcon name="close"/></button></div>
   <nav>{nav.map(([id,text,icon])=><a key={id} href={'#'+id} className={'side-link'+(active===id?' active':'')} aria-current={active===id?'page':undefined} onClick={link(go,id)}><NavIcon name={icon} size={20}/><span>{text}</span></a>)}</nav>
   <div className="sidebar-foot">{sideFoot}</div>
  </aside>
  <main id="main-content" className="content" tabIndex={-1}>{children}</main>
 </div>;
}

export function ProtectedLayout({tab,go,user,logout,loggingOut,children}){
 return <AppShell tab={tab} go={go} home={homeFor(user)} nav={navFor(user)} active={tab==='detail'?'dashboard':tab}
  topRight={<AccountMenu user={user} go={go} logout={logout} busy={loggingOut}/>}
  sideFoot={<>{user&&<div className="side-user"><span className="avatar" aria-hidden="true">{initials(user.name)}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div>}<Button className="side-link side-logout" busy={loggingOut} onClick={logout}><NavIcon name="logout" size={20}/>Log out</Button></>}>{children}</AppShell>;
}

export function PublicLayout({go,children}){
 return <div className="shell shell-public">
  <header className="topbar"><Brand go={go} to="home"/><nav className="public-nav" aria-label="Main navigation"><a className="text-link" href="#login" onClick={link(go,'login')}>Log in</a><a className="primary small" href="#signup" onClick={link(go,'signup')}>Sign up</a></nav></header>
  <main id="main-content" className="content" tabIndex={-1}>{children}</main>
  <footer className="site-foot"><span>Sweep Dreams · We clean. You relax.</span></footer>
 </div>;
}

const adminNav=[['admin','Bookings','track'],['admin-cleaners','Cleaners','admin']];

// Before the key is entered, the staff login keeps the simple public header; afterwards the admin gets the sidebar shell.
export function StaffLayout({tab,go,adminKey,adminLogout,children}){
 if(adminKey)return <AppShell tab={tab} go={go} home="admin" nav={adminNav} label="Administrator navigation"
  topRight={<span className="staff-tag">Administrator portal</span>}
  sideFoot={<><div className="side-user"><span className="avatar" aria-hidden="true">AD</span><span><strong>Administrator</strong><small>Booking desk</small></span></div><Button className="side-link side-logout" onClick={adminLogout}><NavIcon name="logout" size={20}/>Admin log out</Button></>}>{children}</AppShell>;
 return <div className="shell shell-public shell-staff">
  <header className="topbar"><Brand go={go} to="home"/><nav className="public-nav" aria-label="Staff navigation"><span className="staff-tag">Administrator portal</span>{adminKey&&<button className="secondary small" onClick={adminLogout}>Admin log out</button>}<a className="text-link" href="#login" onClick={link(go,'login')}>Customer login</a></nav></header>
  <main id="main-content" className="content" tabIndex={-1}>{children}</main>
 </div>;
}
