import { useState, useMemo, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://puohduglzhipcgbafkwo.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1b2hkdWdsemhpcGNnYmFma3dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NzgyNzYsImV4cCI6MjA5MTA1NDI3Nn0.ztTGlw2anfC37RQRADGWYEEoeZUEfM-U1H8q67Eu7VY"
);

const C = {
  bg:"#080809", surface:"#0F0F11", card:"#141416",
  border:"#1E1E22", borderHi:"#2A2A30",
  gold:"#F5C842", silver:"#A8B0BC", bronze:"#C47E3A",
  text:"#F0F0F2", muted:"#6B6B78", sub:"#9999A8",
  accent:"#4F6EF7", success:"#3DD68C", danger:"#F05252", warn:"#F5A623",
};
const MEDAL = [C.gold, C.silver, C.bronze];
const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function getCycle(offset=0){ const d=new Date(); d.setMonth(d.getMonth()+offset); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
function cycleLabel(k){ if(!k)return""; const[y,m]=k.split("-"); return `${MONTHS[+m-1]} ${y}`; }
function fmtBRL(v){ return Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }
function getWeekOfMonth(){ const d=new Date(); return Math.ceil(d.getDate()/7); }
function getDayPct(){ const d=new Date(); return d.getDate()/new Date(d.getFullYear(),d.getMonth()+1,0).getDate(); }

function calcRanking(pid,cycle,db){
  const corretores=db.users.filter(u=>u.role==="corretor"&&u.praca_id===pid&&u.status==="active");
  const acts=db.activities.filter(a=>a.praca_id===pid);
  const pl=db.launches.filter(l=>l.praca_id===pid&&l.cycle===cycle);
  return corretores.map(c=>{
    const myL=pl.filter(l=>l.user_id===c.id); let pts=0; const breakdown=[];
    acts.forEach(a=>{const qty=myL.filter(l=>l.activity_id===a.id).reduce((s,l)=>s+l.quantity,0);if(qty>0){breakdown.push({name:a.name,qty,pts:qty*a.points});pts+=qty*a.points;}});
    return{corretor:c,pts,breakdown};
  }).sort((a,b)=>b.pts-a.pts);
}
function calcIncentive(userId,pid,cycle,db){
  const acts=db.activities.filter(a=>a.praca_id===pid&&a.incentive_value>0);
  const launches=db.launches.filter(l=>l.praca_id===pid&&l.cycle===cycle&&l.user_id===userId);
  let total=0; const breakdown=[];
  acts.forEach(a=>{
    const done=launches.filter(l=>l.activity_id===a.id).reduce((s,l)=>s+l.quantity,0);
    let earned=0;
    if(a.incentive_type==="per_unit") earned=done*(a.incentive_value||0);
    else if(a.incentive_type==="on_goal"&&a.goal&&done>=a.goal) earned=a.incentive_value||0;
    if(earned>0){breakdown.push({name:a.name,done,earned});total+=earned;}
  });
  return{total,breakdown};
}
function calcActivityTotals(pid,cycle,db){
  return db.activities.filter(a=>a.praca_id===pid&&a.goal>0).map(a=>{
    const done=db.launches.filter(l=>l.praca_id===pid&&l.cycle===cycle&&l.activity_id===a.id).reduce((s,l)=>s+l.quantity,0);
    return{...a,done};
  });
}
function getMotivCopy(allMet){
  if(allMet) return{title:"Meta destruída.",sub:"Agora é superar.",color:C.success};
  const p=getDayPct();
  if(p<0.26) return{title:"Novo ciclo.",sub:"Hora de largar na frente.",color:C.accent};
  if(p<0.55) return{title:"Meio do mês.",sub:"Sem tirar o pé.",color:C.accent};
  if(p<0.80) return{title:"Reta final.",sub:"O que você fizer agora define o mês.",color:C.warn};
  return{title:"Últimos dias.",sub:"Dá tudo que você tem.",color:C.danger};
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function Icon({name,size=16,color="currentColor"}){
  const p={stroke:color,strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",fill:"none"};
  const w=ch=><svg width={size} height={size} viewBox="0 0 24 24" style={{flexShrink:0,display:"inline-block"}} {...p}>{ch}</svg>;
  const I={
    chart:w(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>),
    users:w(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>),
    check:w(<polyline points="20 6 9 17 4 12"/>),
    folder:w(<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>),
    clock:w(<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>),
    image:w(<><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>),
    target:w(<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>),
    trophy:w(<><path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16M12 17v5M8 17h8a4 4 0 004-4V5H4v8a4 4 0 004 4z"/></>),
    layers:w(<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>),
    trending:w(<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>),
    logout:w(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>),
    building:w(<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>),
    plus:w(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>),
    dollar:w(<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>),
    edit:w(<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>),
    x:w(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>),
    sliders:w(<><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></>),
    help:w(<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>),
    activity:w(<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>),
    arrowup:w(<><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>),
    arrowdown:w(<><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>),
    star:w(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" strokeWidth="2"/>),
    chevdown:w(<polyline points="6 9 12 15 18 9"/>),
    chevup:w(<polyline points="18 15 12 9 6 15"/>),
  };
  return I[name]||null;
}

// ── UI Atoms ──────────────────────────────────────────────────────────────────
function Avatar({name,size=36,color=C.accent}){
  const i=name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
  return <div style={{width:size,height:size,borderRadius:"50%",background:color+"20",border:"1px solid "+color+"40",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.32,fontWeight:700,color,flexShrink:0}}>{i}</div>;
}
function Badge({children,color=C.accent,size=11}){
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:20,background:color+"18",border:"1px solid "+color+"35",fontSize:size,fontWeight:600,color}}>{children}</span>;
}
function Btn({children,onClick,variant="base",style:x={},disabled=false}){
  const base={fontFamily:"inherit",fontSize:14,cursor:disabled?"not-allowed":"pointer",borderRadius:8,padding:"9px 18px",fontWeight:500,border:"1px solid "+C.border,background:C.card,color:C.sub,display:"inline-flex",alignItems:"center",gap:6,opacity:disabled?.5:1,lineHeight:1.3};
  const v={base,primary:{...base,background:C.accent,border:"1px solid "+C.accent,color:"#fff"},ghost:{...base,background:"transparent",border:"1px solid transparent",color:C.muted},danger:{...base,background:"transparent",border:"1px solid transparent",color:C.danger},success:{...base,background:C.success+"18",border:"1px solid "+C.success+"35",color:C.success}};
  return <button style={{...(v[variant]||v.base),...x}} onClick={disabled?undefined:onClick} disabled={disabled}>{children}</button>;
}
function Inp({value,onChange,onKeyDown,type="text",placeholder="",style:x={}}){
  return <input type={type} value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} style={{fontFamily:"inherit",fontSize:14,background:C.surface,border:"1px solid "+C.border,color:C.text,borderRadius:8,padding:"10px 14px",outline:"none",width:"100%",...x}}/>;
}
function Sel({value,onChange,children}){
  return <select value={value} onChange={onChange} style={{fontFamily:"inherit",fontSize:14,background:C.surface,border:"1px solid "+C.border,color:C.text,borderRadius:8,padding:"10px 14px",outline:"none",width:"100%"}}>{children}</select>;
}
function Card({children,topColor,style:x={}}){
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,padding:"20px 22px",position:"relative",overflow:"hidden",...x}}>{topColor&&<div style={{position:"absolute",top:0,left:0,right:0,height:3,background:topColor,borderRadius:"14px 14px 0 0"}}/>}{children}</div>;
}
function Stat({label,value,sub,color=C.accent,icon}){
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"18px 20px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
      <p style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:"0.08em",textTransform:"uppercase",margin:0}}>{label}</p>
      {icon&&<div style={{width:28,height:28,borderRadius:8,background:color+"18",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name={icon} size={14} color={color}/></div>}
    </div>
    <p style={{fontSize:28,fontWeight:700,color,margin:0,lineHeight:1}}>{value}</p>
    {sub&&<p style={{fontSize:12,color:C.muted,margin:"6px 0 0"}}>{sub}</p>}
  </div>;
}
function PageHeader({title,sub,action}){
  return <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:32}}>
    <div><h1 style={{fontSize:26,fontWeight:700,color:C.text,letterSpacing:"-0.02em",margin:"0 0 5px"}}>{title}</h1>{sub&&<p style={{fontSize:14,color:C.muted,margin:0}}>{sub}</p>}</div>
    {action}
  </div>;
}
function Field({label,children,hint}){
  return <div><label style={{fontSize:12,fontWeight:500,color:C.sub,display:"block",marginBottom:6}}>{label}</label>{children}{hint&&<p style={{fontSize:11,color:C.muted,margin:"4px 0 0"}}>{hint}</p>}</div>;
}
function FormBox({title,children,onSave,onCancel,loading}){
  return <div style={{background:C.surface,border:"1px solid "+C.borderHi,borderRadius:16,padding:28,marginBottom:20}}>
    <p style={{fontSize:16,fontWeight:600,color:C.text,margin:"0 0 22px"}}>{title}</p>
    {children}
    <div style={{display:"flex",gap:10,marginTop:24}}>
      <Btn variant="primary" onClick={onSave} disabled={loading}>{loading?"Salvando...":"Salvar"}</Btn>
      <Btn onClick={onCancel}>Cancelar</Btn>
    </div>
  </div>;
}
function SecLabel({children,style:x={}}){ return <p style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:"0.08em",textTransform:"uppercase",margin:"0 0 14px",...x}}>{children}</p>; }
function Divider({label}){
  return <div style={{display:"flex",alignItems:"center",gap:12,margin:"28px 0 24px"}}>
    {label&&<p style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:"0.08em",textTransform:"uppercase",margin:0,whiteSpace:"nowrap"}}>{label}</p>}
    <div style={{flex:1,height:1,background:C.border}}/>
  </div>;
}
function AlertBox({children,color=C.warn}){ return <div style={{background:color+"12",border:"1px solid "+color+"35",borderRadius:10,padding:"11px 16px",fontSize:13,color,marginBottom:16,display:"flex",alignItems:"flex-start",gap:8}}>{children}</div>; }
function PracaTab({pracas,pid,onSelect}){
  return <div style={{display:"flex",gap:8,marginBottom:24,flexWrap:"wrap"}}>
    {pracas.map(p=><button key={p.id} onClick={()=>onSelect(p.id)} style={{fontFamily:"inherit",fontSize:13,cursor:"pointer",borderRadius:8,padding:"8px 16px",fontWeight:pid===p.id?600:400,background:pid===p.id?p.color+"18":C.card,border:"1px solid "+(pid===p.id?p.color+"45":C.border),color:pid===p.id?p.color:C.sub}}>{p.name}</button>)}
  </div>;
}
function Spinner(){ return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:C.muted,fontSize:14}}>Carregando...</p></div>; }

// ── Animated Progress Bar ─────────────────────────────────────────────────────
function ProgressBar({pct,color=C.accent,height=8}){
  const [w,setW]=useState(0);
  useEffect(()=>{const t=setTimeout(()=>setW(Math.min(100,Math.max(0,pct))),300);return()=>clearTimeout(t);},[pct]);
  return <div style={{height,background:C.border,borderRadius:height/2,overflow:"hidden"}}>
    <div style={{height:"100%",width:w+"%",background:color,borderRadius:height/2,transition:"width 1.6s cubic-bezier(0.22,1,0.36,1)"}}/>
  </div>;
}

// ── Confetti ──────────────────────────────────────────────────────────────────
function Confetti(){
  const items=useMemo(()=>Array.from({length:60},(_,i)=>({id:i,x:Math.random()*100,delay:Math.random()*2,dur:2.2+Math.random()*1.5,size:5+Math.random()*9,color:["#F5C842","#4F6EF7","#3DD68C","#F05252","#F5A623","#A8B0BC","#fff"][i%7]})),[]);
  return <>
    <style>{`@keyframes cfall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(900deg);opacity:0}}`}</style>
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:9999,overflow:"hidden"}}>
      {items.map(p=><div key={p.id} style={{position:"absolute",left:p.x+"%",top:0,width:p.size,height:p.size*(p.id%3===0?1:0.45),background:p.color,borderRadius:p.id%4===0?"50%":2,animation:`cfall ${p.dur}s ${p.delay}s ease-in forwards`}}/>)}
    </div>
  </>;
}

// ── Carousel Banner ───────────────────────────────────────────────────────────
function CarouselBanner({banners,interval=5}){
  const [idx,setIdx]=useState(0);
  useEffect(()=>{if(!banners||banners.length<=1)return;const t=setInterval(()=>setIdx(i=>(i+1)%banners.length),interval*1000);return()=>clearInterval(t);},[banners,interval]);
  if(!banners||!banners.length)return null;
  return <div style={{borderRadius:16,overflow:"hidden",marginBottom:28,border:"1px solid "+C.border,position:"relative"}}>
    <img src={banners[idx]} alt="Banner" style={{width:"100%",maxHeight:220,objectFit:"cover",display:"block"}}/>
    {banners.length>1&&<div style={{position:"absolute",bottom:12,left:"50%",transform:"translateX(-50%)",display:"flex",gap:6}}>
      {banners.map((_,i)=><div key={i} onClick={()=>setIdx(i)} style={{width:i===idx?20:7,height:7,borderRadius:4,background:i===idx?"#fff":"rgba(255,255,255,0.4)",cursor:"pointer",transition:"all 0.3s"}}/>)}
    </div>}
  </div>;
}

// ── Motivational Hero ─────────────────────────────────────────────────────────
function MotivHero({pracaId,cycle,db,showConfetti=false}){
  const [celebrated,setCelebrated]=useState(false);
  const totals=useMemo(()=>calcActivityTotals(pracaId,cycle,db),[pracaId,cycle,db]);
  const allMet=totals.length>0&&totals.every(t=>t.done>=t.goal);
  const copy=getMotivCopy(allMet);
  useEffect(()=>{if(allMet&&showConfetti&&!celebrated)setCelebrated(true);},[allMet,showConfetti]);
  return <>
    {allMet&&celebrated&&<Confetti/>}
    <div style={{background:allMet?"linear-gradient(135deg,"+C.success+"18,"+C.success+"08)":"linear-gradient(135deg,"+copy.color+"12,"+copy.color+"04)",border:"1px solid "+(allMet?C.success+"40":copy.color+"30"),borderRadius:16,padding:"28px 32px",marginBottom:8,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",right:24,top:"50%",transform:"translateY(-50%)",opacity:.06}}>
        <Icon name={allMet?"trophy":"target"} size={96} color={copy.color}/>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        <Icon name={allMet?"trophy":"target"} size={18} color={copy.color}/>
        <p style={{fontSize:12,fontWeight:600,color:copy.color,letterSpacing:"0.08em",textTransform:"uppercase",margin:0}}>{cycleLabel(cycle)}</p>
      </div>
      <p style={{fontSize:32,fontWeight:800,color:C.text,margin:"0 0 4px",letterSpacing:"-0.02em",lineHeight:1.1}}>{copy.title}</p>
      <p style={{fontSize:16,color:C.sub,margin:0,fontWeight:400}}>{copy.sub}</p>
    </div>
  </>;
}

// ── Goal Cards ────────────────────────────────────────────────────────────────
function GoalCards({pracaId,cycle,db}){
  const totals=useMemo(()=>calcActivityTotals(pracaId,cycle,db),[pracaId,cycle,db]);
  const praca=db.pracas.find(p=>p.id===pracaId);
  if(!totals.length)return null;
  return <div>
    <Divider label="Metas do mês"/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:12,marginBottom:32}}>
      {totals.map(a=>{
        const pct=a.goal>0?(a.done/a.goal)*100:0;const met=a.done>=a.goal;
        const color=met?C.success:(praca?.color||C.accent);
        return <Card key={a.id}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <p style={{fontSize:13,fontWeight:600,color:C.text,margin:0}}>{a.name}</p>
            {met?<Badge color={C.success}><Icon name="check" size={10} color={C.success}/>Meta batida</Badge>:<Badge color={C.muted}>{Math.min(100,Math.round(pct))}%</Badge>}
          </div>
          <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:10}}>
            <span style={{fontSize:26,fontWeight:800,color,lineHeight:1}}>{a.done}</span>
            <span style={{fontSize:14,color:C.muted}}>/ {a.goal}</span>
          </div>
          <ProgressBar pct={pct} color={color}/>
          {a.incentive_value&&<p style={{fontSize:12,color:C.success,margin:"8px 0 0",display:"flex",alignItems:"center",gap:4}}><Icon name="dollar" size={11} color={C.success}/>{a.incentive_type==="per_unit"?fmtBRL(a.done*a.incentive_value)+" acumulado":met?fmtBRL(a.incentive_value)+" garantido":"Bônus ao bater meta: "+fmtBRL(a.incentive_value)}</p>}
        </Card>;
      })}
    </div>
  </div>;
}

// ── Ranking Board ─────────────────────────────────────────────────────────────
function RankingBoard({pracaId,cycle,db,showGoals=false,currentUserId=null,showHero=false}){
  const praca=db.pracas.find(p=>p.id===pracaId);
  const ranking=useMemo(()=>calcRanking(pracaId,cycle,db),[pracaId,cycle,db]);
  if(!praca)return null;
  const banners=praca.banners||[];const top3=ranking.slice(0,3);const rest=ranking.slice(3);
  const incentive=currentUserId?calcIncentive(currentUserId,pracaId,cycle,db):null;
  return <div>
    <CarouselBanner banners={banners} interval={praca.banner_interval||5}/>
    {showHero&&<MotivHero pracaId={pracaId} cycle={cycle} db={db} showConfetti={true}/>}
    {praca.prize&&<div style={{background:C.gold+"10",border:"1px solid "+C.gold+"28",borderRadius:12,padding:"12px 18px",marginBottom:24,display:"flex",alignItems:"center",gap:10,marginTop:8}}><Icon name="trophy" size={15} color={C.gold}/><span style={{fontSize:13,fontWeight:500,color:C.gold}}>{praca.prize}</span></div>}
    {showGoals&&<GoalCards pracaId={pracaId} cycle={cycle} db={db}/>}
    {incentive&&incentive.total>0&&<div style={{background:C.success+"10",border:"1px solid "+C.success+"30",borderRadius:14,padding:"18px 22px",marginBottom:24}}>
      <p style={{fontSize:11,fontWeight:600,color:C.success,letterSpacing:"0.07em",textTransform:"uppercase",margin:"0 0 8px",display:"flex",alignItems:"center",gap:6}}><Icon name="dollar" size={12} color={C.success}/>Sua meta de incentivo</p>
      <p style={{fontSize:30,fontWeight:800,color:C.success,margin:"0 0 10px",lineHeight:1}}>{fmtBRL(incentive.total)}</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{incentive.breakdown.map(b=><Badge key={b.name} color={C.success}><Icon name="check" size={10} color={C.success}/>{b.name}: {fmtBRL(b.earned)}</Badge>)}</div>
    </div>}
    <Divider label="Ranking"/>
    {top3.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat("+top3.length+",1fr)",gap:12,marginBottom:12}}>
      {top3.map((r,i)=><Card key={r.corretor.id} topColor={i===0?C.gold:MEDAL[i]} style={{textAlign:"center",paddingTop:24}}>
        <p style={{fontSize:22,fontWeight:800,color:MEDAL[i],margin:"0 0 12px"}}>{i+1}°</p>
        <div style={{display:"flex",justifyContent:"center",marginBottom:10}}><Avatar name={r.corretor.name} size={48} color={MEDAL[i]}/></div>
        <p style={{fontSize:14,fontWeight:600,color:C.text,margin:"0 0 6px"}}>{r.corretor.name}</p>
        <p style={{fontSize:30,fontWeight:800,color:MEDAL[i],lineHeight:1,margin:0}}>{r.pts}</p>
        <p style={{fontSize:11,color:C.muted,margin:"4px 0 12px"}}>pontos</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:4,justifyContent:"center"}}>{r.breakdown.map(b=><span key={b.name} style={{fontSize:11,color:C.muted,background:C.surface,padding:"2px 8px",borderRadius:20,border:"1px solid "+C.border}}>{b.qty}× {b.name}</span>)}</div>
      </Card>)}
    </div>}
    {rest.map((r,i)=><div key={r.corretor.id} style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"14px 18px",marginBottom:8,display:"flex",alignItems:"center",gap:14}}>
      <span style={{fontSize:13,fontWeight:600,color:C.muted,minWidth:26,textAlign:"center"}}>{i+4}°</span>
      <Avatar name={r.corretor.name} size={36}/>
      <div style={{flex:1}}><p style={{fontSize:14,fontWeight:500,color:C.text,margin:"0 0 4px"}}>{r.corretor.name}</p><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{r.breakdown.map(b=><span key={b.name} style={{fontSize:11,color:C.muted,background:C.surface,padding:"2px 7px",borderRadius:20,border:"1px solid "+C.border}}>{b.qty}× {b.name}</span>)}</div></div>
      <div style={{textAlign:"right"}}><p style={{fontSize:20,fontWeight:700,color:C.text,margin:0}}>{r.pts}</p><p style={{fontSize:11,color:C.muted,margin:0}}>pts</p></div>
    </div>)}
    {ranking.length===0&&<div style={{textAlign:"center",padding:"60px 0"}}><Icon name="chart" size={40} color={C.muted}/><p style={{fontSize:14,color:C.muted,marginTop:12}}>Nenhum dado lançado ainda neste ciclo.</p></div>}
  </div>;
}

// ── Ranking Total ─────────────────────────────────────────────────────────────
function RankingTotal({db}){
  if(!db.history.length)return <div><PageHeader title="Ranking Total" sub="Resumo histórico de todos os ciclos"/><div style={{textAlign:"center",padding:"60px 0"}}><Icon name="trophy" size={40} color={C.muted}/><p style={{fontSize:14,color:C.muted,marginTop:12}}>Nenhum ciclo encerrado ainda.</p></div></div>;
  return <div>
    <PageHeader title="Ranking Total" sub="Top 3 de cada ciclo encerrado"/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
      {db.history.map((h,hi)=>{const praca=db.pracas.find(p=>p.id===h.praca_id);const top=(h.ranking||[]).slice(0,3);return(
        <Card key={hi} topColor={praca?.color}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18,paddingTop:6}}>
            <Icon name="trophy" size={14} color={praca?.color||C.accent}/>
            <span style={{fontWeight:600,color:C.text,fontSize:14}}>{praca?.name||"—"}</span>
            <Badge color={praca?.color||C.accent}>{cycleLabel(h.cycle)}</Badge>
          </div>
          {top.map((r,ri)=><div key={ri} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:ri<top.length-1?"1px solid "+C.border:"none"}}>
            <span style={{fontSize:16,fontWeight:800,color:MEDAL[ri]||C.muted,minWidth:28}}>{ri+1}°</span>
            <Avatar name={r.corretor?r.corretor.name:"?"} size={34} color={MEDAL[ri]||C.sub}/>
            <span style={{flex:1,fontSize:13,fontWeight:500,color:C.text}}>{r.corretor?r.corretor.name:"?"}</span>
            <span style={{fontSize:15,fontWeight:700,color:MEDAL[ri]||C.text}}>{r.pts} pts</span>
          </div>)}
        </Card>
      );})}
    </div>
  </div>;
}

// ── Performance da Equipe ─────────────────────────────────────────────────────
function Performance({db,praca}){
  const cycle=getCycle();const prevCycle=getCycle(-1);
  const corretores=db.users.filter(u=>u.role==="corretor"&&u.praca_id===praca.id&&u.status==="active");
  const acts=db.activities.filter(a=>a.praca_id===praca.id);
  const rankCurrent=useMemo(()=>calcRanking(praca.id,cycle,db),[praca.id,cycle,db]);
  const rankPrev=useMemo(()=>calcRanking(praca.id,prevCycle,db),[praca.id,prevCycle,db]);
  const totalPts=rankCurrent.reduce((s,r)=>s+r.pts,0);
  const bestMonth=db.history.filter(h=>h.praca_id===praca.id).reduce((best,h)=>{const top=(h.ranking||[])[0];return top&&top.pts>(best?.pts||0)?top:best;},null);
  if(!corretores.length)return <div style={{textAlign:"center",padding:"60px 0"}}><Icon name="users" size={40} color={C.muted}/><p style={{fontSize:14,color:C.muted,marginTop:12}}>Nenhum corretor ativo nesta praça.</p></div>;
  return <div>
    <PageHeader title="Performance da equipe" sub={praca.name+" · "+cycleLabel(cycle)}/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:32}}>
      <Stat label="Corretores ativos" value={corretores.length} icon="users" color={praca.color}/>
      <Stat label="Pontos no ciclo" value={totalPts} icon="chart" color={C.gold}/>
      <Stat label="Melhor corretor hist." value={bestMonth?bestMonth.corretor?.name?.split(" ")[0]||"—":"—"} sub={bestMonth?bestMonth.pts+" pts (recorde)":""} icon="star" color={C.accent}/>
    </div>
    <SecLabel>Detalhamento por corretor</SecLabel>
    {rankCurrent.map((r,pos)=>{
      const prev=rankPrev.find(x=>x.corretor.id===r.corretor.id);
      const prevPts=prev?prev.pts:0;const diff=prevPts>0?Math.round(((r.pts-prevPts)/prevPts)*100):null;
      const isRecord=db.history.every(h=>(h.ranking||[]).find(x=>x.corretor?.id===r.corretor.id)?.pts||0)<=r.pts&&r.pts>0;
      return <div key={r.corretor.id} style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,padding:"18px 20px",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
          <span style={{fontSize:14,fontWeight:700,color:MEDAL[pos]||C.muted,minWidth:28}}>{pos+1}°</span>
          <Avatar name={r.corretor.name} size={42} color={MEDAL[pos]||praca.color}/>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <p style={{fontSize:15,fontWeight:600,color:C.text,margin:0}}>{r.corretor.name}</p>
              {isRecord&&r.pts>0&&<Badge color={C.gold}><Icon name="star" size={10} color={C.gold}/>Recorde</Badge>}
              {diff!==null&&diff>0&&<Badge color={C.success}><Icon name="arrowup" size={10} color={C.success}/>+{diff}% vs mês ant.</Badge>}
              {diff!==null&&diff<0&&<Badge color={C.danger}><Icon name="arrowdown" size={10} color={C.danger}/>{diff}% vs mês ant.</Badge>}
              {diff===0&&<Badge color={C.muted}>Igual ao mês ant.</Badge>}
            </div>
            <p style={{fontSize:12,color:C.muted,margin:0}}>{r.pts} pts este mês{prevPts>0?" · "+prevPts+" pts mês anterior":""}</p>
          </div>
          <p style={{fontSize:24,fontWeight:800,color:MEDAL[pos]||praca.color,margin:0}}>{r.pts}</p>
        </div>
        {acts.length>0&&<div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8}}>
            {acts.map(a=>{
              const qty=db.launches.filter(l=>l.praca_id===praca.id&&l.cycle===cycle&&l.user_id===r.corretor.id&&l.activity_id===a.id).reduce((s,l)=>s+l.quantity,0);
              const pct=a.goal?Math.min(100,Math.round((qty/a.goal)*100)):null;
              return <div key={a.id} style={{background:C.surface,borderRadius:10,padding:"10px 12px",border:"1px solid "+C.border}}>
                <p style={{fontSize:11,fontWeight:600,color:C.muted,margin:"0 0 5px"}}>{a.name}</p>
                <p style={{fontSize:18,fontWeight:700,color:qty>0?praca.color:C.muted,margin:"0 0 4px"}}>{qty}{a.goal?<span style={{fontSize:11,fontWeight:400,color:C.muted}}>/{a.goal}</span>:null}</p>
                {pct!==null&&<ProgressBar pct={pct} color={qty>=a.goal?C.success:praca.color} height={4}/>}
              </div>;
            })}
          </div>
        </div>}
      </div>;
    })}
  </div>;
}

// ── Onboarding Tooltip ────────────────────────────────────────────────────────
function OnboardingTooltip({steps,onDone}){
  const [step,setStep]=useState(0);
  const s=steps[step];
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:10000,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:24}}>
    <div style={{background:C.surface,border:"1px solid "+C.borderHi,borderRadius:20,padding:28,maxWidth:420,width:"100%"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <div style={{width:36,height:36,borderRadius:10,background:C.accent+"20",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon name={s.icon} size={18} color={C.accent}/>
        </div>
        <div>
          <p style={{fontSize:15,fontWeight:700,color:C.text,margin:0}}>{s.title}</p>
          <p style={{fontSize:11,color:C.muted,margin:0}}>{step+1} de {steps.length}</p>
        </div>
      </div>
      <p style={{fontSize:14,color:C.sub,margin:"0 0 22px",lineHeight:1.6}}>{s.desc}</p>
      <div style={{display:"flex",gap:6,marginBottom:18}}>{steps.map((_,i)=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=step?C.accent:C.border}}/>)}</div>
      <div style={{display:"flex",gap:10}}>
        {step>0&&<Btn onClick={()=>setStep(s=>s-1)}>Anterior</Btn>}
        {step<steps.length-1?<Btn variant="primary" onClick={()=>setStep(s=>s+1)} style={{flex:1,justifyContent:"center"}}>Próximo</Btn>:<Btn variant="primary" onClick={onDone} style={{flex:1,justifyContent:"center"}}>Entendi, vamos lá!</Btn>}
      </div>
    </div>
  </div>;
}

const ONBOARDING_GERENTE=[
  {icon:"chart",title:"Ranking da praça",desc:"Aqui você acompanha a pontuação em tempo real da sua equipe. O ranking atualiza automaticamente conforme os pontos são lançados."},
  {icon:"plus",title:"Lançar pontos",desc:"Use esta tela para registrar as atividades semanais de cada corretor. Escolha o corretor, a semana e informe a quantidade de cada atividade realizada."},
  {icon:"target",title:"Metas e incentivos",desc:"Cada atividade pode ter uma meta mensal e um valor de incentivo. O corretor vê apenas seus próprios ganhos — o time vê só a pontuação."},
  {icon:"users",title:"Aprovar corretores",desc:"Quando um corretor se cadastra pelo app, ele aguarda sua aprovação. Você encontra os pendentes na aba Aprovações, com badge de notificação."},
  {icon:"activity",title:"Performance da equipe",desc:"Veja o desempenho detalhado de cada corretor: atividades, evolução em relação ao mês anterior e recordes históricos."},
  {icon:"folder",title:"Materiais",desc:"Suba campanhas, cards de WhatsApp e PDFs organizados em pastas. Tudo fica disponível para os corretores na aba Materiais deles."},
  {icon:"image",title:"Banner e carrossel",desc:"Personalize o topo do ranking com banners da sua praça. Você pode subir várias imagens e elas passam automaticamente em carrossel."},
];
const ONBOARDING_CORRETOR=[
  {icon:"chart",title:"Seu ranking",desc:"Aqui você acompanha sua posição e pontuação no ciclo atual. O pódio mostra os 3 melhores — dá para chegar lá!"},
  {icon:"target",title:"Metas do mês",desc:"As metas da sua praça ficam logo acima do ranking com uma barra de progresso animada. Acompanhe o quanto já foi feito."},
  {icon:"dollar",title:"Incentivo financeiro",desc:"Se a sua praça tem metas com valor de incentivo, você vê quanto está acumulando ou qual bônus vai ganhar ao bater a meta. Só você vê o seu."},
  {icon:"folder",title:"Materiais",desc:"Acesse campanhas, cards de WhatsApp e materiais de apoio que seu gerente disponibilizou. Tudo organizado em pastas por campanha."},
];

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQ_ITEMS=[
  {q:"Como os pontos são calculados?",a:"Cada atividade tem um valor em pontos definido pelo admin. Ao lançar pontos de um corretor, o sistema multiplica a quantidade pela pontuação da atividade e soma tudo no ranking."},
  {q:"Quando o ciclo mensal é reiniciado?",a:"O ciclo não reinicia automaticamente. O gerente fecha o mês manualmente na aba 'Fechar mês'. Isso salva o ranking no histórico e o próximo ciclo começa zerado."},
  {q:"Como aprovar um corretor novo?",a:"Quando o corretor se cadastra pelo app, aparece um badge vermelho na aba Aprovações. Clique em Aprovar para liberar o acesso ou Rejeitar para recusar."},
  {q:"O corretor vê quanto os outros estão ganhando de incentivo?",a:"Não. Cada corretor vê apenas seus próprios valores de incentivo. No ranking, todos veem somente a pontuação."},
  {q:"Posso ter metas diferentes para atividades diferentes?",a:"Sim. Cada atividade tem sua própria meta e valor de incentivo configurados pelo admin. Uma atividade pode ter incentivo por unidade, outra pode ter bônus ao bater a meta."},
  {q:"Como funciona o banner carrossel?",a:"Na aba Banner, você sobe várias imagens e define o intervalo em segundos. As imagens passam automaticamente no topo do ranking para todos da sua praça."},
  {q:"O que acontece se eu fechar o mês sem lançar todos os pontos?",a:"O ranking atual é salvo com os dados disponíveis. Não é possível lançar pontos em ciclos encerrados, então certifique-se que tudo está correto antes de fechar."},
];

function FAQ(){
  const [open,setOpen]=useState(null);
  return <div>
    <PageHeader title="Dúvidas frequentes" sub="Tudo que você precisa saber para usar o Ranking Houses"/>
    {FAQ_ITEMS.map((item,i)=><div key={i} style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,marginBottom:8,overflow:"hidden"}}>
      <button onClick={()=>setOpen(open===i?null:i)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",background:"transparent",border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
        <span style={{fontSize:14,fontWeight:500,color:C.text}}>{item.q}</span>
        <Icon name={open===i?"chevup":"chevdown"} size={16} color={C.muted}/>
      </button>
      {open===i&&<div style={{padding:"0 20px 18px",fontSize:14,color:C.sub,lineHeight:1.7}}>{item.a}</div>}
    </div>)}
  </div>;
}

// ── Login ─────────────────────────────────────────────────────────────────────
function Login({onLogin,pracas}){
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");const [pass,setPass]=useState("");const [err,setErr]=useState("");const [loading,setLoading]=useState(false);
  const [reg,setReg]=useState({name:"",email:"",password:"",role:"corretor",praca_id:""});
  const [regOk,setRegOk]=useState(false);const [regErr,setRegErr]=useState("");
  async function doLogin(){
    setLoading(true);setErr("");
    const{data,error}=await sb.from("app_users").select("*").eq("email",email.toLowerCase().trim()).eq("password",pass).maybeSingle();
    setLoading(false);
    if(error||!data){setErr("Email ou senha incorretos");return;}
    onLogin(data);
  }
  async function doRegister(){
    if(!reg.name.trim()||!reg.email.trim()||!reg.password.trim()||!reg.praca_id){setRegErr("Preencha todos os campos");return;}
    setLoading(true);setRegErr("");
    const{data:ex}=await sb.from("app_users").select("id").eq("email",reg.email.toLowerCase().trim()).maybeSingle();
    if(ex){setRegErr("Email já cadastrado");setLoading(false);return;}
    const{error}=await sb.from("app_users").insert({name:reg.name.trim(),email:reg.email.toLowerCase().trim(),password:reg.password,role:reg.role,praca_id:parseInt(reg.praca_id),status:"pending"});
    setLoading(false);
    if(error){setRegErr("Erro: "+error.message);return;}
    setRegOk(true);
  }
  return <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 20px",position:"relative"}}>
    <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient("+C.border+" 1px,transparent 1px),linear-gradient(90deg,"+C.border+" 1px,transparent 1px)",backgroundSize:"52px 52px",opacity:.2}}/>
    <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:420}}>
      <div style={{textAlign:"center",marginBottom:36}}>
        <div style={{width:58,height:58,borderRadius:16,background:"linear-gradient(135deg,"+C.accent+",#7B5AF5)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",boxShadow:"0 0 40px "+C.accent+"30"}}>
          <Icon name="layers" size={26} color="#fff"/>
        </div>
        <p style={{fontSize:28,fontWeight:800,color:C.text,letterSpacing:"-0.03em",margin:"0 0 6px"}}>Ranking Houses</p>
        <p style={{fontSize:14,color:C.muted,margin:0}}>Acesse sua conta para continuar</p>
      </div>
      {mode==="login"&&<div style={{background:C.surface,border:"1px solid "+C.border,borderRadius:18,padding:32}}>
        <div style={{marginBottom:16}}><Field label="Email"><Inp type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="seu@email.com"/></Field></div>
        <div style={{marginBottom:24}}><Field label="Senha"><Inp type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="••••••••"/></Field></div>
        {err&&<p style={{fontSize:13,color:C.danger,textAlign:"center",margin:"0 0 16px"}}>{err}</p>}
        <Btn variant="primary" onClick={doLogin} disabled={loading} style={{width:"100%",padding:"13px",fontSize:15,fontWeight:600,justifyContent:"center"}}>{loading?"Entrando...":"Entrar"}</Btn>
        <p style={{textAlign:"center",marginTop:18,fontSize:13,color:C.muted}}>Sem conta? <button onClick={()=>setMode("register")} style={{background:"none",border:"none",color:C.accent,cursor:"pointer",fontFamily:"inherit",fontSize:13,padding:0,fontWeight:500}}>Criar cadastro</button></p>
      </div>}
      {mode==="register"&&!regOk&&<div style={{background:C.surface,border:"1px solid "+C.border,borderRadius:18,padding:32}}>
        <p style={{fontSize:18,fontWeight:700,color:C.text,margin:"0 0 24px"}}>Criar cadastro</p>
        <div style={{display:"grid",gap:16,marginBottom:6}}>
          <Field label="Nome completo"><Inp value={reg.name} onChange={e=>setReg(r=>({...r,name:e.target.value}))} placeholder="Seu nome"/></Field>
          <Field label="Email"><Inp type="email" value={reg.email} onChange={e=>setReg(r=>({...r,email:e.target.value}))} placeholder="seu@email.com"/></Field>
          <Field label="Senha"><Inp type="password" value={reg.password} onChange={e=>setReg(r=>({...r,password:e.target.value}))} placeholder="Crie uma senha"/></Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Field label="Cargo"><Sel value={reg.role} onChange={e=>setReg(r=>({...r,role:e.target.value}))}><option value="corretor">Corretor</option><option value="gerente">Gerente</option></Sel></Field>
            <Field label="Praça"><Sel value={reg.praca_id} onChange={e=>setReg(r=>({...r,praca_id:e.target.value}))}><option value="">Selecione...</option>{pracas.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</Sel></Field>
          </div>
        </div>
        {regErr&&<p style={{fontSize:13,color:C.danger,margin:"12px 0 0"}}>{regErr}</p>}
        <div style={{display:"flex",gap:10,marginTop:24}}>
          <Btn variant="primary" onClick={doRegister} disabled={loading} style={{flex:1,justifyContent:"center"}}>{loading?"Enviando...":"Enviar cadastro"}</Btn>
          <Btn onClick={()=>setMode("login")}>Voltar</Btn>
        </div>
      </div>}
      {mode==="register"&&regOk&&<div style={{background:C.surface,border:"1px solid "+C.success+"40",borderRadius:18,padding:32,textAlign:"center"}}>
        <div style={{width:56,height:56,borderRadius:"50%",background:C.success+"20",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><Icon name="check" size={28} color={C.success}/></div>
        <p style={{fontSize:18,fontWeight:700,color:C.success,margin:"0 0 8px"}}>Cadastro enviado!</p>
        <p style={{fontSize:14,color:C.muted,margin:"0 0 24px"}}>Aguarde a aprovação do seu gerente ou admin para acessar.</p>
        <Btn onClick={()=>{setMode("login");setRegOk(false);setReg({name:"",email:"",password:"",role:"corretor",praca_id:""});}}>Voltar ao login</Btn>
      </div>}
    </div>
  </div>;
}

// ── Pending Screen ────────────────────────────────────────────────────────────
function PendingScreen({user,db,onLogout}){
  const praca=user.praca_id?db.pracas.find(p=>p.id===user.praca_id):null;
  return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{background:C.surface,border:"1px solid "+C.border,borderRadius:18,padding:40,maxWidth:400,width:"100%",textAlign:"center"}}>
      <div style={{width:60,height:60,borderRadius:"50%",background:C.warn+"20",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}><Icon name="clock" size={28} color={C.warn}/></div>
      <p style={{fontSize:20,fontWeight:700,color:C.text,margin:"0 0 8px"}}>Cadastro em análise</p>
      <p style={{fontSize:14,color:C.muted,margin:"0 0 4px"}}>{user.name}</p>
      <p style={{fontSize:13,color:C.sub,margin:"0 0 24px"}}>{praca?praca.name:""} · {{gerente:"Gerente",corretor:"Corretor"}[user.role]}</p>
      <p style={{fontSize:13,color:C.muted,margin:"0 0 28px",lineHeight:1.6}}>Entre em contato com {user.role==="gerente"?"o admin":"seu gerente"} para liberar o acesso.</p>
      <Btn onClick={onLogout}><Icon name="logout" size={14} color={C.muted}/>Sair</Btn>
    </div>
  </div>;
}

// ── Shell ─────────────────────────────────────────────────────────────────────
function Shell({user,tab,setTab,tabs,children,onLogout,pracaColor}){
  const rLabel={admin:"Admin Master",gerente:"Gerente",corretor:"Corretor"}[user.role];
  const rColor={admin:C.gold,gerente:pracaColor||C.accent,corretor:C.sub}[user.role];
  const ac=pracaColor||C.accent;
  return <div style={{display:"flex",minHeight:"100vh",background:C.bg,fontFamily:"system-ui,sans-serif"}}>
    <div style={{width:224,background:C.surface,borderRight:"1px solid "+C.border,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"22px 18px 18px",borderBottom:"1px solid "+C.border}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,"+C.accent+",#7B5AF5)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon name="layers" size={15} color="#fff"/></div>
          <span style={{fontWeight:700,fontSize:13,color:C.text,letterSpacing:"-0.01em"}}>Ranking Houses</span>
        </div>
      </div>
      <div style={{padding:"16px 18px",borderBottom:"1px solid "+C.border}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Avatar name={user.name} size={34} color={rColor}/>
          <div style={{overflow:"hidden",flex:1}}>
            <p style={{fontSize:13,fontWeight:600,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",margin:"0 0 5px"}}>{user.name}</p>
            <Badge color={rColor}>{rLabel}</Badge>
          </div>
        </div>
      </div>
      <nav style={{flex:1,padding:"12px 8px"}}>
        {tabs.map(t=>{const active=tab===t.id;return <button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 12px",textAlign:"left",borderRadius:9,marginBottom:2,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:active?600:400,background:active?ac+"15":"transparent",border:"1px solid "+(active?ac+"30":"transparent"),color:active?ac:C.muted,transition:"all 0.1s"}}>
          <Icon name={t.icon} size={15} color={active?ac:C.muted}/>{t.label}
          {t.badge?<span style={{marginLeft:"auto",background:C.danger,color:"#fff",borderRadius:20,fontSize:10,fontWeight:700,padding:"1px 7px",minWidth:18,textAlign:"center"}}>{t.badge}</span>:null}
        </button>;})}
      </nav>
      <div style={{padding:"10px 8px",borderTop:"1px solid "+C.border}}>
        <button onClick={onLogout} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 12px",fontFamily:"inherit",fontSize:13,background:"transparent",border:"1px solid transparent",borderRadius:9,color:C.muted,cursor:"pointer"}}>
          <Icon name="logout" size={15} color={C.muted}/>Sair
        </button>
      </div>
    </div>
    <div style={{flex:1,overflow:"auto",padding:"32px 40px"}}>{children}</div>
  </div>;
}

// ── App Root ──────────────────────────────────────────────────────────────────
export default function App(){
  const [db,setDb]=useState(null);
  const [user,setUser]=useState(()=>{try{const s=localStorage.getItem("rh_user");return s?JSON.parse(s):null;}catch{return null;}});
  const [tab,setTab]=useState(()=>{try{return localStorage.getItem("rh_tab")||"ranking";}catch{return "ranking";}});
  const [showOnboarding,setShowOnboarding]=useState(false);

  async function reload(){
    const [p,u,a,l,h,fo,fi]=await Promise.all([
      sb.from("pracas").select("*").order("id"),
      sb.from("app_users").select("*").order("id"),
      sb.from("activities").select("*").order("id"),
      sb.from("launches").select("*"),
      sb.from("history").select("*").order("closed_at",{ascending:false}),
      sb.from("materials_folders").select("*").order("id"),
      sb.from("materials_files").select("*").order("id"),
    ]);
    setDb({pracas:p.data||[],users:u.data||[],activities:a.data||[],launches:l.data||[],history:h.data||[],folders:fo.data||[],files:fi.data||[]});
  }
  useEffect(()=>{reload();},[]);
  useEffect(()=>{try{if(user)localStorage.setItem("rh_user",JSON.stringify(user));else localStorage.removeItem("rh_user");}catch{}},[user]);
  useEffect(()=>{try{localStorage.setItem("rh_tab",tab);}catch{}},[tab]);

  function login(u){
    setUser(u);
    setTab(u.role==="admin"?"pracas":"ranking");
    const key="rh_onb_"+u.id;
    if(!localStorage.getItem(key)&&(u.role==="gerente"||u.role==="corretor"))setShowOnboarding(true);
  }
  function doneOnboarding(){
    setShowOnboarding(false);
    if(user)localStorage.setItem("rh_onb_"+user.id,"1");
  }
  function logout(){setUser(null);}

  if(!db)return <Spinner/>;
  if(!user)return <Login onLogin={login} pracas={db.pracas}/>;
  if(user.status==="pending")return <PendingScreen user={user} db={db} onLogout={logout}/>;

  const praca=user.praca_id?db.pracas.find(p=>p.id===user.praca_id):null;
  const onbSteps=user.role==="gerente"?ONBOARDING_GERENTE:ONBOARDING_CORRETOR;

  return <>
    {showOnboarding&&<OnboardingTooltip steps={onbSteps} onDone={doneOnboarding}/>}
    {user.role==="admin"&&<AdminPanel db={db} reload={reload} user={user} tab={tab} setTab={setTab} onLogout={logout}/>}
    {user.role==="gerente"&&<GerentePanel db={db} reload={reload} user={user} praca={praca} tab={tab} setTab={setTab} onLogout={logout}/>}
    {user.role==="corretor"&&<CorretorPanel db={db} user={user} praca={praca} onLogout={logout}/>}
  </>;
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
function AdminPanel({db,reload,user,tab,setTab,onLogout}){
  const pendingG=db.users.filter(u=>u.status==="pending"&&u.role==="gerente").length;
  const [viewPid,setViewPid]=useState(db.pracas[0]?.id||null);
  const tabs=[
    {id:"pracas",label:"Praças",icon:"building"},
    {id:"usuarios",label:"Usuários",icon:"users"},
    {id:"aprovacoes",label:"Aprovações",icon:"check",badge:pendingG||null},
    {id:"atividades",label:"Atividades",icon:"sliders"},
    {id:"materiais",label:"Materiais",icon:"folder"},
    {id:"rankings",label:"Rankings",icon:"chart"},
    {id:"performance",label:"Performance",icon:"activity"},
    {id:"total",label:"Ranking Total",icon:"trending"},
    {id:"historico",label:"Histórico",icon:"clock"},
  ];
  const viewPraca=db.pracas.find(p=>p.id===viewPid);
  return <Shell user={user} tab={tab} setTab={setTab} tabs={tabs} onLogout={onLogout} pracaColor={C.gold}>
    {tab==="pracas"&&<AdminPracas db={db} reload={reload}/>}
    {tab==="usuarios"&&<AdminUsuarios db={db} reload={reload}/>}
    {tab==="aprovacoes"&&<Aprovacoes db={db} reload={reload} viewerRole="admin"/>}
    {tab==="atividades"&&<AdminAtividades db={db} reload={reload}/>}
    {tab==="materiais"&&<Materiais db={db} reload={reload} pracaId={null} canEdit={true} isAdmin={true}/>}
    {tab==="rankings"&&<div><PageHeader title={"Rankings · "+cycleLabel(getCycle())} sub="Visualize o ranking atual de qualquer praça"/><PracaTab pracas={db.pracas} pid={viewPid} onSelect={setViewPid}/>{viewPraca&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:28}}><Stat label="Corretores" value={db.users.filter(u=>u.role==="corretor"&&u.praca_id===viewPid&&u.status==="active").length} icon="users" color={viewPraca.color}/><Stat label="Líder" value={calcRanking(viewPid,getCycle(),db)[0]?.corretor.name.split(" ")[0]||"—"} sub={calcRanking(viewPid,getCycle(),db)[0]?.pts+" pts"||""} icon="trophy" color={C.gold}/><Stat label="Total de pontos" value={calcRanking(viewPid,getCycle(),db).reduce((s,r)=>s+r.pts,0)} icon="chart" color={C.sub}/></div>}{viewPid&&<RankingBoard pracaId={viewPid} cycle={getCycle()} db={db} showGoals={true} showHero={true}/>}</div>}
    {tab==="performance"&&<div><PracaTab pracas={db.pracas} pid={viewPid} onSelect={setViewPid}/>{viewPraca&&<Performance db={db} praca={viewPraca}/>}</div>}
    {tab==="total"&&<RankingTotal db={db}/>}
    {tab==="historico"&&<Historico db={db}/>}
  </Shell>;
}

function AdminPracas({db,reload}){
  const [form,setForm]=useState({name:"",color:"#4F6EF7",prize:""});
  const [editId,setEditId]=useState(null);const [adding,setAdding]=useState(false);const [loading,setLoading]=useState(false);
  function cancel(){setEditId(null);setAdding(false);setForm({name:"",color:"#4F6EF7",prize:""});}
  function startEdit(p){setForm({name:p.name,color:p.color,prize:p.prize||""});setEditId(p.id);setAdding(false);}
  async function save(){
    if(!form.name.trim())return;setLoading(true);
    if(editId){await sb.from("pracas").update({name:form.name,color:form.color,prize:form.prize||null}).eq("id",editId);}
    else{await sb.from("pracas").insert({name:form.name,color:form.color,prize:form.prize||null,banners:[],banner_interval:5});}
    await reload();setLoading(false);cancel();
  }
  const countC=pid=>db.users.filter(u=>u.role==="corretor"&&u.praca_id===pid&&u.status==="active").length;
  return <div>
    <PageHeader title="Praças" sub="Configure praças, cores e prêmios" action={!editId&&!adding&&<Btn variant="primary" onClick={()=>setAdding(true)}><Icon name="plus" size={14} color="#fff"/>Nova praça</Btn>}/>
    {(editId||adding)&&<FormBox title={editId?"Editar praça":"Nova praça"} onSave={save} onCancel={cancel} loading={loading}>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
        <Field label="Nome"><Inp value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Produto 1"/></Field>
        <Field label="Cor"><input type="color" value={form.color} onChange={e=>setForm(f=>({...f,color:e.target.value}))} style={{height:42,width:"100%",borderRadius:8,border:"1px solid "+C.border,background:C.surface,padding:4,cursor:"pointer"}}/></Field>
      </div>
      <Field label="Prêmio do mês"><Inp value={form.prize} onChange={e=>setForm(f=>({...f,prize:e.target.value}))} placeholder="Ex: iPhone 15 Pro para o 1° lugar!"/></Field>
    </FormBox>}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      {db.pracas.map(p=><Card key={p.id} topColor={p.color} style={{paddingTop:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div><p style={{fontSize:16,fontWeight:600,color:C.text,margin:"0 0 10px"}}>{p.name}</p><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><Badge color={p.color}>{countC(p.id)} corretores</Badge>{p.prize&&<Badge color={C.gold}>🏆</Badge>}</div>{p.prize&&<p style={{fontSize:12,color:C.muted,margin:"8px 0 0"}}>{p.prize}</p>}</div>
          <div style={{display:"flex",gap:4}}>
            <Btn variant="ghost" onClick={()=>startEdit(p)} style={{padding:"6px 10px"}}><Icon name="edit" size={14} color={C.muted}/></Btn>
            <Btn variant="danger" onClick={async()=>{await sb.from("pracas").delete().eq("id",p.id);await reload();}} style={{padding:"6px 10px"}}><Icon name="x" size={14} color={C.danger}/></Btn>
          </div>
        </div>
      </Card>)}
    </div>
  </div>;
}

function AdminUsuarios({db,reload}){
  const [form,setForm]=useState({name:"",email:"",password:"123456",role:"corretor",pracaId:""});
  const [editId,setEditId]=useState(null);const [adding,setAdding]=useState(false);const [loading,setLoading]=useState(false);
  const rL={admin:"Admin Master",gerente:"Gerente",corretor:"Corretor"};const rC={admin:C.gold,gerente:C.accent,corretor:C.sub};
  function cancel(){setEditId(null);setAdding(false);setForm({name:"",email:"",password:"123456",role:"corretor",pracaId:""});}
  function startEdit(u){setForm({name:u.name,email:u.email,password:u.password,role:u.role,pracaId:u.praca_id||""});setEditId(u.id);setAdding(false);}
  async function save(){
    if(!form.name.trim()||!form.email.trim())return;setLoading(true);
    const praca_id=form.role==="admin"?null:(form.pracaId?parseInt(form.pracaId):null);
    const payload={name:form.name,email:form.email.toLowerCase().trim(),password:form.password,role:form.role,praca_id,status:"active"};
    if(editId){await sb.from("app_users").update(payload).eq("id",editId);}
    else{await sb.from("app_users").insert(payload);}
    await reload();setLoading(false);cancel();
  }
  return <div>
    <PageHeader title="Usuários" sub="Gerencie acessos e atribuições de praça" action={!editId&&!adding&&<Btn variant="primary" onClick={()=>setAdding(true)}><Icon name="plus" size={14} color="#fff"/>Novo usuário</Btn>}/>
    {(editId||adding)&&<FormBox title={editId?"Editar usuário":"Novo usuário"} onSave={save} onCancel={cancel} loading={loading}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <Field label="Nome"><Inp value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Nome completo"/></Field>
        <Field label="Email"><Inp type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@co.com"/></Field>
        <Field label="Senha"><Inp value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/></Field>
        <Field label="Perfil"><Sel value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}><option value="corretor">Corretor</option><option value="gerente">Gerente</option><option value="admin">Admin Master</option></Sel></Field>
        {form.role!=="admin"&&<Field label="Praça"><Sel value={form.pracaId} onChange={e=>setForm(f=>({...f,pracaId:e.target.value}))}><option value="">Selecione...</option>{db.pracas.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</Sel></Field>}
      </div>
    </FormBox>}
    {["admin","gerente","corretor"].map(role=>{
      const group=db.users.filter(u=>u.role===role&&u.status==="active");if(!group.length)return null;
      return <div key={role} style={{marginBottom:28}}><SecLabel>{rL[role]}s — {group.length}</SecLabel>
        {group.map(u=>{const p=u.praca_id?db.pracas.find(x=>x.id===u.praca_id):null;return(
          <div key={u.id} style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 18px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
            <Avatar name={u.name} size={36} color={rC[u.role]}/>
            <div style={{flex:1}}><p style={{fontSize:14,fontWeight:500,color:C.text,margin:"0 0 3px"}}>{u.name}</p><p style={{fontSize:12,color:C.muted,margin:0}}>{u.email}{p?" · "+p.name:""}</p></div>
            <Badge color={rC[u.role]}>{rL[u.role]}</Badge>
            <Btn variant="ghost" onClick={()=>startEdit(u)} style={{padding:"6px 10px"}}><Icon name="edit" size={14} color={C.muted}/></Btn>
            {u.id!==1&&<Btn variant="danger" onClick={async()=>{await sb.from("app_users").delete().eq("id",u.id);await reload();}} style={{padding:"6px 10px"}}><Icon name="x" size={14} color={C.danger}/></Btn>}
          </div>
        );})}
      </div>;
    })}
  </div>;
}

function Aprovacoes({db,reload,viewerRole,pracaId}){
  const [loading,setLoading]=useState(null);
  const pending=db.users.filter(u=>{if(u.status!=="pending")return false;if(viewerRole==="admin")return u.role==="gerente";return u.role==="corretor"&&u.praca_id===pracaId;});
  async function approve(u){setLoading(u.id);await sb.from("app_users").update({status:"active"}).eq("id",u.id);await reload();setLoading(null);}
  async function reject(u){setLoading(u.id);await sb.from("app_users").delete().eq("id",u.id);await reload();setLoading(null);}
  return <div>
    <PageHeader title="Aprovações" sub={(viewerRole==="admin"?"Gerentes":"Corretores")+" aguardando aprovação"}/>
    {pending.length===0?<div style={{textAlign:"center",padding:"60px 0"}}><div style={{width:64,height:64,borderRadius:"50%",background:C.success+"18",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><Icon name="check" size={28} color={C.success}/></div><p style={{fontSize:15,fontWeight:500,color:C.text,marginBottom:4}}>Tudo em dia</p><p style={{fontSize:13,color:C.muted}}>Nenhum cadastro pendente.</p></div>
    :pending.map(u=>{const p=u.praca_id?db.pracas.find(x=>x.id===u.praca_id):null;return(
      <div key={u.id} style={{background:C.card,border:"1px solid "+C.warn+"35",borderRadius:14,padding:"16px 20px",marginBottom:10,display:"flex",alignItems:"center",gap:14}}>
        <Avatar name={u.name} size={44} color={C.warn}/>
        <div style={{flex:1}}><p style={{fontSize:14,fontWeight:600,color:C.text,margin:"0 0 4px"}}>{u.name}</p><p style={{fontSize:12,color:C.muted,margin:0}}>{u.email} · {p?p.name:"—"}</p></div>
        <Badge color={C.warn}>{{gerente:"Gerente",corretor:"Corretor"}[u.role]}</Badge>
        <Btn variant="success" onClick={()=>approve(u)} disabled={loading===u.id}><Icon name="check" size={13} color={C.success}/>Aprovar</Btn>
        <Btn variant="danger" onClick={()=>reject(u)} disabled={loading===u.id}><Icon name="x" size={13} color={C.danger}/>Rejeitar</Btn>
      </div>
    );})}
  </div>;
}

function AdminAtividades({db,reload}){
  const [pid,setPid]=useState(db.pracas[0]?.id||null);
  const EMPTY={name:"",points:10,goal:"",incentive_value:"",incentive_type:"per_unit"};
  const [form,setForm]=useState(EMPTY);const [editId,setEditId]=useState(null);const [adding,setAdding]=useState(false);const [loading,setLoading]=useState(false);
  const praca=db.pracas.find(p=>p.id===pid);const acts=db.activities.filter(a=>a.praca_id===pid);
  function cancel(){setEditId(null);setAdding(false);setForm(EMPTY);}
  function startEdit(a){setForm({name:a.name,points:a.points,goal:a.goal||"",incentive_value:a.incentive_value||"",incentive_type:a.incentive_type||"per_unit"});setEditId(a.id);setAdding(false);}
  async function save(){
    if(!form.name.trim()||!pid)return;setLoading(true);
    const pts=parseInt(form.points)||1;const goal=form.goal?parseInt(form.goal):null;const iv=form.incentive_value?parseFloat(form.incentive_value):null;
    const payload={name:form.name,points:pts,goal,incentive_value:iv,incentive_type:iv?form.incentive_type:"per_unit"};
    if(editId){await sb.from("activities").update(payload).eq("id",editId);}
    else{await sb.from("activities").insert({praca_id:pid,...payload});}
    await reload();setLoading(false);cancel();
  }
  return <div>
    <PageHeader title="Atividades" sub="Configure métricas, metas e incentivos" action={!editId&&!adding&&<Btn variant="primary" onClick={()=>setAdding(true)}><Icon name="plus" size={14} color="#fff"/>Nova atividade</Btn>}/>
    <PracaTab pracas={db.pracas} pid={pid} onSelect={p=>{setPid(p);cancel();}}/>
    {(editId||adding)&&<FormBox title={editId?"Editar atividade":"Nova atividade"} onSave={save} onCancel={cancel} loading={loading}>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
        <Field label="Nome da atividade"><Inp value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Agendamento"/></Field>
        <Field label="Pontos por unidade"><Inp type="number" min="1" value={form.points} onChange={e=>setForm(f=>({...f,points:e.target.value}))}/></Field>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:form.incentive_value?14:0}}>
        <Field label="Meta mensal" hint="Deixe vazio se não houver meta"><Inp type="number" min="0" value={form.goal} onChange={e=>setForm(f=>({...f,goal:e.target.value}))} placeholder="Ex: 50"/></Field>
        <Field label="Valor de incentivo R$" hint="Deixe vazio se não houver"><Inp type="number" min="0" step="0.01" value={form.incentive_value} onChange={e=>setForm(f=>({...f,incentive_value:e.target.value}))} placeholder="Ex: 10.00"/></Field>
      </div>
      {form.incentive_value>0&&<Field label="Tipo de incentivo">
        <Sel value={form.incentive_type} onChange={e=>setForm(f=>({...f,incentive_type:e.target.value}))}>
          <option value="per_unit">Por unidade realizada (R$ × quantidade)</option>
          <option value="on_goal">Bônus ao bater a meta (valor fixo)</option>
        </Sel>
      </Field>}
    </FormBox>}
    {acts.length===0?<div style={{textAlign:"center",padding:"60px 0"}}><Icon name="sliders" size={40} color={C.muted}/><p style={{fontSize:14,color:C.muted,marginTop:12}}>Nenhuma atividade cadastrada{praca?" para "+praca.name:""}.</p></div>:(
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
        {acts.map(a=><Card key={a.id}>
          <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
            <div style={{width:46,height:46,borderRadius:12,background:(praca?.color||C.accent)+"15",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{fontSize:18,fontWeight:800,color:praca?.color||C.accent}}>{a.points}</span>
            </div>
            <div style={{flex:1}}>
              <p style={{fontSize:14,fontWeight:600,color:C.text,margin:"0 0 5px"}}>{a.name}</p>
              <p style={{fontSize:12,color:C.muted,margin:"0 0 3px"}}>{a.points} pts / unidade</p>
              {a.goal&&<p style={{fontSize:12,color:C.sub,margin:"0 0 3px",display:"flex",alignItems:"center",gap:4}}><Icon name="target" size={11} color={C.sub}/>Meta: {a.goal}</p>}
              {a.incentive_value&&<p style={{fontSize:12,color:C.success,margin:0,display:"flex",alignItems:"center",gap:4}}><Icon name="dollar" size={11} color={C.success}/>{fmtBRL(a.incentive_value)} {a.incentive_type==="per_unit"?"/ unidade":"ao bater meta"}</p>}
            </div>
            <div style={{display:"flex",gap:3}}>
              <Btn variant="ghost" onClick={()=>startEdit(a)} style={{padding:"5px 9px"}}><Icon name="edit" size={13} color={C.muted}/></Btn>
              <Btn variant="danger" onClick={async()=>{await sb.from("activities").delete().eq("id",a.id);await reload();}} style={{padding:"5px 9px"}}><Icon name="x" size={13} color={C.danger}/></Btn>
            </div>
          </div>
        </Card>)}
      </div>
    )}
  </div>;
}

function Historico({db}){
  return <div>
    <PageHeader title="Histórico" sub="Ciclos encerrados"/>
    {db.history.length===0?<div style={{textAlign:"center",padding:"60px 0"}}><Icon name="clock" size={40} color={C.muted}/><p style={{fontSize:14,color:C.muted,marginTop:12}}>Nenhum ciclo encerrado ainda.</p></div>
    :db.history.map((h,i)=>{const praca=db.pracas.find(p=>p.id===h.praca_id);return(
      <Card key={i} style={{marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>{praca&&<div style={{width:10,height:10,borderRadius:"50%",background:praca.color}}/>}<span style={{fontWeight:600,color:C.text,fontSize:15}}>{praca?.name||"—"}</span><Badge color={praca?.color||C.accent}>{cycleLabel(h.cycle)}</Badge></div>
        {(h.ranking||[]).slice(0,3).map((r,ri)=><div key={ri} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:ri<Math.min((h.ranking||[]).length,3)-1?"1px solid "+C.border:"none"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:13,fontWeight:700,color:MEDAL[ri]||C.muted}}>{ri+1}°</span><Avatar name={r.corretor?.name||"?"} size={28}/><span style={{fontSize:14,color:C.text}}>{r.corretor?.name||"?"}</span></div>
          <span style={{fontSize:15,fontWeight:700,color:C.text}}>{r.pts} pts</span>
        </div>)}
      </Card>
    );})}
  </div>;
}

// ── Materiais ─────────────────────────────────────────────────────────────────
function Materiais({db,reload,pracaId,canEdit,isAdmin}){
  const [folder,setFolder]=useState(null);const [imgModal,setImgModal]=useState(null);
  const [newFolder,setNewFolder]=useState("");const [addingFolder,setAddingFolder]=useState(false);
  const [editFolder,setEditFolder]=useState(null);const [editName,setEditName]=useState("");
  const [uploading,setUploading]=useState(false);const [loadingF,setLoadingF]=useState(false);
  const pracas=pracaId?[db.pracas.find(p=>p.id===pracaId)].filter(Boolean):db.pracas;
  const [activePid,setActivePid]=useState(pracaId||pracas[0]?.id||null);
  const folders=db.folders.filter(f=>f.praca_id===activePid);
  const folderFiles=folder?db.files.filter(f=>f.folder_id===folder.id):[];
  async function createFolder(){if(!newFolder.trim()||!activePid)return;setLoadingF(true);await sb.from("materials_folders").insert({praca_id:activePid,name:newFolder.trim()});await reload();setLoadingF(false);setNewFolder("");setAddingFolder(false);}
  async function saveEditFolder(){if(!editName.trim())return;await sb.from("materials_folders").update({name:editName.trim()}).eq("id",editFolder.id);await reload();setEditFolder(null);setEditName("");}
  async function uploadFile(e){
    const f=e.target.files[0];if(!f||!folder)return;setUploading(true);
    const isImg=f.type.startsWith("image/");const isPdf=f.type==="application/pdf";if(!isImg&&!isPdf){setUploading(false);return;}
    const ext=f.name.split(".").pop();const path="materials/folder-"+folder.id+"/"+Date.now()+"."+ext;
    const{error}=await sb.storage.from("imagens").upload(path,f,{upsert:true,contentType:f.type});
    if(!error){const{data}=sb.storage.from("imagens").getPublicUrl(path);await sb.from("materials_files").insert({folder_id:folder.id,name:f.name,url:data.publicUrl,file_type:isImg?"image":"pdf"});await reload();}
    setUploading(false);e.target.value="";
  }
  return <div>
    {imgModal&&<div onClick={()=>setImgModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.94)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out"}}>
      <img src={imgModal} style={{maxWidth:"92vw",maxHeight:"92vh",objectFit:"contain",borderRadius:10}} onClick={e=>e.stopPropagation()}/>
      <button onClick={()=>setImgModal(null)} style={{position:"fixed",top:20,right:20,background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",cursor:"pointer",borderRadius:8,width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="x" size={16} color="#fff"/></button>
    </div>}
    {!folder?<>
      <PageHeader title="Materiais" sub="Campanhas, cards e documentos" action={canEdit&&!addingFolder&&<Btn variant="primary" onClick={()=>setAddingFolder(true)}><Icon name="plus" size={14} color="#fff"/>Nova pasta</Btn>}/>
      {isAdmin&&<PracaTab pracas={pracas} pid={activePid} onSelect={p=>{setActivePid(p);setFolder(null);}}/>}
      {addingFolder&&<div style={{background:C.surface,border:"1px solid "+C.borderHi,borderRadius:14,padding:20,marginBottom:20}}><Field label="Nome da pasta"><div style={{display:"flex",gap:10}}><Inp value={newFolder} onChange={e=>setNewFolder(e.target.value)} placeholder="Ex: Campanha Dia das Mães"/><Btn variant="primary" onClick={createFolder} disabled={loadingF}>{loadingF?"...":"Criar"}</Btn><Btn onClick={()=>{setAddingFolder(false);setNewFolder("");}}>Cancelar</Btn></div></Field></div>}
      {folders.length===0?<div style={{textAlign:"center",padding:"60px 0"}}><Icon name="folder" size={44} color={C.muted}/><p style={{fontSize:15,fontWeight:500,color:C.text,marginTop:14,marginBottom:4}}>Nenhuma pasta</p><p style={{fontSize:13,color:C.muted}}>Crie uma pasta para organizar os materiais.</p></div>:(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
          {folders.map(f=>{const count=db.files.filter(fi=>fi.folder_id===f.id).length;const thumb=db.files.find(fi=>fi.folder_id===f.id&&fi.file_type==="image");return(
            <div key={f.id} onClick={()=>setFolder(f)} style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,overflow:"hidden",cursor:"pointer",transition:"border-color 0.15s"}}>
              <div style={{height:110,background:C.surface,display:"flex",alignItems:"center",justifyContent:"center"}}>{thumb?<img src={thumb.url} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<Icon name="folder" size={40} color={C.muted}/>}</div>
              <div style={{padding:"12px 14px"}}>
                {editFolder?.id===f.id?<div onClick={e=>e.stopPropagation()} style={{display:"flex",gap:6}}><Inp value={editName} onChange={e=>setEditName(e.target.value)} style={{fontSize:13}}/><Btn variant="primary" onClick={saveEditFolder} style={{fontSize:12,padding:"5px 8px"}}><Icon name="check" size={12} color="#fff"/></Btn></div>:(
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div><p style={{fontSize:13,fontWeight:600,color:C.text,margin:"0 0 3px"}}>{f.name}</p><p style={{fontSize:11,color:C.muted,margin:0}}>{count} arquivo{count!==1?"s":""}</p></div>
                    {canEdit&&<div onClick={e=>e.stopPropagation()} style={{display:"flex",gap:2}}><Btn variant="ghost" onClick={()=>{setEditFolder(f);setEditName(f.name);}} style={{padding:"3px 7px"}}><Icon name="edit" size={12} color={C.muted}/></Btn><Btn variant="danger" onClick={async()=>{await sb.from("materials_folders").delete().eq("id",f.id);await reload();if(folder?.id===f.id)setFolder(null);}} style={{padding:"3px 7px"}}><Icon name="x" size={12} color={C.danger}/></Btn></div>}
                  </div>
                )}
              </div>
            </div>
          );})}
        </div>
      )}
    </>:<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}><Btn variant="ghost" onClick={()=>setFolder(null)} style={{padding:"8px 14px",fontSize:13}}>← Voltar</Btn><h1 style={{fontSize:22,fontWeight:700,color:C.text,margin:0}}>{folder.name}</h1></div>
        {canEdit&&<label style={{display:"inline-flex",alignItems:"center",gap:8,fontFamily:"inherit",fontSize:14,cursor:uploading?"not-allowed":"pointer",borderRadius:8,padding:"9px 18px",fontWeight:500,background:C.accent,border:"1px solid "+C.accent,color:"#fff",opacity:uploading?.6:1}}>{uploading?"Enviando...":"+ Adicionar arquivo"}<input type="file" accept="image/*,.pdf" onChange={uploadFile} disabled={uploading} style={{display:"none"}}/></label>}
      </div>
      {folderFiles.length===0?<div style={{textAlign:"center",padding:"60px 0"}}><Icon name="folder" size={44} color={C.muted}/><p style={{fontSize:14,color:C.muted,marginTop:12}}>Pasta vazia.{canEdit?" Adicione imagens ou PDFs acima.":""}</p></div>:(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12}}>
          {folderFiles.map(file=><div key={file.id} style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,overflow:"hidden"}}>
            {file.file_type==="image"?<div onClick={()=>setImgModal(file.url)} style={{cursor:"zoom-in"}}><img src={file.url} style={{width:"100%",height:130,objectFit:"cover",display:"block"}}/></div>:<a href={file.url} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",height:130,background:C.surface,textDecoration:"none",flexDirection:"column",gap:8}}><Icon name="folder" size={28} color={C.accent}/><span style={{fontSize:11,color:C.accent,fontWeight:500}}>Abrir PDF</span></a>}
            <div style={{padding:"8px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <p style={{fontSize:11,color:C.muted,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{file.name}</p>
              {canEdit&&<Btn variant="danger" onClick={async()=>{await sb.from("materials_files").delete().eq("id",file.id);await reload();}} style={{padding:"3px 7px",marginLeft:6}}><Icon name="x" size={12} color={C.danger}/></Btn>}
            </div>
          </div>)}
        </div>
      )}
    </>}
  </div>;
}

// ── Gerente Panel ─────────────────────────────────────────────────────────────
function GerentePanel({db,reload,user,praca,tab,setTab,onLogout}){
  const pendingC=praca?db.users.filter(u=>u.status==="pending"&&u.role==="corretor"&&u.praca_id===praca.id).length:0;
  const tabs=[
    {id:"ranking",label:"Ranking",icon:"chart"},
    {id:"lancar",label:"Lançar pontos",icon:"plus"},
    {id:"performance",label:"Performance",icon:"activity"},
    {id:"materiais",label:"Materiais",icon:"folder"},
    {id:"aprovacoes",label:"Aprovações",icon:"check",badge:pendingC||null},
    {id:"total",label:"Ranking Total",icon:"trending"},
    {id:"fechar",label:"Fechar mês",icon:"clock"},
    {id:"banner",label:"Banner",icon:"image"},
    {id:"faq",label:"Ajuda",icon:"help"},
    {id:"historico",label:"Histórico",icon:"layers"},
  ];
  if(!praca)return <Shell user={user} tab={tab} setTab={setTab} tabs={tabs} onLogout={onLogout}><div style={{textAlign:"center",padding:"60px 0"}}><Icon name="building" size={44} color={C.muted}/><p style={{fontSize:14,color:C.muted,marginTop:12}}>Sem praça vinculada. Fale com o admin.</p></div></Shell>;
  return <Shell user={user} tab={tab} setTab={setTab} tabs={tabs} onLogout={onLogout} pracaColor={praca.color}>
    {tab==="ranking"&&<div><PageHeader title={praca.name} sub={"Ranking · "+cycleLabel(getCycle())}/><RankingBoard pracaId={praca.id} cycle={getCycle()} db={db} showGoals={true} showHero={true}/></div>}
    {tab==="lancar"&&<LancarPontos db={db} reload={reload} praca={praca}/>}
    {tab==="performance"&&<Performance db={db} praca={praca}/>}
    {tab==="materiais"&&<Materiais db={db} reload={reload} pracaId={praca.id} canEdit={true} isAdmin={false}/>}
    {tab==="aprovacoes"&&<Aprovacoes db={db} reload={reload} viewerRole="gerente" pracaId={praca.id}/>}
    {tab==="total"&&<RankingTotal db={db}/>}
    {tab==="fechar"&&<FecharMes db={db} reload={reload} praca={praca}/>}
    {tab==="banner"&&<BannerEditor reload={reload} praca={praca}/>}
    {tab==="faq"&&<FAQ/>}
    {tab==="historico"&&<Historico db={db}/>}
  </Shell>;
}

function LancarPontos({db,reload,praca}){
  const cycle=getCycle();const corretores=db.users.filter(u=>u.role==="corretor"&&u.praca_id===praca.id&&u.status==="active");
  const acts=db.activities.filter(a=>a.praca_id===praca.id);
  const [cid,setCid]=useState(corretores[0]?.id||"");const [week,setWeek]=useState(1);const [qtys,setQtys]=useState({});const [saved,setSaved]=useState(false);const [loading,setLoading]=useState(false);
  const existing=db.launches.filter(l=>l.praca_id===praca.id&&l.cycle===cycle&&l.user_id===cid&&l.week===week);
  const totalNew=acts.reduce((s,a)=>s+(parseInt(qtys[a.id])||0)*a.points,0);
  async function launch(){
    const entries=acts.flatMap(a=>{const q=parseInt(qtys[a.id])||0;return q>0?[{praca_id:praca.id,user_id:cid,activity_id:a.id,quantity:q,week,cycle}]:[];});
    if(!entries.length||!cid)return;setLoading(true);
    await sb.from("launches").insert(entries);await reload();setLoading(false);setQtys({});setSaved(true);setTimeout(()=>setSaved(false),2500);
  }
  return <div>
    <PageHeader title="Lançar pontos" sub={praca.name+" · "+cycleLabel(cycle)}/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:24}}>
      <Field label="Corretor"><Sel value={cid} onChange={e=>setCid(parseInt(e.target.value))}>{corretores.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Sel></Field>
      <Field label="Semana do mês"><Sel value={week} onChange={e=>setWeek(parseInt(e.target.value))}>{[1,2,3,4,5].map(w=><option key={w} value={w}>Semana {w}</option>)}</Sel></Field>
    </div>
    {existing.length>0&&<AlertBox><Icon name="clock" size={13} color={C.warn}/>Já lançado na semana {week}: {existing.map(e=>{const a=acts.find(x=>x.id===e.activity_id);return a?e.quantity+"× "+a.name:"";}).join(", ")}. Novo lançamento será somado.</AlertBox>}
    <Card>
      <SecLabel>Quantidade por atividade</SecLabel>
      {acts.length===0?<div style={{textAlign:"center",padding:"30px 0"}}><Icon name="sliders" size={32} color={C.muted}/><p style={{fontSize:13,color:C.muted,marginTop:8}}>Nenhuma atividade cadastrada.</p></div>:acts.map(a=>(
        <div key={a.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 0",borderBottom:"1px solid "+C.border}}>
          <div style={{width:46,height:46,borderRadius:12,background:praca.color+"15",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{fontSize:17,fontWeight:800,color:praca.color}}>{a.points}</span>
          </div>
          <div style={{flex:1}}>
            <p style={{fontSize:14,fontWeight:500,color:C.text,margin:"0 0 3px"}}>{a.name}</p>
            <p style={{fontSize:12,color:C.muted,margin:0}}>{a.points} pts / ocorrência{a.goal?" · meta: "+a.goal:""}{a.incentive_value?<span style={{color:C.success}}> · {fmtBRL(a.incentive_value)}{a.incentive_type==="per_unit"?"/un":"→ bônus"}</span>:null}</p>
          </div>
          <input type="number" min="0" step="1" value={qtys[a.id]||""} onChange={e=>setQtys(q=>({...q,[a.id]:Math.max(0,parseInt(e.target.value)||0)}))} placeholder="0" style={{fontFamily:"inherit",fontSize:14,background:C.surface,border:"1px solid "+C.border,color:C.text,borderRadius:8,padding:"10px 14px",outline:"none",width:88,textAlign:"center"}}/>
          {(parseInt(qtys[a.id])||0)>0&&<span style={{fontSize:13,fontWeight:600,color:C.success,minWidth:64}}>+{(parseInt(qtys[a.id])||0)*a.points}pts</span>}
        </div>
      ))}
      {totalNew>0&&<div style={{display:"flex",justifyContent:"flex-end",paddingTop:16}}><span style={{fontSize:16,fontWeight:700,color:C.success}}>Total: +{totalNew} pontos</span></div>}
    </Card>
    <div style={{display:"flex",alignItems:"center",gap:14,marginTop:22}}>
      <Btn variant="primary" onClick={launch} disabled={loading} style={{padding:"12px 32px",fontSize:15}}>{loading?"Salvando...":"Confirmar lançamento"}</Btn>
      {saved&&<span style={{fontSize:13,color:C.success,fontWeight:500,display:"flex",alignItems:"center",gap:6}}><Icon name="check" size={13} color={C.success}/>Pontos lançados!</span>}
    </div>
  </div>;
}

function FecharMes({db,reload,praca}){
  const cycle=getCycle();const [prize,setPrize]=useState(praca.prize||"");const [done,setDone]=useState(false);const [loading,setLoading]=useState(false);
  const ranking=useMemo(()=>calcRanking(praca.id,cycle,db),[praca.id,cycle,db]);
  async function savePrize(){await sb.from("pracas").update({prize:prize||null}).eq("id",praca.id);await reload();}
  async function closeMonth(){
    setLoading(true);
    await sb.from("history").insert({praca_id:praca.id,cycle,ranking:ranking.map(r=>({corretor:{id:r.corretor.id,name:r.corretor.name},pts:r.pts,breakdown:r.breakdown}))});
    await reload();setLoading(false);setDone(true);
  }
  if(done)return <div><PageHeader title="Fechar mês"/><Card style={{borderColor:C.success+"45"}}><div style={{display:"flex",alignItems:"center",gap:14}}><div style={{width:48,height:48,borderRadius:"50%",background:C.success+"20",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon name="check" size={22} color={C.success}/></div><div><p style={{fontSize:18,fontWeight:700,color:C.success,margin:"0 0 4px"}}>Ciclo encerrado!</p><p style={{fontSize:14,color:C.sub,margin:0}}>{cycleLabel(cycle)} salvo no histórico com sucesso.</p></div></div></Card></div>;
  return <div>
    <PageHeader title={"Fechar mês · "+cycleLabel(cycle)} sub={praca.name}/>
    <Card style={{marginBottom:20}}><SecLabel>Prêmio do mês</SecLabel><div style={{display:"flex",gap:10}}><Inp value={prize} onChange={e=>setPrize(e.target.value)} placeholder="Ex: iPhone 15 Pro para o 1° lugar!" style={{flex:1}}/><Btn onClick={savePrize}>Salvar</Btn></div></Card>
    <Card style={{marginBottom:20}}><SecLabel>Ranking final do ciclo</SecLabel>
      {ranking.length===0?<p style={{color:C.muted,fontSize:14}}>Nenhum ponto lançado neste ciclo.</p>:ranking.map((r,i)=>(
        <div key={r.corretor.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:i<ranking.length-1?"1px solid "+C.border:"none"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:14,fontWeight:700,color:MEDAL[i]||C.muted,minWidth:26}}>{i+1}°</span><Avatar name={r.corretor.name} size={32}/><span style={{fontSize:14,color:C.text}}>{r.corretor.name}</span></div>
          <span style={{fontSize:16,fontWeight:700,color:C.text}}>{r.pts} pts</span>
        </div>
      ))}
    </Card>
    <AlertBox><Icon name="clock" size={13} color={C.warn}/>Ao fechar o ciclo, o ranking será salvo permanentemente. Esta ação não pode ser desfeita.</AlertBox>
    <Btn variant="primary" onClick={closeMonth} disabled={loading} style={{padding:"12px 32px",fontSize:15}}>{loading?"Fechando...":"Fechar ciclo de "+cycleLabel(cycle)}</Btn>
  </div>;
}

function BannerEditor({reload,praca}){
  const banners=praca.banners||[];const [interval,setIntervalVal]=useState(praca.banner_interval||5);const [uploading,setUploading]=useState(false);const [err,setErr]=useState("");
  async function uploadBanner(e){
    const f=e.target.files[0];if(!f)return;setUploading(true);setErr("");
    const ext=f.name.split(".").pop();const path="banners/praca-"+praca.id+"-"+Date.now()+"."+ext;
    const{error}=await sb.storage.from("imagens").upload(path,f,{upsert:true,contentType:f.type});
    if(error){setErr("Erro: "+error.message);setUploading(false);return;}
    const{data}=sb.storage.from("imagens").getPublicUrl(path);
    await sb.from("pracas").update({banners:[...banners,data.publicUrl]}).eq("id",praca.id);
    await reload();setUploading(false);e.target.value="";
  }
  async function removeBanner(i){await sb.from("pracas").update({banners:banners.filter((_,idx)=>idx!==i)}).eq("id",praca.id);await reload();}
  async function saveInterval(){await sb.from("pracas").update({banner_interval:interval}).eq("id",praca.id);await reload();}
  return <div>
    <PageHeader title="Banner do ranking" sub={praca.name+" · carrossel automático"}/>
    <Card style={{marginBottom:16}}><SecLabel>Intervalo do carrossel</SecLabel><div style={{display:"flex",gap:10,alignItems:"center"}}><Inp type="number" min="2" max="60" value={interval} onChange={e=>setIntervalVal(parseInt(e.target.value)||5)} style={{width:90}}/><span style={{fontSize:13,color:C.muted}}>segundos por banner</span><Btn onClick={saveInterval}>Salvar</Btn></div></Card>
    <Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}><SecLabel style={{margin:0}}>Imagens ({banners.length}/10)</SecLabel><label style={{display:"inline-flex",alignItems:"center",gap:8,fontFamily:"inherit",fontSize:13,cursor:uploading?"not-allowed":"pointer",borderRadius:8,padding:"8px 16px",fontWeight:500,background:C.accent,border:"1px solid "+C.accent,color:"#fff",opacity:uploading?.6:1}}>{uploading?"Enviando...":"+ Adicionar"}<input type="file" accept="image/*" onChange={uploadBanner} disabled={uploading} style={{display:"none"}}/></label></div>
      {err&&<p style={{fontSize:13,color:C.danger,margin:"0 0 12px"}}>{err}</p>}
      {banners.length===0?<p style={{textAlign:"center",padding:"30px 0",color:C.muted,fontSize:13}}>Nenhum banner. Recomendado: 1200×300px.</p>:(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10,marginBottom:16}}>
          {banners.map((url,i)=><div key={i} style={{borderRadius:10,overflow:"hidden",border:"1px solid "+C.border,position:"relative"}}>
            <img src={url} style={{width:"100%",height:110,objectFit:"cover",display:"block"}}/>
            <div style={{position:"absolute",top:6,right:6}}><button onClick={()=>removeBanner(i)} style={{background:"rgba(0,0,0,0.65)",border:"none",color:"#fff",cursor:"pointer",borderRadius:6,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="x" size={12} color="#fff"/></button></div>
            <div style={{position:"absolute",bottom:6,left:8}}><span style={{fontSize:11,color:"#fff",background:"rgba(0,0,0,0.55)",padding:"2px 7px",borderRadius:4}}>{i+1}°</span></div>
          </div>)}
        </div>
      )}
      {banners.length>0&&<div><Divider label="Preview"/><CarouselBanner banners={banners} interval={interval}/></div>}
    </Card>
  </div>;
}

// ── Corretor Panel ────────────────────────────────────────────────────────────
function CorretorPanel({db,user,praca,onLogout}){
  const cycle=getCycle();const [tab,setTab]=useState("ranking");
  const tabs=[{id:"ranking",label:"Ranking",icon:"chart"},{id:"materiais",label:"Materiais",icon:"folder"}];
  const ranking=useMemo(()=>praca?calcRanking(praca.id,cycle,db):[],[praca,cycle,db]);
  const myIdx=ranking.findIndex(r=>r.corretor.id===user.id);const myData=myIdx>=0?ranking[myIdx]:null;
  if(!praca)return <Shell user={user} tab={tab} setTab={setTab} tabs={tabs} onLogout={onLogout}><div style={{textAlign:"center",padding:"60px 0"}}><Icon name="building" size={44} color={C.muted}/><p style={{fontSize:14,color:C.muted,marginTop:12}}>Sem praça vinculada. Fale com seu gerente.</p></div></Shell>;
  return <Shell user={user} tab={tab} setTab={setTab} tabs={tabs} onLogout={onLogout} pracaColor={praca.color}>
    {tab==="ranking"&&<div>
      <PageHeader title={praca.name} sub={"Ranking · "+cycleLabel(cycle)}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:28}}>
        <Stat label="Sua posição" value={myIdx>=0?(myIdx+1)+"°":"—"} icon="trending" color={praca.color}/>
        <Stat label="Seus pontos" value={myData?.pts||0} icon="chart" color={C.gold}/>
        <Stat label="Corretores" value={ranking.length} icon="users" color={C.sub}/>
      </div>
      <RankingBoard pracaId={praca.id} cycle={cycle} db={db} showGoals={true} showHero={true} currentUserId={user.id}/>
    </div>}
    {tab==="materiais"&&<Materiais db={db} reload={()=>{}} pracaId={praca.id} canEdit={false} isAdmin={false}/>}
  </Shell>;
}
