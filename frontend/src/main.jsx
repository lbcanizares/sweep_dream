import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';
import {api,remember} from './api.js';
import {ProtectedLayout,PublicLayout,StaffLayout} from './layouts.jsx';
import {Button,PageSkeleton,RouteProgress} from './ui.jsx';
import Dashboard,{DashboardSkeleton} from './Dashboard.jsx';
import HomeView from './HomeView.jsx';
import ServiceView from './ServiceView.jsx';
import BookView from './BookView.jsx';
import BookingsView from './BookingsView.jsx';
import AdminView from './AdminView.jsx';
import AdminLogin from './AdminLogin.jsx';
import AuthView from './AuthView.jsx';

// Hash routes. Public: home, login, signup. Customer app (ProtectedLayout when signed in; guests can still
// book and look up by token in the public layout): detail, book, bookings. Members only: dashboard. Staff: admin*.
const ROUTES=['home','dashboard','detail','book','bookings','login','signup','admin-login','admin'],ALIAS={start:'home',track:'bookings'};
const STAFF=['admin','admin-login'],APP=['dashboard','detail','book','bookings'];
const route=()=>{const id=location.hash.slice(1);const r=ALIAS[id]||id;return ROUTES.includes(r)?r:'home'};

function App(){
  const [tab,setTab]=useState(route),[config,setConfig]=useState(null),[configFailed,setConfigFailed]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [busyKey,setBusyKey]=useState(''),[navigating,setNavigating]=useState(true);
  const [user,setUser]=useState(null),[authReady,setAuthReady]=useState(false),[accountBookings,setAccountBookings]=useState(null);
  const [availability,setAvailability]=useState(null),[search,setSearch]=useState('');
  const [step,setStep]=useState(1),[form,setForm]=useState({size:'small',date:'',time:'09:00',name:'',contact:'',room:'',notes:''});
  const [saved,setSaved]=useState(()=>{try{return JSON.parse(localStorage.getItem('sweep-access')||'null')}catch{return null}}),[lookup,setLookup]=useState({id:'',token:''}),[booking,setBooking]=useState(null);
  const [adminKey,setAdminKey]=useState(''),[rows,setRows]=useState([]);
  const loadConfig=()=>api('/config').then(c=>{setConfig(c);setConfigFailed(false)}).catch(()=>setConfigFailed(true));
  useEffect(()=>{loadConfig();api('/auth/me').then(d=>{setUser(d.user);if(d.user)setForm(f=>({...f,name:f.name||d.user.name,contact:f.contact||d.user.email}))}).catch(()=>{}).finally(()=>setAuthReady(true))},[]);
  useEffect(()=>{window.scrollTo(0,0);},[tab,step]);
  const run=async(fn,key='action')=>{setBusyKey(key);setError('');setMessage('');try{await fn()}catch(e){setError(e.message)}finally{setBusyKey('')}};
  const fetchBooking=async access=>{const b=await api('/bookings/'+access.id,{headers:{'x-booking-token':access.token}});setBooking(b);setLookup(access);setSaved(access);remember(access);};
  const load=(access,key)=>run(()=>fetchBooking(access),key);
  const refreshAdmin=async k=>setRows(await api('/admin/bookings',{headers:{Authorization:'Bearer '+k}}));
  const update=(b,status,cleaner,completedChecklist)=>run(async()=>{await api('/admin/bookings/'+b.id,{method:'PATCH',headers:{Authorization:'Bearer '+adminKey},body:JSON.stringify({status,cleaner,completedChecklist})});await refreshAdmin(adminKey);setMessage('Booking updated.');},b.id+status);
  const clearAdmin=()=>{setAdminKey('');setRows([]);};
  const show=id=>{location.hash=id;setTab(id);};
  const redirect=id=>{history.replaceState(null,'','#'+id);setTab(id);};
  const go=id=>{if(!STAFF.includes(id))clearAdmin();show(id);setError('');setMessage('');};
  const forget=()=>{setBooking(null);setLookup({id:'',token:''});setSaved(null);try{localStorage.removeItem('sweep-access')}catch{}};
  useEffect(()=>{const sync=()=>{if(location.hash==='#main-content')return;setTab(route());setError('');};window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[]);
  // Route guards run once the session is known.
  useEffect(()=>{if(tab==='admin'&&!adminKey)redirect('admin-login');if(!STAFF.includes(tab))clearAdmin();if(!authReady)return;if(tab==='dashboard'&&!user)redirect('login');else if(user&&['home','login','signup'].includes(tab))redirect('dashboard');},[tab,adminKey,user,authReady]);
  // Route loads: drive the top progress bar and fetch what the next screen needs.
  useEffect(()=>{if(!authReady)return;let live=true;setNavigating(true);const jobs=[new Promise(r=>setTimeout(r,240))];
    if(user&&['dashboard','bookings'].includes(tab))jobs.push(api('/account/bookings').then(b=>live&&setAccountBookings(b)).catch(e=>live&&setError(e.message)));
    if(tab==='bookings'&&saved&&booking?.id!==saved.id)jobs.push(fetchBooking(saved).catch(e=>live&&setError(e.message)));
    Promise.all(jobs).then(()=>live&&setNavigating(false));return()=>{live=false}},[tab,user,authReady]);
  useEffect(()=>{if(!form.date){setAvailability(null);return}let current=true;setAvailability(null);api('/availability?date='+form.date).then(data=>{if(current)setAvailability(data)}).catch(e=>{if(current)setError(e.message)});return()=>{current=false}},[form.date,tab]);

  const submit=()=>run(async()=>{const b=await api('/bookings',{method:'POST',body:JSON.stringify(form)});const access={id:b.id,token:b.token};setSaved(access);remember(access);setLookup(access);setBooking(b);setAccountBookings(null);setStep(1);show('bookings');setMessage('Request saved. Your schedule is pending manual confirmation.');},'book');
  const logout=()=>run(async()=>{await api('/auth/logout',{method:'POST'});setUser(null);setAccountBookings(null);forget();go('home')},'logout');
  const onAuth=u=>{setUser(u);setForm({...form,name:u.name,contact:u.email});forget();setAccountBookings(null);go('dashboard')};
  const openBooking=b=>{go('bookings');load({id:b.id,token:''},'open-'+b.id)};

  const ready=config&&authReady;
  const layout=STAFF.includes(tab)?'staff':APP.includes(tab)&&(user||(!authReady&&tab==='dashboard'))?'app':'public';
  const body=configFailed&&!config?<section className="panel error-state" role="alert"><h1>We couldn't load Sweep Dreams</h1><p className="muted">The server didn't respond. Check your connection, then try again.</p><Button busy={busyKey==='config'} onClick={()=>run(loadConfig,'config')}>Try again</Button></section>
   :!ready||(tab==='dashboard'&&(!user||accountBookings===null))?(tab==='dashboard'?<DashboardSkeleton/>:<PageSkeleton/>)
   :tab==='admin-login'||(tab==='admin'&&!adminKey)?<AdminLogin busy={busyKey==='admin-login'} go={go} onLogin={k=>run(async()=>{await refreshAdmin(k);setAdminKey(k);show('admin')},'admin-login')}/>
   :tab==='admin'?<AdminView config={config} rows={rows} busyKey={busyKey} refresh={()=>run(()=>refreshAdmin(adminKey),'admin-refresh')} update={update}/>
   :['login','signup'].includes(tab)?<AuthView key={tab} mode={tab} go={go} onSuccess={onAuth}/>
   :tab==='dashboard'?<Dashboard user={user} config={config} bookings={accountBookings} go={go} search={search} setSearch={setSearch} open={openBooking}/>
   :tab==='detail'?<ServiceView config={config} go={go} user={user} setStep={setStep}/>
   :tab==='book'?<BookView config={config} form={form} setForm={setForm} step={step} setStep={setStep} availability={availability} busyKey={busyKey} setError={setError} submit={submit}/>
   :tab==='bookings'?<BookingsView user={user} accountBookings={accountBookings} booking={booking} lookup={lookup} setLookup={setLookup} load={load} busyKey={busyKey} go={go} cancel={()=>run(async()=>setBooking(await api('/bookings/'+booking.id+'/cancel',{method:'POST',headers:{'x-booking-token':lookup.token}})),'cancel')} feedback={(rating,comment)=>run(async()=>{setBooking(await api('/bookings/'+booking.id+'/feedback',{method:'POST',headers:{'x-booking-token':lookup.token},body:JSON.stringify({rating,comment})}));setMessage('Thank you for helping us improve.');},'feedback')}/>
   :<HomeView config={config} go={go}/>;
  const content=<>{config?.demo&&<p className="demo">Classroom demo · use fictional details only.</p>}{error&&<div className="notice error" role="alert">{error}</div>}{message&&<div className="notice" role="status">{message}</div>}<div className="view" key={ready?tab:'loading'}>{body}</div></>;
  const Layout=layout==='staff'?StaffLayout:layout==='app'?ProtectedLayout:PublicLayout;
  return <><a className="skip-link" href="#main-content">Skip to content</a><RouteProgress active={navigating||!ready}/><Layout tab={tab} go={go} user={user} logout={logout} loggingOut={busyKey==='logout'} adminKey={adminKey} adminLogout={()=>{clearAdmin();go('admin-login')}}>{content}</Layout></>;
}
createRoot(document.getElementById('root')).render(<App/>);
