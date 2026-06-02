import { useState, useEffect } from "react";

// ─── Constantes ───────────────────────────────────────────────────────────────
const STORAGE_KEY = "pq_v4";
const TURNO_C = { "Mañana":"#f59e0b","Tarde":"#0ea5e9","Noche":"#6366f1" };
const PRIO_C  = { "Alta":["#ef4444","#fef2f2"],"Media":["#f59e0b","#fffbeb"],"Baja":["#22c55e","#f0fdf4"] };
const TIPO_IND = ["Medicamento","Curación","Control","Examen","Ayuno","Movilización","Alta","Otro"];
const REGIMENES = ["Régimen Cero","Líquidos claros","Líquidos completos","Blando","Común","Papilla","SNG","NPT (Parenteral)","NE (Enteral)"];
const REGIMEN_VELOCIDAD = ["NPT (Parenteral)","NE (Enteral)"];
const TIPO_VOMITO = ["Alimenticio","Bilioso","Fecaloideo","Claro"];
const LABS_DEFAULT = [
  "Hemoglobina","Hematocrito","Leucocitos","Plaquetas",
  "Creatinina","BUN","Sodio","Potasio","Cloro",
  "PCR","Procalcitonina","Bilirrubina total","Bilirrubina directa",
  "GOT","GPT","GGT","Amilasa","Lipasa","Albúmina","Proteínas totales",
  "INR","TTPK","Glucosa","Lactato","pH","pCO2","pO2","HCO3"
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().split("T")[0]; }
function fmt(s)  { if(!s) return "—"; const [y,m,d]=s.split("-"); return `${d}/${m}/${y}`; }
function daysFrom(s) {
  if(!s) return null;
  const a=new Date(); a.setHours(0,0,0,0);
  const b=new Date(s+"T00:00:00"); b.setHours(0,0,0,0);
  return Math.round((a-b)/86400000);
}
function emptyPatient() {
  return {
    id:Date.now(), nombre:"", cama:"", prioridad:"Media", turno:"Mañana",
    fechaIngreso:today(), motivoConsulta:"", examenFisico:"",
    tieneCirugia:false, cirugia:"", fechaCirugia:today(), protocolo:"", hallazgos:"",
    tieneAtb:false, atbNombre:"", fechaInicioAtb:today(),
    diagnostico:"", notas:"",
    indicaciones:[], evoluciones:[], laboratorios:[], archivado:false,
  };
}
function emptyInd()  { return { id:Date.now(), tipo:"Medicamento", descripcion:"", fecha:today(), hora:"", completado:false }; }
function emptyEv()   {
  return {
    id:Date.now(), fecha:today(),
    regimen:"", regimenVelocidad:"",
    nauseas:false, vomitos:false, vomitosCantidad:"", vomitosTipo:[],
    dolor:"", dolorTendencia:"igual",
    diuresis:false, gases:false, deposiciones:false, deambulo:false,
    texto:"",
  };
}
function emptyLab()  { return { id:Date.now(), fecha:today(), valores:{} }; }

// ─── CSS Global ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a0f; }
  input, select, textarea, button { font-family: 'Plus Jakarta Sans', sans-serif; }
  button { transition: all 0.15s ease; cursor: pointer; }
  button:hover { opacity: 0.85; transform: translateY(-1px); }
  button:active { transform: translateY(0); }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #111118; }
  ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 4px; }
  input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
  textarea { resize: vertical; }
  select option { background: #1c1c28; color: #e2e2f0; }
  @keyframes fadeIn { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform:translateY(0); } }
  .fade-in { animation: fadeIn 0.18s ease forwards; }
`;

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  bg:        "#1C1B19",
  surface:   "#242320",
  surface2:  "#2C2B28",
  surface3:  "#353431",
  border:    "#403E3A",
  border2:   "#4D4A45",
  text:      "#F4F1EB",
  textMid:   "#C0BBB2",
  textDim:   "#8E887F",
  accent:    "#D97757",
  accentDim: "#4B2A21",
  green:     "#7AA88A",
  greenDim:  "#223428",
  amber:     "#C99A43",
  amberDim:  "#3D2D13",
  red:       "#C86B6B",
  redDim:    "#3A1C1C",
  purple:    "#B49AC7",
  purpleDim: "#35263F",
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const S = {
  app:  { minHeight:"100vh", background:T.bg, fontFamily:"'Plus Jakarta Sans',sans-serif", color:T.text },
  hdr:  {
    background:T.surface,
    borderBottom:`1px solid ${T.border}`,
    padding:"0 24px",
    display:"flex", alignItems:"center", justifyContent:"space-between",
    height:56, position:"sticky", top:0, zIndex:200,
  },
  logo: { fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:16, color:T.text, display:"flex", alignItems:"center", gap:8 },
  logoAccent: { color: T.accent },
  wrap: { maxWidth:860, margin:"0 auto", padding:"24px 16px" },
  card: {
    background:T.surface,
    borderRadius:16,
    border:`1px solid ${T.border}`,
    marginBottom:10,
    overflow:"hidden",
    animation:"fadeIn 0.2s ease",
  },
  inp: {
    width:"100%",
    background:T.surface2,
    border:`1.5px solid ${T.border2}`,
    borderRadius:10,
    padding:"10px 14px",
    fontSize:14,
    color:T.text,
    outline:"none",
    transition:"border-color 0.15s",
  },
  lbl: { fontSize:11, fontWeight:600, color:T.textMid, display:"block", marginBottom:5, letterSpacing:"0.5px", textTransform:"uppercase" },
  secT: { fontSize:10, fontWeight:700, letterSpacing:"1.5px", color:T.textDim, textTransform:"uppercase", marginBottom:10, marginTop:20 },
  btn: (v) => {
    const map = {
      primary: { bg:T.accent,       color:"#fff" },
      danger:  { bg:T.red,          color:"#fff" },
      green:   { bg:T.green,        color:"#0d1a14" },
      purple:  { bg:T.purple,       color:"#1a1030" },
      ghost:   { bg:"transparent",  color:T.textMid, border:`1.5px solid ${T.border2}` },
    };
    const m = map[v]||map.primary;
    return {
      background:m.bg, color:m.color,
      border:m.border||"none",
      borderRadius:10, padding:"9px 18px", fontSize:13, fontWeight:600,
      cursor:"pointer", flexShrink:0, letterSpacing:"0.2px",
    };
  },
  badge:(c,bg) => ({ background:bg||c+"22", color:c, borderRadius:6, padding:"3px 9px", fontSize:11, fontWeight:700 }),
  tag:  (c)   => ({ display:"inline-flex", alignItems:"center", background:c+"18", color:c, borderRadius:6, padding:"3px 8px", fontSize:11, fontWeight:600, marginRight:4 }),
  pill: (c)   => ({ background:c+"22", color:c, border:`1px solid ${c}44`, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700, display:"inline-block" }),
  navB: (a) => ({
    background:a ? T.accentDim : "transparent",
    color:a ? T.accent : T.textMid,
    border:`1.5px solid ${a ? T.accent+"55" : "transparent"}`,
    borderRadius:8, padding:"6px 14px", fontSize:13, fontWeight:600,
  }),
  grid2:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 },
  full: { gridColumn:"1/-1" },
};

// ─── Componentes pequeños ─────────────────────────────────────────────────────
function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display:"flex", gap:2, borderBottom:`1px solid ${T.border}`, marginBottom:18, flexWrap:"wrap" }}>
      {tabs.map(t => (
        <button key={t.id} onClick={()=>onChange(t.id)} style={{
          background:"none", border:"none", cursor:"pointer", padding:"10px 14px", fontSize:13, fontWeight:600,
          color:active===t.id ? T.accent : T.textMid,
          borderBottom:active===t.id ? `2px solid ${T.accent}` : "2px solid transparent",
          marginBottom:-1, transition:"all 0.15s", letterSpacing:"0.2px",
        }}>{t.icon} {t.label}</button>
      ))}
    </div>
  );
}

function PopBadge({ p }) {
  if(!p.tieneCirugia||!p.fechaCirugia) return null;
  const d=daysFrom(p.fechaCirugia); if(d<0) return null;
  return <span style={S.pill(T.accent)}>✂️ POP {d}</span>;
}
function AtbBadge({ p }) {
  if(!p.tieneAtb||!p.fechaInicioAtb) return null;
  const d=daysFrom(p.fechaInicioAtb);
  const c=d>=7?T.red:d>=4?T.amber:T.green;
  return <span style={{...S.pill(c), marginLeft:4}}>💊 ATB {d}d</span>;
}

function BoolChip({ label, value, onChange }) {
  return (
    <button onClick={()=>onChange(!value)} style={{
      border:`1.5px solid ${value ? T.accent : T.border2}`,
      background:value ? T.accentDim : T.surface2,
      color:value ? T.accent : T.textMid,
      borderRadius:9, padding:"7px 13px", fontSize:13, fontWeight:600,
    }}>{value ? "✓" : "○"} {label}</button>
  );
}

function TendBtn({ value, onChange }) {
  const opts = [
    {val:"mejor",icon:"↑",color:T.green},
    {val:"igual",icon:"→",color:T.amber},
    {val:"peor", icon:"↓",color:T.red},
  ];
  return (
    <div style={{display:"flex",gap:6}}>
      {opts.map(o=>(
        <button key={o.val} onClick={()=>onChange(o.val)} style={{
          border:`1.5px solid ${value===o.val ? o.color : T.border2}`,
          background:value===o.val ? o.color+"22" : T.surface2,
          color:value===o.val ? o.color : T.textMid,
          borderRadius:8, padding:"6px 12px", fontSize:16, fontWeight:900,
        }}>{o.icon}</button>
      ))}
    </div>
  );
}

function TendIcon({ v }) {
  if(v==="mejor") return <span style={{color:T.green,fontWeight:700}}>↑ Mejor</span>;
  if(v==="peor")  return <span style={{color:T.red,fontWeight:700}}>↓ Peor</span>;
  return <span style={{color:T.amber,fontWeight:700}}>→ Igual</span>;
}

// ─── Formulario Paciente ──────────────────────────────────────────────────────
function FormPaciente({ init, onSave, onCancel }) {
  const [f, setF] = useState(init);
  const [tab, setTab] = useState("ingreso");
  const up  = (k) => (e) => setF(p=>({...p,[k]:e.target.value}));
  const upB = (k) => (e) => setF(p=>({...p,[k]:e.target.checked}));
  const isEdit = !!init._exists;

  const inpFocus = { onFocus:e=>e.target.style.borderColor=T.accent, onBlur:e=>e.target.style.borderColor=T.border2 };

  const tabs = [
    {id:"ingreso",icon:"🏥",label:"Ingreso"},
    {id:"cirugia",icon:"✂️",label:"Cirugía"},
    {id:"atb",    icon:"💊",label:"ATB"},
    {id:"config", icon:"⚙️",label:"Config"},
  ];

  return (
    <div style={S.wrap}>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:20}}>
        <button onClick={onCancel} style={S.btn("ghost")}>← Volver</button>
        <h2 style={{margin:0,fontSize:20,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{isEdit?"Editar paciente":"Nuevo paciente"}</h2>
      </div>
      <div style={S.card}>
        <div style={{padding:"16px 20px 0"}}><Tabs tabs={tabs} active={tab} onChange={setTab}/></div>
        <div style={{padding:"0 20px 24px"}}>

          {tab==="ingreso" && (
            <div style={S.grid2}>
              <div style={S.full}>
                <label style={S.lbl}>Nombre completo</label>
                <input style={S.inp} value={f.nombre} onChange={up("nombre")} placeholder="Nombre del paciente" {...inpFocus}/>
              </div>
              <div>
                <label style={S.lbl}>Cama / Habitación</label>
                <input style={S.inp} value={f.cama} onChange={up("cama")} placeholder="Ej: 12A" {...inpFocus}/>
              </div>
              <div>
                <label style={S.lbl}>Fecha ingreso</label>
                <input type="date" style={S.inp} value={f.fechaIngreso} onChange={up("fechaIngreso")} {...inpFocus}/>
              </div>
              <div style={S.full}>
                <label style={S.lbl}>Motivo de consulta</label>
                <textarea rows={3} style={S.inp} value={f.motivoConsulta} onChange={up("motivoConsulta")} placeholder="Motivo de ingreso…" {...inpFocus}/>
              </div>
              <div style={S.full}>
                <label style={S.lbl}>Examen físico al ingreso</label>
                <textarea rows={5} style={S.inp} value={f.examenFisico} onChange={up("examenFisico")} placeholder="Signos vitales, hallazgos…" {...inpFocus}/>
              </div>
              <div style={S.full}>
                <label style={S.lbl}>Diagnóstico</label>
                <input style={S.inp} value={f.diagnostico} onChange={up("diagnostico")} placeholder="Diagnóstico principal" {...inpFocus}/>
              </div>
              <div style={S.full}>
                <label style={S.lbl}>Notas adicionales</label>
                <textarea rows={3} style={S.inp} value={f.notas} onChange={up("notas")} placeholder="Otras notas…" {...inpFocus}/>
              </div>
            </div>
          )}

          {tab==="cirugia" && (
            <div>
              <label style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"14px",background:T.surface2,borderRadius:10,cursor:"pointer",border:`1px solid ${T.border}`}}>
                <input type="checkbox" id="cxck" checked={f.tieneCirugia} onChange={upB("tieneCirugia")} style={{width:18,height:18,accentColor:T.accent,cursor:"pointer"}}/>
                <span style={{fontWeight:600,fontSize:14}}>Este paciente tiene cirugía registrada</span>
              </label>
              {f.tieneCirugia && (
                <div style={S.grid2}>
                  <div style={S.full}>
                    <label style={S.lbl}>Nombre de la cirugía</label>
                    <input style={S.inp} value={f.cirugia} onChange={up("cirugia")} placeholder="Ej: Colecistectomía laparoscópica" {...inpFocus}/>
                  </div>
                  <div>
                    <label style={S.lbl}>Fecha de la cirugía</label>
                    <input type="date" style={S.inp} value={f.fechaCirugia} onChange={up("fechaCirugia")} {...inpFocus}/>
                  </div>
                  <div style={S.full}>
                    <label style={S.lbl}>Protocolo operatorio</label>
                    <textarea rows={6} style={S.inp} value={f.protocolo} onChange={up("protocolo")} placeholder="Técnica, cirujano, anestesia…" {...inpFocus}/>
                  </div>
                  <div style={S.full}>
                    <label style={S.lbl}>Hallazgos intraoperatorios</label>
                    <textarea rows={5} style={S.inp} value={f.hallazgos} onChange={up("hallazgos")} placeholder="Hallazgos, complicaciones…" {...inpFocus}/>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab==="atb" && (
            <div>
              <label style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"14px",background:T.surface2,borderRadius:10,cursor:"pointer",border:`1px solid ${T.border}`}}>
                <input type="checkbox" id="atbck" checked={f.tieneAtb} onChange={upB("tieneAtb")} style={{width:18,height:18,accentColor:T.accent,cursor:"pointer"}}/>
                <span style={{fontWeight:600,fontSize:14}}>Paciente con antibioticoterapia activa</span>
              </label>
              {f.tieneAtb && (
                <div style={S.grid2}>
                  <div style={S.full}>
                    <label style={S.lbl}>Antibiótico(s)</label>
                    <input style={S.inp} value={f.atbNombre} onChange={up("atbNombre")} placeholder="Ej: Ceftriaxona 1g IV c/24h" {...inpFocus}/>
                  </div>
                  <div>
                    <label style={S.lbl}>Fecha de inicio ATB</label>
                    <input type="date" style={S.inp} value={f.fechaInicioAtb} onChange={up("fechaInicioAtb")} {...inpFocus}/>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab==="config" && (
            <div style={S.grid2}>
              <div>
                <label style={S.lbl}>Prioridad</label>
                <select style={S.inp} value={f.prioridad} onChange={up("prioridad")}>
                  {Object.keys(PRIO_C).map(k=><option key={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label style={S.lbl}>Turno asignado</label>
                <select style={S.inp} value={f.turno} onChange={up("turno")}>
                  {Object.keys(TURNO_C).map(k=><option key={k}>{k}</option>)}
                </select>
              </div>
            </div>
          )}

          <div style={{display:"flex",gap:10,marginTop:24}}>
            <button onClick={()=>onSave(f)} style={S.btn("primary")}>{isEdit?"Guardar cambios":"Agregar paciente"}</button>
            <button onClick={onCancel} style={S.btn("ghost")}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Formulario Evolución ─────────────────────────────────────────────────────
function FormEvolucion({ init, onSave, onCancel }) {
  const [e, setE] = useState(init);
  const up  = (k) => (ev) => setE(p=>({...p,[k]:ev.target.value}));
  const upB = (k) => (v)  => setE(p=>({...p,[k]:v}));
  const toggleTipoVomito = (t) => setE(p=>{
    const arr = p.vomitosTipo||[];
    return {...p, vomitosTipo: arr.includes(t) ? arr.filter(x=>x!==t) : [...arr,t]};
  });
  const needsVelocidad = REGIMEN_VELOCIDAD.includes(e.regimen);
  const inpFocus = { onFocus:ev=>ev.target.style.borderColor=T.purple, onBlur:ev=>ev.target.style.borderColor=T.border2 };

  return (
    <div style={{...S.card, border:`1.5px solid ${T.purple}40`, marginBottom:12}}>
      <div style={{padding:"13px 18px",background:T.purpleDim+"60",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <span style={{fontWeight:700,fontSize:15,color:T.purple,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>📓 Evolución diaria</span>
        <input type="date" style={{...S.inp,width:"auto"}} value={e.fecha} onChange={up("fecha")} {...inpFocus}/>
      </div>
      <div style={{padding:18}}>
        <div style={{marginBottom:16}}>
          <label style={S.lbl}>Régimen del día</label>
          <select style={S.inp} value={e.regimen} onChange={up("regimen")} {...inpFocus}>
            <option value="">— Seleccionar —</option>
            {REGIMENES.map(r=><option key={r}>{r}</option>)}
          </select>
          {needsVelocidad && (
            <div style={{marginTop:8}}>
              <label style={S.lbl}>Velocidad de infusión</label>
              <input style={S.inp} value={e.regimenVelocidad} onChange={up("regimenVelocidad")} placeholder="Ej: 40 cc/hr" {...inpFocus}/>
            </div>
          )}
        </div>

        <div style={{marginBottom:16}}>
          <label style={S.lbl}>Síntomas digestivos</label>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:e.vomitos?10:0}}>
            <BoolChip label="Náuseas" value={e.nauseas} onChange={upB("nauseas")}/>
            <BoolChip label="Vómitos" value={e.vomitos} onChange={upB("vomitos")}/>
          </div>
          {e.vomitos && (
            <div style={{background:T.amberDim+"66",border:`1px solid ${T.amber}30`,borderRadius:10,padding:"12px 14px",marginTop:8}}>
              <div style={S.grid2}>
                <div>
                  <label style={S.lbl}>Número de vómitos</label>
                  <input style={S.inp} type="number" min="1" value={e.vomitosCantidad} onChange={up("vomitosCantidad")} placeholder="Ej: 3" {...inpFocus}/>
                </div>
                <div>
                  <label style={S.lbl}>Tipo de vómito</label>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>
                    {TIPO_VOMITO.map(t=>(
                      <button key={t} onClick={()=>toggleTipoVomito(t)} style={{
                        border:`1.5px solid ${(e.vomitosTipo||[]).includes(t) ? T.amber : T.border2}`,
                        background:(e.vomitosTipo||[]).includes(t) ? T.amberDim : T.surface2,
                        color:(e.vomitosTipo||[]).includes(t) ? T.amber : T.textMid,
                        borderRadius:7,padding:"5px 10px",fontSize:12,fontWeight:600,
                      }}>{t}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{marginBottom:16}}>
          <label style={S.lbl}>Dolor</label>
          <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:160}}>
              <label style={S.lbl}>Zona / descripción</label>
              <input style={S.inp} value={e.dolor} onChange={up("dolor")} placeholder="Ej: Herida operatoria…" {...inpFocus}/>
            </div>
            <div>
              <label style={S.lbl}>vs ayer</label>
              <TendBtn value={e.dolorTendencia} onChange={upB("dolorTendencia")}/>
            </div>
          </div>
        </div>

        <div style={{marginBottom:16}}>
          <label style={S.lbl}>Recuperación funcional</label>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <BoolChip label="💧 Diuresis"  value={e.diuresis}     onChange={upB("diuresis")}/>
            <BoolChip label="💨 Gases"     value={e.gases}        onChange={upB("gases")}/>
            <BoolChip label="🚽 Deposic."  value={e.deposiciones} onChange={upB("deposiciones")}/>
            <BoolChip label="🚶 Deambuló"  value={e.deambulo}     onChange={upB("deambulo")}/>
          </div>
        </div>

        <div style={{marginBottom:16}}>
          <label style={S.lbl}>Notas de evolución</label>
          <textarea rows={4} style={S.inp} value={e.texto} onChange={up("texto")} placeholder="Evolución clínica, indicaciones, plan…" {...inpFocus}/>
        </div>

        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>onSave(e)} style={S.btn("purple")}>Guardar evolución</button>
          <button onClick={onCancel} style={S.btn("ghost")}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Formulario Laboratorio ───────────────────────────────────────────────────
function FormLab({ init, onSave, onCancel }) {
  const [lab, setLab] = useState(init);
  const [custom, setCustom] = useState("");
  const setVal = (k,v) => setLab(p=>({...p, valores:{...p.valores,[k]:v}}));
  const addCustom = () => {
    const t = custom.trim();
    if(!t) return;
    setLab(p=>({...p, valores:{...p.valores,[t]:""}}));
    setCustom("");
  };
  const removeParam = (k) => setLab(p=>{ const v={...p.valores}; delete v[k]; return {...p,valores:v}; });
  const inpFocus = { onFocus:e=>e.target.style.borderColor=T.accent, onBlur:e=>e.target.style.borderColor=T.border2 };

  return (
    <div style={{...S.card,border:`1.5px solid ${T.accent}40`,marginBottom:12}}>
      <div style={{padding:"13px 18px",background:T.accentDim+"66",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <span style={{fontWeight:700,fontSize:15,color:T.accent,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>🧪 Nuevo laboratorio</span>
        <input type="date" style={{...S.inp,width:"auto"}} value={lab.fecha} onChange={e=>setLab(p=>({...p,fecha:e.target.value}))} {...inpFocus}/>
      </div>
      <div style={{padding:18}}>
        <p style={{fontSize:12,color:T.textMid,marginBottom:14}}>Completa solo los exámenes realizados.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:10,marginBottom:16}}>
          {LABS_DEFAULT.map(k=>(
            <div key={k}>
              <label style={S.lbl}>{k}</label>
              <input style={S.inp} value={lab.valores[k]||""} onChange={e=>setVal(k,e.target.value)} placeholder="valor" {...inpFocus}/>
            </div>
          ))}
          {Object.keys(lab.valores).filter(k=>!LABS_DEFAULT.includes(k)).map(k=>(
            <div key={k}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <label style={S.lbl}>{k}</label>
                <button onClick={()=>removeParam(k)} style={{background:"none",border:"none",cursor:"pointer",color:T.red,fontSize:14,padding:0}}>✕</button>
              </div>
              <input style={S.inp} value={lab.valores[k]||""} onChange={e=>setVal(k,e.target.value)} placeholder="valor" {...inpFocus}/>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          <input style={{...S.inp,flex:1}} value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Agregar parámetro personalizado…" {...inpFocus}/>
          <button onClick={addCustom} style={S.btn("primary")}>+ Agregar</button>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>onSave(lab)} style={S.btn("primary")}>Guardar laboratorio</button>
          <button onClick={onCancel} style={S.btn("ghost")}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Formulario Indicación ────────────────────────────────────────────────────
function FormIndicacion({ init, onSave, onCancel }) {
  const [ind, setInd] = useState(init);
  const up = (k) => (e) => setInd(p=>({...p,[k]:e.target.value}));
  const inpFocus = { onFocus:e=>e.target.style.borderColor=T.accent, onBlur:e=>e.target.style.borderColor=T.border2 };
  return (
    <div style={{...S.card,border:`1.5px solid ${T.accent}40`,marginBottom:14}}>
      <div style={{padding:16}}>
        <div style={S.grid2}>
          <div>
            <label style={S.lbl}>Tipo</label>
            <select style={S.inp} value={ind.tipo} onChange={up("tipo")} {...inpFocus}>
              {TIPO_IND.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={S.lbl}>Fecha</label>
            <input type="date" style={S.inp} value={ind.fecha} onChange={up("fecha")} {...inpFocus}/>
          </div>
          <div>
            <label style={S.lbl}>Hora (opcional)</label>
            <input type="time" style={S.inp} value={ind.hora} onChange={up("hora")} {...inpFocus}/>
          </div>
          <div style={S.full}>
            <label style={S.lbl}>Descripción</label>
            <input style={S.inp} value={ind.descripcion} onChange={up("descripcion")} placeholder="Ej: Ketorolaco 30mg IV c/8h" {...inpFocus}/>
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:14}}>
          <button onClick={()=>onSave(ind)} style={S.btn("primary")}>Guardar</button>
          <button onClick={onCancel} style={S.btn("ghost")}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Detalle Paciente ─────────────────────────────────────────────────────────
function DetallePaciente({ patient, onBack, onEdit, onArchivar, onToggleInd, onDelInd, onAddInd, onSaveEv, onSaveLab, onDelLab }) {
  const [tab, setTab]     = useState("ficha");
  const [showInd, setShowInd] = useState(false);
  const [showEv,  setShowEv]  = useState(false);
  const [showLab, setShowLab] = useState(false);
  const [editEvId,  setEditEvId]  = useState(null);
  const [editLabId, setEditLabId] = useState(null);

  const pendientes = (patient.indicaciones||[]).filter(i=>!i.completado)
    .sort((a,b)=>a.fecha.localeCompare(b.fecha)||(a.hora||"").localeCompare(b.hora||""));
  const hechos      = (patient.indicaciones||[]).filter(i=>i.completado);
  const evoluciones = [...(patient.evoluciones||[])].sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const labs        = [...(patient.laboratorios||[])].sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const diasIngreso = daysFrom(patient.fechaIngreso);
  const prioColor   = PRIO_C[patient.prioridad][0];

  function prevLabVal(labIdx, key) {
    const older = labs.slice(labIdx+1);
    for(const l of older) {
      const v = l.valores[key];
      if(v !== undefined && v !== "") return v;
    }
    return null;
  }
  function numTrend(curr, prev) {
    if(prev===null) return null;
    const c=parseFloat(curr), p=parseFloat(prev);
    if(isNaN(c)||isNaN(p)) return null;
    if(c>p) return "↑"; if(c<p) return "↓"; return "→";
  }
  function trendColor(t) {
    if(t==="↑") return T.green; if(t==="↓") return T.red; return T.amber;
  }

  const tabList = [
    {id:"ficha",       icon:"📋", label:"Ficha"},
    {id:"cirugia",     icon:"✂️", label:"Cirugía"},
    {id:"evoluciones", icon:"📓", label:`Evoluciones${evoluciones.length>0?" ("+evoluciones.length+")":""}`},
    {id:"laboratorio", icon:"🧪", label:`Laboratorio${labs.length>0?" ("+labs.length+")":""}`},
    {id:"indicaciones",icon:"📝", label:`Indicaciones${pendientes.length>0?" ("+pendientes.length+")":""}`},
  ];

  return (
    <div style={S.wrap}>
      <button onClick={onBack} style={{...S.btn("ghost"),marginBottom:16}}>← Volver</button>

      {/* Header card */}
      <div style={{...S.card,borderTop:`3px solid ${prioColor}`,marginBottom:14}}>
        <div style={{padding:"20px 22px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
            <div>
              <div style={{fontSize:24,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:6}}>{patient.nombre}</div>
              <div style={{fontSize:13,color:T.textMid,display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
                <span>🛏 Cama {patient.cama}</span>
                <span style={{color:T.border2}}>·</span>
                <span>📅 Ingreso {fmt(patient.fechaIngreso)}</span>
                <span style={S.pill(T.textMid)}>Día {diasIngreso} internación</span>
                <PopBadge p={patient}/>
                <AtbBadge p={patient}/>
              </div>
              {patient.diagnostico && <div style={{fontSize:13,color:T.textMid,marginTop:10,padding:"6px 12px",background:T.surface2,borderRadius:8,display:"inline-block"}}>{patient.diagnostico}</div>}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button onClick={onEdit}     style={S.btn("ghost")}>Editar</button>
              <button onClick={onArchivar} style={S.btn("danger")}>Dar alta</button>
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
            <span style={S.badge(prioColor,prioColor+"20")}>{patient.prioridad}</span>
            <span style={S.badge(TURNO_C[patient.turno],TURNO_C[patient.turno]+"20")}>{patient.turno}</span>
          </div>
        </div>
      </div>

      <div style={{...S.card,padding:"14px 20px 0"}}>
        <Tabs tabs={tabList} active={tab} onChange={setTab}/>
        <div style={{paddingBottom:20}}>

          {tab==="ficha" && (
            <div className="fade-in">
              {patient.motivoConsulta && <>
                <div style={S.secT}>Motivo de consulta</div>
                <div style={{background:T.surface2,borderRadius:10,padding:"12px 16px",fontSize:14,lineHeight:1.7,whiteSpace:"pre-wrap",border:`1px solid ${T.border}`,color:T.text}}>{patient.motivoConsulta}</div>
              </>}
              {patient.examenFisico && <>
                <div style={S.secT}>Examen físico al ingreso</div>
                <div style={{background:T.surface2,borderRadius:10,padding:"12px 16px",fontSize:14,lineHeight:1.7,whiteSpace:"pre-wrap",border:`1px solid ${T.border}`,color:T.text}}>{patient.examenFisico}</div>
              </>}
              {patient.tieneAtb && <>
                <div style={S.secT}>Antibioticoterapia</div>
                <div style={{background:T.greenDim,border:`1px solid ${T.green}30`,borderRadius:10,padding:"14px 16px"}}>
                  <div style={{fontWeight:700,fontSize:14,color:T.green}}>💊 {patient.atbNombre||"—"}</div>
                  <div style={{fontSize:13,color:T.textMid,marginTop:4}}>Inicio: {fmt(patient.fechaInicioAtb)} · Día <b style={{color:T.green}}>{daysFrom(patient.fechaInicioAtb)}</b> de tratamiento</div>
                </div>
              </>}
              {patient.notas && <div style={{background:T.amberDim,border:`1px solid ${T.amber}30`,borderRadius:10,padding:"10px 14px",fontSize:13,color:T.amber,marginTop:12}}>📝 {patient.notas}</div>}
              {!patient.motivoConsulta&&!patient.examenFisico&&!patient.tieneAtb&&!patient.notas && <div style={{color:T.textDim,fontSize:14}}>Sin datos clínicos registrados.</div>}
            </div>
          )}

          {tab==="cirugia" && (
            <div className="fade-in">
              {!patient.tieneCirugia && <div style={{color:T.textDim,fontSize:14}}>No hay cirugía registrada.</div>}
              {patient.tieneCirugia && <>
                <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:16}}>
                  <div style={{background:T.surface2,borderRadius:10,padding:"12px 16px",flex:1,minWidth:150,border:`1px solid ${T.border}`}}>
                    <div style={S.lbl}>Cirugía</div>
                    <div style={{fontWeight:700,fontSize:15,color:T.text}}>{patient.cirugia||"—"}</div>
                  </div>
                  <div style={{background:T.surface2,borderRadius:10,padding:"12px 16px",flex:1,minWidth:130,border:`1px solid ${T.border}`}}>
                    <div style={S.lbl}>Fecha</div>
                    <div style={{fontWeight:700,fontSize:15,marginBottom:6,color:T.text}}>{fmt(patient.fechaCirugia)}</div>
                    <span style={S.pill(T.accent)}>POP día {daysFrom(patient.fechaCirugia)}</span>
                  </div>
                </div>
                {patient.protocolo && <>
                  <div style={S.secT}>Protocolo operatorio</div>
                  <div style={{background:T.surface2,borderRadius:10,padding:14,fontSize:14,lineHeight:1.7,whiteSpace:"pre-wrap",border:`1px solid ${T.border}`,color:T.text}}>{patient.protocolo}</div>
                </>}
                {patient.hallazgos && <>
                  <div style={S.secT}>Hallazgos intraoperatorios</div>
                  <div style={{background:T.amberDim,borderRadius:10,padding:14,fontSize:14,lineHeight:1.7,whiteSpace:"pre-wrap",border:`1px solid ${T.amber}30`,color:T.text}}>{patient.hallazgos}</div>
                </>}
              </>}
            </div>
          )}

          {tab==="evoluciones" && (
            <div className="fade-in">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <span style={{fontWeight:700,fontSize:14}}>Registro de evoluciones</span>
                <button onClick={()=>{setShowEv(v=>!v);setEditEvId(null);}} style={S.btn("purple")}>{showEv?"Cancelar":"+ Nueva evolución"}</button>
              </div>
              {showEv && !editEvId && (
                <FormEvolucion init={emptyEv()} onSave={(ev)=>{onSaveEv(ev,"new");setShowEv(false);}} onCancel={()=>setShowEv(false)}/>
              )}
              {evoluciones.length===0&&!showEv && <div style={{color:T.textDim,fontSize:14}}>Sin evoluciones registradas.</div>}
              {evoluciones.map((ev)=>(
                <div key={ev.id}>
                  {editEvId===ev.id ? (
                    <FormEvolucion init={ev} onSave={(updated)=>{onSaveEv(updated,"edit");setEditEvId(null);}} onCancel={()=>setEditEvId(null)}/>
                  ) : (
                    <div style={{...S.card,border:`1px solid ${T.border}`,marginBottom:10}}>
                      <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{fontWeight:700,fontSize:14,color:T.purple}}>📓 {fmt(ev.fecha)}</div>
                        <button onClick={()=>setEditEvId(ev.id)} style={{...S.btn("ghost"),padding:"4px 10px",fontSize:12}}>Editar</button>
                      </div>
                      <div style={{padding:"12px 16px"}}>
                        {ev.regimen && (
                          <div style={{marginBottom:8}}>
                            <span style={S.tag(T.accent)}>🍽 {ev.regimen}</span>
                            {ev.regimenVelocidad && <span style={S.tag(T.purple)}>⚡ {ev.regimenVelocidad}</span>}
                          </div>
                        )}
                        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
                          <span style={S.tag(ev.nauseas?T.amber:T.textDim)}>{ev.nauseas?"✓":"○"} Náuseas</span>
                          <span style={S.tag(ev.vomitos?T.red:T.textDim)}>{ev.vomitos?"✓":"○"} Vómitos{ev.vomitos&&ev.vomitosCantidad?" x"+ev.vomitosCantidad:""}{ev.vomitos&&ev.vomitosTipo&&ev.vomitosTipo.length>0?" ("+ev.vomitosTipo.join(", ")+")":""}</span>
                          <span style={S.tag(ev.diuresis?T.accent:T.textDim)}>{ev.diuresis?"✓":"○"} 💧 Diuresis</span>
                          <span style={S.tag(ev.gases?T.green:T.textDim)}>{ev.gases?"✓":"○"} 💨 Gases</span>
                          <span style={S.tag(ev.deposiciones?T.green:T.textDim)}>{ev.deposiciones?"✓":"○"} 🚽 Deposic.</span>
                          <span style={S.tag(ev.deambulo?T.green:T.textDim)}>{ev.deambulo?"✓":"○"} 🚶 Deambuló</span>
                        </div>
                        {ev.dolor && (
                          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                            <span style={{fontSize:13,color:T.textMid}}>🩺 Dolor: <b style={{color:T.text}}>{ev.dolor}</b></span>
                            <TendIcon v={ev.dolorTendencia}/>
                          </div>
                        )}
                        {ev.texto && <div style={{background:T.surface2,borderRadius:8,padding:"10px 12px",fontSize:13,lineHeight:1.6,whiteSpace:"pre-wrap",color:T.textMid,border:`1px solid ${T.border}`}}>{ev.texto}</div>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab==="laboratorio" && (
            <div className="fade-in">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <span style={{fontWeight:700,fontSize:14}}>Resultados de laboratorio</span>
                <button onClick={()=>{setShowLab(v=>!v);setEditLabId(null);}} style={S.btn("primary")}>{showLab?"Cancelar":"+ Nuevo lab"}</button>
              </div>
              {showLab && !editLabId && (
                <FormLab init={emptyLab()} onSave={(lb)=>{onSaveLab(lb,"new");setShowLab(false);}} onCancel={()=>setShowLab(false)}/>
              )}
              {labs.length===0&&!showLab && <div style={{color:T.textDim,fontSize:14}}>Sin laboratorios registrados.</div>}
              {labs.map((lb,labIdx)=>{
                const params = Object.entries(lb.valores).filter(([,v])=>v!=="");
                return (
                  <div key={lb.id}>
                    {editLabId===lb.id ? (
                      <FormLab init={lb} onSave={(updated)=>{onSaveLab(updated,"edit");setEditLabId(null);}} onCancel={()=>setEditLabId(null)}/>
                    ) : (
                      <div style={{...S.card,border:`1px solid ${T.border}`,marginBottom:12}}>
                        <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div style={{fontWeight:700,fontSize:14,color:T.accent}}>🧪 {fmt(lb.fecha)}</div>
                          <div style={{display:"flex",gap:8}}>
                            <button onClick={()=>setEditLabId(lb.id)} style={{...S.btn("ghost"),padding:"4px 10px",fontSize:12}}>Editar</button>
                            <button onClick={()=>onDelLab(lb.id)} style={{...S.btn("danger"),padding:"4px 10px",fontSize:12}}>🗑</button>
                          </div>
                        </div>
                        {params.length===0 && <div style={{padding:"12px 16px",color:T.textDim,fontSize:13}}>Sin valores ingresados.</div>}
                        {params.length>0 && (
                          <div style={{padding:"12px 16px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8}}>
                            {params.map(([k,v])=>{
                              const prev  = prevLabVal(labIdx,k);
                              const trend = numTrend(v,prev);
                              const isFirst = labIdx===labs.length-1 || prev===null;
                              return (
                                <div key={k} style={{background:T.surface2,borderRadius:8,padding:"10px 12px",border:`1px solid ${T.border}`}}>
                                  <div style={{fontSize:10,color:T.textDim,fontWeight:600,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.5px"}}>{k}</div>
                                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                                    <span style={{fontSize:16,fontWeight:800,color:T.text}}>{v}</span>
                                    {!isFirst && trend && <span style={{fontSize:16,fontWeight:900,color:trendColor(trend)}}>{trend}</span>}
                                  </div>
                                  {!isFirst && prev!==null && <div style={{fontSize:10,color:T.textDim,marginTop:2}}>Anterior: {prev}</div>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab==="indicaciones" && (
            <div className="fade-in">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <span style={{fontWeight:700,fontSize:14}}>Pendientes ({pendientes.length})</span>
                <button onClick={()=>setShowInd(v=>!v)} style={S.btn("primary")}>{showInd?"Cancelar":"+ Agregar"}</button>
              </div>
              {showInd && (
                <FormIndicacion init={emptyInd()} onSave={(ind)=>{onAddInd(ind);setShowInd(false);}} onCancel={()=>setShowInd(false)}/>
              )}
              {pendientes.length===0&&!showInd && <div style={{color:T.textDim,fontSize:14,marginBottom:12}}>Sin indicaciones pendientes.</div>}
              {pendientes.map(i=>{
                const isT=i.fecha===today(), isP=i.fecha<today();
                return (
                  <div key={i.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 14px",borderRadius:10,marginBottom:6,
                    background:isP?T.amberDim+"66":isT?T.greenDim+"66":T.surface2,
                    border:`1px solid ${isP?T.amber+"30":isT?T.green+"30":T.border}`}}>
                    <input type="checkbox" checked={false} style={{width:18,height:18,accentColor:T.accent,cursor:"pointer",marginTop:2,flexShrink:0}} onChange={()=>onToggleInd(i.id)}/>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:4}}>
                        <span style={S.tag(T.accent)}>{i.tipo}</span>
                        <span style={S.tag(isP?T.red:isT?T.green:T.purple)}>{isP?"⚠ Vencida":isT?"Hoy":fmt(i.fecha)}</span>
                        {i.hora&&<span style={S.tag(T.textMid)}>🕐 {i.hora}</span>}
                      </div>
                      <div style={{fontSize:14,fontWeight:500,color:T.text}}>{i.descripcion}</div>
                    </div>
                    <button onClick={()=>onDelInd(i.id)} style={{background:"none",border:"none",cursor:"pointer",color:T.red,fontSize:16}}>🗑</button>
                  </div>
                );
              })}
              {hechos.length>0 && <>
                <div style={{...S.secT,marginTop:20}}>✅ Completadas ({hechos.length})</div>
                {hechos.map(i=>(
                  <div key={i.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:8,marginBottom:4,border:`1px solid ${T.border}`,opacity:0.45}}>
                    <input type="checkbox" checked={true} style={{width:18,height:18,accentColor:T.accent,cursor:"pointer"}} onChange={()=>onToggleInd(i.id)}/>
                    <span style={S.tag(T.textDim)}>{i.tipo}</span>
                    <span style={{fontSize:13,textDecoration:"line-through",flex:1,color:T.textMid}}>{i.descripcion}</span>
                    <span style={{fontSize:11,color:T.textDim}}>{fmt(i.fecha)}</span>
                  </div>
                ))}
              </>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [patients, setPatients] = useState(()=>{
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY))||[]; } catch { return []; }
  });
  const [view,    setView]    = useState("hoy");
  const [selId,   setSelId]   = useState(null);
  const [formData,setFormData]= useState(null);
  const [filterDate, setFD]   = useState(today());
  const [search,  setSearch]  = useState("");

  useEffect(()=>{ localStorage.setItem(STORAGE_KEY,JSON.stringify(patients)); },[patients]);

  const active = patients.filter(p=>!p.archivado);
  const sel    = patients.find(p=>p.id===selId);

  const openNew  = ()  => { setFormData({...emptyPatient()}); setView("form"); };
  const openEdit = (p) => { setFormData({...p,_exists:true}); setView("form"); };

  const savePatient = (form) => {
    if(!form.nombre.trim()) return;
    const {_exists,...clean}=form;
    setPatients(ps=> ps.find(p=>p.id===clean.id) ? ps.map(p=>p.id===clean.id?clean:p) : [{...clean,id:Date.now()},...ps]);
    setView("detalle");
  };
  const archivar    = (id) => { setPatients(ps=>ps.map(p=>p.id===id?{...p,archivado:true}:p)); setView("lista"); };
  const toggleInd   = (pid,iid) => setPatients(ps=>ps.map(p=>p.id===pid?{...p,indicaciones:p.indicaciones.map(i=>i.id===iid?{...i,completado:!i.completado}:i)}:p));
  const delInd      = (pid,iid) => setPatients(ps=>ps.map(p=>p.id===pid?{...p,indicaciones:p.indicaciones.filter(i=>i.id!==iid)}:p));
  const addInd      = (pid,ind) => setPatients(ps=>ps.map(p=>p.id===pid?{...p,indicaciones:[...p.indicaciones,{...ind,id:Date.now()}]}:p));
  const saveEv      = (pid,ev,mode) => setPatients(ps=>ps.map(p=>{
    if(p.id!==pid) return p;
    const evs=p.evoluciones||[];
    return {...p, evoluciones: mode==="edit" ? evs.map(e=>e.id===ev.id?ev:e) : [...evs,{...ev,id:Date.now()}]};
  }));
  const saveLab     = (pid,lb,mode) => setPatients(ps=>ps.map(p=>{
    if(p.id!==pid) return p;
    const lbs=p.laboratorios||[];
    return {...p, laboratorios: mode==="edit" ? lbs.map(l=>l.id===lb.id?lb:l) : [...lbs,{...lb,id:Date.now()}]};
  }));
  const delLab      = (pid,lid) => setPatients(ps=>ps.map(p=>p.id===pid?{...p,laboratorios:(p.laboratorios||[]).filter(l=>l.id!==lid)}:p));

  const indHoy = active.flatMap(p=>
    (p.indicaciones||[]).filter(i=>!i.completado&&i.fecha===filterDate)
      .map(i=>({...i,paciente:p.nombre,cama:p.cama,patientId:p.id,prioridad:p.prioridad}))
  ).sort((a,b)=>(a.hora||"99:99").localeCompare(b.hora||"99:99"));

  const proximos = active.flatMap(p=>
    (p.indicaciones||[]).filter(i=>!i.completado&&i.fecha>filterDate)
      .map(i=>({...i,paciente:p.nombre,cama:p.cama,patientId:p.id,prioridad:p.prioridad}))
  ).sort((a,b)=>a.fecha.localeCompare(b.fecha)||(a.hora||"").localeCompare(b.hora||"")).slice(0,10);

  const filtered = active.filter(p=>
    [p.nombre,p.cama,p.cirugia,p.diagnostico].some(v=>(v||"").toLowerCase().includes(search.toLowerCase()))
  );

  const Header = ({ activeView }) => (
    <header style={S.hdr}>
      <div style={S.logo}>
        <span style={{fontSize:22}}>🏥</span>
        <span>Pos<span style={S.logoAccent}>Quirúrgico</span></span>
      </div>
      <nav style={{display:"flex",gap:6}}>
        <button style={S.navB(activeView==="hoy")}   onClick={()=>setView("hoy")}>Hoy</button>
        <button style={S.navB(activeView==="lista")}  onClick={()=>setView("lista")}>Pacientes</button>
      </nav>
    </header>
  );

  // ── Vista Hoy ──
  if(view==="hoy") return (
    <div style={S.app}>
      <style>{GLOBAL_CSS}</style>
      <Header activeView="hoy"/>
      <div style={S.wrap}>

        {/* Fecha */}
        <div style={{display:"flex",gap:10,alignItems:"flex-end",marginBottom:22,flexWrap:"wrap"}}>
          <div>
            <div style={S.secT}>Fecha de revisión</div>
            <input type="date" value={filterDate} onChange={e=>setFD(e.target.value)} style={{...S.inp,width:"auto"}}/>
          </div>
          <button onClick={()=>setFD(today())} style={S.btn("ghost")}>Hoy</button>
        </div>

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:26}}>
          {[
            {label:"Pacientes activos", val:active.length,                                 c:T.accent, icon:"👥"},
            {label:"Pendientes hoy",    val:indHoy.length,                                 c:T.amber,  icon:"📋"},
            {label:"Alta prioridad",    val:active.filter(p=>p.prioridad==="Alta").length, c:T.red,    icon:"🔴"},
          ].map(it=>(
            <div key={it.label} style={{background:T.surface,borderRadius:14,padding:"18px 16px",border:`1px solid ${T.border}`,borderLeft:`3px solid ${it.c}`,display:"flex",flexDirection:"column",gap:6}}>
              <div style={{fontSize:36,fontWeight:800,color:it.c,lineHeight:1,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{it.val}</div>
              <div style={{fontSize:11,color:T.textMid,fontWeight:500,lineHeight:1.3}}>{it.icon} {it.label}</div>
            </div>
          ))}
        </div>

        {/* Pacientes activos */}
        <div style={S.secT}>🛏 Pacientes activos</div>
        {active.length===0 && <div style={{color:T.textDim,fontSize:14,marginBottom:16,padding:"16px",background:T.surface,borderRadius:12,border:`1px dashed ${T.border}`}}>Sin pacientes activos. <button onClick={openNew} style={{...S.btn("primary"),padding:"4px 12px",fontSize:12,marginLeft:8}}>+ Agregar</button></div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:10,marginBottom:26}}>
          {active.map(p=>{
            const pend=(p.indicaciones||[]).filter(i=>!i.completado&&i.fecha===filterDate).length;
            const evHoy=(p.evoluciones||[]).find(e=>e.fecha===filterDate);
            return (
              <div key={p.id} style={{background:T.surface,borderRadius:14,border:`1px solid ${T.border}`,borderTop:`2px solid ${PRIO_C[p.prioridad][0]}`,overflow:"hidden",transition:"transform 0.15s,box-shadow 0.15s"}}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 24px #000a`;}}
                onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
                <div style={{padding:"14px 16px"}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:2,color:T.text}}>{p.nombre}</div>
                  <div style={{fontSize:12,color:T.textMid,marginBottom:8}}>🛏 Cama {p.cama}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8,minHeight:22}}>
                    <PopBadge p={p}/><AtbBadge p={p}/>
                  </div>
                  {pend>0 && <div style={{fontSize:12,color:T.amber,fontWeight:600,marginBottom:6}}>⚠ {pend} pendiente(s) hoy</div>}
                  {evHoy  && <div style={{fontSize:11,color:T.purple,fontWeight:600,marginBottom:6}}>📓 Evolucionado hoy</div>}
                  <button onClick={()=>{setSelId(p.id);setView("detalle");}} style={{...S.btn("primary"),padding:"7px 12px",fontSize:12,width:"100%"}}>Ver ficha →</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ATB activos */}
        {active.filter(p=>p.tieneAtb).length>0 && <>
          <div style={S.secT}>💊 ATB activos</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:22}}>
            {active.filter(p=>p.tieneAtb).map(p=>{
              const d=daysFrom(p.fechaInicioAtb);
              const c=d>=7?T.red:d>=4?T.amber:T.green;
              return (
                <div key={p.id} onClick={()=>{setSelId(p.id);setView("detalle");}} style={{background:T.surface,border:`1.5px solid ${c}40`,borderRadius:10,padding:"10px 14px",cursor:"pointer",minWidth:150,transition:"border-color 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=c}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=c+"40"}>
                  <div style={{fontWeight:700,fontSize:13,color:T.text}}>{p.nombre}</div>
                  <div style={{fontSize:11,color:T.textMid,marginBottom:6}}>Cama {p.cama}</div>
                  <span style={S.pill(c)}>{p.atbNombre||"ATB"} · día {d}</span>
                </div>
              );
            })}
          </div>
        </>}

        {/* Indicaciones del día */}
        <div style={S.secT}>📋 Indicaciones — {fmt(filterDate)}</div>
        {indHoy.length===0 && <div style={{color:T.textDim,fontSize:14,padding:"12px 0 18px"}}>Sin indicaciones pendientes.</div>}
        {indHoy.map(i=>(
          <div key={i.id} style={{...S.card,borderLeft:`3px solid ${PRIO_C[i.prioridad][0]}`}}>
            <div style={{padding:"12px 16px",display:"flex",alignItems:"flex-start",gap:10}}>
              <input type="checkbox" checked={i.completado} style={{width:18,height:18,accentColor:T.accent,cursor:"pointer",marginTop:2,flexShrink:0}} onChange={()=>toggleInd(i.patientId,i.id)}/>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:4}}>
                  <span style={S.tag(PRIO_C[i.prioridad][0])}>{i.prioridad}</span>
                  <span style={S.tag(T.accent)}>{i.tipo}</span>
                  {i.hora&&<span style={S.tag(T.purple)}>🕐 {i.hora}</span>}
                </div>
                <div style={{fontWeight:600,fontSize:14,color:T.text}}>{i.descripcion}</div>
                <div style={{fontSize:12,color:T.textMid,marginTop:3}}>🛏 Cama {i.cama} — <b>{i.paciente}</b></div>
              </div>
              <button onClick={()=>{setSelId(i.patientId);setView("detalle");}} style={{...S.btn("ghost"),padding:"5px 10px",fontSize:12}}>Ver</button>
            </div>
          </div>
        ))}

        {proximos.length>0 && <>
          <div style={{...S.secT,marginTop:24}}>🗓 Próximas indicaciones</div>
          {proximos.map(i=>{
            const diff=-daysFrom(i.fecha);
            return (
              <div key={i.id} style={S.card}>
                <div style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:8}}>
                  <span style={S.tag(T.purple)}>+{diff}d</span>
                  <span style={S.tag(T.accent)}>{i.tipo}</span>
                  <div style={{flex:1,fontSize:13,color:T.text}}><b>{i.descripcion}</b> <span style={{color:T.textMid}}>— {i.paciente} (Cama {i.cama})</span></div>
                  <span style={{fontSize:12,color:T.textDim}}>{fmt(i.fecha)}</span>
                </div>
              </div>
            );
          })}
        </>}
      </div>
    </div>
  );

  // ── Vista Lista ──
  if(view==="lista") return (
    <div style={S.app}>
      <style>{GLOBAL_CSS}</style>
      <Header activeView="lista"/>
      <div style={S.wrap}>
        <div style={{display:"flex",gap:10,marginBottom:18,alignItems:"center"}}>
          <input placeholder="Buscar nombre, cama, diagnóstico…" value={search} onChange={e=>setSearch(e.target.value)} style={{...S.inp,flex:1}}
            onFocus={e=>e.target.style.borderColor=T.accent} onBlur={e=>e.target.style.borderColor=T.border2}/>
          <button onClick={openNew} style={S.btn("primary")}>+ Paciente</button>
        </div>
        {filtered.length===0 && <div style={{color:T.textDim,fontSize:14,padding:"24px",background:T.surface,borderRadius:14,textAlign:"center",border:`1px dashed ${T.border}`}}>
          {search ? "Sin resultados para esa búsqueda." : "Sin pacientes activos. Agrega uno con el botón de arriba."}
        </div>}
        {filtered.map(p=>{
          const pend=(p.indicaciones||[]).filter(i=>!i.completado).length;
          return (
            <div key={p.id} style={{...S.card,borderLeft:`3px solid ${PRIO_C[p.prioridad][0]}`}}>
              <div style={{padding:"14px 18px",display:"flex",alignItems:"flex-start",gap:12}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontWeight:800,fontSize:16,fontFamily:"'Plus Jakarta Sans',sans-serif",color:T.text}}>{p.nombre}</span>
                    <span style={S.badge(PRIO_C[p.prioridad][0],PRIO_C[p.prioridad][0]+"20")}>{p.prioridad}</span>
                    <span style={S.badge(TURNO_C[p.turno],TURNO_C[p.turno]+"20")}>{p.turno}</span>
                    <PopBadge p={p}/><AtbBadge p={p}/>
                  </div>
                  <div style={{fontSize:13,color:T.textMid}}>
                    🛏 Cama {p.cama}{p.tieneCirugia&&" · ✂️ "+p.cirugia} · 📅 {fmt(p.fechaIngreso)}
                  </div>
                  {p.diagnostico&&<div style={{fontSize:12,color:T.textMid,marginTop:3}}>{p.diagnostico}</div>}
                  {pend>0&&<div style={{fontSize:12,color:T.amber,marginTop:4,fontWeight:600}}>⚠ {pend} indicación(es) pendiente(s)</div>}
                </div>
                <button onClick={()=>{setSelId(p.id);setView("detalle");}} style={S.btn("primary")}>Ver →</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── Vista Form ──
  if(view==="form" && formData) return (
    <div style={S.app}>
      <style>{GLOBAL_CSS}</style>
      <Header activeView=""/>
      <FormPaciente
        init={formData}
        onSave={savePatient}
        onCancel={()=>setView(patients.find(p=>p.id===formData.id)?"detalle":"lista")}
      />
    </div>
  );

  // ── Vista Detalle ──
  if(view==="detalle" && sel) return (
    <div style={S.app}>
      <style>{GLOBAL_CSS}</style>
      <Header activeView=""/>
      <DetallePaciente
        patient={sel}
        onBack={()=>setView("lista")}
        onEdit={()=>openEdit(sel)}
        onArchivar={()=>archivar(sel.id)}
        onToggleInd={(iid)=>toggleInd(sel.id,iid)}
        onDelInd={(iid)=>delInd(sel.id,iid)}
        onAddInd={(ind)=>addInd(sel.id,ind)}
        onSaveEv={(ev,mode)=>saveEv(sel.id,ev,mode)}
        onSaveLab={(lb,mode)=>saveLab(sel.id,lb,mode)}
        onDelLab={(lid)=>delLab(sel.id,lid)}
      />
    </div>
  );

  return <div style={S.app}><style>{GLOBAL_CSS}</style><Header activeView=""/></div>;
}
