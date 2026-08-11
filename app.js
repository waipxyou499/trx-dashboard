const state={blocks:[],zoom:1,history:[]};
const API="/api/blocks";

function classify(n){return n>=5?"BIG":"SMALL"}
function numFromHash(hash){
  if(!hash)return null;
  for(let i=hash.length-1;i>=0;i--){
    if(/[0-9]/.test(hash[i])) return Number(hash[i]);
  }
  return null;
}
function makeDemo(){
  let base=101000;
  const out=[];
  for(let i=0;i<70;i++){
    const digit=Math.floor(Math.random()*10);
    out.push({number:base+i,hash:"demo"+digit,time:Date.now()-((70-i)*3000),digit});
  }
  return out;
}
function normalize(data){
  const arr=data?.data||data?.blocks||[];
  return arr.map(b=>({number:b.number,hash:b.hash||b.blockID||"",time:b.timestamp||Date.now(),digit:numFromHash(b.hash||b.blockID||"")})).filter(x=>x.digit!==null);
}
async function load(){
  try{
    const r=await fetch(API,{cache:"no-store"});
    if(!r.ok)throw new Error("API "+r.status);
    const d=await r.json();
    state.blocks=normalize(d);
    if(!state.blocks.length)throw new Error("empty");
  }catch(e){
    if(!state.blocks.length) state.blocks=makeDemo();
  }
  render();
}
function render(){
  const b=state.blocks;
  const big=b.filter(x=>x.digit>=5).length, small=b.length-big;
  document.getElementById("bigCount").textContent=big;
  document.getElementById("smallCount").textContent=small;
  const last=b[b.length-1];
  document.getElementById("lastResult").textContent=last?classify(last.digit):"—";
  document.getElementById("lastResult").className=last?.digit>=5?"big-text":"small-text";
  let s=0; if(last){const c=classify(last.digit);for(let i=b.length-1;i>=0&&classify(b[i].digit)===c;i--)s++}
  document.getElementById("streak").textContent=s;
  if(last){
    document.getElementById("currentIssue").textContent=String(last.number).padStart(6,"0");
    document.getElementById("nextIssue").textContent=String(Number(last.number)+1).padStart(6,"0");
    document.getElementById("predIssue").textContent=String(Number(last.number)+1).padStart(6,"0");
  }
  const recent=b.slice(-25).reverse();
  document.getElementById("rows").innerHTML=recent.map(x=>`<tr><td>${x.number}</td><td>${x.digit}</td><td class="${x.digit>=5?"big-text":"small-text"}">${classify(x.digit)}</td><td>${new Date(x.time).toLocaleTimeString()}</td></tr>`).join("");
  predict();
  draw();
}
function predict(){
  const b=state.blocks.slice(-20);
  if(!b.length)return;
  const big=b.filter(x=>x.digit>=5).length;
  const small=b.length-big;
  let p=big>=small?"BIG":"SMALL";
  let conf=Math.round(50+Math.abs(big-small)/b.length*35);
  // simple streak-aware display only; not a proven predictor
  const last=classify(b[b.length-1].digit);
  let reason=`Recent 20: BIG ${big}, SMALL ${small}.`;
  if(b.length>=5 && b.slice(-5).every(x=>classify(x.digit)==="SMALL")){p="BIG";conf=Math.max(conf,68);reason="REVERSAL DISPLAY: 5 consecutive SMALL results. Expecting bounce."}
  if(b.length>=5 && b.slice(-5).every(x=>classify(x.digit)==="BIG")){p="SMALL";conf=Math.max(conf,68);reason="REVERSAL DISPLAY: 5 consecutive BIG results. Expecting pullback."}
  const el=document.getElementById("prediction");el.textContent=p;el.className="pred "+(p==="BIG"?"big":"small");
  document.getElementById("confidence").textContent=conf+"%";
  document.getElementById("confidenceBar").style.width=conf+"%";
  document.getElementById("reason").textContent=reason;
}
function draw(){
  const c=document.getElementById("chart"),ctx=c.getContext("2d");
  const d=devicePixelRatio||1,w=c.clientWidth,h=c.clientHeight;c.width=w*d;c.height=h*d;ctx.scale(d,d);
  ctx.fillStyle="#07090b";ctx.fillRect(0,0,w,h);
  const count=Math.min(state.blocks.length,Math.round(55*state.zoom));const arr=state.blocks.slice(-count);
  ctx.strokeStyle="#20262c";ctx.lineWidth=1;
  for(let x=0;x<w;x+=66){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}
  for(let y=32;y<h;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
  if(!arr.length)return;
  const vals=arr.map((x,i)=>100+(x.digit-4.5)*1.8+Math.sin(i*.7)*1.8);
  const min=Math.min(...vals)-5,max=Math.max(...vals)+5;
  const sy=v=>h-25-(v-min)/(max-min)*(h-45);
  const step=w/(arr.length+1);
  arr.forEach((x,i)=>{
    const cx=(i+1)*step, v=vals[i], open=v+(i%2?1.5:-1), close=v+(x.digit>=5?2:-2);
    const high=Math.max(open,close)+2,low=Math.min(open,close)-2;
    ctx.strokeStyle=close>=open?"#27d66c":"#f04455";ctx.fillStyle=ctx.strokeStyle;
    ctx.beginPath();ctx.moveTo(cx,sy(high));ctx.lineTo(cx,sy(low));ctx.stroke();
    const top=sy(Math.max(open,close)),bot=sy(Math.min(open,close));
    ctx.fillRect(cx-4,top,8,Math.max(3,bot-top));
  });
}
document.getElementById("zoomIn").onclick=()=>{state.zoom=Math.min(2,state.zoom+.25);draw()};
document.getElementById("zoomOut").onclick=()=>{state.zoom=Math.max(.5,state.zoom-.25);draw()};
document.getElementById("reset").onclick=()=>{state.zoom=1;draw()};
window.addEventListener("resize",draw);
load();setInterval(load,60000);
