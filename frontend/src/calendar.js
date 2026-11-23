// "Add to calendar" helpers. No Google account connection: the customer saves the event themselves,
// and their calendar app reminds them. Bookings are in Philippine time (UTC+8, no daylight saving).
const TZ='Asia/Manila',OFFSET_MS=8*3600e3;
const pad=n=>String(n).padStart(2,'0');

const minutesFor=(b,config)=>config?.services?.find(s=>s.id===b.serviceId)?.minutes||60;

// Start and end as real instants, from the booking's Manila date and time.
function span(b,config){
 const [y,m,d]=b.date.split('-').map(Number),[hh,mm]=b.time.split(':').map(Number);
 const start=Date.UTC(y,m-1,d,hh,mm)-OFFSET_MS;
 return {start,end:start+minutesFor(b,config)*60000};
}
const stamp=(ms,{utc})=>{const t=new Date(utc?ms:ms+OFFSET_MS);return `${t.getUTCFullYear()}${pad(t.getUTCMonth()+1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}${pad(t.getUTCSeconds())}${utc?'Z':''}`;};

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
 const q=new URLSearchParams({action:'TEMPLATE',text:title(b),dates:stamp(start,{utc:false})+'/'+stamp(end,{utc:false}),ctz:TZ,location:b.room,details:details(b,config,site)});
 return 'https://calendar.google.com/calendar/render?'+q.toString();
}

const esc=s=>String(s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
// iCalendar lines must be at most 75 bytes; longer ones continue on lines starting with a space.
function fold(line){
 const enc=new TextEncoder(),out=[];let cur='',size=0,limit=75;
 for(const ch of line){const n=enc.encode(ch).length;if(size+n>limit){out.push(cur);cur=' ';size=1;limit=75;}cur+=ch;size+=n;}
 out.push(cur);return out.join('\r\n');
}

// A calendar file (Apple Calendar, Outlook, etc.) with reminders a day and an hour before.
export function icsFile(b,config,site,now=Date.now()){
 const {start,end}=span(b,config);
 const alarm=(trigger,text)=>['BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+esc(text),'TRIGGER:'+trigger,'END:VALARM'];
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Sweep Dreams//Bookings//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH',
  'BEGIN:VEVENT','UID:'+b.id+'@sweep-dreams','DTSTAMP:'+stamp(now,{utc:true}),'DTSTART:'+stamp(start,{utc:true}),'DTEND:'+stamp(end,{utc:true}),
  'SUMMARY:'+esc(title(b)),'LOCATION:'+esc(b.room),'DESCRIPTION:'+esc(details(b,config,site)),'URL:'+site+'#bookings','STATUS:'+(b.status==='pending'?'TENTATIVE':'CONFIRMED'),
  ...alarm('-P1D','Sweep Dreams cleaning tomorrow at '+b.time),...alarm('-PT1H','Sweep Dreams cleaning in 1 hour'),
  'END:VEVENT','END:VCALENDAR'].map(fold).join('\r\n')+'\r\n';
}

export function downloadIcs(b,config,site){
 const url=URL.createObjectURL(new Blob([icsFile(b,config,site)],{type:'text/calendar;charset=utf-8'}));
 const a=Object.assign(document.createElement('a'),{href:url,download:'sweep-dreams-'+b.id+'.ics'});
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
