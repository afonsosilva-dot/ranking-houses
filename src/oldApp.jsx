import { useState, useMemo, createContext, useContext, useEffect, useRef } from "react";

// ─── Theme ────────────────────────────────────────────────────────────────────
const DARK = {bg:"#080809",surface:"#0F0F11",card:"#141416",border:"#1E1E22",borderHi:"#2A2A30",text:"#F0F0F2",muted:"#6B6B78",sub:"#9999A8",gold:"#F5C842",silver:"#A8B0BC",bronze:"#C47E3A",success:"#3DD68C",danger:"#F05252",warn:"#F5A623"};
const LIGHT = {bg:"#F0F2F5",surface:"#FFFFFF",card:"#FAFAFA",border:"#E2E2E7",borderHi:"#CECECE",text:"#111113",muted:"#71717A",sub:"#52525B",gold:"#B45309",silver:"#6B7280",bronze:"#7C2D12",success:"#15803D",danger:"#DC2626",warn:"#D97706"};
function buildC(cfg){return{...(cfg.theme==="light"?LIGHT:DARK),accent:cfg.accent||"#4F6EF7"};}
const AppCtx = createContext({C:DARK,cfg:{},setDb:()=>{}});
const useC = ()=>useContext(AppCtx).C;
const useCfg = ()=>useContext(AppCtx).cfg;
const useSetDb = ()=>useContext(AppCtx).setDb;

// ─── Utilities ────────────────────────────────────────────────────────────────
const MONTHS=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
function getCycle(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}
function cycleLabel(k){if(!k)return"";const[y,m]=k.split("-");return MONTHS[+m-1]+" "+y;}
function calcRanking(pid,cycle,db){
  const corretores=db.users.filter(u=>u.role==="corretor"&&u.pracaId===pid);
  const acts=db.activities[String(pid)]||[];
  const launches=(db.launches[String(pid)]||{})[cycle]||{};
  return corretores.map(c=>{
    const entries=launches[String(c.id)]||[];
    let pts=0;const breakdown=[];
    acts.forEach(a=>{const qty=entries.filter(e=>e.activityId===a.id).reduce((s,e)=>s+e.quantity,0);if(qty>0){breakdown.push({name:a.name,qty,pts:qty*a.points});pts+=qty*a.points;}});
    return{corretor:c,pts,breakdown};
  }).sort((a,b)=>b.pts-a.pts);
}
function useW(){
  const[w,setW]=useState(()=>window.innerWidth);
  useEffect(()=>{const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  return w;
}
function readFile(file,cb){const r=new FileReader();r.onload=e=>cb(e.target.result);r.readAsDataURL(file);}
let _confettiShown=false;

// ─── Seed ─────────────────────────────────────────────────────────────────────
const SEED={
  nid:20,
  config:{projectName:"Ranking Houses",theme:"dark",accent:"#4F6EF7",loginLogo:null,sidebarLogo:null},
  pracas:[
    {id:1,name:"Produto 1",color:"#4F6EF7",prize:"iPhone 15 Pro para o 1° lugar!",banner:null,logo:null},
    {id:2,name:"Produto 2",color:"#3DD68C",prize:"R$ 2.000 em bônus",banner:null,logo:null},
  ],
  activities:{
    "1":[{id:1,name:"Agendamento",points:10},{id:2,name:"Visita",points:25},{id:3,name:"Venda",points:100}],
    "2":[{id:1,name:"Agendamento",points:10},{id:2,name:"Visita",points:25}],
  },
  users:[
    {id:1,name:"Admin Master",email:"admin@master.com",password:"admin123",role:"admin",pracaId:null},
    {id:2,name:"Carlos Mendes",email:"gerente1@co.com",password:"123456",role:"gerente",pracaId:1},
    {id:3,name:"Ana Paula",email:"gerente2@co.com",password:"123456",role:"gerente",pracaId:2},
    {id:4,name:"João Silva",email:"joao@co.com",password:"123456",role:"corretor",pracaId:1},
    {id:5,name:"Maria Santos",email:"maria@co.com",password:"123456",role:"corretor",pracaId:1},
    {id:6,name:"Pedro Oliveira",email:"pedro@co.com",password:"123456",role:"corretor",pracaId:1},
    {id:7,name:"Lucas Costa",email:"lucas@co.com",password:"123456",role:"corretor",pracaId:2},
    {id:8,name:"Fernanda Lima",email:"fernanda@co.com",password:"123456",role:"corretor",pracaId:2},
  ],
  launches:{
    "1":{"2026-04":{"4":[{activityId:1,quantity:3,week:1},{activityId:2,quantity:2,week:1},{activityId:3,quantity:1,week:2}],"5":[{activityId:1,quantity:5,week:1},{activityId:2,quantity:1,week:2}],"6":[{activityId:2,quantity:3,week:1},{activityId:3,quantity:2,week:2}]}},
    "2":{"2026-04":{"7":[{activityId:1,quantity:4,week:1}],"8":[{activityId:2,quantity:2,week:1}]}},
  },
  history:[],
};

// ─── Confetti ─────────────────────────────────────────────────────────────────
function Confetti({onDone}){
  useEffect(()=>{
    const canvas=document.createElement("canvas");
    canvas.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999";
    canvas.width=window.innerWidth;canvas.height=window.innerHeight;
    document.body.appendChild(canvas);
    const ctx=canvas.getContext("2d");
    const cols=["#F5C842","#4F6EF7","#3DD68C","#F05252","#A8B0BC","#7B5AF5","#F5A623","#FF6B9D"];
    const ps=Array.from({length:160},()=>({
      x:Math.random()*canvas.width,y:Math.random()*-canvas.height*.6,
      r:Math.random()*7+3,col:cols[Math.floor(Math.random()*cols.length)],
      vx:(Math.random()-.5)*4,vy:Math.random()*3+2,
      ang:Math.random()*Math.PI*2,spin:(Math.random()-.5)*.15,
      isRect:Math.random()>.4,
    }));
    let frame;const start=Date.now();
    function draw(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ps.forEach(p=>{
        p.x+=p.vx;p.y+=p.vy;p.ang+=p.spin;p.vy+=0.07;
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.ang);ctx.fillStyle=p.col;
        if(p.isRect)ctx.fillRect(-p.r/2,-p.r*.3,p.r,p.r*.6);
        else{ctx.beginPath();ctx.arc(0,0,p.r/2,0,Math.PI*2);ctx.fill();}
        ctx.restore();
      });
      if(Date.now()-start<4200){frame=requestAnimationFrame(draw);}
      else{if(canvas.parentNode)document.body.removeChild(canvas);onDone();}
    }
    draw();
    return()=>{cancelAnimationFrame(frame);if(canvas.parentNode)document.body.removeChild(canvas);};
  },[]);
  return null;
}

// ─── Atoms ────────────────────────────────────────────────────────────────────
function Avatar({name,size=36,color}){
  const C=useC();const ac=color||C.accent;
  const i=name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
  return <div style={{width:size,height:size,borderRadius:"50%",background:ac+"20",border:"1px solid "+ac+"40",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.32,fontWeight:700,color:ac,flexShrink:0}}>{i}</div>;
}
function Badge({children,color}){
  const C=useC();const ac=color||C.accent;
  return <span style={{display:"inline-flex",padding:"3px 10px",borderRadius:20,background:ac+"18",border:"1px solid "+ac+"35",fontSize:11,fontWeight:600,color:ac,letterSpacing:"0.03em"}}>{children}</span>;
}
function Btn({children,onClick,variant="base",style:extra={}}){
  const C=useC();
  const base={fontFamily:"inherit",fontSize:14,cursor:"pointer",borderRadius:8,padding:"9px 18px",fontWeight:500,border:"1px solid "+C.border,background:C.card,color:C.sub,display:"inline-flex",alignItems:"center",gap:6};
  const v={base,primary:{...base,background:C.accent,border:"1px solid "+C.accent,color:"#fff"},ghost:{...base,background:"transparent",border:"1px solid transparent",color:C.muted},danger:{...base,background:"transparent",border:"1px solid transparent",color:C.danger}};
  return <button style={{...(v[variant]||base),...extra}} onClick={onClick}>{children}</button>;
}
function Inp({value,onChange,onKeyDown,type="text",placeholder="",style:extra={}}){
  const C=useC();
  return <input type={type} value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} style={{fontFamily:"inherit",fontSize:14,background:C.surface,border:"1px solid "+C.border,color:C.text,borderRadius:8,padding:"10px 14px",outline:"none",width:"100%",...extra}}/>;
}
function Sel({value,onChange,children}){
  const C=useC();
  return <select value={value} onChange={onChange} style={{fontFamily:"inherit",fontSize:14,background:C.surface,border:"1px solid "+C.border,color:C.text,borderRadius:8,padding:"10px 14px",outline:"none",width:"100%"}}>{children}</select>;
}
function Card({children,topColor,style:extra={}}){
  const C=useC();
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,padding:"18px 20px",position:"relative",overflow:"hidden",...extra}}>{topColor&&<div style={{position:"absolute",top:0,left:0,right:0,height:3,background:topColor}}/>}{children}</div>;
}
function Stat({label,value,sub,color}){
  const C=useC();const ac=color||C.accent;
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"16px 20px"}}><p style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:"0.08em",textTransform:"uppercase",margin:"0 0 8px"}}>{label}</p><p style={{fontSize:26,fontWeight:700,color:ac,margin:0}}>{value}</p>{sub&&<p style={{fontSize:12,color:C.muted,margin:"6px 0 0"}}>{sub}</p>}</div>;
}
function PageHeader({title,sub,action}){
  const C=useC();
  return <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28,flexWrap:"wrap",gap:10}}><div><h1 style={{fontSize:22,fontWeight:700,color:C.text,letterSpacing:"-0.02em",margin:"0 0 4px"}}>{title}</h1>{sub&&<p style={{fontSize:13,color:C.muted,margin:0}}>{sub}</p>}</div>{action}</div>;
}
function Field({label,children}){
  const C=useC();
  return <div><label style={{fontSize:12,fontWeight:500,color:C.sub,display:"block",marginBottom:6}}>{label}</label>{children}</div>;
}
function FormBox({title,children,onSave,onCancel}){
  const C=useC();
  return <div style={{background:C.surface,border:"1px solid "+C.borderHi,borderRadius:14,padding:24,marginBottom:20}}><p style={{fontSize:15,fontWeight:600,color:C.text,margin:"0 0 20px"}}>{title}</p>{children}<div style={{display:"flex",gap:10,marginTop:20}}><Btn variant="primary" onClick={onSave}>Salvar</Btn><Btn onClick={onCancel}>Cancelar</Btn></div></div>;
}
function SecLabel({children}){const C=useC();return <p style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:"0.08em",textTransform:"uppercase",margin:"0 0 12px"}}>{children}</p>;}
function Divider(){const C=useC();return <div style={{height:1,background:C.border,margin:"24px 0"}}/>;}
function AlertBox({children,color}){
  const C=useC();const ac=color||C.warn;
  return <div style={{background:ac+"12",border:"1px solid "+ac+"35",borderRadius:10,padding:"11px 14px",fontSize:13,color:ac,marginBottom:16}}>{children}</div>;
}
function PracaTab({pracas,activePid,onSelect}){
  const C=useC();
  return <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>{pracas.map(p=><Btn key={p.id} onClick={()=>onSelect(p.id)} style={{background:activePid===p.id?p.color+"18":C.card,border:"1px solid "+(activePid===p.id?p.color+"45":C.border),color:activePid===p.id?p.color:C.sub,fontWeight:activePid===p.id?600:400,padding:"8px 16px",fontSize:13}}>{p.name}</Btn>)}</div>;
}
function LogoUpload({value,onChange,label,w=120,h=48}){
  const C=useC();
  function onFile(e){const f=e.target.files[0];if(f)readFile(f,onChange);}
  if(value)return(
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <img src={value} alt="" style={{width:w,height:h,objectFit:"contain",borderRadius:8,border:"1px solid "+C.border,background:C.surface,padding:4}}/>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        <label style={{fontFamily:"inherit",fontSize:12,cursor:"pointer",borderRadius:6,padding:"5px 12px",border:"1px solid "+C.border,background:C.card,color:C.sub,display:"inline-flex",alignItems:"center"}}>Trocar<input type="file" accept="image/*" onChange={onFile} style={{display:"none"}}/></label>
        <button onClick={()=>onChange(null)} style={{fontFamily:"inherit",fontSize:12,cursor:"pointer",borderRadius:6,padding:"5px 12px",border:"1px solid transparent",background:"transparent",color:C.danger}}>Remover</button>
      </div>
    </div>
  );
  return(
    <label style={{display:"inline-flex",alignItems:"center",gap:8,fontFamily:"inherit",fontSize:13,cursor:"pointer",borderRadius:8,padding:"10px 18px",border:"1px dashed "+C.borderHi,background:"transparent",color:C.muted}}>
      + {label}
      <input type="file" accept="image/*" onChange={onFile} style={{display:"none"}}/>
    </label>
  );
}

// ─── Ranking Board ────────────────────────────────────────────────────────────
function RankingBoard({pracaId,cycle,db}){
  const C=useC();
  const praca=db.pracas.find(p=>p.id===pracaId);
  const ranking=useMemo(()=>calcRanking(pracaId,cycle,db),[pracaId,cycle,db]);
  if(!praca)return null;
  const mC=[C.gold,C.silver,C.bronze];
  const top3=ranking.slice(0,3);const rest=ranking.slice(3);
  return(
    <div>
      {praca.banner&&<div style={{borderRadius:12,overflow:"hidden",marginBottom:20,border:"1px solid "+C.border}}><img src={praca.banner} alt="Banner" style={{width:"100%",maxHeight:180,objectFit:"cover",display:"block"}}/></div>}
      {praca.prize&&<div style={{background:C.gold+"10",border:"1px solid "+C.gold+"28",borderRadius:12,padding:"11px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:10}}><span>🏆</span><span style={{fontSize:13,fontWeight:500,color:C.gold}}>{praca.prize}</span></div>}
      {top3.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat("+top3.length+",1fr)",gap:10,marginBottom:10}}>{top3.map((r,i)=>(
        <Card key={r.corretor.id} topColor={i===0?C.gold:mC[i]} style={{textAlign:"center",paddingTop:i===0?22:18}}>
          <p style={{fontSize:20,fontWeight:800,color:mC[i],margin:"0 0 8px"}}>{i+1}°</p>
          <div style={{display:"flex",justifyContent:"center",marginBottom:8}}><Avatar name={r.corretor.name} size={40} color={mC[i]}/></div>
          <p style={{fontSize:13,fontWeight:500,color:C.text,margin:"0 0 4px"}}>{r.corretor.name}</p>
          <p style={{fontSize:26,fontWeight:800,color:mC[i],lineHeight:1,margin:0}}>{r.pts}</p>
          <p style={{fontSize:11,color:C.muted,margin:"3px 0 8px"}}>pontos</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:4,justifyContent:"center"}}>{r.breakdown.map(b=><span key={b.name} style={{fontSize:11,color:C.muted,background:C.surface,padding:"2px 7px",borderRadius:20,border:"1px solid "+C.border}}>{b.qty}× {b.name}</span>)}</div>
        </Card>
      ))}</div>}
      {rest.map((r,i)=>(
        <div key={r.corretor.id} style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:13,fontWeight:600,color:C.muted,minWidth:22,textAlign:"center"}}>{i+4}°</span>
          <Avatar name={r.corretor.name} size={32}/>
          <div style={{flex:1}}>
            <p style={{fontSize:14,fontWeight:500,color:C.text,margin:"0 0 3px"}}>{r.corretor.name}</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{r.breakdown.map(b=><span key={b.name} style={{fontSize:11,color:C.muted,background:C.surface,padding:"2px 7px",borderRadius:20,border:"1px solid "+C.border}}>{b.qty}× {b.name}</span>)}</div>
          </div>
          <div style={{textAlign:"right"}}><p style={{fontSize:18,fontWeight:700,color:C.text,margin:0}}>{r.pts}</p><p style={{fontSize:11,color:C.muted,margin:0}}>pts</p></div>
        </div>
      ))}
      {ranking.length===0&&<p style={{textAlign:"center",padding:"60px 0",color:C.muted,fontSize:14}}>Nenhum dado lançado ainda neste ciclo.</p>}
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function Login({users,onLogin}){
  const C=useC();const cfg=useCfg();
  const[email,setEmail]=useState("");const[pass,setPass]=useState("");const[err,setErr]=useState("");
  function doLogin(){const u=users.find(u=>u.email.toLowerCase()===email.toLowerCase()&&u.password===pass);if(!u){setErr("Email ou senha incorretos");return;}onLogin(u);}
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 20px",position:"relative"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient("+C.border+" 1px,transparent 1px),linear-gradient(90deg,"+C.border+" 1px,transparent 1px)",backgroundSize:"52px 52px",opacity:.22}}/>
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          {cfg.loginLogo
            ?<img src={cfg.loginLogo} alt="Logo" style={{height:56,objectFit:"contain",margin:"0 auto 14px",display:"block"}}/>
            :<div style={{width:54,height:54,borderRadius:14,background:"linear-gradient(135deg,"+C.accent+",#7B5AF5)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
          }
          <p style={{fontSize:24,fontWeight:800,color:C.text,letterSpacing:"-0.03em",margin:"0 0 4px"}}>{cfg.projectName||"Ranking Houses"}</p>
          <p style={{fontSize:13,color:C.muted,margin:0}}>Acesse sua conta para continuar</p>
        </div>
        <div style={{background:C.surface,border:"1px solid "+C.border,borderRadius:16,padding:28}}>
          <div style={{marginBottom:14}}><Field label="Email"><Inp type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="seu@email.com"/></Field></div>
          <div style={{marginBottom:22}}><Field label="Senha"><Inp type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="••••••••"/></Field></div>
          {err&&<p style={{fontSize:13,color:C.danger,textAlign:"center",margin:"0 0 14px"}}>{err}</p>}
          <Btn variant="primary" onClick={doLogin} style={{width:"100%",padding:"12px",fontSize:15,fontWeight:600,justifyContent:"center"}}>Entrar</Btn>
        </div>
        <div style={{marginTop:14,padding:"14px 16px",background:C.surface,border:"1px solid "+C.border,borderRadius:10,fontSize:11,color:C.muted,lineHeight:1.9}}>
          <span style={{fontWeight:600,color:C.sub,display:"block",marginBottom:2}}>Demo</span>
          admin@master.com / admin123 — Admin<br/>gerente1@co.com / 123456 — Gerente<br/>joao@co.com / 123456 — Corretor
        </div>
      </div>
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────
function Shell({user,tab,setTab,tabs,children,onLogout,pracaColor}){
  const C=useC();const cfg=useCfg();
  const w=useW();const isMobile=w<700;
  const[drawerOpen,setDrawerOpen]=useState(false);
  const rLabel={admin:"Admin Master",gerente:"Gerente",corretor:"Corretor"}[user.role];
  const rColor={admin:C.gold,gerente:pracaColor||C.accent,corretor:C.sub}[user.role];
  const ac=pracaColor||C.accent;
  const projName=cfg.projectName||"Ranking Houses";

  const LogoEl=()=>cfg.sidebarLogo
    ?<img src={cfg.sidebarLogo} alt="Logo" style={{height:28,objectFit:"contain"}}/>
    :<div style={{width:28,height:28,borderRadius:7,background:"linear-gradient(135deg,"+C.accent+",#7B5AF5)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>;

  const SidebarInner=({onClose})=>(
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.surface}}>
      <div style={{padding:"18px 16px 14px",borderBottom:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><LogoEl/><span style={{fontWeight:700,fontSize:13,color:C.text}}>{projName}</span></div>
        {onClose&&<button onClick={onClose} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:18,padding:0}}>✕</button>}
      </div>
      <div style={{padding:"12px 16px",borderBottom:"1px solid "+C.border}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><Avatar name={user.name} size={30} color={rColor}/><div style={{overflow:"hidden",flex:1}}><p style={{fontSize:12,fontWeight:500,color:C.text,margin:"0 0 3px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.name}</p><Badge color={rColor}>{rLabel}</Badge></div></div>
      </div>
      <nav style={{flex:1,padding:"8px"}}>
        {tabs.map(t=>{const active=tab===t.id;return(
          <button key={t.id} onClick={()=>{setTab(t.id);setDrawerOpen(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 12px",textAlign:"left",borderRadius:8,marginBottom:2,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:active?600:400,background:active?ac+"15":"transparent",border:"1px solid "+(active?ac+"30":"transparent"),color:active?ac:C.muted}}>
            <span style={{fontSize:13}}>{t.icon}</span>{t.label}
          </button>
        );})}
      </nav>
      <div style={{padding:"8px",borderTop:"1px solid "+C.border}}>
        <button onClick={onLogout} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"9px 12px",fontFamily:"inherit",fontSize:13,background:"transparent",border:"1px solid transparent",borderRadius:8,color:C.muted,cursor:"pointer"}}>↩ Sair</button>
      </div>
    </div>
  );

  if(isMobile)return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"system-ui,sans-serif"}}>
      <div style={{height:52,background:C.surface,borderBottom:"1px solid "+C.border,display:"flex",alignItems:"center",padding:"0 14px",gap:10,position:"sticky",top:0,zIndex:100}}>
        <button onClick={()=>setDrawerOpen(true)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:20,padding:"0 4px",lineHeight:1}}>☰</button>
        <span style={{fontWeight:700,fontSize:13,color:C.text,flex:1}}>{projName}</span>
        <Avatar name={user.name} size={28} color={rColor}/>
      </div>
      {drawerOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex"}}>
          <div style={{width:240,height:"100%",overflowY:"auto",boxShadow:"4px 0 20px rgba(0,0,0,.4)"}}><SidebarInner onClose={()=>setDrawerOpen(false)}/></div>
          <div style={{flex:1,background:"rgba(0,0,0,.5)"}} onClick={()=>setDrawerOpen(false)}/>
        </div>
      )}
      <div style={{padding:"20px 16px"}}>{children}</div>
    </div>
  );

  return(
    <div style={{display:"flex",minHeight:"100vh",background:C.bg,fontFamily:"system-ui,sans-serif"}}>
      <div style={{width:216,flexShrink:0,borderRight:"1px solid "+C.border}}><SidebarInner onClose={null}/></div>
      <div style={{flex:1,overflow:"auto",padding:"30px 36px"}}>{children}</div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App(){
  const[db,setDb]=useState(SEED);
  const[user,setUser]=useState(null);
  const[tab,setTab]=useState("ranking");
  const C=useMemo(()=>buildC(db.config),[db.config]);
  const ctxVal=useMemo(()=>({C,cfg:db.config,setDb}),[C,db.config]);
  function login(u){setUser(u);setTab(u.role==="admin"?"pracas":"ranking");}
  function logout(){setUser(null);}
  return(
    <AppCtx.Provider value={ctxVal}>
      {!user&&<Login users={db.users} onLogin={login}/>}
      {user&&user.role==="admin"&&<AdminPanel db={db} setDb={setDb} user={user} tab={tab} setTab={setTab} onLogout={logout}/>}
      {user&&user.role==="gerente"&&<GerentePanel db={db} setDb={setDb} user={user} praca={db.pracas.find(p=>p.id===user.pracaId)} tab={tab} setTab={setTab} onLogout={logout}/>}
      {user&&user.role==="corretor"&&<CorretorPanel db={db} user={user} praca={db.pracas.find(p=>p.id===user.pracaId)} onLogout={logout}/>}
    </AppCtx.Provider>
  );
}

// ─── Admin ────────────────────────────────────────────────────────────────────
function AdminPanel({db,setDb,user,tab,setTab,onLogout}){
  const tabs=[{id:"pracas",label:"Praças",icon:"◈"},{id:"usuarios",label:"Usuários",icon:"◎"},{id:"atividades",label:"Atividades",icon:"◆"},{id:"rankings",label:"Rankings",icon:"▲"},{id:"banners",label:"Banners",icon:"◉"},{id:"config",label:"Configurações",icon:"⚙"},{id:"historico",label:"Histórico",icon:"◷"}];
  return(
    <Shell user={user} tab={tab} setTab={setTab} tabs={tabs} onLogout={onLogout} pracaColor={useC().gold}>
      {tab==="pracas"&&<AdminPracas db={db} setDb={setDb}/>}
      {tab==="usuarios"&&<AdminUsuarios db={db} setDb={setDb}/>}
      {tab==="atividades"&&<AdminAtividades db={db} setDb={setDb}/>}
      {tab==="rankings"&&<AdminRankings db={db}/>}
      {tab==="banners"&&<AdminBanners db={db} setDb={setDb}/>}
      {tab==="config"&&<AdminConfig db={db} setDb={setDb}/>}
      {tab==="historico"&&<Historico db={db}/>}
    </Shell>
  );
}

function AdminPracas({db,setDb}){
  const C=useC();
  const[form,setForm]=useState({name:"",color:"#4F6EF7",prize:"",logo:null});
  const[editId,setEditId]=useState(null);const[adding,setAdding]=useState(false);
  function cancel(){setEditId(null);setAdding(false);setForm({name:"",color:"#4F6EF7",prize:"",logo:null});}
  function startEdit(p){setForm({name:p.name,color:p.color,prize:p.prize||"",logo:p.logo||null});setEditId(p.id);setAdding(false);}
  function save(){
    if(!form.name.trim())return;
    if(editId){setDb(d=>({...d,pracas:d.pracas.map(p=>p.id===editId?{...p,...form}:p)}));}
    else{const id=db.nid;setDb(d=>({...d,nid:d.nid+1,pracas:[...d.pracas,{id,...form,banner:null}],activities:{...d.activities,[String(id)]:[]} }));}
    cancel();
  }
  const countC=pid=>db.users.filter(u=>u.role==="corretor"&&u.pracaId===pid).length;
  function onLogo(e){const f=e.target.files[0];if(f)readFile(f,v=>setForm(fm=>({...fm,logo:v})));}
  return(
    <div>
      <PageHeader title="Praças" sub="Configure praças, cores e prêmios" action={!editId&&!adding&&<Btn variant="primary" onClick={()=>setAdding(true)}>+ Nova praça</Btn>}/>
      {(editId||adding)&&(
        <FormBox title={editId?"Editar praça":"Nova praça"} onSave={save} onCancel={cancel}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
            <Field label="Nome"><Inp value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Produto 1"/></Field>
            <Field label="Cor"><input type="color" value={form.color} onChange={e=>setForm(f=>({...f,color:e.target.value}))} style={{height:42,width:"100%",borderRadius:8,border:"1px solid "+C.border,background:C.surface,padding:4,cursor:"pointer"}}/></Field>
          </div>
          <div style={{marginBottom:14}}><Field label="Prêmio do mês"><Inp value={form.prize} onChange={e=>setForm(f=>({...f,prize:e.target.value}))} placeholder="Ex: iPhone 15 Pro para o 1° lugar!"/></Field></div>
          <Field label="Logo da praça (opcional)">
            <div style={{marginTop:4}}>
              {form.logo?<div style={{display:"flex",alignItems:"center",gap:10}}><img src={form.logo} alt="" style={{height:36,objectFit:"contain",borderRadius:6,border:"1px solid "+C.border,background:C.surface,padding:3}}/><label style={{fontFamily:"inherit",fontSize:12,cursor:"pointer",borderRadius:6,padding:"5px 12px",border:"1px solid "+C.border,background:C.card,color:C.sub}}>Trocar<input type="file" accept="image/*" onChange={onLogo} style={{display:"none"}}/></label><button onClick={()=>setForm(f=>({...f,logo:null}))} style={{fontFamily:"inherit",fontSize:12,cursor:"pointer",background:"transparent",border:"none",color:C.danger}}>Remover</button></div>
              :<label style={{display:"inline-flex",alignItems:"center",gap:6,fontFamily:"inherit",fontSize:12,cursor:"pointer",borderRadius:8,padding:"8px 14px",border:"1px dashed "+C.borderHi,color:C.muted}}>+ Adicionar logo<input type="file" accept="image/*" onChange={onLogo} style={{display:"none"}}/></label>}
            </div>
          </Field>
        </FormBox>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
        {db.pracas.map(p=>(
          <Card key={p.id} topColor={p.color} style={{paddingTop:22}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  {p.logo&&<img src={p.logo} alt="" style={{height:22,objectFit:"contain"}}/>}
                  <p style={{fontSize:15,fontWeight:600,color:C.text,margin:0}}>{p.name}</p>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}><Badge color={p.color}>{countC(p.id)} corretores</Badge>{p.prize&&<Badge color={C.gold}>🏆 prêmio</Badge>}</div>
                {p.prize&&<p style={{fontSize:11,color:C.muted,margin:"8px 0 0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.prize}</p>}
              </div>
              <div style={{display:"flex",gap:4,flexShrink:0,marginLeft:8}}>
                <Btn variant="ghost" onClick={()=>startEdit(p)} style={{fontSize:12,padding:"5px 10px"}}>✎</Btn>
                <Btn variant="danger" onClick={()=>setDb(d=>({...d,pracas:d.pracas.filter(x=>x.id!==p.id)}))} style={{fontSize:12,padding:"5px 10px"}}>✕</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AdminUsuarios({db,setDb}){
  const C=useC();
  const[form,setForm]=useState({name:"",email:"",password:"123456",role:"corretor",pracaId:""});
  const[editId,setEditId]=useState(null);const[adding,setAdding]=useState(false);
  const rL={admin:"Admin Master",gerente:"Gerente",corretor:"Corretor"};
  const rC={admin:C.gold,gerente:C.accent,corretor:C.sub};
  function cancel(){setEditId(null);setAdding(false);setForm({name:"",email:"",password:"123456",role:"corretor",pracaId:""});}
  function startEdit(u){setForm({name:u.name,email:u.email,password:u.password,role:u.role,pracaId:u.pracaId||""});setEditId(u.id);setAdding(false);}
  function save(){
    if(!form.name.trim()||!form.email.trim())return;
    const pracaId=form.role==="admin"?null:(form.pracaId?parseInt(form.pracaId):null);
    if(editId){setDb(d=>({...d,users:d.users.map(u=>u.id===editId?{...u,...form,pracaId}:u)}));}
    else{setDb(d=>({...d,nid:d.nid+1,users:[...d.users,{id:d.nid,...form,pracaId}]}));}
    cancel();
  }
  return(
    <div>
      <PageHeader title="Usuários" sub="Gerencie acessos e praças" action={!editId&&!adding&&<Btn variant="primary" onClick={()=>setAdding(true)}>+ Novo usuário</Btn>}/>
      {(editId||adding)&&(
        <FormBox title={editId?"Editar usuário":"Novo usuário"} onSave={save} onCancel={cancel}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <Field label="Nome"><Inp value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Nome completo"/></Field>
            <Field label="Email"><Inp type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@co.com"/></Field>
            <Field label="Senha"><Inp value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/></Field>
            <Field label="Perfil"><Sel value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}><option value="corretor">Corretor</option><option value="gerente">Gerente</option><option value="admin">Admin Master</option></Sel></Field>
            {form.role!=="admin"&&<Field label="Praça"><Sel value={form.pracaId} onChange={e=>setForm(f=>({...f,pracaId:e.target.value}))}><option value="">Selecione...</option>{db.pracas.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</Sel></Field>}
          </div>
        </FormBox>
      )}
      {["admin","gerente","corretor"].map(role=>{
        const group=db.users.filter(u=>u.role===role);
        if(!group.length)return null;
        return(
          <div key={role} style={{marginBottom:24}}>
            <SecLabel>{rL[role]}s — {group.length}</SecLabel>
            {group.map(u=>{const p=u.pracaId?db.pracas.find(x=>x.id===u.pracaId):null;return(
              <div key={u.id} style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"12px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <Avatar name={u.name} size={32} color={rC[u.role]}/>
                <div style={{flex:1,minWidth:120}}>
                  <p style={{fontSize:14,fontWeight:500,color:C.text,margin:"0 0 2px"}}>{u.name}</p>
                  <p style={{fontSize:12,color:C.muted,margin:0}}>{u.email}{p?" · "+p.name:""}</p>
                </div>
                <Badge color={rC[u.role]}>{rL[u.role]}</Badge>
                <Btn variant="ghost" onClick={()=>startEdit(u)} style={{fontSize:12,padding:"5px 10px"}}>✎</Btn>
                {u.id!==1&&<Btn variant="danger" onClick={()=>setDb(d=>({...d,users:d.users.filter(x=>x.id!==u.id)}))} style={{fontSize:12,padding:"5px 10px"}}>✕</Btn>}
              </div>
            );})}
          </div>
        );
      })}
    </div>
  );
}

function AdminAtividades({db,setDb}){
  const C=useC();
  const[pid,setPid]=useState(db.pracas[0]?db.pracas[0].id:null);
  const[form,setForm]=useState({name:"",points:10});
  const[editId,setEditId]=useState(null);const[adding,setAdding]=useState(false);
  const praca=db.pracas.find(p=>p.id===pid);
  const acts=pid?(db.activities[String(pid)]||[]):[];
  function cancel(){setEditId(null);setAdding(false);setForm({name:"",points:10});}
  function startEdit(a){setForm({name:a.name,points:a.points});setEditId(a.id);setAdding(false);}
  function save(){
    if(!form.name.trim()||!pid)return;
    const key=String(pid);const pts=parseInt(form.points)||1;
    if(editId){setDb(d=>({...d,activities:{...d.activities,[key]:d.activities[key].map(a=>a.id===editId?{...a,name:form.name,points:pts}:a)}}));}
    else{const id=db.nid;setDb(d=>({...d,nid:d.nid+1,activities:{...d.activities,[key]:[...(d.activities[key]||[]),{id,name:form.name,points:pts}]}}));}
    cancel();
  }
  return(
    <div>
      <PageHeader title="Atividades" sub="Configure métricas e pontuações por praça" action={!editId&&!adding&&<Btn variant="primary" onClick={()=>setAdding(true)}>+ Nova atividade</Btn>}/>
      <PracaTab pracas={db.pracas} activePid={pid} onSelect={p=>{setPid(p);cancel();}}/>
      {(editId||adding)&&(
        <FormBox title={editId?"Editar atividade":"Nova atividade"} onSave={save} onCancel={cancel}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
            <Field label="Nome"><Inp value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Agendamento"/></Field>
            <Field label="Pontos"><input type="number" min="1" value={form.points} onChange={e=>setForm(f=>({...f,points:e.target.value}))} style={{fontFamily:"inherit",fontSize:14,background:C.surface,border:"1px solid "+C.border,color:C.text,borderRadius:8,padding:"10px 14px",outline:"none",width:"100%"}}/></Field>
          </div>
        </FormBox>
      )}
      {acts.length===0
        ?<p style={{textAlign:"center",padding:"60px 0",color:C.muted,fontSize:14}}>Nenhuma atividade{praca?" para "+praca.name:""}.</p>
        :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
          {acts.map(a=>(
            <Card key={a.id} style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:42,height:42,borderRadius:10,background:(praca?praca.color:C.accent)+"15",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:16,fontWeight:800,color:praca?praca.color:C.accent}}>{a.points}</span></div>
              <div style={{flex:1}}><p style={{fontSize:14,fontWeight:500,color:C.text,margin:"0 0 2px"}}>{a.name}</p><p style={{fontSize:12,color:C.muted,margin:0}}>{a.points} pts / vez</p></div>
              <Btn variant="ghost" onClick={()=>startEdit(a)} style={{fontSize:12,padding:"5px 9px"}}>✎</Btn>
              <Btn variant="danger" onClick={()=>setDb(d=>({...d,activities:{...d.activities,[String(pid)]:d.activities[String(pid)].filter(x=>x.id!==a.id)}}))} style={{fontSize:12,padding:"5px 9px"}}>✕</Btn>
            </Card>
          ))}
        </div>
      }
    </div>
  );
}

function AdminRankings({db}){
  const C=useC();
  const cycle=getCycle();
  const[pid,setPid]=useState(db.pracas[0]?db.pracas[0].id:null);
  const praca=db.pracas.find(p=>p.id===pid);
  const ranking=useMemo(()=>pid?calcRanking(pid,cycle,db):[],[pid,cycle,db]);
  return(
    <div>
      <PageHeader title={"Rankings · "+cycleLabel(cycle)} sub="Ranking atual de qualquer praça"/>
      <PracaTab pracas={db.pracas} activePid={pid} onSelect={setPid}/>
      {praca&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
        <Stat label="Corretores" value={ranking.length} color={praca.color}/>
        <Stat label="Líder" value={ranking[0]?ranking[0].corretor.name.split(" ")[0]:"—"} sub={ranking[0]?ranking[0].pts+" pts":"sem dados"} color={C.gold}/>
        <Stat label="Total de pontos" value={ranking.reduce((s,r)=>s+r.pts,0)} color={C.sub}/>
      </div>}
      {pid&&<RankingBoard pracaId={pid} cycle={cycle} db={db}/>}
    </div>
  );
}

function AdminBanners({db,setDb}){
  const[pid,setPid]=useState(db.pracas[0]?db.pracas[0].id:null);
  const praca=db.pracas.find(p=>p.id===pid);
  return(
    <div>
      <PageHeader title="Banners" sub="Gerencie os banners de cada praça"/>
      <PracaTab pracas={db.pracas} activePid={pid} onSelect={setPid}/>
      {praca&&<BannerEditor db={db} setDb={setDb} praca={praca}/>}
    </div>
  );
}

function AdminConfig({db,setDb}){
  const C=useC();
  const cfg=db.config;
  const[name,setName]=useState(cfg.projectName||"Ranking Houses");
  const[nameSaved,setNameSaved]=useState(false);

  function saveConfig(patch){setDb(d=>({...d,config:{...d.config,...patch}}));}
  function saveName(){saveConfig({projectName:name});setNameSaved(true);setTimeout(()=>setNameSaved(false),2000);}

  return(
    <div>
      <PageHeader title="Configurações" sub="Personalize o sistema"/>

      <Card style={{marginBottom:20}}>
        <SecLabel>Nome do projeto</SecLabel>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <Inp value={name} onChange={e=>setName(e.target.value)} style={{flex:1,minWidth:180}}/>
          <Btn variant="primary" onClick={saveName}>Salvar</Btn>
          {nameSaved&&<span style={{fontSize:13,color:C.success,fontWeight:500}}>✓ Salvo!</span>}
        </div>
      </Card>

      <Card style={{marginBottom:20}}>
        <SecLabel>Tema</SecLabel>
        <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
          <Btn onClick={()=>saveConfig({theme:"dark"})} style={{background:cfg.theme==="dark"?C.accent+"20":C.card,border:"1px solid "+(cfg.theme==="dark"?C.accent:C.border),color:cfg.theme==="dark"?C.accent:C.sub,fontWeight:cfg.theme==="dark"?600:400}}>🌙 Dark</Btn>
          <Btn onClick={()=>saveConfig({theme:"light"})} style={{background:cfg.theme==="light"?C.accent+"20":C.card,border:"1px solid "+(cfg.theme==="light"?C.accent:C.border),color:cfg.theme==="light"?C.accent:C.sub,fontWeight:cfg.theme==="light"?600:400}}>☀️ Light</Btn>
        </div>
        <Field label="Cor de destaque (accent)">
          <div style={{display:"flex",alignItems:"center",gap:12,marginTop:4}}>
            <input type="color" value={cfg.accent||"#4F6EF7"} onChange={e=>saveConfig({accent:e.target.value})} style={{height:40,width:60,borderRadius:8,border:"1px solid "+C.border,background:C.surface,padding:3,cursor:"pointer"}}/>
            <span style={{fontSize:13,color:C.muted}}>Afeta botões, destaques e navegação</span>
          </div>
        </Field>
      </Card>

      <Card style={{marginBottom:20}}>
        <SecLabel>Logos</SecLabel>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,flexWrap:"wrap"}}>
          <Field label="Logo da tela de login">
            <div style={{marginTop:6}}><LogoUpload value={cfg.loginLogo} onChange={v=>saveConfig({loginLogo:v})} label="Adicionar logo" w={160} h={52}/></div>
          </Field>
          <Field label="Logo da barra lateral">
            <div style={{marginTop:6}}><LogoUpload value={cfg.sidebarLogo} onChange={v=>saveConfig({sidebarLogo:v})} label="Adicionar logo" w={120} h={36}/></div>
          </Field>
        </div>
      </Card>
    </div>
  );
}

function Historico({db}){
  const C=useC();
  return(
    <div>
      <PageHeader title="Histórico" sub="Ciclos encerrados"/>
      {db.history.length===0
        ?<p style={{textAlign:"center",padding:"60px 0",color:C.muted,fontSize:14}}>Nenhum ciclo encerrado ainda.</p>
        :db.history.map((h,i)=>{
          const praca=db.pracas.find(p=>p.id===h.pracaId);
          const mC=[C.gold,C.silver,C.bronze];
          return(
            <Card key={i} style={{marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                {praca&&<div style={{width:10,height:10,borderRadius:"50%",background:praca.color,flexShrink:0}}/>}
                <span style={{fontWeight:600,color:C.text,fontSize:15}}>{praca?praca.name:"—"}</span>
                <Badge color={praca?praca.color:C.accent}>{cycleLabel(h.cycle)}</Badge>
              </div>
              {h.ranking.slice(0,3).map((r,ri)=>(
                <div key={r.corretor.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:ri<Math.min(h.ranking.length,3)-1?"1px solid "+C.border:"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:13,fontWeight:700,color:mC[ri]||C.muted}}>{ri+1}°</span><Avatar name={r.corretor.name} size={26}/><span style={{fontSize:14,color:C.text}}>{r.corretor.name}</span></div>
                  <span style={{fontSize:15,fontWeight:700,color:C.text}}>{r.pts} pts</span>
                </div>
              ))}
            </Card>
          );
        })
      }
    </div>
  );
}

// ─── Banner Editor (shared) ───────────────────────────────────────────────────
function BannerEditor({db,setDb,praca}){
  const C=useC();
  const[preview,setPreview]=useState(praca.banner||null);
  const[saved,setSaved]=useState(false);
  function onFile(e){const f=e.target.files[0];if(!f)return;readFile(f,v=>{setPreview(v);setSaved(false);});}
  function save(){setDb(d=>({...d,pracas:d.pracas.map(p=>p.id===praca.id?{...p,banner:preview}:p)}));setSaved(true);setTimeout(()=>setSaved(false),2500);}
  function remove(){setPreview(null);setDb(d=>({...d,pracas:d.pracas.map(p=>p.id===praca.id?{...p,banner:null}:p)}));}
  return(
    <div>
      <PageHeader title="Banner do ranking" sub={praca.name+" · aparece no topo do ranking"}/>
      <Card style={{marginBottom:16}}>
        {preview?(
          <div>
            <div style={{borderRadius:10,overflow:"hidden",marginBottom:14,border:"1px solid "+C.border}}><img src={preview} alt="Banner" style={{width:"100%",maxHeight:200,objectFit:"cover",display:"block"}}/></div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
              <label style={{fontFamily:"inherit",fontSize:14,cursor:"pointer",borderRadius:8,padding:"9px 18px",fontWeight:500,border:"1px solid "+C.border,background:C.card,color:C.sub,display:"inline-flex",alignItems:"center",gap:6}}>Trocar imagem<input type="file" accept="image/*" onChange={onFile} style={{display:"none"}}/></label>
              <Btn variant="primary" onClick={save}>Salvar banner</Btn>
              <Btn variant="danger" onClick={remove}>Remover</Btn>
              {saved&&<span style={{fontSize:13,color:C.success,fontWeight:500}}>✓ Salvo!</span>}
            </div>
          </div>
        ):(
          <div style={{textAlign:"center",padding:"48px 20px"}}>
            <div style={{width:52,height:52,borderRadius:12,background:praca.color+"18",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",fontSize:22}}>🖼</div>
            <p style={{fontSize:15,fontWeight:500,color:C.text,margin:"0 0 6px"}}>Nenhum banner</p>
            <p style={{fontSize:13,color:C.muted,margin:"0 0 20px"}}>Recomendado: 1200×300px · JPG ou PNG</p>
            <label style={{fontFamily:"inherit",fontSize:14,cursor:"pointer",borderRadius:8,padding:"10px 24px",fontWeight:500,border:"1px solid "+C.accent,background:C.accent,color:"#fff",display:"inline-flex",alignItems:"center",gap:6}}>Escolher imagem<input type="file" accept="image/*" onChange={onFile} style={{display:"none"}}/></label>
          </div>
        )}
      </Card>
      <p style={{fontSize:12,color:C.muted}}>O banner aparece no topo do ranking para corretores, gerentes e admin.</p>
    </div>
  );
}

// ─── Gerente ──────────────────────────────────────────────────────────────────
function GerentePanel({db,setDb,user,praca,tab,setTab,onLogout}){
  const tabs=[{id:"ranking",label:"Ranking",icon:"▲"},{id:"lancar",label:"Lançar pontos",icon:"◆"},{id:"fechar",label:"Fechar mês",icon:"◷"},{id:"banner",label:"Banner",icon:"◉"},{id:"historico",label:"Histórico",icon:"≡"}];
  const C=useC();
  if(!praca)return <Shell user={user} tab={tab} setTab={setTab} tabs={tabs} onLogout={onLogout}><p style={{color:C.muted}}>Sem praça vinculada.</p></Shell>;
  return(
    <Shell user={user} tab={tab} setTab={setTab} tabs={tabs} onLogout={onLogout} pracaColor={praca.color}>
      {tab==="ranking"&&<div><PageHeader title={praca.name} sub={"Ranking · "+cycleLabel(getCycle())}/><RankingBoard pracaId={praca.id} cycle={getCycle()} db={db}/></div>}
      {tab==="lancar"&&<LancarPontos db={db} setDb={setDb} praca={praca}/>}
      {tab==="fechar"&&<FecharMes db={db} setDb={setDb} praca={praca}/>}
      {tab==="banner"&&<BannerEditor db={db} setDb={setDb} praca={praca}/>}
      {tab==="historico"&&<Historico db={db}/>}
    </Shell>
  );
}

function LancarPontos({db,setDb,praca}){
  const C=useC();
  const cycle=getCycle();
  const corretores=db.users.filter(u=>u.role==="corretor"&&u.pracaId===praca.id);
  const acts=db.activities[String(praca.id)]||[];
  const[cid,setCid]=useState(corretores[0]?corretores[0].id:"");
  const[week,setWeek]=useState(1);const[qtys,setQtys]=useState({});const[saved,setSaved]=useState(false);
  const existing=((db.launches[String(praca.id)]||{})[cycle]||{})[String(cid)]?.filter(e=>e.week===week)||[];
  const totalNew=acts.reduce((s,a)=>s+(parseInt(qtys[a.id])||0)*a.points,0);
  function launch(){
    const entries=acts.flatMap(a=>{const q=parseInt(qtys[a.id])||0;return q>0?[{activityId:a.id,quantity:q,week}]:[];});
    if(!entries.length||!cid)return;
    setDb(d=>{
      const pl=d.launches[String(praca.id)]||{};const cl=pl[cycle]||{};const prev=cl[String(cid)]||[];
      return{...d,launches:{...d.launches,[String(praca.id)]:{...pl,[cycle]:{...cl,[String(cid)]:[...prev,...entries]}}}};
    });
    setQtys({});setSaved(true);setTimeout(()=>setSaved(false),2500);
  }
  return(
    <div>
      <PageHeader title="Lançar pontos" sub={praca.name+" · "+cycleLabel(cycle)}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
        <Field label="Corretor"><Sel value={cid} onChange={e=>setCid(parseInt(e.target.value))}>{corretores.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Sel></Field>
        <Field label="Semana"><Sel value={week} onChange={e=>setWeek(parseInt(e.target.value))}>{[1,2,3,4,5].map(w=><option key={w} value={w}>Semana {w}</option>)}</Sel></Field>
      </div>
      {existing.length>0&&<AlertBox>Já lançado na semana {week}: {existing.map(e=>{const a=acts.find(x=>x.id===e.activityId);return a?e.quantity+"× "+a.name:"";}).join(", ")}. Novo lançamento será somado.</AlertBox>}
      <Card>
        <SecLabel>Quantidade por atividade</SecLabel>
        {acts.length===0?<p style={{color:C.muted,fontSize:14}}>Nenhuma atividade cadastrada.</p>:acts.map(a=>(
          <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid "+C.border}}>
            <div style={{width:40,height:40,borderRadius:10,background:praca.color+"14",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:15,fontWeight:800,color:praca.color}}>{a.points}</span></div>
            <div style={{flex:1}}><p style={{fontSize:14,fontWeight:500,color:C.text,margin:"0 0 2px"}}>{a.name}</p><p style={{fontSize:12,color:C.muted,margin:0}}>{a.points} pts</p></div>
            <input type="number" min="0" step="1" value={qtys[a.id]||""} onChange={e=>setQtys(q=>({...q,[a.id]:Math.max(0,parseInt(e.target.value)||0)}))} placeholder="0" style={{fontFamily:"inherit",fontSize:14,background:C.surface,border:"1px solid "+C.border,color:C.text,borderRadius:8,padding:"9px 12px",outline:"none",width:72,textAlign:"center"}}/>
            {(parseInt(qtys[a.id])||0)>0&&<span style={{fontSize:13,fontWeight:600,color:C.success,minWidth:58}}>+{(parseInt(qtys[a.id])||0)*a.points}pts</span>}
          </div>
        ))}
        {totalNew>0&&<div style={{display:"flex",justifyContent:"flex-end",paddingTop:12}}><span style={{fontSize:15,fontWeight:600,color:C.success}}>Total: +{totalNew} pts</span></div>}
      </Card>
      <div style={{display:"flex",alignItems:"center",gap:12,marginTop:18,flexWrap:"wrap"}}>
        <Btn variant="primary" onClick={launch} style={{padding:"11px 24px",fontSize:15}}>Confirmar lançamento</Btn>
        {saved&&<span style={{fontSize:13,color:C.success,fontWeight:500}}>✓ Pontos lançados!</span>}
      </div>
    </div>
  );
}

function FecharMes({db,setDb,praca}){
  const C=useC();
  const cycle=getCycle();
  const[prize,setPrize]=useState(praca.prize||"");
  const[done,setDone]=useState(false);
  const ranking=useMemo(()=>calcRanking(praca.id,cycle,db),[praca.id,cycle,db]);
  const mC=[C.gold,C.silver,C.bronze];
  function savePrize(){setDb(d=>({...d,pracas:d.pracas.map(p=>p.id===praca.id?{...p,prize}:p)}));}
  function closeMonth(){const snap=ranking.slice();setDb(d=>({...d,history:[{pracaId:praca.id,cycle,ranking:snap,closedAt:new Date().toISOString()},...d.history]}));setDone(true);}
  if(done)return(<div><PageHeader title="Fechar mês"/><Card style={{borderColor:C.success+"45"}}><p style={{fontSize:18,fontWeight:700,color:C.success,margin:"0 0 6px"}}>Ciclo encerrado!</p><p style={{fontSize:14,color:C.sub,margin:0}}>{cycleLabel(cycle)} salvo no histórico.</p></Card></div>);
  return(
    <div>
      <PageHeader title={"Fechar mês · "+cycleLabel(cycle)} sub={praca.name}/>
      <Card style={{marginBottom:18}}>
        <SecLabel>Prêmio do mês</SecLabel>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <Inp value={prize} onChange={e=>setPrize(e.target.value)} placeholder="Ex: iPhone 15 Pro para o 1° lugar!" style={{flex:1,minWidth:180}}/>
          <Btn onClick={savePrize}>Salvar</Btn>
        </div>
      </Card>
      <Card style={{marginBottom:18}}>
        <SecLabel>Ranking final</SecLabel>
        {ranking.map((r,i)=>(
          <div key={r.corretor.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<ranking.length-1?"1px solid "+C.border:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:14,fontWeight:700,color:mC[i]||C.muted,minWidth:22}}>{i+1}°</span><Avatar name={r.corretor.name} size={28}/><span style={{fontSize:14,color:C.text}}>{r.corretor.name}</span></div>
            <span style={{fontSize:16,fontWeight:700,color:C.text}}>{r.pts} pts</span>
          </div>
        ))}
      </Card>
      <AlertBox>Ao fechar o ciclo, o ranking será salvo no histórico permanentemente.</AlertBox>
      <Btn variant="primary" onClick={closeMonth} style={{padding:"11px 24px",fontSize:15}}>Fechar ciclo de {cycleLabel(cycle)}</Btn>
    </div>
  );
}

// ─── Corretor ─────────────────────────────────────────────────────────────────
function CorretorPanel({db,user,praca,onLogout}){
  const C=useC();
  const cycle=getCycle();
  const[tab,setTab]=useState("ranking");
  const tabs=[{id:"ranking",label:"Ranking",icon:"▲"}];
  const ranking=useMemo(()=>praca?calcRanking(praca.id,cycle,db):[],[praca,cycle,db]);
  const myIdx=ranking.findIndex(r=>r.corretor.id===user.id);
  const myData=myIdx>=0?ranking[myIdx]:null;
  const[showConfetti,setShowConfetti]=useState(false);

  useEffect(()=>{
    if(!_confettiShown&&myIdx===0&&myData&&myData.pts>0){
      setShowConfetti(true);_confettiShown=true;
    }
  },[]);

  if(!praca)return <Shell user={user} tab={tab} setTab={setTab} tabs={tabs} onLogout={onLogout}><p style={{color:C.muted}}>Sem praça vinculada.</p></Shell>;
  return(
    <Shell user={user} tab={tab} setTab={setTab} tabs={tabs} onLogout={onLogout} pracaColor={praca.color}>
      {showConfetti&&<Confetti onDone={()=>setShowConfetti(false)}/>}
      <PageHeader title={praca.name} sub={"Ranking · "+cycleLabel(cycle)}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:22}}>
        <Stat label="Sua posição" value={myIdx>=0?(myIdx+1)+"°":"—"} color={praca.color}/>
        <Stat label="Seus pontos" value={myData?myData.pts:0} color={C.gold}/>
        <Stat label="Corretores" value={ranking.length} color={C.sub}/>
      </div>
      <RankingBoard pracaId={praca.id} cycle={cycle} db={db}/>
    </Shell>
  );
}
