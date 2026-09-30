# XAUUSD CapitalXtend Mobile Footprint v1

این پروژه برای CapitalXtend MT5 و نماد XAUUSD آماده شده است.

معماری:
MT5 (CapitalXtend) -> EA -> Mobile Server -> Mobile Browser

امکانات:
- Footprint یک دقیقه‌ای
- Buy/Sell tick volume
- Delta
- POC
- Absorption
- BUY/SELL signal
- Entry / SL / TP
- پنل responsive برای موبایل
- بدون اجرای Python روی گوشی

نکته مهم:
برای دیتای واقعی بروکر، EA باید روی یک MT5 متصل به حساب CapitalXtend اجرا شود؛ این MT5 می‌تواند روی Windows/VPS باشد. موبایل فقط پنل را باز می‌کند.

## راه‌اندازی سرور

نیازمندی: Node.js 18+

    node server.js

پیش‌فرض:
http://localhost:8080

برای اینترنت، همین پوشه را روی VPS اجرا کنید و پورت 8080 را با HTTPS reverse proxy منتشر کنید.

## راه‌اندازی EA

فایل:
XAUUSD_CapitalXtend_Mobile.mq5

در MetaEditor کامپایل و روی نمودار XAUUSD اجرا کنید.

در EA:
SERVER_URL = آدرس عمومی سرور، مثلا:
https://YOUR-DOMAIN.COM/tick

در MT5:
Tools -> Options -> Expert Advisors -> Allow WebRequest
و دامنه سرور را اضافه کنید.

## منطق سیگنال

- تایم‌فریم: 1 دقیقه
- bucket قیمت: 0.10
- absorption threshold: 12 tick-volume units
- Sell absorption: حجم خرید در سقف غالب + بسته شدن زیر سطح
- Buy absorption: حجم فروش در کف غالب + بسته شدن بالای سطح
- SL/TP پیش‌فرض بر اساس ATR قابل تنظیم است.

این نسخه فقط سیگنال/تحلیل است و سفارش خودکار ارسال نمی‌کند.
