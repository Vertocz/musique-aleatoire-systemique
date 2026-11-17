(() => {
"use strict";
const $ = id => document.getElementById(id);
const d = n => 1 + Math.floor(Math.random() * n);
function rollUntil(n, ok){ const rejected=[]; let v=d(n); while(!ok(v)){ rejected.push(v); v=d(n); } return {v, rejected}; }

/* ---------- Théorie ---------- */
const LET = "CDEFGAB", NAT = [0,2,4,5,7,9,11];
const FR = {C:"Do",D:"Ré",E:"Mi",F:"Fa",G:"Sol",A:"La",B:"Si"};
const SCALES = {maj:[0,2,4,5,7,9,11], nat:[0,2,3,5,7,8,10], harm:[0,2,3,5,7,8,11]};
const TONICS = {
  maj:{"♯":["C","G","D","A","E","B","F#","C#"], "♭":["C","F","Bb","Eb","Ab","Db","Gb","Cb"]},
  min:{"♯":["A","E","B","F#","C#","G#","D#","A#"], "♭":["A","D","G","C","F","Bb","Eb","Ab"]}
};
const ACC = {"-2":"𝄫","-1":"♭","0":"","1":"♯","2":"𝄪"};
const ACC_FR = {"-1":" bémol","0":"","1":" dièse"};
const ROMAN = ["I","II","III","IV","V","VI","VII"];

function parseNote(s){ const l=LET.indexOf(s[0]); const a=(s.slice(1).match(/#/g)||[]).length-(s.slice(1).match(/b/g)||[]).length; return {l,a,pc:(NAT[l]+a+12)%12}; }
function buildScale(tonic, kind){
  const t=parseNote(tonic), iv=SCALES[kind];
  return iv.map((x,i)=>{ const l=(t.l+i)%7; const pc=(t.pc+x)%12; let a=pc-NAT[l]; if(a>6)a-=12; if(a<-6)a+=12; return {l,a,pc,name:LET[l]+ACC[a]}; });
}
function triad(scale,i){
  const r=scale[i], t=scale[(i+2)%7], f=scale[(i+4)%7];
  const th=(t.pc-r.pc+12)%12, fi=(f.pc-r.pc+12)%12;
  let q="", rn=ROMAN[i];
  if(th===4&&fi===7){q="";}
  else if(th===3&&fi===7){q="m"; rn=rn.toLowerCase();}
  else if(th===3&&fi===6){q="°"; rn=rn.toLowerCase()+"°";}
  else if(th===4&&fi===8){q="+"; rn=rn+"+";}
  return {name:r.name+q, rn, pcs:[r.pc,t.pc,f.pc]};
}

/* ---------- État ---------- */
const S = {met:null, ton:null, deg:null, grid:null, mel:null, bass:null, drums:null};

function rollMet(){
  const log=[];
  const a=d(10), n=5+a;
  log.push({die:"D10",v:a,txt:`5 + ${a} = <strong>${n} croches</strong> par mesure`});
  const mes=d(6);
  log.push({die:"D6",v:mes,txt:`<strong>${mes} mesure${mes>1?"s":""}</strong>`});
  const dv=d(6), div=dv<=3?"binaire":"ternaire";
  log.push({die:"D6",v:dv,txt:`division <strong>${div}</strong>`});
  S.met={n,mes,div,a,dv,groups:groupsFor(n,div),log};
}
function groupsFor(n,div){
  if(div==="binaire"){ const g=Array(Math.floor(n/2)).fill(2); if(n%2){g[g.length-1]=3;} return g; }
  const r=n%3, k=Math.floor(n/3);
  if(r===0) return Array(k).fill(3);
  if(r===2) return [...Array(k).fill(3),2];
  return [...Array(k-1).fill(3),2,2];
}
function rollTon(){
  const log=[];
  const a=d(8), alt=a<=4?"♭":"♯";
  log.push({die:"D8",v:a,txt:`altérations en <strong>${alt==="♭"?"bémols":"dièses"}</strong>`});
  const b=d(8), count=b===8?0:b;
  log.push({die:"D8",v:b,txt:b===8?"8 → <strong>aucune altération</strong>":`<strong>${count} ${alt}</strong>`});
  const c=d(8), mode=c<=4?"min":"maj";
  log.push({die:"D8",v:c,txt:`mode <strong>${mode==="maj"?"majeur":"mineur"}</strong>`});
  let kind="maj";
  if(mode==="min"){ const p=d(2); kind=p===1?"nat":"harm"; log.push({die:"Pièce",v:p===1?"pile":"face",txt:`mineur <strong>${kind==="nat"?"naturel":"harmonique"}</strong>`}); }
  const tonic=TONICS[mode][alt][count];
  S.ton={alt,count,mode,kind,tonic,dice:[a,b,c],log};
}
function rollDeg(){
  const log=[];
  const nb=d(6);
  log.push({die:"D6",v:nb,txt:`<strong>${nb} degré${nb>1?"s":""}</strong> utilisé${nb>1?"s":""}`});
  const chosen=[];
  for(let k=0;k<nb;k++){
    const r=rollUntil(8,v=>v!==8&&!chosen.includes(v));
    chosen.push(r.v);
    log.push({die:"D8",v:r.v,rej:r.rejected,degSlot:r.v-1,txt:""});
  }
  let scores=chosen.map(()=>d(20));
  const first=scores.slice();
  let guard=0, tie=false;
  while(new Set(scores).size<scores.length && guard++<50){
    tie=true;
    const counts={}; scores.forEach(s=>counts[s]=(counts[s]||0)+1);
    scores=scores.map(s=>counts[s]>1?d(20):s);
  }
  S.deg={nb,list:chosen.map((g,i)=>({deg:g-1,score:scores[i],first:first[i]})),tie,log};
}
function dieFor(T){ if(T===1)return null; if(T<=4)return 4; if(T<=6)return 6; if(T<=10)return 10; if(T<=20)return 20; return 100; }
function rollGrid(keep){
  const prev=(keep&&S.grid)?S.grid.cells:null;
  const list=S.deg.list.slice().sort((a,b)=>a.score-b.score);
  const n=list.length, T=n*(n+1)/2, die=dieFor(T);
  let lo=1; const ranges=list.map((x,i)=>{ const w=i+1; const r={deg:x.deg,w,lo,hi:lo+w-1}; lo+=w; return r; });
  const cells=[], log=[];
  const count=S.met.mes*2;
  for(let c=0;c<count;c++){
    let face, rej=[], v;
    if(prev&&prev[c]&&prev[c].face<=T){ const o=prev[c]; cells.push({deg:ranges.find(r=>o.face>=r.lo&&o.face<=r.hi).deg,v:o.v,face:o.face,rej:[]}); continue; }
    if(die===null){ face=1; }
    else if(die===100){ const r=rollUntil(100,x=>x<=84); rej=r.rejected; v=r.v; face=((v-1)%21)+1; }
    else { const r=rollUntil(die,x=>x<=T); rej=r.rejected; v=r.v; face=v; }
    const range=ranges.find(r=>face>=r.lo&&face<=r.hi);
    cells.push({deg:range.deg,v,face,rej});
  }
  if(prev) log.push({die:"—",v:"",txt:"mêmes dés qu’avant, reconstruits sur la nouvelle métrique"});
  S.grid={T,die,ranges,cells,log};
}

const R2=[[4],[2,2],[2,1,1],[1,1,2],[1,1,1,1],[-2,2]];
const R3=[[6],[4,2],[2,4],[2,2,2],[3,1,2],[-2,2,2]];
const STEP={1:-2,2:-1,3:-1,4:0,5:1,6:1,7:2};
const mod7=i=>((i%7)+7)%7;
/* Dés mémorisés : pour rejouer les mêmes valeurs sur une nouvelle grille (réharmonisation) */
const DICE={mel:{},bass:{},drums:{}};
function kd(part,key,n,keep){ const st=DICE[part]; if(keep&&st[key]!==undefined&&st[key]<=n) return st[key]; const v=d(n); st[key]=v; return v; }
function rollMel(keep){
  if(!keep) DICE.mel={};
  const log=[], M=S.met, n=M.n;
  const a=kd("mel","amb",6,keep), span=a<=2?5:a<=4?7:9;
  if(keep) log.push({die:"—",v:"",txt:"mêmes dés qu’avant, recalés sur les nouveaux accords"});
  log.push({die:"D6",v:a,txt:`ambitus <strong>${span===5?"sixte":span===7?"octave":"dixième"}</strong>`});
  const lo=-Math.floor(span/2), hi=lo+span;
  const nearest=(set,cur,excl)=>{ let best=null; for(let i=lo;i<=hi;i++){ if(!set.includes(mod7(i))||(excl&&i===cur)) continue; if(best===null||Math.abs(i-cur)<Math.abs(best-cur)||(Math.abs(i-cur)===Math.abs(best-cur)&&Math.abs(i)<Math.abs(best))) best=i; } return best===null?cur:best; };
  const notes=[]; let cur=0;
  for(let m=0;m<M.mes;m++){
    const rr=[], pr=[]; let pos=0; const evs=[];
    M.groups.forEach((g,gi)=>{ const r=kd("mel",`r${m}:${gi}`,6,keep); rr.push(r); (g===2?R2:R3)[r-1].forEach(x=>{ evs.push({start:pos,dur:Math.abs(x),rest:x<0}); pos+=Math.abs(x); }); });
    const started=[false,false]; let k=0;
    evs.forEach(ev=>{
      if(ev.rest) return;
      const half=ev.start<n?0:1, deg=S.grid.cells[m*2+half].deg, tones=[deg,(deg+2)%7,(deg+4)%7];
      if(!started[half]){ started[half]=true; const r=kd("mel",`p${m}:${k++}`,6,keep); cur=nearest([tones[r<=2?0:r<=4?1:2]],cur,false); pr.push(`[${r}]`); }
      else { const r=kd("mel",`p${m}:${k++}`,8,keep); if(r===8){ cur=nearest(tones,cur,true); } else { let nx=cur+STEP[r]; if(nx>hi||nx<lo) nx=cur-STEP[r]; cur=nx; } pr.push(String(r)); }
      notes.push({m,start:ev.start,dur:ev.dur,idx:cur,half});
    });
    log.push({die:"D6",v:rr.join("·"),txt:`m.${m+1} rythme`});
    if(pr.length) log.push({die:"D6/D8",v:pr.join(" "),txt:`m.${m+1} hauteurs`});
  }
  if(notes.length){ const last=notes[notes.length-1]; const deg=S.grid.cells[last.m*2+last.half].deg; last.idx=nearest([deg],last.idx,false); }
  S.mel={span,lo,hi,notes,log};
}

const GM={kick:36,snare:38,hhc:42,hho:46,ride:51,crash:49};
function rollDrums(keep){
  if(!keep) DICE.drums={};
  const log=[], M=S.met, n=M.n, G=S.grid;
  const r1=kd("drums","cym",6,keep), ride=r1>=5; log.push({die:"D6",v:r1,txt:`cymbale de rythme : <strong>${ride?"ride":"charleston"}</strong>`});
  const r2=kd("drums","dens",6,keep), dens=r2<=2?"croches":r2<=4?"doubles":"groupes"; log.push({die:"D6",v:r2,txt:`densité : <strong>${dens==="croches"?"croches":dens==="doubles"?"doubles croches":"un coup par groupe"}</strong>`});
  const r3=kd("drums","fill",6,keep), fill=r3>=5; log.push({die:"D6",v:r3,txt:fill?"<strong>break</strong> de caisse claire en fin de grille":"pas de break"});
  const hits=[]; const add=(m,st,inst,vel)=>{ if(!hits.some(h=>h.m===m&&h.s===st&&h.inst===inst)) hits.push({m,s:st,inst,vel}); };
  const starts=[]; let acc=0; M.groups.forEach(g=>{ starts.push(acc); acc+=g; });
  for(let m=0;m<M.mes;m++){
    const rr=[], extra=[];
    const fillFrom = (fill&&m===M.mes-1) ? starts[starts.length-1]*2 : Infinity;
    starts.forEach((c,gi)=>{ const st=2*c; if(st>=fillFrom) return;
      if(gi===0){ add(m,st,"kick",110); }
      else { const r=kd("drums",`g${m}:${gi}`,6,keep); rr.push(r); if(r<=2||r===6) add(m,st,"kick",95); if(r>=3) add(m,st,"snare",100); } });
    if(n<fillFrom) add(m,n,"kick",100);
    [0,1].forEach(h=>{ const cell=m*2+h, st=h?n:0; if(st>=fillFrom) return;
      if(cell===0){ add(m,0,"crash",110); return; }
      if(G.cells[cell].deg!==G.cells[cell-1].deg){ const r=kd("drums",`c${m}:${h}`,6,keep); extra.push(`${h?"½":"1"}:${r}`); if(r>=5) add(m,st,"crash",100); } });
    const hat=ride?"ride":"hhc";
    for(let st=0;st<2*n&&st<fillFrom;st++){
      const isGroup=st%2===0&&starts.includes(st/2);
      const on = dens==="doubles" || (dens==="croches"&&st%2===0) || (dens==="groupes"&&isGroup);
      if(on) add(m,st,hat,isGroup?95:(st%2?55:75));
    }
    if(!ride && dens!=="groupes" && 2*n-2<fillFrom){ const r=kd("drums",`o${m}`,6,keep); extra.push(`ouv:${r}`); if(r===6){ const i=hits.findIndex(h=>h.m===m&&h.s===2*n-2&&h.inst==="hhc"); if(i>=0) hits.splice(i,1); add(m,2*n-2,"hho",85); } }
    if(fillFrom<Infinity){ for(let st=fillFrom, k=0; st<2*n; st++, k++) add(m,st,"snare",60+Math.min(60,k*8)); add(m,fillFrom,"kick",100); }
    log.push({die:"D6",v:rr.length?rr.join("·"):"—",txt:`m.${m+1} groupes${extra.length?` · crash/ouvert ${extra.join(" ")}`:""}`});
  }
  if(keep) log.splice(3,0,{die:"—",v:"",txt:"mêmes dés qu’avant, recalés sur les nouveaux accords"});
  S.drums={ride,dens,fill,hits,log};
}


/* ---------- Basse : elle répond à la mélodie ---------- */
function rollBass(keep){
  if(!keep) DICE.bass={};
  const log=[], M=S.met, n=M.n, G=S.grid, total=G.cells.length;
  const r0=kd("bass","style",6,keep), style=r0<=2?"tenue":r0<=4?"groupes":"reponse";
  log.push({die:"D6",v:r0,txt:`style : <strong>${style==="tenue"?"notes tenues":style==="groupes"?"une note par groupe de croches":"réponse à la mélodie"}</strong>`});
  const lo=-4, hi=7;
  const nearest=(set,cur)=>{ let best=null; for(let i=lo;i<=hi;i++){ if(!set.includes(mod7(i))) continue; if(best===null||Math.abs(i-cur)<Math.abs(best-cur)) best=i; } return best===null?cur:best; };
  const melAttack=new Set(S.mel.notes.map(x=>x.m+":"+x.start));
  const melAt=(m,s)=>{ let v=null; for(const x of S.mel.notes){ if(x.m<m||(x.m===m&&x.start<=s)) v=x.idx; } return v; };
  const starts=[]; let acc=0; M.groups.forEach(g=>{ starts.push(acc*2); acc+=g; });
  const notes=[]; let cur=0;
  for(let m=0;m<M.mes;m++){
    const pr=[], places=[];
    for(let h=0;h<2;h++){
      const cell=m*2+h, deg=G.cells[cell].deg, nextDeg=G.cells[(cell+1)%total].deg;
      const tones=[deg,(deg+2)%7,(deg+4)%7], a=h*n, b=a+n;
      let at=[a];
      if(style==="groupes") starts.forEach(s=>{ if(s>a&&s<b) at.push(s); });
      if(style==="reponse") for(let s=a+1;s<b;s++){ if(s%2) continue; if(melAttack.has(m+":"+s)) continue; const r=kd("bass",`q${m}:${h}:${places.length}`,6,keep); places.push(r); if(r>=4) at.push(s); }
      at=[...new Set(at)].sort((x,y)=>x-y);
      let prevS=a;
      at.forEach((s,i)=>{
        if(i===0){ const r=kd("bass",`p${m}:${h}:${i}`,6,keep); cur=nearest([tones[r<=4?0:r===5?1:2]],cur); pr.push(`[${r}]`); }
        else { const r=kd("bass",`p${m}:${h}:${i}`,6,keep); pr.push(String(r));
          if(r===1) cur=nearest([tones[0]],cur);
          else if(r===2) cur=nearest([tones[2]],cur);
          else if(r===3){ cur = cur+7<=hi ? cur+7 : cur-7>=lo ? cur-7 : cur; }
          else if(r===4) cur=nearest([tones[1]],cur);
          else if(r===5){ const tg=nearest([nextDeg],cur); const st=tg>cur?1:tg<cur?-1:1; cur=Math.max(lo,Math.min(hi,cur+st)); }
          else { const m1=melAt(m,prevS), m2=melAt(m,s); const st=(m1!==null&&m2!==null&&m2>m1)?-1:1; let nx=cur+st; if(nx>hi||nx<lo) nx=cur-st; cur=nx; }
        }
        const end=i+1<at.length?at[i+1]:b;
        notes.push({m,start:s,dur:end-s,idx:cur,half:h}); prevS=s;
      });
    }
    log.push({die:"D6",v:pr.join(" "),txt:`m.${m+1} hauteurs`});
    if(places.length) log.push({die:"D6",v:places.join(""),txt:`m.${m+1} places (4–6 : la basse répond)`});
  }
  if(keep) log.splice(1,0,{die:"—",v:"",txt:"mêmes dés qu’avant, recalés sur les nouveaux accords"});
  S.bass={style,notes,log};
}

/* ---------- Rendu ---------- */
let scale=[], chords={};
function computeChords(){ scale=buildScale(S.ton.tonic,S.ton.kind); chords={}; for(let i=0;i<7;i++) chords[i]=triad(scale,i); }
function keyNameFr(){ const t=parseNote(S.ton.tonic); return FR[LET[t.l]]+(ACC_FR[t.a]||"")+" "+(S.ton.mode==="maj"?"majeur":"mineur"); }
let HUES=[15,135,225];
function dieSvg(kind,value,hue,size){
  const hs=(s,l,a)=>`hsl(${hue} ${s}% ${l}%${a?" / "+a:""})`;
  const c={top:hs(90,88),light:hs(88,78),mid:hs(85,66),dark:hs(75,54),deep:hs(65,44),edge:hs(45,18,.35),ink:hs(45,12)};
  const P=(pts,f)=>`<polygon points="${pts}" fill="${f}" stroke="${c.edge}" stroke-width="1.5" stroke-linejoin="round"/>`;
  let body="", pos=null; const label=String(value);
  if(kind==="d4"){ body=P("46,8 96,72 84,88",c.dark)+P("46,8 84,88 8,88",c.light); pos=[46,66,26]; }
  else if(kind==="d6"){
    body=P("50,8 88,28 50,48 12,28",c.top)+P("12,28 50,48 50,92 12,72",c.dark)+P("50,48 88,28 88,72 50,92",c.light);
    const n=Math.min(6,Math.max(1,parseInt(label,10)||1)); const F={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
    let dots=""; F[n].forEach(i=>{ dots+=`<circle cx="${(i%3-1)*10}" cy="${(Math.floor(i/3)-1)*11}" r="4.4" fill="${c.ink}"/>`; });
    body+=`<g transform="translate(69 60) skewY(-27.8)">${dots}</g>`;
  }
  else if(kind==="d8"){ body=P("8,42 50,96 22,66",c.deep)+P("92,42 78,66 50,96",c.deep)+P("22,66 50,96 78,66",c.dark)+P("50,4 8,42 22,66",c.mid)+P("50,4 78,66 92,42",c.dark)+P("50,4 22,66 78,66",c.light); pos=[50,46,24]; }
  else if(kind==="d10"||kind==="d100"){ body=P("5,50 12,64 50,96",c.deep)+P("95,50 50,96 88,64",c.deep)+P("12,64 28,56 50,67 50,96",c.dark)+P("88,64 50,96 50,67 72,56",c.deep)+P("50,4 5,50 12,64 28,56",c.mid)+P("50,4 72,56 88,64 95,50",c.dark)+P("50,4 28,56 50,67 72,56",c.light); pos=[50,44,22]; }
  else if(kind==="coin"){ body=`<circle cx="50" cy="54" r="40" fill="${c.dark}" stroke="${c.edge}" stroke-width="1.5"/><circle cx="50" cy="50" r="40" fill="${c.light}" stroke="${c.edge}" stroke-width="1.5"/><circle cx="50" cy="50" r="31" fill="none" stroke="${c.mid}" stroke-width="3"/>`; pos=[50,50,22]; }
  else { body=P("50,4 10,27 50,22",c.mid)+P("50,4 50,22 90,27",c.top)+P("90,27 50,22 78,68",c.mid)+P("90,27 78,68 90,73",c.dark)+P("90,73 78,68 50,96",c.deep)+P("50,96 78,68 22,68",c.dark)+P("50,96 22,68 10,73",c.deep)+P("10,73 22,68 10,27",c.dark)+P("10,27 22,68 50,22",c.mid)+P("50,22 22,68 78,68",c.light); pos=[50,54,24]; }
  let num="";
  if(pos){ const units=label.length>2?pos[2]*.6:label.length>1?pos[2]*.8:pos[2]; num=`<text x="${pos[0]}" y="${pos[1]}" text-anchor="middle" dominant-baseline="central" font-family="system-ui,sans-serif" font-weight="800" font-size="${units}" fill="${c.ink}">${label}</text>`; }
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true" style="flex:none;filter:drop-shadow(0 4px 4px rgba(0,0,0,.18))">${body}${num}</svg>`;
}
let dieHueIdx=0;
function dieChip(e){
  const rej=(e.rej&&e.rej.length)?e.rej.map(x=>`<s>${x}</s>`).join(""):"";
  const kinds={D4:"d4",D6:"d6",D8:"d8",D10:"d10",D20:"d20",D100:"d100","Pièce":"coin"};
  const k=kinds[e.die], single=(typeof e.v==="number")||(/^\d+$/.test(String(e.v)))||(k==="coin");
  if(k && single){ const hue=HUES[(dieHueIdx++)%3]; const lbl=k==="coin"?(e.v==="pile"?"P":"F"):e.v; return `<span class="dice" title="${e.die} : ${e.v}">${rej}${dieSvg(k,lbl,hue,30)}</span>`; }
  return `<span class="chip">${e.die} ${rej}<b>${e.v}</b></span>`;
}
function noteName(i){ return scale[mod7(i)].name; }
function melMidi(i){ const tpc=scale[0].pc; const base=60+tpc; const oct=Math.floor(i/7); return base+12*oct+((scale[mod7(i)].pc-tpc+12)%12); }
function drumSvg(m){
  const n=S.met.n, W=n*2*10, rows={crash:0,hhc:1,hho:1,ride:1,snare:2,kick:3}, cls={crash:"cy",hhc:"hh",hho:"hh",ride:"hh",snare:"sn",kick:"k"};
  const r=S.drums.hits.filter(h=>h.m===m).map(h=>`<rect class="${cls[h.inst]}" x="${h.s*10+1.5}" y="${rows[h.inst]*8+1}" width="${h.inst==="hho"?14:7}" height="6" rx="1.5" opacity="${(0.35+h.vel/180).toFixed(2)}"/>`).join("");
  return `<svg class="drum-svg" viewBox="0 0 ${W} 32" preserveAspectRatio="none" role="img" aria-label="Batterie mesure ${m+1}"><line x1="${W/2}" y1="0" x2="${W/2}" y2="32"/>${r}</svg>`;
}
function bassSvg(m){
  const n=S.met.n, W=n*2*10, lo=-4, hi=7, H=(hi-lo+1)*3;
  const r=S.bass.notes.filter(x=>x.m===m).map(x=>`<rect x="${x.start*10+.5}" y="${(hi-x.idx)*3}" width="${Math.max(2,x.dur*10-1)}" height="3" rx="1" style="fill:var(--bass)"/>`).join("");
  return `<svg class="roll-svg bass-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Basse mesure ${m+1}"><line x1="${W/2}" y1="0" x2="${W/2}" y2="${H}"/>${r}</svg>`;
}
function renderLog(id,entries){ $(id).innerHTML=entries.map(e=>`<li>${dieChip(e)}<span class="txt">${e.txt}</span></li>`).join(""); }

const DISPLAY=[["Shrikhand","'Shrikhand', cursive",400,1],["Bricolage Grotesque","'Bricolage Grotesque', sans-serif",800,1.05],["Fraunces","'Fraunces', serif",900,1.02],["Lilita One","'Lilita One', sans-serif",400,1.08],["Bungee","'Bungee', sans-serif",400,.78],["Unbounded","'Unbounded', sans-serif",800,.76],["Baloo 2","'Baloo 2', sans-serif",800,1.05],["Chewy","'Chewy', cursive",400,1.05],["Righteous","'Righteous', sans-serif",400,.95],["Bagel Fat One","'Bagel Fat One', sans-serif",400,.9]];
const BODY=[["DM Sans","'DM Sans', sans-serif"],["Nunito","'Nunito', sans-serif"],["Outfit","'Outfit', sans-serif"],["Figtree","'Figtree', sans-serif"],["Work Sans","'Work Sans', sans-serif"],["Space Grotesk","'Space Grotesk', sans-serif"]];
const RADII=[0,6,12,20,28,40];
function lum(h,s,l){ s/=100; l/=100; const k=n=>(n+h/30)%12, a=s*Math.min(l,1-l), f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1))), lin=c=>c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4); return .2126*lin(f(0))+.7152*lin(f(8))+.0722*lin(f(4)); }
const contrast=(a,b)=>(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
let THEME=null;
function drawDesign(){
  const sign=d(8), cnt=d(8), mode=d(8), title=d(10), text=d(6), shape=d(6);
  return {sign,cnt,mode,title,text,shape,flat:sign<=4,count:cnt===8?0:cnt,minor:mode<=4};
}
function applyTheme(P){
  const fifths=P.flat?-P.count:P.count;
  const root=(15+fifths*30+360)%360;
  const iv=P.minor?[0,3,7]:[0,4,7];
  const hues=iv.map(x=>(root+x*30)%360); HUES=hues;
  const disp=DISPLAY[P.title-1], body=BODY[P.text-1], rad=RADII[P.shape-1];
  const lift=h=>h>=190&&h<=300?8:0, accL=[64,72,62];
  const acc=hues.map((h,i)=>({h,s:88,l:accL[i]+lift(h)}));
  const hsl=c=>`hsl(${c.h} ${c.s}% ${c.l}%)`;
  const inkC={h:root,s:45,l:10}, inkL=lum(inkC.h,inkC.s,inkC.l), ink=hsl(inkC);
  const pickInk=c=>{ const L=lum(c.h,c.s,c.l); return contrast(L,inkL)>=contrast(L,1)?ink:"#ffffff"; };
  const v={"--bg":hsl({h:root,s:80,l:95}),"--surface":hsl({h:root,s:70,l:99}),"--ink":ink,
    "--a1":hsl(acc[0]),"--a2":hsl(acc[1]),"--a3":hsl(acc[2]),"--a1-ink":pickInk(acc[0]),"--a2-ink":pickInk(acc[1]),"--a3-ink":pickInk(acc[2]),
    "--deep":`hsl(${hues[0]} 75% 36%)`,"--bass":`hsl(${hues[2]} 70% 34%)`,"--tint":`hsl(${hues[0]} 90% 90%)`,
    "--display":disp[1],"--display-w":disp[2],"--body":body[1],
    "--hero-size":Math.round(76*disp[3])+"px","--chord-size":Math.round(24*disp[3])+"px",
    "--radius":rad+"px","--radius-xs":Math.round(rad*.4)+"px","--radius-btn":(rad>=20?999:rad)+"px"};
  const r=document.documentElement.style; Object.entries(v).forEach(([k,val])=>r.setProperty(k,val));
  const tints=hues.map(h=>`hsl(${h} 90% ${88+lift(h)/2}%)`), tints2=hues.map(h=>`hsl(${h} 85% ${80+lift(h)/2}%)`);
  THEME={P,root,hues,disp,body,rad,v,tints,tints2};
  $("logoDie").innerHTML=dieSvg("d6",P.text,hues[0],48);
  $("decoBig").innerHTML=dieSvg("d10",P.title,hues[1],124);
  $("decoSmall").innerHTML=dieSvg("d8",P.cnt,hues[2],70);
}
function render(){
  computeChords(); dieHueIdx=0;
  const M=S.met, Tn=S.ton, D=S.deg, G=S.grid;
  renderLog("log-met",M.log);
  renderLog("log-ton",Tn.log);
  // Degrés : nom d'accord recalculé selon la tonalité
  const degEntries=D.log.map(e=> e.degSlot===undefined?e:{...e,txt:`degré <strong>${ROMAN[e.degSlot]}</strong> → <strong>${chords[e.degSlot].name}</strong>`});
  const ordered=D.list.slice().sort((a,b)=>b.score-a.score);
  D.list.forEach(x=>degEntries.push({die:"D20",v:x.score,rej:x.first!==x.score?[x.first]:[],txt:`fréquence de <strong>${chords[x.deg].name}</strong>`}));
  if(D.tie) degEntries.push({die:"—",v:"",txt:"égalité au D20 : scores à égalité relancés (barrés)"});
  renderLog("log-deg",degEntries);
  const dieLbl=G.die===null?"aucun dé":"D"+G.die;
  const gl=[{die:"Total",v:G.T,txt:G.die===null?"un seul accord, pas de tirage":`chances réparties sur un <strong>${dieLbl}</strong>`}];
  G.cells.forEach((c,i)=>{ if(G.die===null)return; gl.push({die:dieLbl,v:c.v,rej:c.rej,txt:`m.${Math.floor(i/2)+1} ${i%2?"2ᵉ":"1ʳᵉ"} moitié → <strong>${chords[c.deg].name}</strong>${G.die===100?` (case ${c.face})`:""}`}); });
  renderLog("log-grid",gl);
  renderLog("log-mel",S.mel.log);
  renderLog("log-bass",S.bass.log);
  renderLog("log-drums",S.drums.log);
  $("hatLbl").textContent=S.drums.ride?"Ride":"Charleston";

  const Hh=THEME.hues;
  const keyFull=keyNameFr()+(Tn.mode==="min"?(Tn.kind==="nat"?" naturel":" harmonique"):"");
  const rows=[
    {k:"d10",v:M.a,h:Hh[0],l:"Métrique",r:`${M.n}/8`,d:"5 + D10 croches par mesure"},
    {k:"d6",v:M.mes,h:Hh[1],l:"Mesures",r:String(M.mes),d:"D6, un accord par demi-mesure, en boucle"},
    {k:"d6",v:M.dv,h:Hh[2],l:"Division",r:M.div,d:"groupes de croches : "+M.groups.join("+")},
    {k:"d8",v:Tn.dice[1],h:Hh[0],l:"Tonalité",r:keyFull,d:(Tn.count?`${Tn.count} ${Tn.alt}`:"aucune altération")+` · dés : ${Tn.dice.join(", ")}`},
    {k:"d6",v:D.nb,h:Hh[1],l:"Accords",r:ordered.map(x=>chords[x.deg].name).join(" "),d:"du plus au moins fréquent · "+ordered.map(x=>chords[x.deg].rn).join(" ")},
    {k:"d6",v:S.bass.style==="tenue"?1:S.bass.style==="groupes"?3:5,h:Hh[0],l:"Basse",r:S.bass.style==="tenue"?"notes tenues":S.bass.style==="groupes"?"une note par groupe":"réponse à la mélodie",d:`${S.bass.notes.length} notes · fondamentale en début de demi-mesure`},
    {k:"d6",v:S.mel.span===5?2:S.mel.span===7?4:6,h:Hh[2],l:"Mélodie et batterie",r:`ambitus ${S.mel.span===5?"sixte":S.mel.span===7?"octave":"dixième"}, ${S.drums.ride?"ride":"charleston"}`,d:`${S.mel.notes.length} notes · densité ${S.drums.dens==="croches"?"croches":S.drums.dens==="doubles"?"doubles croches":"par groupe"}${S.drums.fill?" · break en fin":""}`}
  ];
  $("pieceRows").innerHTML=rows.map(x=>`<li>${dieSvg(x.k,x.v,x.h,48)}<span class="t"><b>${x.l} : ${x.r}</b><small>${x.d}</small></span></li>`).join("");
  $("grille-titre").textContent="La grille, en "+keyFull;
  $("gridSub").textContent=`${M.n}/8 (${M.groups.join("+")}) · un accord par demi-mesure · en boucle`;
  $("footKey").textContent=`${keyFull} · ${M.n}/8 · ${M.mes} mesure${M.mes>1?"s":""}`;


  // Grille
  const order=D.list.map(x=>x.deg).sort((a,b)=>a-b);
  const degColor=d=>{ const k=order.indexOf(d); return k<3?THEME.tints[k]:THEME.tints2[k-3]; };
  const starts=new Set(); let acc=0; M.groups.forEach(g=>{starts.add(acc); acc+=g;});
  let html="";
  for(let m=0;m<M.mes;m++){
    let ticks=""; for(let s=0;s<M.n*2;s++){ const c=s/2; const cls= s===0?"d":(s%2===0&&starts.has(c)?"g":""); ticks+=`<i class="${cls}" data-t="${s}"></i>`; }
    html+=`<div class="measure"><div class="measure-top"><span>Mesure ${m+1}</span><span>${M.n}/8</span></div><div class="halves">`;
    for(let h=0;h<2;h++){ const c=G.cells[m*2+h], ch=chords[c.deg];
      html+=`<div class="half" data-cell="${m*2+h}" style="background:${degColor(c.deg)}"><span class="rn">${ch.rn}</span><span class="ch">${ch.name}</span></div>`; }
    const Mel=S.mel, W=M.n*2*10, H=(Mel.span+1)*6;
    const mn=Mel.notes.filter(x=>x.m===m);
    const rects=mn.map(x=>`<rect class="n" x="${x.start*10+.5}" y="${(Mel.hi-x.idx)*6+.5}" width="${x.dur*10-1}" height="5" rx="1"/>`).join("");
    const names=[0,1].map(h=>mn.filter(x=>x.half===h).map(x=>noteName(x.idx)).join(" ")||"—");
    html+=`</div><svg class="roll-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Mélodie mesure ${m+1}"><line x1="${W/2}" y1="0" x2="${W/2}" y2="${H}"/>${rects}</svg><div class="mel"><span>${names[0]}</span><span>${names[1]}</span></div>${bassSvg(m)}${drumSvg(m)}<div class="ticks" data-m="${m}">${ticks}</div></div>`;
  }
  $("grid").innerHTML=html;

  // Poids
  $("dieInfo").textContent=G.die===null?"Un seul accord":`Dé de grille : D${G.die} pour ${G.T} chances`;
  const maxW=G.ranges.length;
  $("weights").innerHTML=G.ranges.slice().reverse().map(r=>{ const ch=chords[r.deg]; const pct=Math.round(r.w/G.T*100);
    return `<div class="wrow"><span class="name">${ch.name}</span><span class="wbar"><span style="width:${r.w/maxW*100}%"></span></span><span class="meta">${r.lo===r.hi?r.lo:r.lo+"–"+r.hi} · ${pct} %</span></div>`; }).join("");
}

/* ---------- Texte & MIDI ---------- */
function gridText(){
  const M=S.met, G=S.grid;
  const ordered=S.deg.list.slice().sort((a,b)=>b.score-a.score);
  let rows=[]; for(let m=0;m<M.mes;m++){ rows.push("| "+chords[G.cells[m*2].deg].name.padEnd(5)+" "+chords[G.cells[m*2+1].deg].name.padEnd(5)+" "); }
  return ["Musique aléatoire systémique",
    `Mesure : ${M.n}/8 (${M.groups.join("+")}), ${M.div}, ${M.mes} mesure${M.mes>1?"s":""} en boucle`,
    `Tonalité : ${keyNameFr()}${S.ton.mode==="min"?" ("+(S.ton.kind==="nat"?"naturel":"harmonique")+")":""}`,
    `Accords (du plus fréquent) : ${ordered.map(x=>chords[x.deg].name+" "+chords[x.deg].rn).join(", ")}`,
    "", rows.join("")+"|",
    "", "Basse : "+Array.from({length:M.mes},(_,m)=>S.bass.notes.filter(x=>x.m===m).map(x=>noteName(x.idx)).join(" ")).join(" | "),
    "Mélodie : "+Array.from({length:M.mes},(_,m)=>S.mel.notes.filter(x=>x.m===m).map(x=>noteName(x.idx)).join(" ")).join(" | ")].join("\n");
}
function voicing(pcs){ const out=pcs.map(pc=>{ let n=57+((pc-57)%12+12)%12; return n; }); return out.sort((a,b)=>a-b); }
function bassNote(pc){ return 36+((pc-36)%12+12)%12; }

function buildMidi(){
  const M=S.met, G=S.grid, PPQ=480, CRO=240, SUB=120;
  const ev=[];
  const bpmQ=Number($("tempo").value);
  const tempo=Math.round(60000000/bpmQ);
  const sf=S.ton.alt==="♯"?S.ton.count:-S.ton.count;
  ev.push({t:0,o:0,b:[0xFF,0x51,3,(tempo>>16)&255,(tempo>>8)&255,tempo&255]});
  ev.push({t:0,o:0,b:[0xFF,0x58,4,M.n,3,24,8]});
  ev.push({t:0,o:0,b:[0xFF,0x59,2,sf&255,S.ton.mode==="min"?1:0]});
  ev.push({t:0,o:0,b:[0xC0,48]}); ev.push({t:0,o:0,b:[0xC1,33]}); ev.push({t:0,o:0,b:[0xC2,73]});
  const mLen=M.n*CRO, half=M.n*SUB;
  for(let m=0;m<M.mes;m++){
    for(let h=0;h<2;h++){ const c=G.cells[m*2+h], ch=chords[c.deg], t0=m*mLen+h*half;
      voicing(ch.pcs).forEach(n=>{ ev.push({t:t0,o:1,b:[0x90,n,72]}); ev.push({t:t0+half-10,o:0,b:[0x80,n,0]}); }); }
  }
  S.bass.notes.forEach(x=>{ const t0=x.m*mLen+x.start*SUB, nn=melMidi(x.idx)-24; ev.push({t:t0,o:1,b:[0x91,nn,96]}); ev.push({t:t0+x.dur*SUB-10,o:0,b:[0x81,nn,0]}); });
  S.drums.hits.forEach(h=>{ const t0=h.m*mLen+h.s*SUB; ev.push({t:t0,o:1,b:[0x99,GM[h.inst],h.vel]}); ev.push({t:t0+60,o:0,b:[0x89,GM[h.inst],0]}); });
  S.mel.notes.forEach(x=>{ const t0=x.m*mLen+x.start*SUB, nn=melMidi(x.idx); ev.push({t:t0,o:1,b:[0x92,nn,96]}); ev.push({t:t0+x.dur*SUB-10,o:0,b:[0x82,nn,0]}); });
  ev.sort((a,b)=>a.t-b.t||a.o-b.o);
  const trk=[]; const name=[...new TextEncoder().encode("Grille aleatoire")];
  trk.push(0,0xFF,0x03,name.length,...name);
  let last=0;
  const vlq=v=>{ const bytes=[v&0x7F]; while((v>>=7)>0) bytes.unshift((v&0x7F)|0x80); return bytes; };
  ev.forEach(e=>{ trk.push(...vlq(e.t-last),...e.b); last=e.t; });
  trk.push(...vlq(M.mes*mLen-last),0xFF,0x2F,0);
  const L=trk.length;
  return new Uint8Array([0x4D,0x54,0x68,0x64,0,0,0,6,0,0,0,1,(PPQ>>8)&255,PPQ&255,0x4D,0x54,0x72,0x6B,(L>>>24)&255,(L>>16)&255,(L>>8)&255,L&255,...trk]);
}
const CRC=(()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();
function crc32(u){ let c=0xFFFFFFFF; for(let i=0;i<u.length;i++) c=CRC[(c^u[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function zip(files){
  const enc=new TextEncoder(), parts=[], central=[]; let off=0;
  const u16=v=>[v&255,(v>>8)&255], u32=v=>[v&255,(v>>8)&255,(v>>16)&255,(v>>>24)&255];
  files.forEach(f=>{ const nm=enc.encode(f.name), data=f.data, crc=crc32(data);
    const head=[...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(data.length),...u32(data.length),...u16(nm.length),...u16(0),...nm];
    parts.push(new Uint8Array(head),data);
    central.push(...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(data.length),...u32(data.length),...u16(nm.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off),...nm);
    off+=head.length+data.length; });
  const end=[...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(central.length),...u32(off),...u16(0)];
  return new Blob([...parts,new Uint8Array(central),new Uint8Array(end)]);
}
function slug(){ return (keyNameFr()+"-"+S.met.n+"-8").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-zA-Z0-9]+/g,"-").toLowerCase(); }

/* ---------- Audio ---------- */
let ctx=null, master=null, playing=false, timer=null, nextTime=0, sub=0, meas=0, queue=[], raf=0;
const mtof=n=>440*Math.pow(2,(n-69)/12);
function ensureCtx(){ if(ctx) return; ctx=new (window.AudioContext||window.webkitAudioContext)(); const comp=ctx.createDynamicsCompressor(); master=ctx.createGain(); master.gain.value=.55; master.connect(comp); comp.connect(ctx.destination); }
function tone(freq,t,dur,{type="triangle",gain=.12,attack=.02,release=.15,cutoff=2400}={}){
  const o=ctx.createOscillator(), g=ctx.createGain(), f=ctx.createBiquadFilter();
  o.type=type; o.frequency.value=freq; f.type="lowpass"; f.frequency.value=cutoff;
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(gain,t+attack); g.gain.setValueAtTime(gain,t+Math.max(attack,dur-release)); g.gain.linearRampToValueAtTime(0,t+dur);
  o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t+dur+.02);
}
let noiseBuf=null;
function noise(t,dur,{hp=6000,bp=0,gain=.2,decay=dur}={}){
  if(!noiseBuf){ noiseBuf=ctx.createBuffer(1,ctx.sampleRate*1.5,ctx.sampleRate); const ch=noiseBuf.getChannelData(0); for(let i=0;i<ch.length;i++) ch[i]=Math.random()*2-1; }
  const src=ctx.createBufferSource(); src.buffer=noiseBuf; const f=ctx.createBiquadFilter(); f.type=bp?"bandpass":"highpass"; f.frequency.value=bp||hp; const g=ctx.createGain();
  g.gain.setValueAtTime(gain,t); g.gain.exponentialRampToValueAtTime(.001,t+decay); src.connect(f); f.connect(g); g.connect(master); src.start(t); src.stop(t+dur+.05);
}
function drum(inst,t,vel){
  const v=vel/127;
  if(inst==="kick"){ const o=ctx.createOscillator(), g=ctx.createGain(); o.frequency.setValueAtTime(140,t); o.frequency.exponentialRampToValueAtTime(42,t+.13); g.gain.setValueAtTime(.95*v,t); g.gain.exponentialRampToValueAtTime(.001,t+.32); o.connect(g); g.connect(master); o.start(t); o.stop(t+.35); }
  else if(inst==="snare"){ noise(t,.18,{hp:1400,gain:.38*v,decay:.16}); tone(185,t,.09,{type:"triangle",gain:.22*v,attack:.001,release:.07}); }
  else if(inst==="hhc"){ noise(t,.05,{hp:7500,gain:.16*v,decay:.04}); }
  else if(inst==="hho"){ noise(t,.32,{hp:7000,gain:.15*v,decay:.3}); }
  else if(inst==="ride"){ noise(t,.45,{bp:5200,gain:.1*v,decay:.4}); tone(3100,t,.25,{type:"sine",gain:.025*v,attack:.001,release:.2,cutoff:8000}); }
  else if(inst==="crash"){ noise(t,1.4,{hp:3800,gain:.26*v,decay:1.3}); }
}
function click(t,level){ const f=[0,900,1250,1700][level], v=[0,.05,.1,.16][level]; tone(f,t,.035,{type:"sine",gain:v,attack:.001,release:.03,cutoff:8000}); }
let OFFLINE=null;   // pendant l'export audio : {chords,bass,mel,drums,arp}
const PART_BOX={chords:"optChords",bass:"optBass",mel:"optMel",drums:"optDrums",arp:"optArp",click:"optClick"};
function partOn(p){ if(OFFLINE) return !!OFFLINE[p]; const el=$(PART_BOX[p]); return !!(el&&el.checked); }
function subDur(){ return 60/(Number($("tempo").value)*4); }
function schedule(s,m,t){
  const M=S.met, n=M.n, cell=m*2+(s<n?0:1), ch=chords[S.grid.cells[cell].deg], sd=subDur();
  if(midiClockOn()){ for(let i=0;i<6;i++) clockOuts().forEach(o=>o.send([0xF8],toPerf(t+i*sd/6))); }
  if((s===0||s===n)&&partOn("chords")){ if(outFor("chords")) voicing(ch.pcs).forEach(x=>midiNote("chords",x,80,t,n*sd*.97));
    else voicing(ch.pcs).forEach(x=>{ tone(mtof(x),t,n*sd,{type:"sawtooth",gain:.035,attack:.04,release:.12,cutoff:1500}); tone(mtof(x),t,n*sd,{type:"triangle",gain:.05,attack:.02,release:.12}); }); }
  if(s%2===0){ const c=s/2; let acc=0, isStart=false, g=0; for(const gg of M.groups){ if(acc===c){isStart=true; g=gg;} acc+=gg; }
    if(partOn("click")) click(t, c===0?3:(isStart?2:1));
  }
  if(partOn("bass")){ S.bass.notes.forEach(x=>{ if(x.m===m&&x.start===s){ const bn=melMidi(x.idx)-24; if(outFor("bass")) midiNote("bass",bn,100,t,x.dur*sd*.92); else tone(mtof(bn),t,x.dur*sd*.95,{type:"triangle",gain:.24,attack:.005,release:.08,cutoff:900}); } }); }
  if(partOn("drums")){ S.drums.hits.forEach(h=>{ if(h.m===m&&h.s===s){ if(outFor("drums")) midiNote("drums",GM[h.inst],h.vel,t,sd*.5); else drum(h.inst,t,h.vel); } }); }
  if(partOn("mel")){ S.mel.notes.forEach(x=>{ if(x.m===m&&x.start===s){ const mm=melMidi(x.idx); if(outFor("mel")){ midiNote("mel",mm,96,t,x.dur*sd*.92); return; } const f=mtof(mm); tone(f,t,x.dur*sd*.95,{type:"triangle",gain:.16,attack:.008,release:.06,cutoff:3200}); tone(f*2,t,x.dur*sd*.9,{type:"sine",gain:.03,attack:.008,release:.06}); } }); }
  if(partOn("arp")){ const v=voicing(ch.pcs); tone(mtof(v[s%3]+12),t,sd*.9,{type:"square",gain:.025,attack:.003,release:.05,cutoff:2600}); }
  if(!OFFLINE) queue.push({t,cell,s,m});
}
/* ---------- Sortie MIDI (page Studio) ---------- */
const HAS_MIDI=!!document.getElementById("midiOn");
const PARTS=[{k:"chords",l:"Accords",ch:1,oct:0},{k:"bass",l:"Basse",ch:2,oct:0},{k:"mel",l:"Mélodie",ch:3,oct:0},{k:"drums",l:"Batterie",ch:10,oct:0}];
let midi=null, route={};
try{ route=JSON.parse(localStorage.getItem("mas-midi")||"{}")||{}; }catch(e){ route={}; }
PARTS.forEach(p=>{ if(!route[p.k]) route[p.k]={out:"",ch:p.ch,oct:p.oct}; });
const saveRoute=()=>{ try{ localStorage.setItem("mas-midi",JSON.stringify(route)); }catch(e){} };
const toPerf=t=>performance.now()+(t-ctx.currentTime)*1000;
function outFor(k){ if(OFFLINE) return null; const r=route[k]; if(!midi||!r||!r.out) return null; return midi.outputs.get(r.out)||null; }
function midiNote(k,note,vel,t,dur){
  const o=outFor(k); if(!o) return; const r=route[k], c=(r.ch-1)&15;
  let nn=note+(k==="drums"?0:12*r.oct); nn=Math.max(0,Math.min(127,nn));
  try{ o.send([0x90|c,nn,vel],toPerf(t)); o.send([0x80|c,nn,0],toPerf(t+dur)); }catch(e){}
}
function usedOuts(){ const set=new Map(); PARTS.forEach(p=>{ const o=outFor(p.k); if(o) set.set(o.id,o); }); return [...set.values()]; }
const midiClockOn=()=>!OFFLINE&&HAS_MIDI&&midi&&$("midiClock").checked;
const clockOuts=()=>usedOuts();
function midiPanic(){
  usedOuts().forEach(o=>{ try{ if(o.clear) o.clear(); }catch(e){} });
  PARTS.forEach(p=>{ const o=outFor(p.k); if(!o) return; const c=(route[p.k].ch-1)&15; try{ o.send([0xB0|c,123,0]); o.send([0xB0|c,120,0]); }catch(e){} });
}
function buildMidiRows(){
  const outs=[...midi.outputs.values()];
  const opt=(v,l,sel)=>`<option value="${v}"${sel?" selected":""}>${l}</option>`;
  $("midiRows").innerHTML=PARTS.map(p=>{ const r=route[p.k];
    const ports=opt("","Son du navigateur",!r.out)+outs.map(o=>opt(o.id,(o.name||"Port MIDI").replace(/</g,""),r.out===o.id)).join("");
    const chans=Array.from({length:16},(_,i)=>opt(i+1,"Canal "+(i+1),r.ch===i+1)).join("");
    const octs=p.k==="drums"?`<span></span>`:`<select id="midi-oct-${p.k}" aria-label="Octave ${p.l}">${[-2,-1,0,1,2].map(v=>opt(v,(v>0?"+":"")+v+" oct.",r.oct===v)).join("")}</select>`;
    return `<span class="lbl">${p.l}</span><select class="port" id="midi-out-${p.k}" aria-label="Sortie ${p.l}">${ports}</select><select id="midi-ch-${p.k}" aria-label="Canal ${p.l}">${chans}</select>${octs}`; }).join("");
  PARTS.forEach(p=>{
    $("midi-out-"+p.k).addEventListener("change",e=>{ midiPanic(); route[p.k].out=e.target.value; saveRoute(); });
    $("midi-ch-"+p.k).addEventListener("change",e=>{ midiPanic(); route[p.k].ch=Number(e.target.value); saveRoute(); });
    const oc=$("midi-oct-"+p.k); if(oc) oc.addEventListener("change",e=>{ route[p.k].oct=Number(e.target.value); saveRoute(); });
  });
  $("midiRows").hidden=false; $("midiClockLbl").hidden=false;
  $("midiStatus").textContent=outs.length?`${outs.length} sortie${outs.length>1?"s":""} MIDI trouvée${outs.length>1?"s":""}. Choisis l’instrument de chaque partie : les parties laissées sur « Son du navigateur » restent jouées ici.`:"Aucune sortie MIDI trouvée. Branche ta MPC ou un synthé en USB : la liste se met à jour toute seule.";
}
if(HAS_MIDI) $("midiOn").addEventListener("click",async()=>{
  if(!navigator.requestMIDIAccess){ $("midiStatus").textContent="Ce navigateur ne gère pas le MIDI. Ouvre le site dans Chrome ou Edge."; return; }
  try{ midi=await navigator.requestMIDIAccess({sysex:false}); midi.onstatechange=()=>buildMidiRows(); buildMidiRows(); $("midiOn").hidden=true; }
  catch(e){ $("midiStatus").textContent="L’accès au MIDI a été refusé ou n’est pas possible ici. Sur le site en ligne, dans Chrome ou Edge, autorise le MIDI quand le navigateur le demande."; }
});

let tickWorker=null;
try{ tickWorker=new Worker(URL.createObjectURL(new Blob(["let i=null;onmessage=e=>{clearInterval(i);if(e.data>0)i=setInterval(()=>postMessage(0),e.data);}"],{type:"text/javascript"}))); }catch(e){ tickWorker=null; }
function scheduler(){
  while(nextTime<ctx.currentTime+.12){
    if(bridge){ scheduleBridge(bsub,nextTime); nextTime+=subDur(); bsub++; if(bsub>=bridge.n*2){ bridge=null; bsub=0; sub=0; meas=0; $("status").textContent=""; } continue; }
    meas%=S.met.mes; if(sub>=S.met.n*2) sub=0;
    if(sub===0&&meas===0&&pending.length){ applyPending(); if(bridge) continue; }
    schedule(sub,meas,nextTime);
    nextTime+=subDur(); sub++; if(sub>=S.met.n*2){ sub=0; meas=(meas+1)%S.met.mes; }
  }
}
function draw(){
  if(!playing) return;
  let cur=null; while(queue.length&&queue[0].t<=ctx.currentTime){ cur=queue.shift(); }
  if(cur){
    document.querySelectorAll(".half.on").forEach(e=>e.classList.remove("on"));
    document.querySelectorAll(".ticks i.now").forEach(e=>e.classList.remove("now"));
    const h=document.querySelector(`.half[data-cell="${cur.cell}"]`); if(h) h.classList.add("on");
    const tk=document.querySelector(`.ticks[data-m="${cur.m}"] i[data-t="${cur.s}"]`); if(tk) tk.classList.add("now");
  }
  raf=requestAnimationFrame(draw);
}
async function togglePlay(){
  const b=$("play");
  if(playing){ playing=false; if(pending.length){ const p=pending; pending=[]; if(p.includes("all")){ applyTheme(drawDesign()); reroll("all"); } else p.forEach(w=>reroll(w)); showPending(); } clearInterval(timer); if(tickWorker) tickWorker.postMessage(0); cancelAnimationFrame(raf); queue=[];
    if(midi){ midiPanic(); if(midiClockOn()) clockOuts().forEach(o=>{ try{ o.send([0xFC]); }catch(e){} }); } b.textContent="▶ Écouter en boucle"; b.setAttribute("aria-pressed","false");
    document.querySelectorAll(".half.on,.ticks i.now").forEach(e=>e.classList.remove("on","now")); return; }
  try{ ensureCtx(); await ctx.resume(); }catch(e){ $("status").textContent="Le son n’a pas pu démarrer dans ce navigateur."; return; }
  playing=true; sub=0; meas=0; bridge=null; bsub=0; nextTime=ctx.currentTime+.08; queue=[];
  if(midiClockOn()) clockOuts().forEach(o=>{ try{ o.send([0xFA],toPerf(nextTime)); }catch(e){} });
  if(tickWorker){ tickWorker.onmessage=scheduler; tickWorker.postMessage(25); } else timer=setInterval(scheduler,25);
  scheduler(); draw();
  b.textContent="■ Arrêter"; b.setAttribute("aria-pressed","true");
}

/* ---------- Actions ---------- */
/* Pendant l'écoute, un changement attend la fin de la grille en cours. */
let pending=[];
const PEND_LBL={all:"tout",met:"la métrique",ton:"la tonalité",deg:"les degrés",grid:"la grille",mel:"la mélodie",bass:"la basse",drums:"la batterie"};
function showPending(){
  document.querySelectorAll("[data-reroll],#rollAll").forEach(b=>b.classList.toggle("pending",pending.includes(b.dataset.reroll||"all")));
  $("status").textContent=pending.length?"Au prochain tour de la grille : "+pending.map(w=>PEND_LBL[w]).join(", ")+".":"";
}
function requestReroll(what){
  const atEnd=!$("endOfGrid")||$("endOfGrid").checked;
  if(!playing||!atEnd){ if(what==="all") applyTheme(drawDesign()); reroll(what); return; }
  if(what==="all") pending=["all"]; else if(!pending.includes("all")&&!pending.includes(what)) pending.push(what);
  showPending();
}
/* Transition entre deux grilles quand la métrique ou la tonalité change :
   une mesure (dans l'ancienne métrique) qui prépare puis amène le premier accord de la nouvelle grille. */
let bridge=null, bsub=0;
function buildBridge(oldMet){
  const n=oldMet.n, target=chords[S.grid.cells[0].deg];
  const prep=chords[3];                       // IV (ou iv) de la nouvelle tonalité : préparation
  const r=(target.pcs[0]+7)%12;               // dominante de l'accord d'arrivée
  const dom=[r,(r+4)%12,(r+7)%12,(r+10)%12];  // accord de septième de dominante
  const near=(pc,base)=>base+((pc-base)%12+12)%12;
  return {n,groups:oldMet.groups,prep:prep.pcs,dom,
    mel:[near(prep.pcs[1],64),near(dom[1],64)],   // tierce de chaque accord ; la tierce de la dominante est la sensible
    name:prep.name+" → "+noteNameFromPc(r)+"7 → "+target.name};
}
function noteNameFromPc(pc){ const map=["C","C♯","D","E♭","E","F","F♯","G","A♭","A","B♭","B"]; return map[pc]; }
function scheduleBridge(s,t){
  const B=bridge, n=B.n, sd=subDur(), half=s<n?0:1, pcs=half?B.dom:B.prep;
  if((s===0||s===n)&&partOn("chords")){ const v=voicing(pcs.slice(0,3)).concat(half?[voicing([B.dom[3]])[0]]:[]);
    if(outFor("chords")) v.forEach(x=>midiNote("chords",x,80,t,n*sd*.97)); else v.forEach(x=>{ tone(mtof(x),t,n*sd,{type:"sawtooth",gain:.035,attack:.04,release:.12,cutoff:1500}); tone(mtof(x),t,n*sd,{type:"triangle",gain:.05,attack:.02,release:.12}); }); }
  if((s===0||s===n)&&partOn("bass")){ const bn=bassNote(pcs[0]); if(outFor("bass")) midiNote("bass",bn,100,t,n*sd*.92); else tone(mtof(bn),t,n*sd*.95,{type:"triangle",gain:.24,attack:.005,release:.08,cutoff:900}); }
  if((s===0||s===n)&&partOn("mel")){ const mm=B.mel[half]; if(outFor("mel")) midiNote("mel",mm,90,t,n*sd*.92); else tone(mtof(mm),t,n*sd*.95,{type:"triangle",gain:.15,attack:.01,release:.08,cutoff:3200}); }
  if(partOn("drums")){
    const hits=[];
    if(s===0) hits.push(["kick",110]);
    if(half===0&&s%2===0) hits.push(["hhc",s===0?95:70]);
    if(half===1) hits.push(["snare",55+Math.min(65,(s-n)*Math.round(65/Math.max(1,n-1)))]);
    if(s===n) hits.push(["kick",100]);
    hits.forEach(([inst,vel])=>{ if(outFor("drums")) midiNote("drums",GM[inst],vel,t,sd*.5); else drum(inst,t,vel); });
  }
  if(partOn("click")&&s%2===0) click(t,s===0?3:1);
}
function applyPending(){
  const p=pending; pending=[];
  const oldMet=S.met, oldTon=S.ton;
  if(p.includes("all")){ applyTheme(drawDesign()); reroll("all"); }
  else p.forEach(w=>reroll(w));
  if(S.met!==oldMet||S.ton!==oldTon){ bridge=buildBridge(oldMet); bsub=0; showPending(); $("status").textContent="Transition : "+bridge.name; return; }
  showPending();
}
function reroll(what){
  if(what==="all"){ rollMet(); rollTon(); rollDeg(); rollGrid(); rollMel(); rollBass(); rollDrums(); }
  else if(what==="met"){ const keep=!!($("keepParts")&&$("keepParts").checked); rollMet(); rollGrid(keep); rollMel(keep); rollBass(keep); rollDrums(keep); }
  else if(what==="ton"){ rollTon(); }
  else if(what==="deg"||what==="grid"){ const keep=!!($("keepParts")&&$("keepParts").checked); if(what==="deg") rollDeg(); rollGrid(); rollMel(keep); rollBass(keep); rollDrums(keep); }
  else if(what==="mel"){ const keep=!!($("keepParts")&&$("keepParts").checked); rollMel(false); rollBass(keep); }
  else if(what==="bass"){ rollBass(); }
  else if(what==="drums"){ rollDrums(); }
  queue=[]; render();
  $("status").textContent="";
}
/* Jeu supplémentaire : le dé de chance. Un D6 accompagne chaque relance ; seul un 6 autorise le changement. */
function chanceSound(ok){
  try{ ensureCtx(); ctx.resume(); }catch(e){ return; }
  const t=ctx.currentTime+.02;
  if(ok) [0,4,7,12].forEach((x,i)=>tone(mtof(72+x),t+i*.07,.18,{type:"triangle",gain:.12,attack:.005,release:.1,cutoff:4000}));
  else tone(mtof(48),t,.12,{type:"sine",gain:.12,attack:.003,release:.09,cutoff:1200});
}
function tryReroll(what){
  const box=$("chanceMode");
  if(box&&box.checked){
    const v=d(6), ok=v===6;
    chanceSound(ok);
    const msg=ok?"accordé":"refusé";
    $("chanceOut").innerHTML=`<span class="dice">${dieSvg("d6",v,HUES[0],30)}</span><span>${msg}</span>`;
    if(!ok) return;
  }
  requestReroll(what);
}
$("rollAll").addEventListener("click",()=>tryReroll("all"));
document.querySelectorAll("[data-reroll]").forEach(b=>b.addEventListener("click",()=>tryReroll(b.dataset.reroll)));
$("play").addEventListener("click",togglePlay);
$("tempo").addEventListener("input",()=>{ $("tempoOut").textContent=$("tempo").value; });
$("copy").addEventListener("click",async()=>{ try{ await navigator.clipboard.writeText(gridText()); $("status").textContent="Grille copiée dans le presse-papiers."; }catch(e){ $("status").textContent="La copie a été refusée par le navigateur."; } });

/* ---------- Export audio (MP3) ---------- */
function loadScript(src){ return new Promise((ok,ko)=>{ const e=document.createElement("script"); e.src=src; e.onload=ok; e.onerror=ko; document.head.appendChild(e); }); }
async function ensureLame(){
  if(window.lamejs) return;
  try{ await loadScript("https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js"); }
  catch(e){ await loadScript("https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js"); }
}
const SR=44100;
function exportSeconds(loops){ return loops*S.met.mes*S.met.n*2*subDur(); }
async function renderAudio(loops,parts,progress){
  const sd=subDur(), total=loops*S.met.mes*S.met.n*2, dur=total*sd+2.5;
  const off=new OfflineAudioContext(1,Math.ceil(dur*SR),SR);
  const saved={ctx,master,noiseBuf};
  ctx=off; noiseBuf=null; OFFLINE=parts;
  const comp=off.createDynamicsCompressor(); master=off.createGain(); master.gain.value=.55; master.connect(comp); comp.connect(off.destination);
  try{
    let t=.05;
    for(let l=0;l<loops;l++) for(let m=0;m<S.met.mes;m++) for(let s=0;s<S.met.n*2;s++){ schedule(s,m,t); t+=sd; }
  } finally { ctx=saved.ctx; master=saved.master; noiseBuf=saved.noiseBuf; OFFLINE=null; }
  progress("Calcul du son…");
  return await off.startRendering();
}
async function encodeMp3(buffer,progress){
  await ensureLame();
  const data=buffer.getChannelData(0), enc=new lamejs.Mp3Encoder(1,SR,192), out=[], block=1152;
  let peak=0; for(let i=0;i<data.length;i++){ const a=Math.abs(data[i]); if(a>peak) peak=a; }
  const gain=peak>0?Math.min(4,.95/peak):1;
  const pcm=new Int16Array(block);
  for(let i=0;i<data.length;i+=block){
    const n=Math.min(block,data.length-i);
    for(let j=0;j<n;j++){ const v=Math.max(-1,Math.min(1,data[i+j]*gain)); pcm[j]=v<0?v*32768:v*32767; }
    const mp3=enc.encodeBuffer(n===block?pcm:pcm.subarray(0,n)); if(mp3.length) out.push(new Uint8Array(mp3));
    if((i/block)%400===0){ progress(`Encodage MP3 : ${Math.round(i/data.length*100)} %`); await new Promise(r=>setTimeout(r,0)); }
  }
  const end=enc.flush(); if(end.length) out.push(new Uint8Array(end));
  return new Blob(out,{type:"audio/mpeg"});
}
function fmtDur(sec){ const m=Math.floor(sec/60), s=Math.round(sec%60); return m?`${m} min ${String(s).padStart(2,"0")} s`:`${s} s`; }
function openExport(){
  const PARTS_X=[["chords","Accords"],["bass","Basse"],["mel","Mélodie"],["drums","Batterie"],["arp","Arpège"]];
  const html=`<div class="export">
    <label class="exp-row" for="expLoops"><span>Nombre de tours</span><input type="number" id="expLoops" min="1" max="32" value="4"></label>
    <p class="status" id="expDur" style="margin:0"></p>
    <div class="switches">${PARTS_X.map(([k,l])=>`<label class="sw" for="exp-${k}"><input type="checkbox" role="switch" id="exp-${k}" ${partOn(k)?"checked":""}><span>${l}</span></label>`).join("")}</div>
    <div class="player"><button class="btn btn-ink" id="expGo" type="button">Créer le MP3</button><p class="status" id="expStatus" style="margin:0" aria-live="polite"></p></div>
  </div>`;
  openModal("Exporter en MP3",html);
  const upd=()=>{ const L=Math.max(1,Math.min(32,Number($("expLoops").value)||1)); const sec=exportSeconds(L); $("expDur").textContent=`Durée : ${fmtDur(sec)}`+(sec>600?" · limité à 10 min":""); };
  $("expLoops").addEventListener("input",upd); upd();
  $("expGo").addEventListener("click",async()=>{
    const btn=$("expGo"), st=t=>{ const e=$("expStatus"); if(e) e.textContent=t; };
    let L=Math.max(1,Math.min(32,Number($("expLoops").value)||1));
    while(L>1&&exportSeconds(L)>600) L--;
    const parts={}; PARTS_X.forEach(([k])=>parts[k]=$("exp-"+k).checked);
    if(!Object.values(parts).some(Boolean)){ st("Choisis au moins un instrument."); return; }
    btn.disabled=true; st("Préparation…");
    try{
      const buf=await renderAudio(L,parts,st);
      const blob=await encodeMp3(buf,st);
      const base=slug()+"-"+L+"-tours";
      if(!inClaude){
        const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=base+".mp3"; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),4000); st("MP3 téléchargé.");
      } else if(downloads){
        const z=zip([{name:base+".mp3",data:new Uint8Array(await blob.arrayBuffer())}]);
        await downloads.save({filename:base+".zip",data:z}); st("MP3 enregistré (dans un .zip).");
      } else st("Le téléchargement n’est pas disponible ici : ouvre le site en ligne.");
    }catch(e){ st(e&&e.code==="declined"?"Téléchargement annulé.":"L’export a échoué : "+(e&&e.message||e)); }
    btn.disabled=false;
  });
}
$("mp3").addEventListener("click",openExport);

let downloads=null;
const inClaude=!!(window.claude&&window.claude.use);
if(inClaude){ $("dl").hidden=true; window.claude.use("downloads").then(ns=>{ downloads=ns; if(ns){ $("dl").textContent="Télécharger MIDI (.zip)"; $("dl").hidden=false; } }).catch(()=>{}); }
$("dl").addEventListener("click",async()=>{
  const enc=new TextEncoder(), base=slug();
  if(!inClaude){
    const url=URL.createObjectURL(new Blob([buildMidi()],{type:"audio/midi"}));
    const a=document.createElement("a"); a.href=url; a.download=base+".mid"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
    $("status").textContent="Fichier MIDI téléchargé."; return;
  }
  if(!downloads) return;
  const blob=zip([{name:base+".mid",data:buildMidi()},{name:base+".txt",data:enc.encode(gridText())}]);
  try{ await downloads.save({filename:base+".zip",data:blob}); $("status").textContent="Fichier enregistré : le .mid est dans le .zip."; }
  catch(e){ $("status").textContent= e&&e.code==="declined"?"Téléchargement annulé.":"Le téléchargement n’est pas disponible ici."; }
});

const modal=$("modal"); let lastFocus=null;
function openModal(title,html){ $("modale-titre").textContent=title; $("modalBody").innerHTML=html; lastFocus=document.activeElement; modal.hidden=false; $("closeModal").focus(); }
function closeModal(){ modal.hidden=true; if(lastFocus) lastFocus.focus(); }
$("closeModal").addEventListener("click",closeModal);
function designHtml(){
  const T=THEME, P=T.P, H=T.hues;
  const rows=[
    {k:"d8",v:P.sign,h:H[0],m:"D8 : "+(P.flat?"bémols":"dièses"),d:"sens de rotation de la couleur sur le cercle, comme sur le cycle des quintes"},
    {k:"d8",v:P.cnt,h:H[1],m:"D8 : "+(P.count===0?"aucune altération":P.count+" altération"+(P.count>1?"s":"")),d:`couleur de base : 30° de plus par altération, Do majeur est le point de départ (teinte ${T.root}°)`},
    {k:"d8",v:P.mode,h:H[2],m:"D8 : "+(P.minor?"mineur":"majeur"),d:P.minor?"palette en accord mineur : 3 couleurs espacées comme la-do-mi":"palette en accord majeur : 3 couleurs espacées comme do-mi-sol"},
    {k:"d10",v:P.title,h:H[0],m:"D10 : police des titres",d:"une police par face sur 10 : "+T.disp[0]},
    {k:"d6",v:P.text,h:H[1],m:"D6 : police du texte",d:"une police par face sur 6 : "+T.body[0]},
    {k:"d6",v:P.shape,h:H[2],m:"D6 : forme des blocs",d:`du plus anguleux (1) au plus arrondi (6) : ${T.rad} px`}
  ];
  return `<p>Le design est tiré au sort à chaque arrivée sur le site et à chaque « Tout relancer », avec ses propres dés, comme une tonalité qu’on ne jouerait pas. La place et la taille des blocs ne changent jamais.</p>
  <ul>${rows.map(x=>`<li>${dieSvg(x.k,x.v,x.h,56)}<span class="t"><b>${x.m}</b><span class="d">→ ${x.d}</span></span></li>`).join("")}</ul>
  <div class="swatches" aria-label="Palette de cette page">${[["Fond","--bg"],["Couleur 1","--a1"],["Couleur 2","--a2"],["Couleur 3","--a3"],["Encre","--ink"]].map(([n,k])=>`<span title="${n}" style="background:${T.v[k]}"></span>`).join("")}</div>`;
}
$("openDesign").addEventListener("click",()=>openModal("D’où vient mon design ?",designHtml()));
const RULES={
  met:["Métrique",`<ol class="r"><li><strong>Croches par mesure</strong> : 5 + D10, donc de 6 à 15 croches.</li><li><strong>Nombre de mesures</strong> : D6, de 1 à 6. La grille tourne en boucle.</li><li><strong>Division</strong> : D6. De 1 à 3, binaire : les croches sont groupées par 2. De 4 à 6, ternaire : groupées par 3. Un groupe de 3 ou de 2 complète si le compte ne tombe pas juste (7/8 binaire = 2+2+3, 8/8 ternaire = 3+3+2).</li></ol><p>Les groupes donnent les temps forts : la batterie et la mélodie s’y appuient.</p>`],
  ton:["Tonalité",`<p>Pendant l’écoute, un changement de tonalité ou de métrique attend la fin de la grille, puis une <strong>mesure de transition</strong> l’amène : un accord de préparation (IV de la nouvelle tonalité), puis l’accord de dominante du premier accord de la nouvelle grille, pendant que la batterie fait un roulement. La nouvelle grille arrive comme une résolution.</p><ol class="r"><li><strong>D8</strong> : de 1 à 4 bémols, de 5 à 8 dièses.</li><li><strong>D8</strong> : nombre d’altérations. Le 8 donne aucune altération (do majeur ou la mineur).</li><li><strong>D8</strong> : de 1 à 4 mineur, de 5 à 8 majeur.</li><li>En mineur, <strong>pile ou face</strong> : mineur naturel ou harmonique (V majeur, VII diminué).</li></ol><p>Exemple : 5, 2, 6 donne deux dièses en majeur, soit ré majeur.</p>`],
  deg:["Degrés",`<ol class="r"><li><strong>D6</strong> : combien de degrés on utilise.</li><li><strong>D8 par degré</strong> : lequel (I à VII). Le 8 et les doublons sont relancés.</li><li><strong>D20 par degré</strong> : sa fréquence. Plus le score est haut, plus l’accord reviendra. Les égalités sont relancées.</li></ol><p>Exemple en ré majeur : I, II, III et VI donnent D, Em, F♯m et Bm.</p>`],
  grid:["Grille",`<p><strong>Garder mélodie, basse et batterie</strong> (case en haut des tirages) : quand les degrés ou la grille sont relancés, la mélodie, la basse et la batterie gardent leurs dés ; quand la métrique change, la grille, la mélodie, la basse et la batterie gardent aussi leurs dés et se reconstruisent autour de la nouvelle mesure (mêmes accords dans le même ordre, mêmes cellules rythmiques par groupe, mêmes mouvements de notes) ; quand la mélodie est relancée, la basse garde les siens. Le rythme et le dessin de la mélodie restent les mêmes ; les notes qui dépendent des accords (notes d’appui, sauts vers l’accord, fondamentales, crash) se recalent sur les nouveaux accords. C’est une réharmonisation. Décoche la case pour tout retirer.</p><ol class="r"><li>Les degrés sont classés par leur score au D20. Le dernier reçoit 1 chance, le suivant 2… le premier n chances.</li><li>Le total des chances donne le dé : 3 → D4 (4 relancé), 6 → D6, 10 → D10, 15 → D20 (au-delà de 15 relancé), 21 → D100 (1 à 84 ramené de 1 à 21, 85 à 100 relancé).</li><li>Un lancer par <strong>demi-mesure</strong> choisit l’accord. Une mesure de 7 croches se coupe en 2 × 7 doubles croches.</li></ol><p>Exemple avec 4 degrés : D = 1, F♯m = 2–3, Em = 4–6, Bm = 7–10, sur un D10.</p>`],
  mel:["Mélodie (règles provisoires)",`<ol class="r"><li><strong>Ambitus</strong> : D6. De 1 à 2 une sixte, de 3 à 4 une octave, de 5 à 6 une dixième, autour de la tonique.</li><li><strong>Rythme</strong> : un D6 par groupe de croches. Groupe de 2 : noire, 2 croches, croche + 2 doubles, 2 doubles + croche, 4 doubles, demi-soupir + croche. Groupe de 3 : noire pointée, noire + croche, croche + noire, 3 croches, croche pointée + double + croche, demi-soupir + 2 croches.</li><li><strong>Note d’appui</strong> : la 1ʳᵉ note de chaque demi-mesure est une note de l’accord, au D6 (1–2 fondamentale, 3–4 tierce, 5–6 quinte), la plus proche de la précédente.</li><li><strong>Notes suivantes</strong> : D8. 1 tierce en dessous, 2–3 degré en dessous, 4 même note, 5–6 degré au-dessus, 7 tierce au-dessus, 8 saut vers la note de l’accord la plus proche. Hors ambitus, le mouvement s’inverse.</li><li>La dernière note de la grille devient la fondamentale de son accord.</li></ol>`],
  chance:["Dé de chance (jeu supplémentaire)",`<p>Une option de jeu, désactivée par défaut. Quand elle est active, chaque relance est accompagnée d’un <strong>D6 de chance</strong> : seul un <strong>6</strong> autorise le changement, à la fin de la grille. Sur 1 à 5, rien ne change.</p><p>Avec les vrais dés : le visiteur lance le dé de la partie qu’il veut changer avec le dé de chance. Le dé de partie lancé seul ne fait rien.</p><p>Un petit son confirme que le lancer a été compris : une montée sur un 6, une note grave sinon.</p>`],
  bass:["Basse",`<p>La basse a son propre système : elle s’appuie sur les accords et répond à la mélodie. Quand la mélodie est relancée, la basse garde ses dés (si la case « garder » est cochée) et se recale : elle remplit les nouveaux trous de la mélodie et suit son nouveau dessin.</p><ol class="r"><li><strong>Style</strong>, un D6 pour toute la grille : 1–2 notes tenues (une par demi-mesure), 3–4 une note par groupe de croches, 5–6 réponse à la mélodie.</li><li><strong>En réponse</strong> : sur chaque croche où la mélodie ne joue pas de nouvelle note, un D6 ; de 4 à 6, la basse joue. Elle remplit les trous de la mélodie.</li><li><strong>Note d’appui</strong> en début de demi-mesure, D6 : 1–4 fondamentale, 5 tierce (renversement), 6 quinte.</li><li><strong>Notes suivantes</strong>, D6 : 1 fondamentale, 2 quinte, 3 saut d’octave, 4 tierce, 5 note de passage vers l’accord suivant, 6 mouvement contraire à la mélodie (elle descend quand la mélodie monte, et inversement).</li><li>Registre : environ une dixième, deux octaves sous la mélodie. Une note dure jusqu’à la suivante.</li></ol>`],
  drums:["Batterie",`<ol class="r"><li><strong>Trois dés pour toute la grille</strong> : D6 cymbale de rythme (1–4 charleston, 5–6 ride), D6 densité (1–2 croches, 3–4 doubles croches, 5–6 un coup par groupe), D6 break (5–6 roulement de caisse claire sur le dernier groupe de la grille).</li><li><strong>Grosse caisse</strong> au 1ᵉʳ temps et à chaque demi-mesure.</li><li><strong>Autres groupes de croches</strong> : D6. 1–2 grosse caisse, 3–5 caisse claire, 6 les deux.</li><li><strong>Crash</strong> au début de la grille, puis D6 5–6 quand l’accord change.</li><li><strong>Charleston ouvert</strong> sur la dernière croche de la mesure au D6 6.</li></ol>`]
};
document.querySelectorAll("[data-rule]").forEach(b=>b.addEventListener("click",()=>{ const r=RULES[b.dataset.rule]; openModal(r[0],r[1]); }));
modal.addEventListener("click",e=>{ if(e.target===modal) closeModal(); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&!modal.hidden) closeModal(); });

const IS_STUDIO=document.body.dataset.page==="studio";
function showLanding(){
  if(playing) togglePlay();
  applyTheme(drawDesign());
  $("composition").hidden=true; $("landing").hidden=false; $("footKey").textContent="";
  window.scrollTo(0,0);
}
if(IS_STUDIO){
  applyTheme(drawDesign()); reroll("all");
} else {
  $("compose").addEventListener("click",()=>{ reroll("all"); $("landing").hidden=true; $("composition").hidden=false; window.scrollTo(0,0); });
  $("home").addEventListener("click",e=>{ e.preventDefault(); showLanding(); });
  showLanding();
}
})();
