import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';
import {api} from './api.js';
import {ProtectedLayout,PublicLayout,StaffLayout,homeFor} from './layouts.jsx';
import {Button,PageSkeleton,RouteProgress} from './ui.jsx';
import Dashboard,{DashboardSkeleton} from './Dashboard.jsx';
import HomeView from './HomeView.jsx';
import ServiceView from './ServiceView.jsx';
import BookView from './BookView.jsx';
import BookingsView from './BookingsView.jsx';
import AdminView from './AdminView.jsx';
import AdminLogin from './AdminLogin.jsx';
import AuthView from './AuthView.jsx';
import CleanerView from './CleanerView.jsx';

// Hash routes. Public: home, detail, login, signup. Login required (ProtectedLayout): dashboard, book, bookings, cleaner;
// guests are sent to #login and returned afterwards. Signed-in users see detail inside the shell too. Staff: admin*.
// Customers and cleaners share one login; cleaners only see #cleaner, customers never do.
const ROUTES=['home','dashboard','detail','book','bookings','cleaner','login','signup','admin-login','admin','admin-cleaners'],ALIAS={start:'home',track:'bookings',jobs:'cleaner'};
// Admin pages need the key; the sidebar switches between them.
const ADMIN=['admin','admin-cleaners'],STAFF=[...ADMIN,'admin-login'],APP=['dashboard','detail','book','bookings','cleaner'],MEMBER=['dashboard','book','bookings','cleaner'];
const isCleaner=u=>u?.role==='cleaner';
const route=()=>{const id=location.hash.slice(1);const r=ALIAS[id]||id;return ROUTES.includes(r)?r:'home'};

function App(){
  const [tab,setTab]=useState(route),[config,setConfig]=useState(null),[configFailed,setConfigFailed]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [busyKey,setBusyKey]=useState(''),[navigating,setNavigating]=useState(true);
  const [user,setUser]=useState(null),[authReady,setAuthReady]=useState(false),[accountBookings,setAccountBookings]=useState(null);
  const [availability,setAvailability]=useState(null),[search,setSearch]=useState('');
  const [step,setStep]=useState(1),[form,setForm]=useState({serviceId:'basic',size:'small',addons:[],extras:{},paymentMethod:'cash',date:'',time:'09:00',name:'',contact:'',room:'',notes:'',location:null});
  const [booking,setBooking]=useState(null);
  const [adminKey,setAdminKey]=useState(''),[rows,setRows]=useState([]),[staffCleaners,setStaffCleaners]=useState([]);
  const [cleanerData,setCleanerData]=useState(null);
  const loadConfig=()=>api('/config').then(c=>{setConfig(c);setConfigFailed(false)}).catch(()=>setConfigFailed(true));
  useEffect(()=>{loadConfig();api('/auth/me').then(d=>{setUser(d.user);if(d.user)setForm(f=>({...f,name:f.name||d.user.name,contact:f.contact||d.user.email}))}).catch(()=>{}).finally(()=>setAuthReady(true))},[]);
  useEffect(()=>{window.scrollTo(0,0);},[tab,step]);
  const run=async(fn,key='action')=>{setBusyKey(key);setError('');setMessage('');try{await fn()}catch(e){setError(e.message)}finally{setBusyKey('')}};
  const load=(id,key='open-'+id)=>run(async()=>setBooking(await api('/bookings/'+id)),key);
  const refreshAdmin=async k=>{const auth={headers:{Authorization:'Bearer '+k}};const [b,c]=await Promise.all([api('/admin/bookings',auth),api('/admin/cleaners',auth)]);setRows(b);setStaffCleaners(c);};
  const adminSend=(path,method,body)=>api(path,{method,headers:{Authorization:'Bearer '+adminKey},body:JSON.stringify(body)});
  const update=(b,status,cleanerId,completedChecklist)=>run(async()=>{await adminSend('/admin/bookings/'+b.id,'PATCH',{status,cleanerId,completedChecklist});await refreshAdmin(adminKey);setMessage('Booking updated.');},b.id+status);
  const reassign=(b,cleanerId)=>run(async()=>{const r=await adminSend('/admin/bookings/'+b.id+'/reassign','POST',{cleanerId});await refreshAdmin(adminKey);setMessage('Booking #'+b.id+' is now assigned to '+r.cleaner+'.');},b.id+'reassign');
  // Resolves true when the account was created, so the form can clear itself.
  const createCleaner=data=>{let ok=false;return run(async()=>{const c=await adminSend('/admin/cleaners','POST',data);await refreshAdmin(adminKey);setMessage(c.name+' can now log in on the normal login page with '+c.email+'.');ok=true;},'cleaner-create').then(()=>ok);};
  // Resolves true when saved, so the edit form can close.
  const updateCleaner=(c,patch,field)=>{let ok=false;return run(async()=>{const u=await adminSend('/admin/cleaners/'+c.id,'PATCH',patch);await refreshAdmin(adminKey);setMessage(u.name+(patch.active===false?' was deactivated.':patch.active===true?' was reactivated.':'’s details were saved.'));ok=true;},'cleaner-'+c.id+field).then(()=>ok);};
  const clearAdmin=()=>{setAdminKey('');setRows([]);setStaffCleaners([]);};
  const loadJobs=()=>api('/cleaner/jobs').then(setCleanerData).catch(e=>{setError(e.message);setCleanerData({blocked:true});});
  const advance=(job,status,completedChecklist)=>run(async()=>{const j=await api('/cleaner/jobs/'+job.id,{method:'PATCH',body:JSON.stringify({status,completedChecklist})});setCleanerData(d=>({...d,jobs:d.jobs.map(x=>x.id===j.id?j:x)}));setMessage(status==='completed'?'Job complete. Nice work!':'Job updated. The customer can see your progress.');},job.id+status);
  const show=id=>{location.hash=id;setTab(id);};
  const redirect=id=>{history.replaceState(null,'','#'+id);setTab(id);};
  const go=id=>{if(!STAFF.includes(id))clearAdmin();show(id);setError('');setMessage('');};
  useEffect(()=>{const sync=()=>{if(location.hash==='#main-content')return;setTab(route());setError('');};window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[]);
  // Route guards run once the session is known.
  useEffect(()=>{if(ADMIN.includes(tab)&&!adminKey)redirect('admin-login');if(!STAFF.includes(tab))clearAdmin();if(!authReady)return;if(MEMBER.includes(tab)&&!user){try{sessionStorage.setItem('after-login',tab)}catch{}redirect('login');setMessage(tab==='book'?'Please log in or sign up to book a clean.':tab==='cleaner'?'Please log in to see your jobs.':'Please log in to see your bookings.');}else if(user&&['home','login','signup'].includes(tab))redirect(homeFor(user));else if(isCleaner(user)&&APP.includes(tab)&&tab!=='cleaner')redirect('cleaner');else if(user&&!isCleaner(user)&&tab==='cleaner')redirect('dashboard');},[tab,adminKey,user,authReady]);
  // Route loads: drive the top progress bar and fetch what the next screen needs.
  useEffect(()=>{if(!authReady)return;let live=true;setNavigating(true);const jobs=[new Promise(r=>setTimeout(r,240))];
    if(isCleaner(user)&&tab==='cleaner')jobs.push(api('/cleaner/jobs').then(d=>live&&setCleanerData(d)).catch(e=>{if(live){setError(e.message);setCleanerData({blocked:true})}}));
    if(user&&!isCleaner(user)&&['dashboard','bookings'].includes(tab))jobs.push(api('/account/bookings').then(b=>live&&setAccountBookings(b)).catch(e=>live&&setError(e.message)));
    Promise.all(jobs).then(()=>live&&setNavigating(false));return()=>{live=false}},[tab,user,authReady]);
  useEffect(()=>{if(!form.date){setAvailability(null);return}let current=true;setAvailability(null);api('/availability?date='+form.date).then(data=>{if(current)setAvailability(data)}).catch(e=>{if(current)setError(e.message)});return()=>{current=false}},[form.date,tab]);

  const submit=()=>run(async()=>{const b=await api('/bookings',{method:'POST',body:JSON.stringify(form)});setBooking(b);setAccountBookings(null);setStep(1);setForm(f=>({...f,addons:[],extras:{},date:'',notes:''}));show('bookings');setMessage('Request saved. Your schedule is pending manual confirmation.');},'book');
  const logout=()=>run(async()=>{await api('/auth/logout',{method:'POST'});setUser(null);setAccountBookings(null);setBooking(null);setCleanerData(null);go('home')},'logout');
  const onAuth=u=>{setUser(u);setForm({...form,name:u.name,contact:u.email});setBooking(null);setAccountBookings(null);setCleanerData(null);let next=homeFor(u);try{const saved=sessionStorage.getItem('after-login');sessionStorage.removeItem('after-login');if(saved&&(saved==='cleaner')===isCleaner(u))next=saved}catch{}go(next)};
  const openBooking=b=>{go('bookings');load(b.id)};
  const choose=id=>{setForm({...form,serviceId:id,addons:[]});go('detail')};

  const ready=config&&authReady;
  const layout=STAFF.includes(tab)?'staff':APP.includes(tab)&&(user||(!authReady&&MEMBER.includes(tab)))?'app':'public';
  const body=configFailed&&!config?<section className="panel error-state" role="alert"><h1>We couldn't load Sweep Dreams</h1><p className="muted">The server didn't respond. Check your connection, then try again.</p><Button busy={busyKey==='config'} onClick={()=>run(loadConfig,'config')}>Try again</Button></section>
   :!ready||(MEMBER.includes(tab)&&!user)||(APP.includes(tab)&&(tab==='cleaner')!==isCleaner(user))||(tab==='cleaner'&&cleanerData===null)||(tab==='dashboard'&&accountBookings===null)?(tab==='dashboard'?<DashboardSkeleton/>:<PageSkeleton/>)
   :tab==='admin-login'||(ADMIN.includes(tab)&&!adminKey)?<AdminLogin busy={busyKey==='admin-login'} go={go} onLogin={k=>run(async()=>{await refreshAdmin(k);setAdminKey(k);show('admin')},'admin-login')}/>
   :ADMIN.includes(tab)?<AdminView section={tab==='admin-cleaners'?'cleaners':'bookings'} config={config} rows={rows} cleaners={staffCleaners} busyKey={busyKey} refresh={()=>run(()=>refreshAdmin(adminKey),'admin-refresh')} update={update} reassign={reassign} createCleaner={createCleaner} updateCleaner={updateCleaner} go={go}/>
   :tab==='cleaner'?<CleanerView user={user} config={config} data={cleanerData} busyKey={busyKey} advance={advance} refresh={()=>run(loadJobs,'cleaner-refresh')}/>
   :['login','signup'].includes(tab)?<AuthView key={tab} mode={tab} go={go} onSuccess={onAuth}/>
   :tab==='dashboard'?<Dashboard user={user} config={config} bookings={accountBookings} go={go} choose={choose} search={search} setSearch={setSearch} open={openBooking}/>
   :tab==='detail'?<ServiceView config={config} serviceId={form.serviceId} go={go} user={user} setStep={setStep}/>
   :tab==='book'?<BookView config={config} form={form} setForm={setForm} step={step} setStep={setStep} availability={availability} busyKey={busyKey} setError={setError} submit={submit}/>
   :tab==='bookings'?<BookingsView config={config} accountBookings={accountBookings} booking={booking} load={load} busyKey={busyKey} go={go} cancel={()=>run(async()=>setBooking(await api('/bookings/'+booking.id+'/cancel',{method:'POST'})),'cancel')} feedback={(rating,comment)=>run(async()=>{setBooking(await api('/bookings/'+booking.id+'/feedback',{method:'POST',body:JSON.stringify({rating,comment})}));setMessage('Thank you for helping us improve.');},'feedback')}/>
   :<HomeView config={config} go={go} choose={choose}/>;
  const content=<>{config?.demo&&<p className="demo">Classroom demo · use fictional details only.</p>}{error&&<div className="notice error" role="alert">{error}</div>}{message&&<div className="notice" role="status">{message}</div>}<div className="view" key={ready?tab:'loading'}>{body}</div></>;
  const Layout=layout==='staff'?StaffLayout:layout==='app'?ProtectedLayout:PublicLayout;
  return <><a className="skip-link" href="#main-content">Skip to content</a><RouteProgress active={navigating||!ready}/><Layout tab={tab} go={go} user={user} logout={logout} loggingOut={busyKey==='logout'} adminKey={adminKey} adminLogout={()=>{clearAdmin();go('admin-login')}}>{content}</Layout></>;
}
createRoot(document.getElementById('root')).render(<App/>);
