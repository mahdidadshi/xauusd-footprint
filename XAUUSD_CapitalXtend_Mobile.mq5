#property strict
#property version "1.00"
#property description "CapitalXtend XAUUSD -> Mobile Footprint server"

input string SERVER_URL = "https://YOUR-DOMAIN.COM/tick";
input string SYMBOL_NAME = "XAUUSD";
input int SEND_EVERY_MS = 250;
input bool USE_REAL_VOLUME = false;

ulong last_send=0;

int OnInit()
{
   string sym=SYMBOL_NAME;
   if(!SymbolSelect(sym,true))
   {
      Print("Cannot select symbol: ",sym);
      return INIT_FAILED;
   }
   EventSetMillisecondTimer(SEND_EVERY_MS);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}

double TickVolume(const MqlTick &t)
{
   if(USE_REAL_VOLUME && t.volume_real>0) return t.volume_real;
   if(t.volume>0) return (double)t.volume;
   return 1.0;
}

void OnTimer()
{
   MqlTick t;
   if(!SymbolInfoTick(SYMBOL_NAME,t)) return;

   double buyVol=0, sellVol=0;
   double v=TickVolume(t);

   // MT5 tick flags: BUY/SELL describe aggressor side when supplied by broker.
   if((t.flags & TICK_FLAG_BUY)==TICK_FLAG_BUY) buyVol=v;
   else if((t.flags & TICK_FLAG_SELL)==TICK_FLAG_SELL) sellVol=v;
   else
   {
      // fallback: classify by last vs previous mid is intentionally omitted;
      // unknown ticks are sent with zero side volume.
   }

   string json=StringFormat(
      "{\"symbol\":\"%s\",\"bid\":%.5f,\"ask\":%.5f,\"last\":%.5f,\"time\":%I64d,\"buyVol\":%.5f,\"sellVol\":%.5f}",
      SYMBOL_NAME,t.bid,t.ask,t.last,(long)t.time_msc,buyVol,sellVol
   );

   char post[], result[];
   string headers="Content-Type: application/json\r\n";
   StringToCharArray(json,post,0,StringLen(json),CP_UTF8);

   string result_headers;
   ResetLastError();
   int code=WebRequest("POST",SERVER_URL,headers,3000,post,result,result_headers);

   if(code==-1)
      Print("WebRequest failed. Error=",GetLastError(),
            ". Add server domain to MT5 WebRequest allowed URLs.");
}
