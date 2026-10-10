const $=s=>document.querySelector(s),ui=$('#ui'),hud=$('#hud'),msg=$('#msg'),cv=$('#cv'),cx=cv.getContext('2d');
const TEAMS=[
{n:'Ferrari',c:'#e10600',spd:92,acc:86,hdl:84,d:['L. Moretti','C. Bianchi']},
{n:'Mercedes',c:'#00d2be',spd:90,acc:84,hdl:90,d:['G. Russo','A. Kimura']},
{n:'Red Bull',c:'#1e41ff',spd:94,acc:90,hdl:88,d:['M. Verhoef','S. Duarte']},
{n:'McLaren',c:'#ff8700',spd:88,acc:92,hdl:86,d:['O. Piastri','L. Norwick']},
{n:'Aston Verde',c:'#00875a',spd:84,acc:80,hdl:82,d:['F. Alvarez','L. Strand']},
{n:'Alpine Azul',c:'#ff69b4',spd:80,acc:82,hdl:80,d:['P. Gaslin','E. Ocampo']}];
const TIRES=[{n:'Macio',c:'#e10600',g:1.12,w:.014},{n:'Médio',c:'#ffd800',g:1,w:.008},{n:'Duro',c:'#ddd',g:.93,w:.0045}];
const TRACKS=[
{n:'Autódromo Paulista',p:[[0,0],[700,-60],[1300,150],[1500,650],[1100,950],[600,750],[300,1100],[-300,1000],[-500,500],[-250,150]]},
{n:'Parque Real',p:[[0,0],[900,0],[1300,300],[1100,650],[600,500],[450,900],[-100,1000],[-400,600],[-300,200]]},
{n:'Circuito do Lago',p:[[0,0],[500,-250],[1100,-250],[1400,100],[1100,450],[1300,800],[700,1000],[300,700],[-100,900],[-500,650],[-400,200]]}];
const PTS=[25,18,15,12,10,8,6,4,2,1],W=120;
let S=JSON.parse(localStorage.f1||'null')||{pid:Math.random().toString(36).slice(2)+Date.now().toString(36),name:'Piloto',team:0,drv:0,tire:1,pts:0,wins:0,races:0,titles:0,best:{},champ:null,q:{}};
const save=()=>localStorage.f1=JSON.stringify(S);
const wrap=a=>((a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
const fmt=t=>t?`${(t/60)|0}:${(t%60).toFixed(2).padStart(5,'0')}`:'--';
let G=null,K={},TC={},sock=null,sid=null,room=null,rooms=[];

function build(t){if(t.s)return t;const P=t.p,n=P.length,s=[];
 for(let i=0;i<n;i++){const a=P[(i+n-1)%n],b=P[i],c=P[(i+1)%n],d=P[(i+2)%n];
  for(let k=0;k<14;k++){const u=k/14,u2=u*u,u3=u2*u;
   s.push([0,1].map(j=>.5*(2*b[j]+(-a[j]+c[j])*u+(2*a[j]-5*b[j]+4*c[j]-d[j])*u2+(-a[j]+3*b[j]-3*c[j]+d[j])*u3)))}}
 t.s=s;t.N=s.length;t.len=s.reduce((q,p,i)=>q+Math.hypot(p[0]-s[(i+1)%t.N][0],p[1]-s[(i+1)%t.N][1]),0);return t}

function mk(team,name,slot,o={}){const tr=G.tr,N=tr.N,i=((N-2-slot)%N+N)%N,p=tr.s[i],q=tr.s[(i+1)%N],a=Math.atan2(q[1]-p[1],q[0]-p[0]),off=(slot%2?1:-1)*20;
 const c={name,team,T:TEAMS[team],x:p[0]-Math.sin(a)*off,y:p[1]+Math.cos(a)*off,a,vx:0,vy:0,tot:-(2+slot),last:i,laps:0,ls:0,best:0,lap:0,life:1,tire:S.tire,pitT:0,fin:0,off:0,...o};
 c.tx=c.x;c.ty=c.y;c.ta=a;return c}

function step(c,dt,inp){const T=c.T,tr=G.tr,tire=TIRES[c.tire],N=tr.N;
 if(c.pitT>0){c.pitT-=dt;inp={th:0,br:1,st:0}}
 const maxS=(300+T.spd*2.4)*(.85+.15*c.life)*(c.off?.45:1),acc=180+T.acc*2.4,gr=(3+T.hdl/25)*tire.g*(.55+.45*c.life)*(c.off?.6:1);
 let s=c.vx*Math.cos(c.a)+c.vy*Math.sin(c.a);
 s+=(inp.th*acc*Math.max(0,1-s/maxS)-inp.br*(s>0?450:200)-(inp.th?0:90)*Math.sign(s))*dt;
 if(s>maxS)s-=(s-maxS)*3*dt;if(s<-120)s=-120;
 c.a+=inp.st*(2.3+T.hdl/60)*dt*Math.max(-1,Math.min(1,s/140))/(1+Math.abs(s)/900);
 const k=Math.min(1,gr*dt);c.vx+=(s*Math.cos(c.a)-c.vx)*k;c.vy+=(s*Math.sin(c.a)-c.vy)*k;
 c.x+=c.vx*dt;c.y+=c.vy*dt;c.spd=Math.hypot(c.vx,c.vy);
 if(!c.bot)c.life=Math.max(0,c.life-tire.w*c.spd/400*dt*(1+Math.abs(inp.st)*.8));
 let bd=1e9,bi=c.last;for(let j=-3;j<=14;j++){const i=(c.last+j+N)%N,d=Math.hypot(c.x-tr.s[i][0],c.y-tr.s[i][1]);if(d<bd){bd=d;bi=i}}
 c.tot+=((bi-c.last+N+N/2)%N)-N/2;c.last=bi;c.off=bd>W/2+4;
 const L=Math.max(0,Math.floor(c.tot/N));
 if(L>c.laps){c.laps=L;const lt=G.t-c.ls;c.ls=G.t;c.lap=lt;if(c.laps>1||G.mode!='race'||1){if(!c.best||lt<c.best)c.best=lt}
  if(c.pitReq){c.pitReq=0;c.pitT=2.6;c.life=1;c.tire=(c.tire+1)%3}
  if(c.laps>=G.laps)finish(c)}}

function bot(c){const tr=G.tr,N=tr.N,t=tr.s[(c.last+6)%N],d=wrap(Math.atan2(t[1]-c.y,t[0]-c.x)-c.a),ad=Math.abs(d);
 return{st:Math.max(-1,Math.min(1,d*3)),th:ad>.6&&c.spd>260?.2:1-Math.min(.5,ad),br:ad>.75&&c.spd>280?.6:0}}
function mine(){const r=K.ArrowRight||K.KeyD||TC.R,l=K.ArrowLeft||K.KeyA||TC.L;
 return{th:K.ArrowUp||K.KeyW||TC.G?1:0,br:K.ArrowDown||K.KeyS||K.Space||TC.B?1:0,st:(r?1:0)-(l?1:0)}}

function start(o){const tr=build(TRACKS[o.tr]);G={...o,tr,cars:[],t:0,cd:3.5,phase:'count',net:0,last:performance.now()};
 const solo=o.mode=='practice'||o.mode=='quali',n=solo?1:10;
 if(o.online){o.players.forEach((p,i)=>{const c=mk(p.team,p.name,i,{id:p.id,remote:p.id!=sid,you:p.id==sid});G.cars.push(c)});G.me=G.cars.find(c=>c.you);G.me.tire=S.tire;G.me.remote=0}
 else{const my=solo?0:Math.min(n-1,(S.q[o.tr]||6)-1);let b=0;
  for(let i=0;i<n;i++){if(i==my){G.me=mk(S.team,TEAMS[S.team].d[S.drv],i,{you:1});G.cars.push(G.me)}
   else{const t=b%6,sk=.9+Math.random()*.1,c=mk(t,TEAMS[t].d[(b/6|0)%2],i,{bot:1,sk});c.T={...TEAMS[t],spd:TEAMS[t].spd*sk,hdl:TEAMS[t].hdl*sk,acc:TEAMS[t].acc*sk};G.cars.push(c);b++}}}
 ui.style.display='none';hud.style.display='block';$('#exit').style.display='block';if('ontouchstart'in window)$('#touch').style.display='flex';
 requestAnimationFrame(loop)}
function quit(){if(G&&G.online&&sock)sock.emit('leave');G=null;hud.style.display=msg.textContent='';hud.style.display='none';$('#exit').style.display=$('#touch').style.display='none';menu()}
$('#exit').onclick=quit;

function loop(now){if(!G)return;const dt=Math.min(.05,(now-G.last)/1000);G.last=now;upd(dt);draw();hudu();requestAnimationFrame(loop)}
function upd(dt){const g=G,tr=g.tr;
 if(g.phase=='count'){g.cd-=dt;msg.textContent=g.cd>3?'':Math.ceil(g.cd)||'';if(g.cd<=0){g.phase='go';g.t=0;msg.textContent='GO!';setTimeout(()=>{if(G&&!G.me.fin)msg.textContent=''},900)}}else g.t+=dt;
 for(const c of g.cars){
  if(c.remote){c.x+=(c.tx-c.x)*.3;c.y+=(c.ty-c.y)*.3;c.a+=wrap(c.ta-c.a)*.3;c.laps=Math.max(0,Math.floor(c.tot/tr.N));continue}
  let inp={th:0,br:0,st:0};if(g.phase=='go'&&!c.fin)inp=c.bot?bot(c):mine();else if(c.fin)inp={th:0,br:.5,st:0};
  if(g.phase=='count')inp={th:0,br:1,st:0};
  step(c,dt,inp)}
 for(const a of g.cars)if(!a.remote)for(const b of g.cars)if(a!=b){const dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);
  if(d<34&&d>0){const f=(34-d)/(b.remote?1:2);a.x+=dx/d*f;a.y+=dy/d*f;a.vx*=.97;a.vy*=.97}}
 g.net+=dt;if(g.online&&g.net>.05){g.net=0;sock.emit('st',{x:g.me.x,y:g.me.y,a:g.me.a,t:g.me.tot})}}
function finish(c){if(!c.you||G.over)return;G.over=1;const g=G;msg.textContent='🏁';
 if(g.mode=='practice')return setTimeout(()=>G&&(msg.textContent='🏁 Melhor: '+fmt(c.best)),500);
 if(g.mode=='quali'){const bt=[0,1,2,3,4,5,0,1,2].map((t,i)=>g.tr.len/((300+TEAMS[t].spd*.95*2.4)*.62));const pos=1+bt.filter(x=>x<c.best).length;
  S.q[g.trI]=pos;save();return setTimeout(()=>result([{name:c.name,team:c.team,time:c.best,best:c.best}],`Classificação: largará em P${pos} na próxima corrida (melhor volta ${fmt(c.best)})`),800)}
 if(g.online){sock.emit('fin',{time:g.t,best:c.best});msg.textContent='🏁 Aguardando…';return}
 setTimeout(()=>{const o=[...g.cars].sort((a,b)=>(!!b.fin-!!a.fin)||(a.fin&&b.fin?a.fin-b.fin:b.tot-a.tot));
  const rows=o.map((x,i)=>({name:x.name,team:x.team,pos:i+1,time:x.fin,best:x.best,pts:PTS[i]||0,you:x.you}));
  const me=rows.find(r=>r.you);S.pts+=me.pts;S.races++;S.wins+=me.pos==1;const k=g.trI;if(c.best&&(!S.best[k]||c.best<S.best[k]))S.best[k]=c.best;
  let ex='';if(g.champ){const C=S.champ;rows.forEach(r=>C.pts[r.name]=(C.pts[r.name]||0)+r.pts);C.round++;
   if(C.round>=3){const st=Object.entries(C.pts).sort((a,b)=>b[1]-a[1]);if(st[0][0]==c.name){S.titles++;ex='🏆 VOCÊ É O CAMPEÃO!'}else ex='Campeonato encerrado: campeão '+st[0][0];S.champ=null}}
  save();fetch('/api/result',{method:'POST',body:JSON.stringify({pid:S.pid,name:S.name,pos:me.pos,pts:me.pts,best:c.best,track:k})}).catch(()=>{});
  result(rows,ex,g.champ)},900)}

let R,SC,CAM,carsG,trackG,trackFor=null,gameFor=null;
function init3(){R=new THREE.WebGLRenderer({canvas:$('#cv3'),antialias:true});SC=new THREE.Scene();
 SC.background=new THREE.Color(0x87b9e8);SC.fog=new THREE.Fog(0x87b9e8,700,2600);CAM=new THREE.PerspectiveCamera(62,1,1,5000);
 SC.add(new THREE.HemisphereLight(0xffffff,0x335533,.95));const d=new THREE.DirectionalLight(0xffffff,.8);d.position.set(300,600,200);SC.add(d);
 const gr=new THREE.Mesh(new THREE.PlaneGeometry(30000,30000),new THREE.MeshLambertMaterial({color:0x1d5e2a}));gr.rotation.x=-Math.PI/2;gr.position.y=-.5;SC.add(gr);
 carsG=new THREE.Group();trackG=new THREE.Group();SC.add(carsG,trackG)}
function ribbon(s,w,y,col,lit){const N=s.length,pos=[],nor=[],cl=[];
 for(let i=0;i<N;i++){const a=s[i],b=s[(i+1)%N],c=s[(i+N-1)%N];
  const e=(p,q)=>{const tx=q[0]-p[0],tz=q[1]-p[1],l=Math.hypot(tx,tz)||1;return[-tz/l,tx/l]};
  const n0=e(c,b),n1=e(a,s[(i+2)%N]),C=new THREE.Color(col(i));
  [[a,n0,1],[a,n0,-1],[b,n1,1],[b,n1,-1],[a,n0,1],[b,n1,-1]].forEach(v=>{pos.push(v[0][0]+v[1][0]*w/2*v[2],y,v[0][1]+v[1][1]*w/2*v[2]);nor.push(0,1,0);cl.push(C.r,C.g,C.b)})}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));g.setAttribute('color',new THREE.Float32BufferAttribute(cl,3));
 const M=lit?THREE.MeshLambertMaterial:THREE.MeshBasicMaterial;return new THREE.Mesh(g,new M({vertexColors:true,side:THREE.DoubleSide}))}
function buildTrack(tr){while(trackG.children.length)trackG.remove(trackG.children[0]);const s=tr.s;
 trackG.add(ribbon(s,W+90,.02,()=>0xc8b27a,true),ribbon(s,W+16,.06,i=>(i>>1)%2?0xe10600:0xffffff,false),ribbon(s,W,.1,i=>i%2?0x353b46:0x30363f,true));
 const a=Math.atan2(s[1][1]-s[0][1],s[1][0]-s[0][0]),l=new THREE.Mesh(new THREE.PlaneGeometry(10,W),new THREE.MeshBasicMaterial({color:0xffffff}));
 l.rotation.x=-Math.PI/2;l.rotation.z=a;l.position.set(s[0][0],.2,s[0][1]);trackG.add(l)}
function carMesh(col){const g=new THREE.Group(),M=c=>new THREE.MeshLambertMaterial({color:c}),B=(w,h,d,x,y,z,c)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c));m.position.set(x,y,z);g.add(m)};
 B(30,7,10,0,6,0,col);B(14,4,5,20,5,0,col);B(3,2,26,28,3,0,0x222222);B(3,12,22,-18,11,0,0x222222);
 [[12,9],[12,-9],[-13,9],[-13,-9]].forEach(p=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(5.5,5.5,6,14),M(0x111111));m.rotation.x=Math.PI/2;m.position.set(p[0],5.5,p[1]);g.add(m)});
 const h=new THREE.Mesh(new THREE.SphereGeometry(3.5,10,8),M(0xffffff));h.position.set(-2,11,0);g.add(h);return g}
function draw(){if(!R)init3();const m=G.me,w=innerWidth,h=innerHeight;
 if(cv3size!=w+'x'+h){cv3size=w+'x'+h;R.setSize(w,h);CAM.aspect=w/h;CAM.updateProjectionMatrix()}
 if(trackFor!==G.tr){trackFor=G.tr;buildTrack(G.tr)}
 if(gameFor!==G){gameFor=G;while(carsG.children.length)carsG.remove(carsG.children[0]);G.ca=m.a}
 for(const c of G.cars){if(!c.m){c.m=carMesh(new THREE.Color(c.T.c));carsG.add(c.m)}c.m.position.set(c.x,0,c.y);c.m.rotation.y=-c.a}
 G.ca+=wrap(m.a-G.ca)*.08;const ca=G.ca,cs=Math.cos(ca),sn=Math.sin(ca);
 CAM.position.set(m.x-cs*95,46,m.y-sn*95);CAM.lookAt(m.x+cs*60,6,m.y+sn*60);
 const f=60+Math.min(25,(m.spd||0)/18);if(Math.abs(CAM.fov-f)>.5){CAM.fov=f;CAM.updateProjectionMatrix()}
 R.render(SC,CAM)}
let cv3size='';

function hudu(){const g=G,m=g.me,pos=[...g.cars].sort((a,b)=>b.tot-a.tot).indexOf(m)+1,T=TIRES[m.tire];
 const fl=m.fin?'':g.phase=='go'&&g.t<5?'🟢 BANDEIRA VERDE':m.off?'🟡 BANDEIRA AMARELA — fora da pista':'';
 hud.innerHTML=`<div class=big>${g.cars.length>1?'P'+pos+'/'+g.cars.length:''}</div>Volta ${Math.min(m.laps+1,g.laps)}${g.laps>99?'':'/'+g.laps}<br>${(m.spd*.5|0)||0} km/h<br>⏱ ${fmt(g.phase=='go'?g.t-m.ls:0)} · Melhor ${fmt(m.best)}<br>
 <span style="color:${T.c}">● ${T.n}</span> ${(m.life*100)|0}%${m.pitT>0?' · PIT STOP':m.pitReq?' · PIT na próxima volta':''}<br>${fl}`}

addEventListener('keydown',e=>{K[e.code]=1;if(e.code=='KeyP'&&G)G.me.pitReq=!G.me.pitReq;if(e.code=='Escape'&&G)quit();if(e.code.startsWith('Arrow'))e.preventDefault()});
addEventListener('keyup',e=>K[e.code]=0);
document.querySelectorAll('#touch button').forEach(b=>{const k=b.dataset.k;
 b.onpointerdown=e=>{e.preventDefault();if(k=='P'&&G)G.me.pitReq=!G.me.pitReq;else TC[k]=1};
 b.onpointerup=b.onpointerleave=b.onpointercancel=()=>TC[k]=0});

/* ---------- Menus ---------- */
const scr=h=>{ui.style.display='block';ui.innerHTML='<div class=w>'+h+'</div>'};
const bars=T=>[['Velocidade',T.spd],['Aceleração',T.acc],['Dirigibilidade',T.hdl]].map(x=>`${x[0]}<div class=bar><i style="width:${x[1]}%;background:${T.c}"></i></div>`).join('');
function menu(){S.name=S.name||'Piloto';scr(`<h1>APEX <b>GP</b></h1>
<div class=card><b>${S.name}</b> · ${TEAMS[S.team].n} · ${S.pts} pts · ${S.wins} vitórias · ${S.races} corridas · ${S.titles} títulos</div>
<div class=g><button class=r onclick="pick('race')">🏁 Corrida Rápida</button><button onclick="champ()">🏆 Campeonato</button><button onclick="pick('quali')">⏱ Classificação</button>
<button onclick="pick('practice')">🔧 Treino</button><button class=r onclick="lobby()">🌐 Multiplayer Online</button><button onclick="garage()">🏎 Garagem</button><button onclick="rank()">📊 Ranking Global</button></div>
<p style="opacity:.6">Setas/WASD = pilotar · P = pit stop na próxima volta · Esc = sair. No celular use os botões na tela.</p>`);
 if(location.search.includes('sala='))lobby(new URLSearchParams(location.search).get('sala'))}
function garage(){scr(`<h2>Garagem</h2>Nome: <input value="${S.name}" maxlength=16 onchange="S.name=this.value;save()">
<div class=g>${TEAMS.map((T,i)=>`<div class=card><b style="color:${T.c}">${T.n}</b>${bars(T)}${T.d.map((d,j)=>`<button class="${S.team==i&&S.drv==j?'sel':''}" onclick="S.team=${i};S.drv=${j};save();garage()">${d}</button>`).join(' ')}</div>`).join('')}</div>
<h3>Pneu inicial</h3><div class=g>${TIRES.map((t,i)=>`<button class="${S.tire==i?'sel':''}" style="border-color:${t.c}" onclick="S.tire=${i};save();garage()">${t.n}</button>`).join('')}</div>
<button onclick="menu()">← Voltar</button>`)}
function pick(mode,champ){scr(`<h2>Escolha a pista</h2><p>Voltas: <select id=lp><option>3<option selected>5<option>8</select></p>
<div class=g>${TRACKS.map((t,i)=>`<button onclick="go('${mode}',${i})">${t.n}</button>`).join('')}</div><button onclick="menu()">← Voltar</button>`)}
function go(mode,i,champ){const laps=mode=='practice'?999:mode=='quali'?3:+($('#lp')?.value||3);G=null;start({mode,tr:i,trI:i,laps,champ})}
function champ(){const C=S.champ;if(!C){S.champ={round:0,pts:{}};save();return champ()}
 const st=Object.entries(C.pts).sort((a,b)=>b[1]-a[1]);
 scr(`<h2>Campeonato — Etapa ${C.round+1}/3</h2><table>${st.map((r,i)=>`<tr><td>${i+1}</td><td>${r[0]}</td><td>${r[1]} pts</td></tr>`).join('')}</table>
 <p><button class=r onclick="G=null;start({mode:'race',tr:${C.round%3},trI:${C.round%3},laps:3,champ:1})">Largar: ${TRACKS[C.round%3].n}</button>
 <button onclick="S.champ=null;save();menu()">Abandonar</button> <button onclick="menu()">← Voltar</button></p>`)}
function result(rows,ex,ch){scr(`<h2>Resultado</h2><p>${ex||''}</p><table><tr><th>Pos<th>Piloto<th>Equipe<th>Tempo<th>Melhor<th>Pts</tr>
${rows.map((r,i)=>`<tr style="${r.you||r.id==sid?'background:#2a1a1a':''}"><td>${r.pos||i+1}<td>${r.name}<td style="color:${TEAMS[r.team].c}">${TEAMS[r.team].n}<td>${fmt(r.time)}<td>${fmt(r.best)}<td>${r.pts??''}</tr>`).join('')}</table>
<p>${ch&&S.champ?'<button class=r onclick="champ()">Próxima etapa</button> ':''}<button onclick="quit()">Menu</button></p>`);hud.style.display='none';$('#exit').style.display='none'}
async function rank(){let d=[];try{d=await (await fetch('/api/leaderboard')).json()}catch(e){}
 scr(`<h2>Ranking Global</h2><table>${d.map((r,i)=>`<tr><td>${i+1}<td>${r.name}<td>${r.points} pts<td>${r.wins} vitórias<td>${r.races} corridas</tr>`).join('')||'<tr><td>Sem dados ainda</td></tr>'}</table><button onclick="menu()">← Voltar</button>`)}

/* ---------- Online ---------- */
function conn(){if(sock)return;sock=io();sock.on('connect',()=>{sid=sock.id;sock.emit('list')});
 sock.on('rooms',r=>{rooms=r;if(!room&&!G&&ui.dataset.s=='lobby')lobby()});
 sock.on('room',r=>{room=r;if(!G)roomUI()});
 sock.on('err',m=>alert(m));
 sock.on('start',r=>{room=r;start({mode:'race',online:1,tr:r.track,trI:r.track,laps:r.laps,players:r.players})});
 sock.on('st',d=>{const c=G&&G.cars.find(x=>x.id==d.id);if(c){c.tx=d.x;c.ty=d.y;c.ta=d.a;c.tot=d.t}});
 sock.on('res',r=>{if(!G||!G.me.fin)return;const me=r.find(x=>x.id==sid);if(me&&!G.saved){G.saved=1;S.pts+=me.pts;S.races++;S.wins+=me.pos==1;save()}
  result(r.map(x=>({...x})),'Online — aguardando demais pilotos aparecem conforme terminam')})}
function lobby(code){conn();ui.dataset.s='lobby';
 if(code){history.replaceState(0,'',location.pathname);setTimeout(()=>sock.emit('join',{code,name:S.name,team:S.team,pid:S.pid}),400)}
 scr(`<h2>Multiplayer</h2><div class=card>Criar sala — pista: <select id=lt>${TRACKS.map((t,i)=>`<option value=${i}>${t.n}`).join('')}</select> voltas: <select id=ll><option>3<option>5<option>8</select>
 <button class=r onclick="sock.emit('create',{track:+$('#lt').value,laps:+$('#ll').value,name:S.name,team:S.team,pid:S.pid})">Criar</button></div>
 <div class=card>Entrar por código: <input id=jc maxlength=4 size=5 style="text-transform:uppercase"> <button onclick="sock.emit('join',{code:$('#jc').value,name:S.name,team:S.team,pid:S.pid})">Entrar</button></div>
 <h3>Salas abertas</h3>${rooms.map(r=>`<div class=card>${r.code} · ${TRACKS[r.track].n} · ${r.laps} voltas · ${r.n} piloto(s) · host ${r.host} <button onclick="sock.emit('join',{code:'${r.code}',name:S.name,team:S.team,pid:S.pid})">Entrar</button></div>`).join('')||'<p>Nenhuma sala. Crie a sua!</p>'}
 <button onclick="sock.emit('list');lobby()">↻ Atualizar</button> <button onclick="menu()">← Voltar</button>`)}
function roomUI(){ui.dataset.s='room';const host=room.host==sid,link=location.origin+'/?sala='+room.code;
 scr(`<h2>Sala ${room.code} — ${TRACKS[room.track].n} · ${room.laps} voltas</h2><div class=card>Convide amigos: <input readonly value="${link}" size=34 onclick="this.select();navigator.clipboard?.writeText(this.value)"></div>
 <table>${room.players.map(p=>`<tr><td>${p.name}${p.id==room.host?' 👑':''}<td style="color:${TEAMS[p.team].c}">${TEAMS[p.team].n}</tr>`).join('')}</table>
 <p>${host?'<button class=r onclick="sock.emit(\'start\')">Iniciar corrida</button>':'Aguardando o host iniciar…'} <button onclick="sock.emit('leave');room=null;lobby()">Sair da sala</button></p>`)}
menu();
