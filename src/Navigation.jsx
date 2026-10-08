import React from 'react';
import NavIcon from './NavIcon.jsx';
export default function Navigation({tab,go,user,logout,adminKey,adminLogout}) {
 const staff=tab==='admin'||tab==='admin-login';
 const items=staff?(adminKey?[['admin','Booking desk']]:[]):[['home','Home'],['book','Book a clean'],['track','My booking']];
 const active=tab==='detail'?'home':tab;
 return <header><a className="brand" href="#home" onClick={e=>{e.preventDefault();go('home')}}><span className="brand-icon" aria-hidden="true">🧹</span><span>Sweep Dreams<small>We clean. You relax.</small></span></a><nav aria-label="Main navigation">{items.map(([id,label])=><a href={'#'+id} className={active===id?'nav active':'nav'} aria-current={active===id?'page':undefined} key={id} onClick={e=>{e.preventDefault();go(id)}}><NavIcon name={id}/><span className="nav-label">{label}</span></a>)}</nav><div className="account-nav">{staff?<><span>Administrator portal</span>{adminKey&&<button className="secondary" onClick={adminLogout}>Admin log out</button>}<a href="#login" onClick={e=>{e.preventDefault();go('login')}}>Customer login</a></>:user?<><span>{user.name}</span><button className="secondary" onClick={logout}>Log out</button></>:<><a href="#login" onClick={e=>{e.preventDefault();go('login')}}>Log in</a><a className="primary" href="#signup" onClick={e=>{e.preventDefault();go('signup')}}>Sign up</a></>}</div></header>;
}
