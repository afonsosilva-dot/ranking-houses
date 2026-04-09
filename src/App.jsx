import { useState, useMemo, useEffect } from "react";
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

function getCycle() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
function cycleLabel(k) { if(!k)return""; const[y,m]=k.split("-"); return `${MONTHS[+m-1]} ${y}`; }
function calcRanking(pracaId,cycle,db) {
  const corretores=db.users.filter(u=>u.role==="corretor"&&u.praca_id===pracaId&&u.status==="active");
  const acts=db.activities.filter(a=>a.praca_id===pracaId);
  const pl=db.launches.filter(l=>l.praca_id===pracaId&&l.cycle===cycle);
  return corretores.map(c=>{
    const myL=pl.filter(l=>l.user_id===c.id);
    let pts=0;const breakdown=[];
    acts.forEach(a=>{const qty=myL.filter(l=>l.activity_id===a.id).reduce((s,l)=>s+l.quantity,0);if(qty>0){breakdown.push({name:a.name,qty,pts:qty*a.points});pts+=qty*a.points;}});
    return{corretor:c,pts,breakdown};
  }).sort((a,b)=>b.pts-a.pts);
}

// ── Atoms ─────────────────────────────────────────────────────────────────────
function Avatar({name,size=36,color=C.accent}){
  const i=name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
  return <div style={{width:size,height:size,borderRadius:"50%",background:color+"20",border:"1px solid "+color+"40",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.32,fontWeight:700,color,flexShrink:0}}>{i}</div>;
}
function Badge({children,color=C.accent}){
  return <span style={{display:"inline-flex",padding:"3px 10px",borderRadius:20,background:color+"18",border:"1px solid "+color+"35",fontSize:11,fontWeight:600,color}}>{children}</span>;
}
function Btn({children,onClick,variant="base",style:x={},disabled=false}){
  const base={fontFamily:"inherit",fontSize:14,cursor:disabled?"not-allowed":"pointer",borderRadius:8,padding:"9px 18px",fontWeight:500,border:"1px solid "+C.border,background:C.card,color:C.sub,display:"inline-flex",alignItems:"center",gap:6,opacity:disabled?.5:1};
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
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,padding:"18px 20px",position:"relative",overflow:"hidden",...x}}>{topColor&&<div style={{position:"absolute",top:0,left:0,right:0,height:3,background:topColor}}/>}{children}</div>;
}
function Stat({label,value,sub,color=C.accent}){
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"16px 20px"}}><p style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:"0.08em",textTransform:"uppercase",margin:"0 0 8px"}}>{label}</p><p style={{fontSize:26,fontWeight:700,color,margin:0}}>{value}</p>{sub&&<p style={{fontSize:12,color:C.muted,margin:"6px 0 0"}}>{sub}</p>}</div>;
}
function PageHeader({title,sub,action}){
  return <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28}}><div><h1 style={{fontSize:24,fontWeight:700,color:C.text,letterSpacing:"-0.02em",margin:"0 0 4px"}}>{title}</h1>{sub&&<p style={{fontSize:13,color:C.muted,margin:0}}>{sub}</p>}</div>{action}</div>;
}
function Field({label,children}){
  return <div><label style={{fontSize:12,fontWeight:500,color:C.sub,display:"block",marginBottom:6}}>{label}</label>{children}</div>;
}
function FormBox({title,children,onSave,onCancel,loading}){
  return <div style={{background:C.surface,border:"1px solid "+C.borderHi,borderRadius:14,padding:24,marginBottom:20}}><p style={{fontSize:15,fontWeight:600,color:C.text,margin:"0 0 20px"}}>{title}</p>{children}<div style={{display:"flex",gap:10,marginTop:20}}><Btn variant="primary" onClick={onSave} disabled={loading}>{loading?"Salvando...":"Salvar"}</Btn><Btn onClick={onCancel}>Cancelar</Btn></div></div>;
}
function SecLabel({children}){ return <p style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:"0.08em",textTransform:"uppercase",margin:"0 0 12px"}}>{children}</p>; }
function AlertBox({children,color=C.warn}){ return <div style={{background:color+"12",border:"1px solid "+color+"35",borderRadius:10,padding:"11px 14px",fontSize:13,color,marginBottom:16}}>{children}</div>; }
function PracaTab({pracas,pid,onSelect}){
  return <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>{pracas.map(p=><Btn key={p.id} onClick={()=>onSelect(p.id)} style={{background:pid===p.id?p.color+"18":C.card,border:"1px solid "+(pid===p.id?p.color+"45":C.border),color:pid===p.id?p.color:C.sub,fontWeight:pid===p.id?600:400,padding:"8px 16px",fontSize:13}}>{p.name}</Btn>)}</div>;
}
function Spinner(){ return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:C.muted,fontSize:14}}>Carregando...</p></div>; }

// ── Ranking Board ─────────────────────────────────────────────────────────────
function RankingBoard({pracaId,cycle,db}){
  const praca=db.pracas.find(p=>p.id===pracaId);
  const ranking=useMemo(()=>calcRanking(pracaId,cycle,db),[pracaId,cycle,db]);
  if(!praca)return null;
  const top3=ranking.slice(0,3);const rest=ranking.slice(3);
  return(
    <div>
      {praca.banner&&<div style={{borderRadius:14,overflow:"hidden",marginBottom:22,border:"1px solid "+C.border}}><img src={praca.banner} alt="Banner" style={{width:"100%",maxHeight:200,objectFit:"cover",display:"block"}}/></div>}
      {praca.prize&&<div style={{background:C.gold+"10",border:"1px solid "+C.gold+"28",borderRadius:12,padding:"11px 16px",marginBottom:22,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:16}}>🏆</span><span style={{fontSize:13,fontWeight:500,color:C.gold}}>{praca.prize}</span></div>}
      {top3.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat("+top3.length+",1fr)",gap:12,marginBottom:12}}>
        {top3.map((r,i)=>(
          <Card key={r.corretor.id} topColor={i===0?C.gold:MEDAL[i]} style={{textAlign:"center",paddingTop:i===0?22:18}}>
            <p style={{fontSize:20,fontWeight:800,color:MEDAL[i],margin:"0 0 10px"}}>{i+1}°</p>
            <div style={{display:"flex",justifyContent:"center",marginBottom:8}}><Avatar name={r.corretor.name} size={42} color={MEDAL[i]}/></div>
            <p style={{fontSize:13,fontWeight:500,color:C.text,margin:"0 0 6px"}}>{r.corretor.name}</p>
            <p style={{fontSize:28,fontWeight:800,color:MEDAL[i],lineHeight:1,margin:0}}>{r.pts}</p>
            <p style={{fontSize:11,color:C.muted,margin:"4px 0 10px"}}>pontos</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:4,justifyContent:"center"}}>{r.breakdown.map(b=><span key={b.name} style={{fontSize:11,color:C.muted,background:C.surface,padding:"2px 8px",borderRadius:20,border:"1px solid "+C.border}}>{b.qty}× {b.name}</span>)}</div>
          </Card>
        ))}
      </div>}
      {rest.map((r,i)=>(
        <div key={r.corretor.id} style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 18px",marginBottom:8,display:"flex",alignItems:"center",gap:14}}>
          <span style={{fontSize:13,fontWeight:600,color:C.muted,minWidth:24,textAlign:"center"}}>{i+4}°</span>
          <Avatar name={r.corretor.name} size={34}/>
          <div style={{flex:1}}><p style={{fontSize:14,fontWeight:500,color:C.text,margin:"0 0 4px"}}>{r.corretor.name}</p><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{r.breakdown.map(b=><span key={b.name} style={{fontSize:11,color:C.muted,background:C.surface,padding:"2px 7px",borderRadius:20,border:"1px solid "+C.border}}>{b.qty}× {b.name}</span>)}</div></div>
          <div style={{textAlign:"right"}}><p style={{fontSize:18,fontWeight:700,color:C.text,margin:0}}>{r.pts}</p><p style={{fontSize:11,color:C.muted,margin:0}}>pts</p></div>
        </div>
      ))}
      {ranking.length===0&&<p style={{textAlign:"center",padding:"60px 0",color:C.muted,fontSize:14}}>Nenhum dado lançado ainda neste ciclo.</p>}
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
function Login({onLogin,pracas}){
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState(""); const [pass,setPass]=useState(""); const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const [reg,setReg]=useState({name:"",email:"",password:"",role:"corretor",praca_id:""});
  const [regOk,setRegOk]=useState(false); const [regErr,setRegErr]=useState("");

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
    const{data:exists}=await sb.from("app_users").select("id").eq("email",reg.email.toLowerCase().trim()).maybeSingle();
    if(exists){setRegErr("Este email já está cadastrado");setLoading(false);return;}
    const{error}=await sb.from("app_users").insert({name:reg.name.trim(),email:reg.email.toLowerCase().trim(),password:reg.password,role:reg.role,praca_id:parseInt(reg.praca_id),status:"pending"});
    setLoading(false);
    if(error){setRegErr("Erro ao cadastrar: "+error.message);return;}
    setRegOk(true);
  }

  const logoBlock=(
    <div style={{textAlign:"center",marginBottom:32}}>
      <div style={{width:54,height:54,borderRadius:14,background:"linear-gradient(135deg,"+C.accent+",#7B5AF5)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <p style={{fontSize:24,fontWeight:800,color:C.text,letterSpacing:"-0.03em",margin:"0 0 4px"}}>Ranking Houses</p>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 20px",position:"relative"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient("+C.border+" 1px,transparent 1px),linear-gradient(90deg,"+C.border+" 1px,transparent 1px)",backgroundSize:"52px 52px",opacity:.25}}/>
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:420}}>
        {logoBlock}
        {mode==="login"&&(
          <div style={{background:C.surface,border:"1px solid "+C.border,borderRadius:16,padding:28}}>
            <div style={{marginBottom:14}}><Field label="Email"><Inp type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="seu@email.com"/></Field></div>
            <div style={{marginBottom:22}}><Field label="Senha"><Inp type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="••••••••"/></Field></div>
            {err&&<p style={{fontSize:13,color:C.danger,textAlign:"center",margin:"0 0 14px"}}>{err}</p>}
            <Btn variant="primary" onClick={doLogin} disabled={loading} style={{width:"100%",padding:"12px",fontSize:15,fontWeight:600,justifyContent:"center"}}>{loading?"Entrando...":"Entrar"}</Btn>
            <p style={{textAlign:"center",marginTop:16,fontSize:13,color:C.muted}}>Não tem conta? <button onClick={()=>setMode("register")} style={{background:"none",border:"none",color:C.accent,cursor:"pointer",fontFamily:"inherit",fontSize:13,padding:0}}>Criar cadastro</button></p>
          </div>
        )}
        {mode==="register"&&!regOk&&(
          <div style={{background:C.surface,border:"1px solid "+C.border,borderRadius:16,padding:28}}>
            <p style={{fontSize:16,fontWeight:600,color:C.text,margin:"0 0 20px"}}>Criar cadastro</p>
            <div style={{display:"grid",gap:14,marginBottom:6}}>
              <Field label="Nome completo"><Inp value={reg.name} onChange={e=>setReg(r=>({...r,name:e.target.value}))} placeholder="Seu nome"/></Field>
              <Field label="Email"><Inp type="email" value={reg.email} onChange={e=>setReg(r=>({...r,email:e.target.value}))} placeholder="seu@email.com"/></Field>
              <Field label="Senha"><Inp type="password" value={reg.password} onChange={e=>setReg(r=>({...r,password:e.target.value}))} placeholder="Crie uma senha"/></Field>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <Field label="Cargo">
                  <Sel value={reg.role} onChange={e=>setReg(r=>({...r,role:e.target.value}))}><option value="corretor">Corretor</option><option value="gerente">Gerente</option></Sel>
                </Field>
                <Field label="Praça">
                  <Sel value={reg.praca_id} onChange={e=>setReg(r=>({...r,praca_id:e.target.value}))}><option value="">Selecione...</option>{pracas.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</Sel>
                </Field>
              </div>
            </div>
            {regErr&&<p style={{fontSize:13,color:C.danger,margin:"10px 0 0"}}>{regErr}</p>}
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <Btn variant="primary" onClick={doRegister} disabled={loading} style={{flex:1,justifyContent:"center"}}>{loading?"Enviando...":"Enviar cadastro"}</Btn>
              <Btn onClick={()=>setMode("login")}>Voltar</Btn>
            </div>
          </div>
        )}
        {mode==="register"&&regOk&&(
          <div style={{background:C.surface,border:"1px solid "+C.success+"40",borderRadius:16,padding:28,textAlign:"center"}}>
            <p style={{fontSize:32,margin:"0 0 16px"}}>✅</p>
            <p style={{fontSize:16,fontWeight:600,color:C.success,margin:"0 0 8px"}}>Cadastro enviado!</p>
            <p style={{fontSize:14,color:C.muted,margin:"0 0 20px"}}>Aguarde a aprovação do seu gerente ou admin.</p>
            <Btn onClick={()=>{setMode("login");setRegOk(false);setReg({name:"",email:"",password:"",role:"corretor",praca_id:""});}}>Voltar ao login</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pending Screen ────────────────────────────────────────────────────────────
function PendingScreen({user,db,onLogout}){
  const praca=user.praca_id?db.pracas.find(p=>p.id===user.praca_id):null;
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,border:"1px solid "+C.border,borderRadius:16,padding:36,maxWidth:400,width:"100%",textAlign:"center"}}>
        <p style={{fontSize:32,margin:"0 0 16px"}}>⏳</p>
        <p style={{fontSize:18,fontWeight:700,color:C.text,margin:"0 0 8px"}}>Cadastro em análise</p>
        <p style={{fontSize:14,color:C.muted,margin:"0 0 4px"}}>{user.name}</p>
        <p style={{fontSize:13,color:C.sub,margin:"0 0 20px"}}>{praca?praca.name:""} · {{gerente:"Gerente",corretor:"Corretor"}[user.role]||user.role}</p>
        <p style={{fontSize:13,color:C.muted,margin:"0 0 24px"}}>Entre em contato com {user.role==="gerente"?"o admin":"seu gerente"} para aprovação.</p>
        <Btn onClick={onLogout}>Sair</Btn>
      </div>
    </div>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────
function Shell({user,tab,setTab,tabs,children,onLogout,pracaColor}){
  const rLabel={admin:"Admin Master",gerente:"Gerente",corretor:"Corretor"}[user.role];
  const rColor={admin:C.gold,gerente:pracaColor||C.accent,corretor:C.sub}[user.role];
  const ac=pracaColor||C.accent;
  return(
    <div style={{display:"flex",minHeight:"100vh",background:C.bg,fontFamily:"system-ui,sans-serif"}}>
      <div style={{width:216,background:C.surface,borderRight:"1px solid "+C.border,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"20px 18px 16px",borderBottom:"1px solid "+C.border}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,"+C.accent+",#7B5AF5)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{fontWeight:700,fontSize:13,color:C.text}}>Ranking Houses</span>
          </div>
        </div>
        <div style={{padding:"14px 18px",borderBottom:"1px solid "+C.border}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Avatar name={user.name} size={32} color={rColor}/>
            <div style={{overflow:"hidden",flex:1}}>
              <p style={{fontSize:13,fontWeight:500,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",margin:"0 0 4px"}}>{user.name}</p>
              <Badge color={rColor}>{rLabel}</Badge>
            </div>
          </div>
        </div>
        <nav style={{flex:1,padding:"10px 8px"}}>
          {tabs.map(t=>{const active=tab===t.id;return <button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 12px",textAlign:"left",borderRadius:8,marginBottom:2,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:active?600:400,background:active?ac+"15":"transparent",border:"1px solid "+(active?ac+"30":"transparent"),color:active?ac:C.muted}}><span style={{fontSize:14}}>{t.icon}</span>{t.label}{t.badge?<span style={{marginLeft:"auto",background:C.danger,color:"#fff",borderRadius:20,fontSize:10,fontWeight:700,padding:"1px 7px"}}>{t.badge}</span>:null}</button>;})}
        </nav>
        <div style={{padding:"10px 8px",borderTop:"1px solid "+C.border}}>
          <button onClick={onLogout} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"9px 12px",fontFamily:"inherit",fontSize:13,background:"transparent",border:"1px solid transparent",borderRadius:8,color:C.muted,cursor:"pointer"}}><span>↩</span>Sair</button>
        </div>
      </div>
      <div style={{flex:1,overflow:"auto",padding:"30px 36px"}}>{children}</div>
    </div>
  );
}

// ── App Root ──────────────────────────────────────────────────────────────────
export default function App(){
  const [db,setDb]=useState(null);
  const [user,setUser]=useState(()=>{try{const s=localStorage.getItem("rh_user");return s?JSON.parse(s):null;}catch{return null;}});
  const [tab,setTab]=useState(()=>{try{return localStorage.getItem("rh_tab")||"ranking";}catch{return "ranking";}});

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

  function login(u){setUser(u);setTab(u.role==="admin"?"pracas":"ranking");}
  function logout(){setUser(null);}

  if(!db)return <Spinner/>;
  if(!user)return <Login onLogin={login} pracas={db.pracas}/>;
  if(user.status==="pending")return <PendingScreen user={user} db={db} onLogout={logout}/>;

  const praca=user.praca_id?db.pracas.find(p=>p.id===user.praca_id):null;
  if(user.role==="admin")return <AdminPanel db={db} reload={reload} user={user} tab={tab} setTab={setTab} onLogout={logout}/>;
  if(user.role==="gerente")return <GerentePanel db={db} reload={reload} user={user} praca={praca} tab={tab} setTab={setTab} onLogout={logout}/>;
  return <CorretorPanel db={db} user={user} praca={praca} onLogout={logout}/>;
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
function AdminPanel({db,reload,user,tab,setTab,onLogout}){
  const pendingGerentes=db.users.filter(u=>u.status==="pending"&&u.role==="gerente").length;
  const tabs=[
    {id:"pracas",label:"Praças",icon:"◈"},
    {id:"usuarios",label:"Usuários",icon:"◎"},
    {id:"aprovacoes",label:"Aprovações",icon:"✓",badge:pendingGerentes||null},
    {id:"atividades",label:"Atividades",icon:"◆"},
    {id:"materiais",label:"Materiais",icon:"📁"},
    {id:"rankings",label:"Rankings",icon:"▲"},
    {id:"historico",label:"Histórico",icon:"◷"},
  ];
  return(
    <Shell user={user} tab={tab} setTab={setTab} tabs={tabs} onLogout={onLogout} pracaColor={C.gold}>
      {tab==="pracas"&&<AdminPracas db={db} reload={reload}/>}
      {tab==="usuarios"&&<AdminUsuarios db={db} reload={reload}/>}
      {tab==="aprovacoes"&&<Aprovacoes db={db} reload={reload} viewerRole="admin"/>}
      {tab==="atividades"&&<AdminAtividades db={db} reload={reload}/>}
      {tab==="materiais"&&<Materiais db={db} reload={reload} pracaId={null} canEdit={true} isAdmin={true}/>}
      {tab==="rankings"&&<AdminRankings db={db}/>}
      {tab==="historico"&&<Historico db={db}/>}
    </Shell>
  );
}

function AdminPracas({db,reload}){
  const [form,setForm]=useState({name:"",color:"#4F6EF7",prize:""});
  const [editId,setEditId]=useState(null);const [adding,setAdding]=useState(false);const [loading,setLoading]=useState(false);
  function cancel(){setEditId(null);setAdding(false);setForm({name:"",color:"#4F6EF7",prize:""});}
  function startEdit(p){setForm({name:p.name,color:p.color,prize:p.prize||""});setEditId(p.id);setAdding(false);}
  async function save(){
    if(!form.name.trim())return;setLoading(true);
    if(editId){await sb.from("pracas").update({name:form.name,color:form.color,prize:form.prize||null}).eq("id",editId);}
    else{await sb.from("pracas").insert({name:form.name,color:form.color,prize:form.prize||null});}
    await reload();setLoading(false);cancel();
  }
  async function remove(id){await sb.from("pracas").delete().eq("id",id);await reload();}
  const countC=pid=>db.users.filter(u=>u.role==="corretor"&&u.praca_id===pid&&u.status==="active").length;
  return(
    <div>
      <PageHeader title="Praças" sub="Configure praças, cores e prêmios" action={!editId&&!adding&&<Btn variant="primary" onClick={()=>setAdding(true)}>+ Nova praça</Btn>}/>
      {(editId||adding)&&<FormBox title={editId?"Editar praça":"Nova praça"} onSave={save} onCancel={cancel} loading={loading}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
          <Field label="Nome"><Inp value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Produto 1"/></Field>
          <Field label="Cor"><input type="color" value={form.color} onChange={e=>setForm(f=>({...f,color:e.target.value}))} style={{height:42,width:"100%",borderRadius:8,border:"1px solid "+C.border,background:C.surface,padding:4,cursor:"pointer"}}/></Field>
        </div>
        <Field label="Prêmio do mês"><Inp value={form.prize} onChange={e=>setForm(f=>({...f,prize:e.target.value}))} placeholder="Ex: iPhone 15 Pro para o 1° lugar!"/></Field>
      </FormBox>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {db.pracas.map(p=>(
          <Card key={p.id} topColor={p.color} style={{paddingTop:22}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><p style={{fontSize:16,fontWeight:600,color:C.text,margin:"0 0 8px"}}>{p.name}</p><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><Badge color={p.color}>{countC(p.id)} corretores</Badge>{p.prize&&<Badge color={C.gold}>🏆 prêmio</Badge>}</div>{p.prize&&<p style={{fontSize:12,color:C.muted,margin:"8px 0 0"}}>{p.prize}</p>}</div>
              <div style={{display:"flex",gap:4}}><Btn variant="ghost" onClick={()=>startEdit(p)} style={{fontSize:12,padding:"5px 10px"}}>✎</Btn><Btn variant="danger" onClick={()=>remove(p.id)} style={{fontSize:12,padding:"5px 10px"}}>✕</Btn></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AdminUsuarios({db,reload}){
  const [form,setForm]=useState({name:"",email:"",password:"123456",role:"corretor",pracaId:""});
  const [editId,setEditId]=useState(null);const [adding,setAdding]=useState(false);const [loading,setLoading]=useState(false);
  const rL={admin:"Admin Master",gerente:"Gerente",corretor:"Corretor"};
  const rC={admin:C.gold,gerente:C.accent,corretor:C.sub};
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
  async function remove(id){await sb.from("app_users").delete().eq("id",id);await reload();}
  return(
    <div>
      <PageHeader title="Usuários" sub="Gerencie acessos e atribuições de praça" action={!editId&&!adding&&<Btn variant="primary" onClick={()=>setAdding(true)}>+ Novo usuário</Btn>}/>
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
        const group=db.users.filter(u=>u.role===role&&u.status==="active");
        if(!group.length)return null;
        return(<div key={role} style={{marginBottom:24}}><SecLabel>{rL[role]}s — {group.length}</SecLabel>
          {group.map(u=>{const p=u.praca_id?db.pracas.find(x=>x.id===u.praca_id):null;return(
            <div key={u.id} style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"12px 16px",marginBottom:6,display:"flex",alignItems:"center",gap:12}}>
              <Avatar name={u.name} size={34} color={rC[u.role]}/><div style={{flex:1}}><p style={{fontSize:14,fontWeight:500,color:C.text,margin:"0 0 3px"}}>{u.name}</p><p style={{fontSize:12,color:C.muted,margin:0}}>{u.email}{p?" · "+p.name:""}</p></div>
              <Badge color={rC[u.role]}>{rL[u.role]}</Badge>
              <Btn variant="ghost" onClick={()=>startEdit(u)} style={{fontSize:12,padding:"5px 10px"}}>✎</Btn>
              {u.id!==1&&<Btn variant="danger" onClick={()=>remove(u.id)} style={{fontSize:12,padding:"5px 10px"}}>✕</Btn>}
            </div>
          );})}
        </div>);
      })}
    </div>
  );
}

// ── Aprovações (compartilhado admin + gerente) ────────────────────────────────
function Aprovacoes({db,reload,viewerRole,pracaId}){
  const [loading,setLoading]=useState(null);
  const pending=db.users.filter(u=>{
    if(u.status!=="pending")return false;
    if(viewerRole==="admin")return u.role==="gerente";
    return u.role==="corretor"&&u.praca_id===pracaId;
  });
  async function approve(u){
    setLoading(u.id);
    await sb.from("app_users").update({status:"active"}).eq("id",u.id);
    await reload();setLoading(null);
  }
  async function reject(u){
    setLoading(u.id);
    await sb.from("app_users").delete().eq("id",u.id);
    await reload();setLoading(null);
  }
  const roleLabel=viewerRole==="admin"?"Gerentes pendentes":"Corretores pendentes";
  return(
    <div>
      <PageHeader title="Aprovações" sub={roleLabel+" aguardando liberação"}/>
      {pending.length===0?(
        <div style={{textAlign:"center",padding:"60px 0"}}><p style={{fontSize:32,margin:"0 0 12px"}}>✅</p><p style={{fontSize:14,color:C.muted}}>Nenhum cadastro pendente.</p></div>
      ):pending.map(u=>{
        const p=u.praca_id?db.pracas.find(x=>x.id===u.praca_id):null;
        return(
          <div key={u.id} style={{background:C.card,border:"1px solid "+C.warn+"35",borderRadius:12,padding:"14px 18px",marginBottom:10,display:"flex",alignItems:"center",gap:14}}>
            <Avatar name={u.name} size={40} color={C.warn}/>
            <div style={{flex:1}}><p style={{fontSize:14,fontWeight:500,color:C.text,margin:"0 0 3px"}}>{u.name}</p><p style={{fontSize:12,color:C.muted,margin:0}}>{u.email} · {p?p.name:"—"}</p></div>
            <Badge color={C.warn}>{{gerente:"Gerente",corretor:"Corretor"}[u.role]}</Badge>
            <Btn variant="success" onClick={()=>approve(u)} disabled={loading===u.id}>Aprovar</Btn>
            <Btn variant="danger" onClick={()=>reject(u)} disabled={loading===u.id}>Rejeitar</Btn>
          </div>
        );
      })}
    </div>
  );
}

function AdminAtividades({db,reload}){
  const [pid,setPid]=useState(db.pracas[0]?db.pracas[0].id:null);
  const [form,setForm]=useState({name:"",points:10});
  const [editId,setEditId]=useState(null);const [adding,setAdding]=useState(false);const [loading,setLoading]=useState(false);
  const praca=db.pracas.find(p=>p.id===pid);const acts=db.activities.filter(a=>a.praca_id===pid);
  function cancel(){setEditId(null);setAdding(false);setForm({name:"",points:10});}
  function startEdit(a){setForm({name:a.name,points:a.points});setEditId(a.id);setAdding(false);}
  async function save(){
    if(!form.name.trim()||!pid)return;setLoading(true);const pts=parseInt(form.points)||1;
    if(editId){await sb.from("activities").update({name:form.name,points:pts}).eq("id",editId);}
    else{await sb.from("activities").insert({praca_id:pid,name:form.name,points:pts});}
    await reload();setLoading(false);cancel();
  }
  async function remove(id){await sb.from("activities").delete().eq("id",id);await reload();}
  return(
    <div>
      <PageHeader title="Atividades" sub="Configure métricas e pontuações por praça" action={!editId&&!adding&&<Btn variant="primary" onClick={()=>setAdding(true)}>+ Nova atividade</Btn>}/>
      <PracaTab pracas={db.pracas} pid={pid} onSelect={p=>{setPid(p);cancel();}}/>
      {(editId||adding)&&<FormBox title={editId?"Editar":"Nova atividade"} onSave={save} onCancel={cancel} loading={loading}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
          <Field label="Nome"><Inp value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Agendamento"/></Field>
          <Field label="Pontos"><input type="number" min="1" value={form.points} onChange={e=>setForm(f=>({...f,points:e.target.value}))} style={{fontFamily:"inherit",fontSize:14,background:C.surface,border:"1px solid "+C.border,color:C.text,borderRadius:8,padding:"10px 14px",outline:"none",width:"100%"}}/></Field>
        </div>
      </FormBox>}
      {acts.length===0?<p style={{textAlign:"center",padding:"60px 0",color:C.muted,fontSize:14}}>Nenhuma atividade cadastrada{praca?" para "+praca.name:""}.</p>:(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10}}>
          {acts.map(a=>(
            <Card key={a.id} style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:44,height:44,borderRadius:10,background:(praca?praca.color:C.accent)+"15",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:17,fontWeight:800,color:praca?praca.color:C.accent}}>{a.points}</span></div>
              <div style={{flex:1}}><p style={{fontSize:14,fontWeight:500,color:C.text,margin:"0 0 3px"}}>{a.name}</p><p style={{fontSize:12,color:C.muted,margin:0}}>{a.points} pts / ocorrência</p></div>
              <Btn variant="ghost" onClick={()=>startEdit(a)} style={{fontSize:12,padding:"5px 10px"}}>✎</Btn>
              <Btn variant="danger" onClick={()=>remove(a.id)} style={{fontSize:12,padding:"5px 10px"}}>✕</Btn>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminRankings({db}){
  const cycle=getCycle();const [pid,setPid]=useState(db.pracas[0]?db.pracas[0].id:null);
  const praca=db.pracas.find(p=>p.id===pid);const ranking=useMemo(()=>pid?calcRanking(pid,cycle,db):[],[pid,cycle,db]);
  return(
    <div>
      <PageHeader title={"Rankings · "+cycleLabel(cycle)} sub="Visualize o ranking atual de qualquer praça"/>
      <PracaTab pracas={db.pracas} pid={pid} onSelect={setPid}/>
      {praca&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}><Stat label="Corretores" value={ranking.length} color={praca.color}/><Stat label="Líder" value={ranking[0]?ranking[0].corretor.name.split(" ")[0]:"—"} sub={ranking[0]?ranking[0].pts+" pts":"sem dados"} color={C.gold}/><Stat label="Total de pontos" value={ranking.reduce((s,r)=>s+r.pts,0)} color={C.sub}/></div>}
      {pid&&<RankingBoard pracaId={pid} cycle={cycle} db={db}/>}
    </div>
  );
}

function Historico({db}){
  return(
    <div>
      <PageHeader title="Histórico" sub="Ciclos encerrados e rankings anteriores"/>
      {db.history.length===0?<p style={{textAlign:"center",padding:"60px 0",color:C.muted,fontSize:14}}>Nenhum ciclo encerrado ainda.</p>
      :db.history.map((h,i)=>{
        const praca=db.pracas.find(p=>p.id===h.praca_id);
        return(<Card key={i} style={{marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>{praca&&<div style={{width:10,height:10,borderRadius:"50%",background:praca.color,flexShrink:0}}/>}<span style={{fontWeight:600,color:C.text,fontSize:15}}>{praca?praca.name:"—"}</span><Badge color={praca?praca.color:C.accent}>{cycleLabel(h.cycle)}</Badge></div>
          {(h.ranking||[]).slice(0,3).map((r,ri)=>(
            <div key={ri} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:ri<Math.min((h.ranking||[]).length,3)-1?"1px solid "+C.border:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:13,fontWeight:700,color:MEDAL[ri]||C.muted}}>{ri+1}°</span><Avatar name={r.corretor?r.corretor.name:"?"} size={28}/><span style={{fontSize:14,color:C.text}}>{r.corretor?r.corretor.name:"?"}</span></div>
              <span style={{fontSize:15,fontWeight:700,color:C.text}}>{r.pts} pts</span>
            </div>
          ))}
        </Card>);
      })}
    </div>
  );
}

// ── Materiais (admin + gerente + corretor) ────────────────────────────────────
function Materiais({db,reload,pracaId,canEdit,isAdmin}){
  const [folder,setFolder]=useState(null);
  const [imgModal,setImgModal]=useState(null);
  const [newFolder,setNewFolder]=useState(""); const [addingFolder,setAddingFolder]=useState(false);
  const [editFolder,setEditFolder]=useState(null); const [editName,setEditName]=useState("");
  const [uploading,setUploading]=useState(false); const [loadingF,setLoadingF]=useState(false);

  const pracas=pracaId?[db.pracas.find(p=>p.id===pracaId)].filter(Boolean):db.pracas;
  const [activePid,setActivePid]=useState(pracaId||pracas[0]?.id||null);
  const folders=db.folders.filter(f=>f.praca_id===activePid);
  const folderFiles=folder?db.files.filter(f=>f.folder_id===folder.id):[];

  async function createFolder(){
    if(!newFolder.trim()||!activePid)return;setLoadingF(true);
    await sb.from("materials_folders").insert({praca_id:activePid,name:newFolder.trim()});
    await reload();setLoadingF(false);setNewFolder("");setAddingFolder(false);
  }
  async function saveEditFolder(){
    if(!editName.trim())return;
    await sb.from("materials_folders").update({name:editName.trim()}).eq("id",editFolder.id);
    await reload();setEditFolder(null);setEditName("");
  }
  async function deleteFolder(f){
    await sb.from("materials_folders").delete().eq("id",f.id);
    await reload();if(folder?.id===f.id)setFolder(null);
  }
  async function uploadFile(e){
    const f=e.target.files[0];if(!f||!folder)return;
    setUploading(true);
    const isImg=f.type.startsWith("image/");
    const isPdf=f.type==="application/pdf";
    if(!isImg&&!isPdf){setUploading(false);return;}
    const ext=f.name.split(".").pop();
    const path="materials/folder-"+folder.id+"/"+Date.now()+"."+ext;
    const{error}=await sb.storage.from("imagens").upload(path,f,{upsert:true,contentType:f.type});
    if(!error){
      const{data}=sb.storage.from("imagens").getPublicUrl(path);
      await sb.from("materials_files").insert({folder_id:folder.id,name:f.name,url:data.publicUrl,file_type:isImg?"image":"pdf"});
      await reload();
    }
    setUploading(false);e.target.value="";
  }
  async function deleteFile(file){
    await sb.from("materials_files").delete().eq("id",file.id);
    await reload();
  }

  return(
    <div>
      {imgModal&&(
        <div onClick={()=>setImgModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out"}}>
          <img src={imgModal} style={{maxWidth:"92vw",maxHeight:"92vh",objectFit:"contain",borderRadius:8}} onClick={e=>e.stopPropagation()}/>
          <button onClick={()=>setImgModal(null)} style={{position:"fixed",top:20,right:20,background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",fontSize:24,cursor:"pointer",borderRadius:8,width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
      )}
      {!folder?(
        <>
          <PageHeader title="Materiais" sub="Campanhas, cards e documentos por praça" action={canEdit&&!addingFolder&&<Btn variant="primary" onClick={()=>setAddingFolder(true)}>+ Nova pasta</Btn>}/>
          {!isAdmin&&<div style={{marginBottom:20}}/>}
          {isAdmin&&<PracaTab pracas={pracas} pid={activePid} onSelect={p=>{setActivePid(p);setFolder(null);}}/>}
          {addingFolder&&(
            <div style={{background:C.surface,border:"1px solid "+C.borderHi,borderRadius:14,padding:20,marginBottom:20}}>
              <Field label="Nome da pasta">
                <div style={{display:"flex",gap:10}}><Inp value={newFolder} onChange={e=>setNewFolder(e.target.value)} placeholder="Ex: Campanha Dia das Mães"/><Btn variant="primary" onClick={createFolder} disabled={loadingF}>{loadingF?"...":"Criar"}</Btn><Btn onClick={()=>{setAddingFolder(false);setNewFolder("");}}>Cancelar</Btn></div>
              </Field>
            </div>
          )}
          {folders.length===0?(
            <div style={{textAlign:"center",padding:"60px 0"}}><p style={{fontSize:32,margin:"0 0 12px"}}>📁</p><p style={{fontSize:14,color:C.muted}}>Nenhuma pasta criada ainda.</p></div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
              {folders.map(f=>{
                const count=db.files.filter(fi=>fi.folder_id===f.id).length;
                const thumb=db.files.find(fi=>fi.folder_id===f.id&&fi.file_type==="image");
                return(
                  <div key={f.id} onClick={()=>setFolder(f)} style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,overflow:"hidden",cursor:"pointer",transition:"border-color 0.15s"}}>
                    <div style={{height:100,background:thumb?"none":C.surface,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
                      {thumb?<img src={thumb.url} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:36}}>📁</span>}
                    </div>
                    <div style={{padding:"12px 14px"}}>
                      {editFolder?.id===f.id?(
                        <div onClick={e=>e.stopPropagation()} style={{display:"flex",gap:6}}>
                          <Inp value={editName} onChange={e=>setEditName(e.target.value)} style={{fontSize:13}}/><Btn variant="primary" onClick={saveEditFolder} style={{fontSize:12,padding:"5px 8px"}}>✓</Btn>
                        </div>
                      ):(
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                          <div><p style={{fontSize:13,fontWeight:600,color:C.text,margin:"0 0 3px"}}>{f.name}</p><p style={{fontSize:11,color:C.muted,margin:0}}>{count} arquivo{count!==1?"s":""}</p></div>
                          {canEdit&&<div onClick={e=>e.stopPropagation()} style={{display:"flex",gap:2}}><Btn variant="ghost" onClick={()=>{setEditFolder(f);setEditName(f.name);}} style={{fontSize:11,padding:"3px 7px"}}>✎</Btn><Btn variant="danger" onClick={()=>deleteFolder(f)} style={{fontSize:11,padding:"3px 7px"}}>✕</Btn></div>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ):(
        <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <Btn variant="ghost" onClick={()=>setFolder(null)} style={{padding:"8px 14px",fontSize:13}}>← Voltar</Btn>
              <h1 style={{fontSize:22,fontWeight:700,color:C.text,margin:0}}>{folder.name}</h1>
            </div>
            {canEdit&&(
              <label style={{display:"inline-flex",alignItems:"center",gap:8,fontFamily:"inherit",fontSize:14,cursor:uploading?"not-allowed":"pointer",borderRadius:8,padding:"9px 18px",fontWeight:500,border:"1px solid "+C.accent,background:C.accent,color:"#fff",opacity:uploading?.6:1}}>
                {uploading?"Enviando...":"+ Adicionar arquivo"}
                <input type="file" accept="image/*,.pdf" onChange={uploadFile} disabled={uploading} style={{display:"none"}}/>
              </label>
            )}
          </div>
          {folderFiles.length===0?(
            <div style={{textAlign:"center",padding:"60px 0"}}><p style={{fontSize:32,margin:"0 0 12px"}}>📂</p><p style={{fontSize:14,color:C.muted}}>Pasta vazia.{canEdit?" Adicione imagens ou PDFs acima.":""}</p></div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12}}>
              {folderFiles.map(file=>(
                <div key={file.id} style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,overflow:"hidden"}}>
                  {file.file_type==="image"?(
                    <div onClick={()=>setImgModal(file.url)} style={{cursor:"zoom-in",position:"relative"}}>
                      <img src={file.url} style={{width:"100%",height:130,objectFit:"cover",display:"block"}}/>
                    </div>
                  ):(
                    <a href={file.url} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",height:130,background:C.surface,cursor:"pointer",textDecoration:"none"}}>
                      <div style={{textAlign:"center"}}><p style={{fontSize:36,margin:"0 0 6px"}}>📄</p><p style={{fontSize:11,color:C.accent,fontWeight:500}}>Abrir PDF</p></div>
                    </a>
                  )}
                  <div style={{padding:"8px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <p style={{fontSize:11,color:C.muted,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{file.name}</p>
                    {canEdit&&<Btn variant="danger" onClick={()=>deleteFile(file)} style={{fontSize:11,padding:"3px 7px",marginLeft:6}}>✕</Btn>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Gerente Panel ─────────────────────────────────────────────────────────────
function GerentePanel({db,reload,user,praca,tab,setTab,onLogout}){
  const pendingCorretores=praca?db.users.filter(u=>u.status==="pending"&&u.role==="corretor"&&u.praca_id===praca.id).length:0;
  const tabs=[
    {id:"ranking",label:"Ranking",icon:"▲"},
    {id:"lancar",label:"Lançar pontos",icon:"◆"},
    {id:"materiais",label:"Materiais",icon:"📁"},
    {id:"aprovacoes",label:"Aprovações",icon:"✓",badge:pendingCorretores||null},
    {id:"fechar",label:"Fechar mês",icon:"◷"},
    {id:"banner",label:"Banner",icon:"◉"},
    {id:"historico",label:"Histórico",icon:"≡"},
  ];
  if(!praca)return <Shell user={user} tab={tab} setTab={setTab} tabs={tabs} onLogout={onLogout}><p style={{color:C.muted}}>Sem praça vinculada.</p></Shell>;
  return(
    <Shell user={user} tab={tab} setTab={setTab} tabs={tabs} onLogout={onLogout} pracaColor={praca.color}>
      {tab==="ranking"&&<div><PageHeader title={praca.name} sub={"Ranking · "+cycleLabel(getCycle())}/><RankingBoard pracaId={praca.id} cycle={getCycle()} db={db}/></div>}
      {tab==="lancar"&&<LancarPontos db={db} reload={reload} praca={praca}/>}
      {tab==="materiais"&&<Materiais db={db} reload={reload} pracaId={praca.id} canEdit={true} isAdmin={false}/>}
      {tab==="aprovacoes"&&<Aprovacoes db={db} reload={reload} viewerRole="gerente" pracaId={praca.id}/>}
      {tab==="fechar"&&<FecharMes db={db} reload={reload} praca={praca}/>}
      {tab==="banner"&&<BannerEditor reload={reload} praca={praca}/>}
      {tab==="historico"&&<Historico db={db}/>}
    </Shell>
  );
}

function LancarPontos({db,reload,praca}){
  const cycle=getCycle();
  const corretores=db.users.filter(u=>u.role==="corretor"&&u.praca_id===praca.id&&u.status==="active");
  const acts=db.activities.filter(a=>a.praca_id===praca.id);
  const [cid,setCid]=useState(corretores[0]?corretores[0].id:"");
  const [week,setWeek]=useState(1);const [qtys,setQtys]=useState({});const [saved,setSaved]=useState(false);const [loading,setLoading]=useState(false);
  const existing=db.launches.filter(l=>l.praca_id===praca.id&&l.cycle===cycle&&l.user_id===cid&&l.week===week);
  const totalNew=acts.reduce((s,a)=>s+(parseInt(qtys[a.id])||0)*a.points,0);
  async function launch(){
    const entries=acts.flatMap(a=>{const q=parseInt(qtys[a.id])||0;return q>0?[{praca_id:praca.id,user_id:cid,activity_id:a.id,quantity:q,week,cycle}]:[];});
    if(!entries.length||!cid)return;setLoading(true);
    await sb.from("launches").insert(entries);
    await reload();setLoading(false);setQtys({});setSaved(true);setTimeout(()=>setSaved(false),2500);
  }
  return(
    <div>
      <PageHeader title="Lançar pontos" sub={praca.name+" · "+cycleLabel(cycle)}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
        <Field label="Corretor"><Sel value={cid} onChange={e=>setCid(parseInt(e.target.value))}>{corretores.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Sel></Field>
        <Field label="Semana"><Sel value={week} onChange={e=>setWeek(parseInt(e.target.value))}>{[1,2,3,4,5].map(w=><option key={w} value={w}>Semana {w}</option>)}</Sel></Field>
      </div>
      {existing.length>0&&<AlertBox>Já lançado na semana {week}: {existing.map(e=>{const a=acts.find(x=>x.id===e.activity_id);return a?e.quantity+"× "+a.name:"";}).join(", ")}. Será somado.</AlertBox>}
      <Card>
        <SecLabel>Quantidade por atividade</SecLabel>
        {acts.length===0?<p style={{color:C.muted,fontSize:14}}>Nenhuma atividade cadastrada.</p>:acts.map(a=>(
          <div key={a.id} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:"1px solid "+C.border}}>
            <div style={{width:42,height:42,borderRadius:10,background:praca.color+"15",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:16,fontWeight:800,color:praca.color}}>{a.points}</span></div>
            <div style={{flex:1}}><p style={{fontSize:14,fontWeight:500,color:C.text,margin:"0 0 3px"}}>{a.name}</p><p style={{fontSize:12,color:C.muted,margin:0}}>{a.points} pts por ocorrência</p></div>
            <input type="number" min="0" step="1" value={qtys[a.id]||""} onChange={e=>setQtys(q=>({...q,[a.id]:Math.max(0,parseInt(e.target.value)||0)}))} placeholder="0" style={{fontFamily:"inherit",fontSize:14,background:C.surface,border:"1px solid "+C.border,color:C.text,borderRadius:8,padding:"10px 14px",outline:"none",width:80,textAlign:"center"}}/>
            {(parseInt(qtys[a.id])||0)>0&&<span style={{fontSize:13,fontWeight:600,color:C.success,minWidth:64}}>+{(parseInt(qtys[a.id])||0)*a.points}pts</span>}
          </div>
        ))}
        {totalNew>0&&<div style={{display:"flex",justifyContent:"flex-end",paddingTop:14}}><span style={{fontSize:15,fontWeight:600,color:C.success}}>Total: +{totalNew} pontos</span></div>}
      </Card>
      <div style={{display:"flex",alignItems:"center",gap:14,marginTop:20}}>
        <Btn variant="primary" onClick={launch} disabled={loading} style={{padding:"11px 28px",fontSize:15}}>{loading?"Salvando...":"Confirmar lançamento"}</Btn>
        {saved&&<span style={{fontSize:13,color:C.success,fontWeight:500}}>✓ Pontos lançados!</span>}
      </div>
    </div>
  );
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
  if(done)return <div><PageHeader title="Fechar mês"/><Card style={{borderColor:C.success+"45"}}><p style={{fontSize:18,fontWeight:700,color:C.success,margin:"0 0 6px"}}>Ciclo encerrado!</p><p style={{fontSize:14,color:C.sub,margin:0}}>{cycleLabel(cycle)} salvo no histórico.</p></Card></div>;
  return(
    <div>
      <PageHeader title={"Fechar mês · "+cycleLabel(cycle)} sub={praca.name}/>
      <Card style={{marginBottom:20}}><SecLabel>Prêmio do mês</SecLabel><div style={{display:"flex",gap:10}}><Inp value={prize} onChange={e=>setPrize(e.target.value)} placeholder="Ex: iPhone 15 Pro para o 1° lugar!" style={{flex:1}}/><Btn onClick={savePrize}>Salvar</Btn></div></Card>
      <Card style={{marginBottom:20}}><SecLabel>Ranking final</SecLabel>
        {ranking.map((r,i)=>(
          <div key={r.corretor.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<ranking.length-1?"1px solid "+C.border:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:14,fontWeight:700,color:MEDAL[i]||C.muted,minWidth:24}}>{i+1}°</span><Avatar name={r.corretor.name} size={30}/><span style={{fontSize:14,color:C.text}}>{r.corretor.name}</span></div>
            <span style={{fontSize:16,fontWeight:700,color:C.text}}>{r.pts} pts</span>
          </div>
        ))}
      </Card>
      <AlertBox>Ao fechar o ciclo, o ranking será salvo permanentemente.</AlertBox>
      <Btn variant="primary" onClick={closeMonth} disabled={loading} style={{padding:"11px 28px",fontSize:15}}>{loading?"Fechando...":"Fechar ciclo de "+cycleLabel(cycle)}</Btn>
    </div>
  );
}

function BannerEditor({reload,praca}){
  const [preview,setPreview]=useState(praca.banner||null);const [file,setFile]=useState(null);
  const [saved,setSaved]=useState(false);const [loading,setLoading]=useState(false);const [err,setErr]=useState("");
  function onFile(e){const f=e.target.files[0];if(!f)return;setFile(f);const r=new FileReader();r.onload=ev=>setPreview(ev.target.result);r.readAsDataURL(f);setSaved(false);}
  async function saveBanner(){
    if(!file)return;setLoading(true);setErr("");
    const ext=file.name.split(".").pop();const path="banners/praca-"+praca.id+"-"+Date.now()+"."+ext;
    const{error}=await sb.storage.from("imagens").upload(path,file,{upsert:true,contentType:file.type});
    if(error){setErr("Erro: "+error.message);setLoading(false);return;}
    const{data}=sb.storage.from("imagens").getPublicUrl(path);
    await sb.from("pracas").update({banner:data.publicUrl}).eq("id",praca.id);
    await reload();setLoading(false);setFile(null);setSaved(true);setTimeout(()=>setSaved(false),2500);
  }
  async function removeBanner(){setPreview(null);setFile(null);await sb.from("pracas").update({banner:null}).eq("id",praca.id);await reload();}
  return(
    <div>
      <PageHeader title="Banner do ranking" sub={praca.name+" · aparece no topo do ranking"}/>
      <Card style={{marginBottom:20}}>
        {preview?(
          <div>
            <div style={{borderRadius:10,overflow:"hidden",marginBottom:16,border:"1px solid "+C.border}}><img src={preview} alt="Banner" style={{width:"100%",maxHeight:220,objectFit:"cover",display:"block"}}/></div>
            {err&&<p style={{fontSize:13,color:C.danger,margin:"0 0 10px"}}>{err}</p>}
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <label style={{display:"inline-flex",alignItems:"center",fontFamily:"inherit",fontSize:14,cursor:"pointer",borderRadius:8,padding:"9px 18px",fontWeight:500,border:"1px solid "+C.border,background:C.card,color:C.sub}}>Trocar imagem<input type="file" accept="image/*" onChange={onFile} style={{display:"none"}}/></label>
              {file&&<Btn variant="primary" onClick={saveBanner} disabled={loading}>{loading?"Enviando...":"Salvar banner"}</Btn>}
              <Btn variant="danger" onClick={removeBanner}>Remover</Btn>
              {saved&&<span style={{fontSize:13,color:C.success,fontWeight:500}}>✓ Salvo!</span>}
            </div>
          </div>
        ):(
          <div style={{textAlign:"center",padding:"48px 0"}}>
            <div style={{width:56,height:56,borderRadius:14,background:praca.color+"18",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:24}}>🖼</div>
            <p style={{fontSize:15,fontWeight:500,color:C.text,margin:"0 0 6px"}}>Nenhum banner cadastrado</p>
            <p style={{fontSize:13,color:C.muted,margin:"0 0 20px"}}>Recomendado: 1200×300px, JPG ou PNG</p>
            {err&&<p style={{fontSize:13,color:C.danger,margin:"0 0 12px"}}>{err}</p>}
            <label style={{display:"inline-flex",alignItems:"center",fontFamily:"inherit",fontSize:14,cursor:"pointer",borderRadius:8,padding:"10px 24px",fontWeight:500,border:"1px solid "+C.accent,background:C.accent,color:"#fff"}}>
              Escolher imagem<input type="file" accept="image/*" onChange={onFile} style={{display:"none"}}/>
            </label>
            {file&&<div style={{marginTop:12}}><Btn variant="primary" onClick={saveBanner} disabled={loading}>{loading?"Enviando...":"Salvar banner"}</Btn></div>}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Corretor Panel ────────────────────────────────────────────────────────────
function CorretorPanel({db,user,praca,onLogout}){
  const cycle=getCycle();const [tab,setTab]=useState("ranking");
  const tabs=[{id:"ranking",label:"Ranking",icon:"▲"},{id:"materiais",label:"Materiais",icon:"📁"}];
  const ranking=useMemo(()=>praca?calcRanking(praca.id,cycle,db):[],[praca,cycle,db]);
  const myIdx=ranking.findIndex(r=>r.corretor.id===user.id);
  const myData=myIdx>=0?ranking[myIdx]:null;
  if(!praca)return <Shell user={user} tab={tab} setTab={setTab} tabs={tabs} onLogout={onLogout}><p style={{color:C.muted}}>Sem praça vinculada.</p></Shell>;
  return(
    <Shell user={user} tab={tab} setTab={setTab} tabs={tabs} onLogout={onLogout} pracaColor={praca.color}>
      {tab==="ranking"&&<div>
        <PageHeader title={praca.name} sub={"Ranking · "+cycleLabel(cycle)}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
          <Stat label="Sua posição" value={myIdx>=0?(myIdx+1)+"°":"—"} color={praca.color}/>
          <Stat label="Seus pontos" value={myData?myData.pts:0} color={C.gold}/>
          <Stat label="Corretores" value={ranking.length} color={C.sub}/>
        </div>
        <RankingBoard pracaId={praca.id} cycle={cycle} db={db}/>
      </div>}
      {tab==="materiais"&&<Materiais db={db} reload={()=>{}} pracaId={praca.id} canEdit={false} isAdmin={false}/>}
    </Shell>
  );
}
