// "Add to Google Calendar" link. No Google account connection: the customer saves the event themselves,
// and Google reminds them. Bookings are in Philippine time (UTC+8, no daylight saving).
const TZ='Asia/Manila',OFFSET_MS=8*3600e3;
const pad=n=>String(n).padStart(2,'0');

const minutesFor=(b,config)=>config?.services?.find(s=>s.id===b.serviceId)?.minutes||60;

// Start and end as real instants, from the booking's Manila date and time.
function span(b,config){
 const [y,m,d]=b.date.split('-').map(Number),[hh,mm]=b.time.split(':').map(Number);
 const start=Date.UTC(y,m-1,d,hh,mm)-OFFSET_MS;
 return {start,end:start+minutesFor(b,config)*60000};
}
// Manila wall-clock time as YYYYMMDDTHHMMSS, read together with ctz=Asia/Manila.
const stamp=ms=>{const t=new Date(ms+OFFSET_MS);return `${t.getUTCFullYear()}${pad(t.getUTCMonth()+1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}${pad(t.getUTCSeconds())}`;};

const title=b=>'Sweep Dreams: '+b.service+(b.status==='pending'?' (pending confirmation)':'');
function details(b,config,site){
 const pay=config?.paymentMethods?.find(p=>p.id===b.paymentMethod)?.name||'Cash on service';
 return [
  'Booking #'+b.id,
  b.status==='pending'?'This is your requested time. The Sweep Dreams team will confirm it.':null,
  b.cleaner?'Cleaner: '+b.cleaner:null,
  b.addons?.length?'Add-ons: '+b.addons.map(a=>a.name).join(', '):null,
  'Payment: '+pay,
  b.notes?'Your notes: '+b.notes:null,
  'Check or change this booking: '+site+'#bookings'
 ].filter(Boolean).join('\n');
}

// Opens Google Calendar with the event filled in; Google applies the customer's default reminders.
export function googleCalendarUrl(b,config,site){
 const {start,end}=span(b,config);
 const q=new URLSearchParams({action:'TEMPLATE',text:title(b),dates:stamp(start)+'/'+stamp(end),ctz:TZ,location:b.room,details:details(b,config,site)});
 return 'https://calendar.google.com/calendar/render?'+q.toString();
}
