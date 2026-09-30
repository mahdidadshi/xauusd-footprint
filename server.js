const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";
const ABSORPTION_VOL = Number(process.env.ABSORPTION_VOL || 12);
const BUCKET = Number(process.env.PRICE_BUCKET || 0.10);
const ATR_PERIOD = 14;
const clients = new Set();

let latest = {
  symbol: "XAUUSD",
  bid: 0,
  ask: 0,
  last: 0,
  time: 0,
  delta: 0,
  buyVol: 0,
  sellVol: 0,
  poc: 0,
  signal: "WAIT",
  entry: 0,
  sl: 0,
  tp: 0,
  candle: null,
  levels: []
};

let candle = null;
const ranges = [];

function bucket(p) { return Math.round(p / BUCKET) * BUCKET; }
function n(v, d=2) { return Number(v || 0).toFixed(d); }

function newCandle(t, p) {
  const minute = Math.floor(t / 60000) * 60000;
  return {
    start: minute, open:p, high:p, low:p, close:p,
    buyVol:0, sellVol:0, levels:new Map()
  };
}

function addLevel(c, price, buy, sell) {
  const k = bucket(price).toFixed(2);
  if (!c.levels.has(k)) c.levels.set(k, {price:Number(k), buy:0, sell:0});
  const x = c.levels.get(k);
  x.buy += buy; x.sell += sell;
}

function finalize(c) {
  if (!c) return;
  ranges.push(c.high - c.low);
  if (ranges.length > ATR_PERIOD) ranges.shift();

  const levels = [...c.levels.values()].sort((a,b)=>a.price-b.price);
  let poc = c.close, maxVol = -1;
  for (const x of levels) {
    const v = x.buy + x.sell;
    if (v > maxVol) { maxVol=v; poc=x.price; }
  }

  const top = levels[levels.length-1];
  const bottom = levels[0];
  let signal = "WAIT";
  if (top && top.buy >= ABSORPTION_VOL && c.close < top.price) signal = "SELL";
  if (bottom && bottom.sell >= ABSORPTION_VOL && c.close > bottom.price) signal = "BUY";

  const atr = ranges.length ? ranges.reduce((a,b)=>a+b,0)/ranges.length : Math.max(c.high-c.low, BUCKET*10);
  let sl=0,tp=0;
  if (signal==="BUY") { sl=c.close-atr*0.8; tp=c.close+atr*1.6; }
  if (signal==="SELL") { sl=c.close+atr*0.8; tp=c.close-atr*1.6; }

  latest = {
    ...latest,
    symbol:"XAUUSD",
    bid: latest.bid, ask:latest.ask, last:c.close, time:Date.now(),
    delta:c.buyVol-c.sellVol, buyVol:c.buyVol, sellVol:c.sellVol,
    poc, signal, entry:c.close, sl, tp,
    candle:{start:c.start,open:c.open,high:c.high,low:c.low,close:c.close},
    levels
  };
  broadcast();
}

function processTick(tick) {
  const t = Number(tick.time || Date.now());
  const p = Number(tick.last || tick.bid || tick.ask);
  if (!p) return;

  const buy = Number(tick.buyVol || 0);
  const sell = Number(tick.sellVol || 0);

  if (!candle) candle = newCandle(t,p);
  const minute = Math.floor(t/60000)*60000;
  if (minute !== candle.start) {
    finalize(candle);
    candle = newCandle(t,p);
  }

  candle.high=Math.max(candle.high,p);
  candle.low=Math.min(candle.low,p);
  candle.close=p;
  candle.buyVol += buy;
  candle.sellVol += sell;
  addLevel(candle,p,buy,sell);

  latest.bid=Number(tick.bid||p);
  latest.ask=Number(tick.ask||p);
  latest.last=p;
  latest.time=t;
  latest.candle={start:candle.start,open:candle.open,high:candle.high,low:candle.low,close:candle.close};
  latest.delta=candle.buyVol-candle.sellVol;
  latest.buyVol=candle.buyVol;
  latest.sellVol=candle.sellVol;
  latest.levels=[...candle.levels.values()].sort((a,b)=>a.price-b.price);
  broadcast();
}

function broadcast() {
  const msg = `data: ${JSON.stringify(latest)}\n\n`;
  for (const res of clients) {
    try { res.write(msg); } catch(e) { clients.delete(res); }
  }
}

function sendFile(res, file, type) {
  fs.readFile(file, (err,data)=>{
    if(err){ res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, {"Content-Type":type, "Cache-Control":"no-store"});
    res.end(data);
  });
}

const server=http.createServer((req,res)=>{
  if(req.method==="GET" && req.url==="/"){
    return sendFile(res,path.join(__dirname,"public","index.html"),"text/html; charset=utf-8");
  }
  if(req.method==="GET" && req.url==="/app.js"){
    return sendFile(res,path.join(__dirname,"public","app.js"),"application/javascript; charset=utf-8");
  }
  if(req.method==="GET" && req.url==="/events"){
    res.writeHead(200,{"Content-Type":"text/event-stream","Cache-Control":"no-cache","Connection":"keep-alive","Access-Control-Allow-Origin":"*"});
    res.write(`data: ${JSON.stringify(latest)}\n\n`);
    clients.add(res);
    req.on("close",()=>clients.delete(res));
    return;
  }
  if(req.method==="GET" && req.url==="/health"){
    res.writeHead(200,{"Content-Type":"application/json"});
    return res.end(JSON.stringify({ok:true,clients:clients.size}));
  }
  if(req.method==="POST" && req.url==="/tick"){
    let body="";
    req.on("data",d=>body+=d);
    req.on("end",()=>{
      try { processTick(JSON.parse(body)); res.writeHead(200,{"Content-Type":"application/json"}); res.end('{"ok":true}'); }
      catch(e){ res.writeHead(400); res.end(JSON.stringify({ok:false,error:String(e)})); }
    });
    return;
  }
  res.writeHead(404); res.end("Not found");
});

server.listen(PORT,HOST,()=>console.log(`XAUUSD mobile server on ${HOST}:${PORT}`));
