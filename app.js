const $=id=>document.getElementById(id);
function f(v,d=2){return Number(v||0).toFixed(d)}
function render(x){
  $("status").textContent="● آنلاین";
  $("price").textContent=f(x.last);
  $("spread").textContent=`Spread: ${f((x.ask||0)-(x.bid||0))}`;
  $("delta").textContent=f(x.delta,2);
  $("poc").textContent=f(x.poc);
  $("buy").textContent=f(x.buyVol,2);
  $("sell").textContent=f(x.sellVol,2);
  $("entry").textContent=x.signal==="WAIT"?"—":f(x.entry);
  $("sl").textContent=x.signal==="WAIT"?"—":f(x.sl);
  $("tp").textContent=x.signal==="WAIT"?"—":f(x.tp);
  $("candle").textContent=x.candle?`${f(x.candle.open)} → ${f(x.candle.close)}`:"—";
  const s=$("signal"); s.textContent=x.signal; s.className="signal "+x.signal.toLowerCase();
  const lv=x.levels||[]; $("levelsCount").textContent=lv.length;
  $("levels").innerHTML=lv.slice().reverse().map(a=>{
    const m=Math.max(a.buy,a.sell,0.0001), b=100*a.buy/m, q=100*a.sell/m;
    return `<div class="level"><div><b>${f(a.price)}</b><div class="bar"><i style="width:${b}%"></i></div></div><div>Buy ${f(a.buy,1)}</div><div>Sell ${f(a.sell,1)}<div class="bar sell"><i style="width:${q}%"></i></div></div></div>`
  }).join("");
}
const es=new EventSource("/events");
es.onmessage=e=>{try{render(JSON.parse(e.data))}catch{}};
es.onerror=()=>{$("status").textContent="○ قطع ارتباط"};
