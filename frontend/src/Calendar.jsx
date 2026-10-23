import React,{useState} from 'react';
export default function Calendar({today,value,onChange}){
 const start=new Date((value||today)+'T12:00:00');
 const [month,setMonth]=useState(new Date(start.getFullYear(),start.getMonth(),1));
 const title=month.toLocaleDateString('en-US',{month:'long',year:'numeric'});
 const pad=n=>String(n).padStart(2,'0');
 const days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
 const todayDate=new Date(today+'T12:00:00');
 const previous=month.getFullYear()*12+month.getMonth()<=todayDate.getFullYear()*12+todayDate.getMonth();
 return <div className="calendar"><div className="calendar-heading"><strong>{title}</strong><div><button type="button" aria-label="Previous month" disabled={previous} onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>‹</button><button type="button" aria-label="Next month" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>›</button></div></div><div className="calendar-grid">{['S','M','T','W','T','F','S'].map((d,i)=><span key={'weekday'+i}>{d}</span>)}{Array.from({length:month.getDay()},(_,i)=><span key={'blank'+i}/>)}{Array.from({length:days},(_,i)=>{const day=i+1,date=month.getFullYear()+'-'+pad(month.getMonth()+1)+'-'+pad(day);return <button type="button" key={date} aria-label={month.toLocaleDateString('en-US',{month:'long'})+' '+day+', '+month.getFullYear()} aria-pressed={value===date} disabled={date<=today} className={value===date?'picked':''} onClick={()=>onChange(date)}>{day}</button>})}</div><label className="date-value">Preferred date<input required type="text" readOnly value={value} aria-label="Preferred date" placeholder="Choose a date above"/></label></div>;
}
