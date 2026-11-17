import{initializeApp}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import{getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,GoogleAuthProvider,signInWithPopup,signOut}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import{getFirestore,collection,doc,addDoc,setDoc,deleteDoc,onSnapshot}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import{firebaseConfig}from"./firebase-config.js";

const auth=getAuth(initializeApp(firebaseConfig)),db=getFirestore();
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=n=>new Intl.NumberFormat("pt-MZ",{style:"currency",currency:"MZN"}).format(n||0);
const sum=a=>a.reduce((s,t)=>s+t.valor,0);
const slug=s=>s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"outros";
const S={uid:null,tx:[],cats:[],rec:[],un:[],mes:new Date().toISOString().slice(0,7)};
const col=n=>collection(db,"users",S.uid,n);
const ref=(n,id)=>doc(db,"users",S.uid,n,id);

/* ---------- Autenticação ---------- */
const erro=e=>{$("auth-err").textContent=["auth/invalid-credential","auth/wrong-password","auth/user-not-found"].includes(e.code)?"Email ou palavra-passe incorrectos.":e.code==="auth/email-already-in-use"?"Este email já tem conta. Use Entrar.":e.message};
const tentar=f=>async()=>{$("auth-err").textContent="";try{await f()}catch(e){erro(e)}};
$("f-auth").onsubmit=e=>{e.preventDefault();tentar(()=>signInWithEmailAndPassword(auth,$("email").value,$("pass").value))()};
$("criar").onclick=tentar(()=>createUserWithEmailAndPassword(auth,$("email").value,$("pass").value));
$("google").onclick=tentar(()=>signInWithPopup(auth,new GoogleAuthProvider()));
$("sair").onclick=()=>signOut(auth);

onAuthStateChanged(auth,u=>{
  S.un.forEach(f=>f());S.un=[];
  $("auth").hidden=!!u;$("app").hidden=!u;
  if(!u){S.uid=null;return}
  S.uid=u.uid;
  const sub=(n,k)=>onSnapshot(col(n),s=>{S[k]=s.docs.map(d=>({id:d.id,...d.data()}));render()});
  S.un=[sub("transacoes","tx"),sub("categorias","cats"),sub("recorrentes","rec")];
});

/* ---------- Separadores e mês ---------- */
const tabs=[...document.querySelectorAll("#tabs button")];
tabs.forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".tab").forEach(s=>s.hidden=s.id!=="t-"+b.dataset.t);
  tabs.forEach(x=>x.setAttribute("aria-selected",x===b));
});
tabs[0].click();
$("mes").value=S.mes;
$("mes").onchange=e=>{S.mes=e.target.value||S.mes;render()};
const hoje=()=>new Date().toISOString().slice(0,10);
document.querySelector("#f-mov [name=data]").value=hoje();

/* ---------- Dados ---------- */
const mTx=()=>S.tx.filter(t=>t.data?.startsWith(S.mes)).sort((a,b)=>b.data.localeCompare(a.data));
const despesas=l=>l.filter(t=>t.tipo==="despesa");
const ganhos=l=>l.filter(t=>t.tipo==="ganho");
const porCat=l=>{const m={};l.forEach(t=>m[t.categoria]=(m[t.categoria]||0)+t.valor);return Object.entries(m).sort((a,b)=>b[1]-a[1])};
const limite=c=>(S.cats.find(x=>x.id===slug(c))||{}).limite||0;
const garantirCat=async(nome,tipo)=>{if(!S.cats.some(c=>c.id===slug(nome)))await setDoc(ref("categorias",slug(nome)),{nome,tipo,limite:0})};
const th=(...h)=>`<tr>${h.map(x=>`<th${x.startsWith("#")?' class="n"':""}>${x.replace("#","")}</th>`).join("")}</tr>`;

$("f-mov").onsubmit=async e=>{
  e.preventDefault();const f=new FormData(e.target),cat=f.get("categoria").trim();
  await garantirCat(cat,f.get("tipo"));
  await addDoc(col("transacoes"),{tipo:f.get("tipo"),valor:+f.get("valor"),data:f.get("data"),categoria:cat,descricao:f.get("descricao").trim(),projecto:f.get("projecto").trim()});
  e.target.reset();e.target.data.value=hoje();
};
$("f-rec").onsubmit=async e=>{
  e.preventDefault();const f=new FormData(e.target),cat=f.get("categoria").trim();
  await garantirCat(cat,f.get("tipo"));
  await addDoc(col("recorrentes"),{tipo:f.get("tipo"),descricao:f.get("descricao").trim(),valor:+f.get("valor"),categoria:cat,dia:+f.get("dia")});
  e.target.reset();
};
$("lancar").onclick=async()=>{
  for(const r of S.rec){ // id fixo por recorrente+mês: lançar duas vezes não duplica
    await setDoc(ref("transacoes",`${r.id}_${S.mes}`),{tipo:r.tipo,valor:r.valor,data:`${S.mes}-${String(r.dia).padStart(2,"0")}`,categoria:r.categoria,descricao:r.descricao,projecto:""});
  }
};
document.addEventListener("click",e=>{
  const d=e.target.dataset?.del;if(!d)return;
  const[n,id]=d.split(":");if(confirm("Apagar este registo?"))deleteDoc(ref(n,id));
});
document.addEventListener("change",e=>{
  const id=e.target.dataset?.lim;if(id)setDoc(ref("categorias",id),{limite:+e.target.value||0},{merge:true});
});

/* ---------- Vistas ---------- */
function barras(l){
  const ds=despesas(l),tot=sum(ds);
  return porCat(ds).map(([c,v])=>{
    const lim=limite(c),p=lim?v/lim*100:tot?v/tot*100:0;
    return `<div class="bar ${lim&&p>=100?"over":lim&&p>=80?"warn":""}"><div class="bl"><span>${esc(c)}</span><span>${fmt(v)}${lim?" de "+fmt(lim):""}</span></div><i style="width:${Math.min(p,100)}%"></i></div>`;
  }).join("")||'<p class="empty">Sem despesas neste mês. Registe a primeira em Movimentos.</p>';
}

function render(){
  const l=mTx(),g=sum(ganhos(l)),d=sum(despesas(l));
  $("cards").innerHTML=`<div class="c"><span>Ganhos</span><b class="pos">${fmt(g)}</b></div><div class="c"><span>Despesas</span><b class="neg">${fmt(d)}</b></div><div class="c"><span>Saldo do mês</span><b class="${g>=d?"pos":"neg"}">${fmt(g-d)}</b></div>`;
  $("bars").innerHTML=barras(l);
  $("cats").innerHTML=S.cats.map(c=>`<option value="${esc(c.nome)}">`).join("");

  $("lista").innerHTML=th("Data","Descrição","Categoria","Projecto","#Valor","")+(l.map(t=>`<tr><td>${esc(t.data)}</td><td>${esc(t.descricao)}</td><td>${esc(t.categoria)}</td><td>${esc(t.projecto)}</td><td class="n ${t.tipo==="ganho"?"pos":"neg"}">${t.tipo==="ganho"?"+":"−"}${fmt(t.valor)}</td><td><button data-del="transacoes:${t.id}">Apagar</button></td></tr>`).join("")||'<tr><td colspan="6" class="empty">Nenhum movimento neste mês.</td></tr>');

  $("cat-lista").innerHTML=th("Categoria","Tipo","#Limite mensal (MZN)")+(S.cats.map(c=>`<tr><td>${esc(c.nome)}</td><td>${c.tipo}</td><td class="n">${c.tipo==="despesa"?`<input type="number" min="0" step="0.01" data-lim="${c.id}" value="${c.limite||0}" aria-label="Limite de ${esc(c.nome)}">`:"—"}</td></tr>`).join("")||'<tr><td colspan="3" class="empty">As categorias aparecem quando registar o primeiro movimento.</td></tr>');

  $("rec-lista").innerHTML=th("Descrição","Tipo","Categoria","Dia","#Valor","")+(S.rec.map(r=>`<tr><td>${esc(r.descricao)}</td><td>${r.tipo}</td><td>${esc(r.categoria)}</td><td>${r.dia}</td><td class="n">${fmt(r.valor)}</td><td><button data-del="recorrentes:${r.id}">Apagar</button></td></tr>`).join("")||'<tr><td colspan="6" class="empty">Sem recorrentes. Adicione o salário e as despesas fixas.</td></tr>');

  const pj={};S.tx.filter(t=>t.projecto).forEach(t=>{const p=pj[t.projecto]??={n:0,g:0,r:0};p.n++;t.tipo==="despesa"?p.g+=t.valor:p.r+=t.valor});
  $("proj-lista").innerHTML=th("Projecto","#Movimentos","#Gasto","#Recebido")+(Object.entries(pj).map(([k,p])=>`<tr><td>${esc(k)}</td><td class="n">${p.n}</td><td class="n neg">${fmt(p.g)}</td><td class="n pos">${fmt(p.r)}</td></tr>`).join("")||'<tr><td colspan="4" class="empty">Preencha o campo Projecto num movimento para o ver aqui.</td></tr>');

  relatorio(l,g,d);
}

function relatorio(l,g,d){
  const[y,m]=S.mes.split("-").map(Number);
  const ant=new Date(Date.UTC(y,m-2,1)).toISOString().slice(0,7);
  const da=sum(despesas(S.tx.filter(t=>t.data?.startsWith(ant))));
  const nome=new Date(Date.UTC(y,m-1,1)).toLocaleDateString("pt-MZ",{month:"long",year:"numeric",timeZone:"UTC"});
  const cats=porCat(despesas(l)),exc=cats.filter(([c,v])=>limite(c)&&v>limite(c));
  const top=despesas(l).sort((a,b)=>b.valor-a.valor).slice(0,5);
  const poup=g?(g-d)/g*100:0,dif=d-da;
  $("relatorio").innerHTML=`<h2>Relatório de ${nome}</h2>
  <p>Ganhos <b class="pos">${fmt(g)}</b> · Despesas <b class="neg">${fmt(d)}</b> · Saldo <b class="${g>=d?"pos":"neg"}">${fmt(g-d)}</b></p>
  <p>${g?`Poupou ${poup.toFixed(1)}% dos ganhos.`:"Sem ganhos registados neste mês."} ${da?`As despesas ${dif>0?"subiram":"desceram"} ${fmt(Math.abs(dif))} face a ${ant}.`:""}</p>
  <h2>Despesas por categoria</h2>${barras(l)}
  <h2>Maiores despesas</h2>${top.length?`<table>${th("Data","Descrição","Categoria","#Valor")}${top.map(t=>`<tr><td>${esc(t.data)}</td><td>${esc(t.descricao)}</td><td>${esc(t.categoria)}</td><td class="n">${fmt(t.valor)}</td></tr>`).join("")}</table>`:'<p class="empty">Sem despesas.</p>'}
  <h2>Limites ultrapassados</h2>${exc.length?`<ul>${exc.map(([c,v])=>`<li>${esc(c)}: ${fmt(v)} para um limite de ${fmt(limite(c))} (+${fmt(v-limite(c))})</li>`).join("")}</ul>`:"<p>Nenhum limite ultrapassado.</p>"}`;
}

$("imprimir").onclick=()=>print();
$("csv").onclick=()=>{
  const q=v=>`"${String(v??"").replace(/"/g,'""')}"`;
  const linhas=[["data","tipo","categoria","descricao","projecto","valor"],...mTx().map(t=>[t.data,t.tipo,t.categoria,t.descricao,t.projecto,t.valor])];
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob(["\ufeff"+linhas.map(r=>r.map(q).join(";")).join("\n")],{type:"text/csv"}));
  a.download=`movimentos-${S.mes}.csv`;a.click();
};
