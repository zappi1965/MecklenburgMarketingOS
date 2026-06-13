
'use client'

import { memo, useEffect } from 'react'

const landingCss = `
:root{
  --bg:#05050b;
  --bg2:#090914;
  --surface:#111120;
  --surface2:#17162a;
  --glass:rgba(255,255,255,.065);
  --glass2:rgba(255,255,255,.095);
  --line:rgba(255,255,255,.115);
  --line2:rgba(190,175,255,.22);
  --text:#f8f7ff;
  --soft:#dfdcec;
  --muted:#a6a1b8;
  --muted2:#736f86;
  --violet:#8b5cf6;
  --violet2:#5d5dfc;
  --violet3:#c084fc;
  --blue:#60a5fa;
  --cyan:#67e8f9;
  --green:#86efac;
  --amber:#fbbf24;
  --gold:#facc15;
  --peach:#fb923c;
  --rose:#fb7185;
  --mint:#6ee7b7;
  --grad:linear-gradient(100deg,#5d5dfc 0%,#8b5cf6 54%,#c084fc 100%);
  --grad-warm:linear-gradient(105deg,#fbbf24 0%,#fb923c 45%,#fb7185 100%);
  --grad-human:linear-gradient(110deg,#c084fc 0%,#fb923c 54%,#facc15 100%);
  --grad-trust:linear-gradient(110deg,#86efac 0%,#6ee7b7 48%,#67e8f9 100%);
  --grad-cool:linear-gradient(135deg,#5d5dfc 0%,#8b5cf6 45%,#67e8f9 120%);
  --shadow:0 40px 130px rgba(0,0,0,.54);
  --max:1160px;
  --font:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Segoe UI",Roboto,Helvetica,Arial,sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;background:var(--bg);scroll-padding-top:92px}
body{
  min-height:100vh;
  font-family:var(--font);
  color:var(--text);
  background:
    radial-gradient(980px 600px at 50% -12%,rgba(139,92,246,.28),transparent 66%),
    radial-gradient(760px 560px at 8% 18%,rgba(93,93,252,.13),transparent 68%),
    radial-gradient(820px 540px at 92% 28%,rgba(103,232,249,.085),transparent 68%),
    linear-gradient(180deg,#05050b 0%,#090914 42%,#05050b 100%);
  overflow-x:hidden;
  line-height:1.5;
  -webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
}
body::before{
  content:"";position:fixed;inset:0;pointer-events:none;z-index:-3;
  background:linear-gradient(rgba(255,255,255,.024) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.024) 1px,transparent 1px);
  background-size:80px 80px;
  -webkit-mask-image:radial-gradient(circle at 50% 15%,#000 0%,rgba(0,0,0,.7) 42%,transparent 78%);
  mask-image:radial-gradient(circle at 50% 15%,#000 0%,rgba(0,0,0,.7) 42%,transparent 78%);
}
body::after{
  content:"";position:fixed;inset:0;pointer-events:none;z-index:9999;opacity:.09;mix-blend-mode:soft-light;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 220 220' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.74' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.34'/%3E%3C/svg%3E");
}
::selection{background:var(--violet);color:#fff}
a{color:inherit;text-decoration:none}
button,input,textarea,select{font:inherit}
button{border:0}
h1,h2,h3{letter-spacing:-.057em;line-height:.96;font-weight:850}
.grad{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.container{width:min(var(--max),calc(100% - 44px));margin-inline:auto}
@media(max-width:560px){.container{width:min(var(--max),calc(100% - 28px))}}
:focus-visible{outline:2px solid var(--violet3);outline-offset:4px;border-radius:12px}

/* NAV */
.nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:12px max(12px,env(safe-area-inset-left)) 0 max(12px,env(safe-area-inset-right));pointer-events:none}
.nav-shell{
  width:min(1060px,100%);margin:auto;pointer-events:auto;display:flex;align-items:center;justify-content:space-between;gap:14px;
  min-height:54px;padding:8px 9px 8px 15px;border:1px solid rgba(255,255,255,.105);border-radius:999px;
  background:rgba(7,7,15,.64);-webkit-backdrop-filter:blur(28px) saturate(1.5);backdrop-filter:blur(28px) saturate(1.5);box-shadow:0 14px 58px rgba(0,0,0,.28);
}
.logo{display:flex;align-items:center;gap:.64rem;font-weight:820;letter-spacing:-.025em;white-space:nowrap}
.logo-mark{width:30px;height:30px;border-radius:10px;display:grid;place-items:center;background:var(--grad);box-shadow:0 12px 32px rgba(139,92,246,.38);font-weight:850;color:white;font-size:.82rem}
.logo span:last-child{color:#cbbaff}
.nav-links{display:flex;gap:2px;align-items:center;color:var(--muted);font-weight:720;font-size:.86rem}
.nav-links a{padding:.58rem .82rem;border-radius:999px;transition:.2s}
.nav-links a:hover{color:#fff;background:rgba(255,255,255,.06)}
.nav-actions{display:flex;align-items:center;gap:8px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:42px;padding:.72rem 1.08rem;border-radius:999px;border:1px solid transparent;font-weight:780;white-space:nowrap;cursor:pointer;color:white;transition:transform .2s,box-shadow .2s,background .2s,border-color .2s}
.btn.primary{background:var(--grad);box-shadow:0 15px 45px rgba(139,92,246,.34)}
.btn.primary:hover{transform:translateY(-2px);box-shadow:0 20px 62px rgba(139,92,246,.48)}
.btn.ghost{background:rgba(255,255,255,.055);border-color:rgba(255,255,255,.11);color:var(--soft)}
.btn.ghost:hover{background:rgba(255,255,255,.09);color:#fff}
.btn.big{min-height:54px;padding:.9rem 1.38rem;font-size:1.02rem}
.menu-btn{display:none;width:42px;height:42px;border-radius:999px;border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.055);place-items:center;cursor:pointer}
.menu-btn i,.menu-btn i::before,.menu-btn i::after{content:"";display:block;width:17px;height:2px;border-radius:99px;background:#fff;transition:.24s}
.menu-btn i::before{transform:translateY(-6px)}
.menu-btn i::after{transform:translateY(4px)}
.mobile-menu{display:none;width:100%;padding:4px;gap:5px}
.mobile-menu a{padding:.9rem .95rem;border-radius:16px;background:rgba(255,255,255,.045);font-weight:760;color:var(--muted)}
.mobile-menu a.login-link{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.065);color:#f3efff}
.mobile-menu a.login-link::after{content:"↗";opacity:.72;font-size:.88rem}
.mobile-menu a.menu-cta{background:var(--grad);color:white;text-align:center;margin-top:3px}
@media(max-width:900px){
  .nav-shell{border-radius:25px;flex-wrap:wrap;align-items:flex-start;padding:8px}
  .logo{padding-left:4px;min-height:42px}
  .nav-links,.nav-actions .ghost{display:none}
  .menu-btn{display:grid}
  .nav.open .nav-shell{background:#0a0a16;-webkit-backdrop-filter:none;backdrop-filter:none;border-color:rgba(255,255,255,.14);box-shadow:0 26px 80px rgba(0,0,0,.62)}
  .nav.open .mobile-menu{display:grid}
  .nav.open .menu-btn i{background:transparent}
  .nav.open .menu-btn i::before{transform:translateY(1px) rotate(45deg)}
  .nav.open .menu-btn i::after{transform:translateY(-1px) rotate(-45deg)}
}
@media(max-width:420px){.nav-actions .primary{display:none}.logo .hide-sm{display:none}}

/* BASE */
.section{position:relative;padding:74px 0}
.section.compact{padding:52px 0}
.section-head{display:flex;align-items:end;justify-content:space-between;gap:28px;margin-bottom:22px}
.section-head h2{font-size:clamp(2.15rem,5.2vw,4.55rem);max-width:820px}
.section-head p{color:var(--muted);font-size:1.04rem;max-width:430px}
.kicker{display:inline-flex;align-items:center;gap:.55rem;border:1px solid var(--line2);background:rgba(255,255,255,.055);border-radius:999px;padding:.42rem .75rem;color:#d8d0f2;font-size:.78rem;font-weight:820;letter-spacing:-.01em}
.kicker::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 16px rgba(134,239,172,.75)}
@media(max-width:780px){.section{padding:58px 0}.section-head{display:block}.section-head p{margin-top:14px}}

/* HERO */
.hero{position:relative;padding:138px 0 28px;overflow:visible}
.hero-copy{text-align:center;max-width:1030px;margin:auto;position:relative;z-index:5}
.eyebrow{display:inline-flex;align-items:center;gap:.55rem;padding:.46rem .86rem;border-radius:999px;border:1px solid var(--line2);background:rgba(255,255,255,.055);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);color:#d5d0ea;font-weight:780;font-size:.82rem;box-shadow:inset 0 1px 0 rgba(255,255,255,.07)}
.live-dot{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:rgba(134,239,172,.12)}
.live-dot::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 16px var(--green)}
.hero h1{font-size:clamp(3.2rem,8.1vw,7.55rem);margin:1.28rem auto 0;max-width:13.8ch}
.hero-sub{max-width:790px;margin:1.35rem auto 0;color:var(--muted);font-size:clamp(1.07rem,1.9vw,1.38rem);font-weight:520;line-height:1.48}
.hero-ctas{display:flex;justify-content:center;align-items:center;gap:.9rem;flex-wrap:wrap;margin-top:2rem}
.risk-row{display:flex;justify-content:center;gap:.7rem;flex-wrap:wrap;margin-top:1.1rem;color:var(--muted2);font-size:.88rem}
.risk-row span{display:inline-flex;align-items:center;gap:.45rem;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.035);padding:.38rem .6rem;border-radius:999px}
.risk-row span::before{content:"✓";color:#d8ccff;font-weight:900}
.product-stage{position:relative;width:min(1180px,100%);margin:48px auto 0;min-height:655px;overflow:visible;perspective:1400px}
.product-stage::before{content:"";position:absolute;left:50%;bottom:34px;transform:translateX(-50%);width:min(920px,96vw);height:210px;border-radius:50%;background:radial-gradient(closest-side,rgba(139,92,246,.26),transparent 72%);filter:blur(26px);z-index:0}
.phone-device{position:absolute;left:50%;top:0;width:270px;aspect-ratio:9/19.25;border-radius:47px;background:linear-gradient(180deg,#1b1a27,#05050b);border:1px solid rgba(255,255,255,.15);box-shadow:0 50px 140px rgba(0,0,0,.66),inset 0 0 0 8px #05050b;padding:14px;overflow:hidden;transform-style:preserve-3d}
.phone-device::before{content:"";position:absolute;top:18px;left:50%;transform:translateX(-50%);width:92px;height:26px;border-radius:999px;background:#05050b;z-index:4;box-shadow:0 1px 0 rgba(255,255,255,.07)}
.phone-screen{height:100%;border-radius:33px;background:linear-gradient(165deg,#17162f,#0c0b18 64%,#090813);overflow:hidden;padding:55px 15px 15px;position:relative}
.phone-screen::before{content:"";position:absolute;inset:0;background:radial-gradient(300px 190px at 80% 4%,rgba(139,92,246,.23),transparent 66%),linear-gradient(rgba(255,255,255,.024) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);background-size:auto,38px 38px,38px 38px;pointer-events:none}
.phone-content{position:relative;z-index:2;display:flex;flex-direction:column;gap:10px;min-height:100%}
.phone-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:2px}
.phone-top b{font-size:.92rem;letter-spacing:-.02em}
.phone-top i{width:8px;height:8px;border-radius:50%;background:var(--violet3);box-shadow:0 0 14px var(--violet3)}
.tile{border:1px solid var(--line);background:rgba(255,255,255,.058);border-radius:16px;padding:10px;color:var(--muted);font-size:.74rem}
.tile b{display:block;color:#fff;font-size:.84rem;margin-bottom:2px}
.tile.hl{background:linear-gradient(135deg,rgba(93,93,252,.18),rgba(139,92,246,.09));border-color:rgba(139,92,246,.42)}
.big-num{display:block;font-size:1.78rem;font-weight:850;line-height:1.05;letter-spacing:-.045em}
.bar{height:5px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden;margin-top:8px}
.bar i{display:block;height:100%;width:var(--w);background:var(--grad);border-radius:999px}
.qr{width:82px;height:82px;border-radius:13px;background:#fff;margin:2px auto;display:grid;grid-template-columns:repeat(7,1fr);gap:2px;padding:8px;box-shadow:0 12px 35px rgba(255,255,255,.12)}
.qr s{background:#080811;border-radius:2px}.qr s.off{background:transparent}.stars{color:#ddd6fe;letter-spacing:.08em}
.p-center{z-index:4;transform:translateX(-50%) translateY(0) scale(1)}
.p-left{z-index:3;transform:translateX(-50%) translateX(-86%) translateY(56px) rotateY(14deg) rotateZ(-5deg) scale(.91);opacity:.96}
.p-right{z-index:3;transform:translateX(-50%) translateX(86%) translateY(56px) rotateY(-14deg) rotateZ(5deg) scale(.91);opacity:.96}
.product-caption{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);z-index:5;width:100%;text-align:center;color:var(--muted2);font-size:.86rem}
@media(max-width:900px){.product-stage{min-height:630px}.phone-device{width:236px}.p-left{transform:translateX(-50%) translateX(-64%) translateY(64px) rotateY(16deg) rotateZ(-6deg) scale(.86);opacity:.72}.p-right{transform:translateX(-50%) translateX(64%) translateY(64px) rotateY(-16deg) rotateZ(6deg) scale(.86);opacity:.72}}
@media(max-width:620px){.hero{padding-top:116px}.hero h1{font-size:clamp(3rem,14.4vw,4.75rem)}.hero-ctas .btn{width:100%}.product-stage{margin-top:38px;min-height:690px}.phone-device{width:216px}.p-left{transform:translateX(-50%) translateX(-48%) translateY(84px) rotateY(18deg) rotateZ(-6deg) scale(.78);opacity:.5}.p-right{transform:translateX(-50%) translateX(48%) translateY(84px) rotateY(-18deg) rotateZ(6deg) scale(.78);opacity:.5}.product-caption{bottom:0;padding-inline:18px}}

/* SWIPE SYSTEM */
.swipe-shell{position:relative}
.swipe-meta{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px}
.swipe-hint{color:var(--muted2);font-size:.88rem;font-weight:680}
.arrows{display:flex;gap:8px}
.arrow{width:42px;height:42px;border-radius:50%;border:1px solid var(--line);background:rgba(255,255,255,.055);color:#fff;display:grid;place-items:center;cursor:pointer;transition:.2s}
.arrow:hover{background:rgba(255,255,255,.1);transform:translateY(-1px)}
.swipe-row{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:2px 2px 20px;overscroll-behavior-x:contain;scroll-padding-left:2px}
.swipe-row::-webkit-scrollbar{display:none}
.swipe-card{scroll-snap-align:start;flex:0 0 min(390px,84vw);border:1px solid var(--line);border-radius:32px;background:linear-gradient(180deg,rgba(255,255,255,.068),rgba(255,255,255,.032));padding:24px;min-height:250px;position:relative;overflow:hidden;box-shadow:0 20px 70px rgba(0,0,0,.24)}
.swipe-card::before{content:"";position:absolute;right:-100px;bottom:-110px;width:250px;height:250px;border-radius:50%;background:radial-gradient(circle,rgba(139,92,246,.16),transparent 68%)}
.swipe-card>*{position:relative;z-index:2}
.swipe-card small{color:#d8ccff;font-weight:850;text-transform:uppercase;letter-spacing:.09em;font-size:.72rem}
.swipe-card h3{font-size:1.62rem;margin-top:11px}
.swipe-card p{color:var(--muted);font-size:.95rem;margin-top:11px}
.card-stat{font-size:2.6rem;font-weight:850;letter-spacing:-.06em;line-height:1;margin-top:18px}
.card-note{display:inline-flex;margin-top:16px;border:1px solid rgba(192,132,252,.34);background:rgba(139,92,246,.12);color:#e8e1ff;border-radius:999px;padding:.42rem .7rem;font-size:.76rem;font-weight:820}
@media(max-width:760px){.arrows{display:none}.swipe-hint::after{content:" →"}.swipe-card{min-height:235px}}

/* AHA */
.aha{padding:16px 0 46px}
.aha-card{min-height:200px}.aha-card p{max-width:280px}

/* PROBLEM SOLUTION */
.problem-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.big-panel{border:1px solid var(--line);border-radius:42px;background:linear-gradient(180deg,rgba(255,255,255,.068),rgba(255,255,255,.03));padding:34px;box-shadow:var(--shadow);position:relative;overflow:hidden}
.big-panel::before{content:"";position:absolute;right:-170px;top:-160px;width:410px;height:410px;border-radius:50%;background:radial-gradient(circle,rgba(139,92,246,.2),transparent 67%)}
.big-panel>*{position:relative;z-index:2}.big-panel h2{font-size:clamp(2.3rem,5.5vw,5rem);max-width:760px}.big-panel p{color:var(--muted);font-size:1.06rem;margin-top:18px;max-width:620px}
.pain-list{display:grid;gap:12px;margin-top:26px}
.pain{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:start;border:1px solid var(--line);border-radius:22px;background:rgba(0,0,0,.16);padding:16px;color:var(--muted)}
.pain i{width:34px;height:34px;border-radius:13px;background:rgba(251,113,133,.14);border:1px solid rgba(251,113,133,.28);display:grid;place-items:center;color:#fecdd3;font-style:normal;font-weight:900}.pain b{display:block;color:#fff;margin-bottom:3px}
.solution-panel{border:1px solid var(--line);border-radius:42px;background:linear-gradient(180deg,rgba(139,92,246,.13),rgba(255,255,255,.03));padding:34px;box-shadow:var(--shadow)}
.solution-panel h3{font-size:clamp(2rem,4vw,3.6rem)}.solution-panel p{color:var(--muted);font-size:1.05rem;margin-top:16px}
.solution-points{display:grid;gap:12px;margin-top:24px}.solution-points span{display:flex;gap:10px;color:var(--soft);font-weight:720;border-bottom:1px solid var(--line);padding-bottom:10px}.solution-points span::before{content:"✓";color:#d8ccff;font-weight:900}
@media(max-width:920px){.problem-grid{grid-template-columns:1fr}.big-panel,.solution-panel{border-radius:32px;padding:24px}}

/* ANALYSIS PRODUCT */
.analysis-shell{border:1px solid var(--line);border-radius:46px;background:linear-gradient(180deg,rgba(255,255,255,.068),rgba(255,255,255,.028));box-shadow:var(--shadow);padding:32px;overflow:hidden}
.analysis-top{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:18px}.analysis-top h2{font-size:clamp(2.3rem,5.7vw,5rem);max-width:760px}.analysis-top p{color:var(--muted);max-width:390px;font-size:1.03rem}
.analysis-cta{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:24px}.included{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.included span{border:1px solid var(--line);background:rgba(0,0,0,.15);color:var(--muted);border-radius:999px;padding:.45rem .7rem;font-size:.82rem;font-weight:720}
@media(max-width:820px){.analysis-shell{border-radius:32px;padding:22px}.analysis-top{display:block}.analysis-top p{margin-top:14px}.analysis-cta .btn{width:100%}}

/* CASE / REPORT */
.report-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:stretch}
.report-panel{border:1px solid var(--line);border-radius:36px;background:linear-gradient(180deg,rgba(255,255,255,.065),rgba(255,255,255,.03));padding:24px;box-shadow:0 26px 90px rgba(0,0,0,.3);position:relative;overflow:hidden}.report-panel::before{content:"";position:absolute;right:-100px;top:-110px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(139,92,246,.18),transparent 70%)}.report-panel>*{position:relative;z-index:2}
.report-title{display:flex;justify-content:space-between;gap:14px;margin-bottom:16px}.report-title small{color:#d8ccff;font-weight:850;text-transform:uppercase;letter-spacing:.09em;font-size:.72rem}.report-title span{color:var(--muted2);font-size:.82rem}
.metric-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.metric-box{border:1px solid var(--line);background:rgba(255,255,255,.048);border-radius:20px;padding:14px}.metric-box small{display:block;color:var(--muted2);font-weight:780}.metric-box b{display:block;font-size:1.75rem;letter-spacing:-.045em;margin-top:3px}.metric-box span{display:block;color:var(--muted);font-size:.75rem;margin-top:3px}
.report-chart{height:170px;border:1px solid var(--line);border-radius:24px;background:linear-gradient(180deg,rgba(139,92,246,.13),rgba(255,255,255,.02));position:relative;overflow:hidden;margin-top:14px}.report-chart svg{position:absolute;inset:0;width:100%;height:100%}
.activity{display:grid;gap:10px}.activity-row{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;border:1px solid var(--line);border-radius:18px;background:rgba(255,255,255,.046);padding:12px}.activity-row i{width:34px;height:34px;border-radius:13px;background:var(--grad)}.activity-row b{display:block;font-size:.9rem}.activity-row span{color:var(--muted);font-size:.78rem}.activity-row em{font-style:normal;color:var(--muted2);font-size:.76rem}.tag{display:inline-flex;border:1px solid rgba(192,132,252,.34);background:rgba(139,92,246,.13);color:#e5dcff;padding:.28rem .54rem;border-radius:999px;font-size:.68rem;font-weight:850}
@media(max-width:930px){.report-grid{grid-template-columns:1fr}.metric-row{grid-template-columns:1fr}.activity-row{grid-template-columns:auto 1fr}.activity-row em{grid-column:2}}

/* TEAM */
.team-grid{display:grid;grid-template-columns:.85fr 1.15fr;gap:18px;align-items:stretch}
.trust-copy{border:1px solid var(--line);border-radius:40px;background:linear-gradient(180deg,rgba(255,255,255,.065),rgba(255,255,255,.03));padding:30px;box-shadow:0 26px 90px rgba(0,0,0,.3)}.trust-copy h2{font-size:clamp(2.2rem,5vw,4.3rem)}.trust-copy p{color:var(--muted);margin-top:15px;font-size:1.03rem}.trust-list{display:grid;gap:10px;margin-top:22px}.trust-list span{display:flex;gap:10px;color:var(--soft);font-weight:720}.trust-list span::before{content:"✓";color:#d8ccff;font-weight:900}
.people{display:grid;grid-template-columns:1fr 1fr;gap:14px}.person{border:1px solid var(--line);border-radius:34px;background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.033));padding:18px;overflow:hidden}.photo{height:250px;border-radius:26px;border:1px solid var(--line);background:radial-gradient(circle at 50% 26%,rgba(192,132,252,.28),transparent 30%),linear-gradient(150deg,rgba(93,93,252,.22),rgba(255,255,255,.045));display:grid;place-items:center;color:#eee;font-size:3rem;font-weight:850;letter-spacing:-.08em}.person h3{font-size:1.4rem;margin-top:16px}.person p{color:var(--muted);font-size:.92rem;margin-top:6px}
@media(max-width:920px){.team-grid{grid-template-columns:1fr}.people{grid-template-columns:1fr}.photo{height:220px}}

/* QUALIFY */
.fit-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.fit-item{border:1px solid var(--line);background:rgba(255,255,255,.05);border-radius:24px;padding:18px;display:flex;gap:12px;color:var(--muted)}.fit-item::before{content:"✓";width:28px;height:28px;border-radius:10px;background:rgba(139,92,246,.16);border:1px solid rgba(192,132,252,.34);display:grid;place-items:center;color:#e8ddff;font-weight:900;flex:0 0 auto}.fit-item b{display:block;color:#fff;margin-bottom:3px}
@media(max-width:720px){.fit-grid{grid-template-columns:1fr}}

/* PRICING */
.pricing-note{border:1px solid var(--line);background:rgba(255,255,255,.045);border-radius:28px;padding:18px;margin-bottom:16px;color:var(--muted);display:flex;justify-content:space-between;gap:16px;align-items:center}.pricing-note b{color:#fff}.pricing-note .btn{flex:0 0 auto}
.pricing{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.plan{border:1px solid var(--line);border-radius:34px;background:linear-gradient(180deg,rgba(255,255,255,.065),rgba(255,255,255,.034));padding:25px;min-height:510px;display:flex;flex-direction:column;position:relative;overflow:hidden}.plan.featured{border-color:rgba(192,132,252,.52);background:linear-gradient(180deg,rgba(139,92,246,.17),rgba(255,255,255,.035));box-shadow:0 36px 120px rgba(139,92,246,.2)}.badge{position:absolute;right:18px;top:18px;border-radius:999px;background:var(--grad);padding:.36rem .65rem;font-size:.72rem;font-weight:850}.plan h3{font-size:1.65rem}.plan .desc{color:var(--muted);font-size:.92rem;margin-top:9px;min-height:58px}.price{font-size:2.8rem;font-weight:850;letter-spacing:-.05em;margin:18px 0 2px}.price small{font-size:1rem;color:var(--muted);font-weight:650;letter-spacing:0}.setup{color:var(--muted2);font-size:.83rem;margin-bottom:18px}.plan ul{list-style:none;display:grid;gap:11px;margin:18px 0 25px;flex:1}.plan li{display:flex;gap:9px;color:var(--muted);font-size:.92rem}.plan li::before{content:"✓";color:#e2d8ff;font-weight:850}.plan .btn{width:100%}.fineprint{text-align:center;color:var(--muted2);font-size:.88rem;margin-top:18px}
@media(max-width:920px){.pricing{grid-template-columns:1fr;max-width:500px;margin:auto}.plan{min-height:auto}.pricing-note{display:block}.pricing-note .btn{width:100%;margin-top:14px}}

/* FAQ FORM FOOTER */
.faq{display:grid;grid-template-columns:.9fr 1.1fr;gap:26px}.faq h2{font-size:clamp(2.2rem,5vw,4.4rem)}.faq p{color:var(--muted);margin-top:14px}.faq-list{border:1px solid var(--line);border-radius:32px;background:rgba(255,255,255,.045);overflow:hidden}details{border-bottom:1px solid var(--line)}details:last-child{border-bottom:0}summary{list-style:none;cursor:pointer;font-size:1.08rem;font-weight:820;padding:20px 22px;display:flex;justify-content:space-between;gap:22px;letter-spacing:-.025em}summary::-webkit-details-marker{display:none}summary::after{content:"+";color:var(--violet3);font-size:1.5rem;line-height:1;transition:.22s}details[open] summary::after{transform:rotate(45deg)}details p{padding:0 22px 21px;margin:0;font-size:.95rem}@media(max-width:840px){.faq{grid-template-columns:1fr}}
.form-section{padding:72px 0 92px}.form-box{display:grid;grid-template-columns:.92fr 1.08fr;gap:20px;align-items:stretch}.form-copy,.contact-form{border:1px solid var(--line);border-radius:36px;background:linear-gradient(180deg,rgba(255,255,255,.065),rgba(255,255,255,.034));padding:28px}.form-copy h2{font-size:clamp(2.3rem,5vw,4.6rem)}.form-copy p{color:var(--muted);margin-top:14px}.after-request{display:grid;gap:10px;margin-top:22px}.after-request span{border:1px solid var(--line);background:rgba(0,0,0,.15);border-radius:18px;padding:12px;color:var(--muted)}.after-request b{color:#fff}.contact-form{display:grid;gap:13px}.field{display:grid;gap:7px}.field label{color:var(--muted);font-size:.82rem;font-weight:850}.field input,.field textarea,.field select{width:100%;border:1px solid rgba(255,255,255,.11);background:rgba(0,0,0,.17);color:white;border-radius:17px;padding:12px 13px;outline:none;font-size:16px;-webkit-appearance:none;appearance:none}.field textarea{min-height:112px;resize:vertical}.field input:focus,.field textarea:focus,.field select:focus{border-color:rgba(192,132,252,.6);box-shadow:0 0 0 4px rgba(139,92,246,.13)}.form-note{font-size:.82rem;color:#e6ddff;border:1px solid rgba(192,132,252,.33);background:rgba(139,92,246,.11);border-radius:18px;padding:12px}.mail-note{font-size:.78rem;color:var(--muted2)}
@media(max-width:860px){.form-box{grid-template-columns:1fr}.form-copy,.contact-form{border-radius:28px;padding:20px}}
.footer{border-top:1px solid var(--line);padding:30px 0 calc(34px + env(safe-area-inset-bottom));color:var(--muted2);font-size:.82rem}.footer-row{display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap}.legal{display:flex;gap:12px;flex-wrap:wrap}.legal a:hover{color:#fff}.mobile-sticky{display:none;position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:80}.mobile-sticky .btn{width:100%;box-shadow:0 18px 60px rgba(139,92,246,.46)}@media(max-width:700px){.mobile-sticky{display:block}.footer{padding-bottom:92px}}
.reveal{opacity:0;transform:translateY(34px);transition:opacity .8s cubic-bezier(.2,.8,.2,1),transform .8s cubic-bezier(.2,.8,.2,1)}.reveal.visible{opacity:1;transform:none}.delay1{transition-delay:.08s}.delay2{transition-delay:.16s}.delay3{transition-delay:.24s}

.contact-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.form-status{display:none;border-radius:18px;padding:12px;font-size:.86rem;line-height:1.45}
.form-status.show{display:block}
.form-status.success{border:1px solid rgba(134,239,172,.34);background:rgba(134,239,172,.11);color:#dcfce7}
.form-status.info{border:1px solid rgba(192,132,252,.34);background:rgba(139,92,246,.11);color:#efe7ff}
.photo{position:relative;overflow:hidden}
.photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.photo img[src=""],.photo img:not([src]){display:none}
.photo-initials{position:relative;z-index:1}
.skip-link{position:absolute;left:16px;top:14px;z-index:999;background:#fff;color:#070711;padding:.7rem 1rem;border-radius:999px;font-weight:850;transform:translateY(-150%);transition:.2s}
.skip-link:focus{transform:translateY(0)}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))){.nav-shell{background:rgba(7,7,15,.94)}.eyebrow{background:rgba(35,32,55,.92)}}
@media(max-width:860px){.contact-actions{grid-template-columns:1fr}.contact-actions .btn{width:100%}}
@media(max-width:430px){.hero h1{font-size:clamp(2.55rem,13.4vw,4.1rem)}.hero-sub{font-size:1rem}.risk-row{gap:.45rem}.risk-row span{font-size:.78rem}.product-stage{min-height:620px}.phone-device{width:196px}.swipe-card{flex-basis:86vw;padding:20px}.card-stat{font-size:2.28rem}.section{padding:50px 0}}
@media(pointer:coarse){.btn,.arrow,.menu-btn{min-height:44px}.arrow{min-width:44px}}


/* V15 conversion and live-readiness refinements */
.value-frame{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0 18px}
.value-pill{border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.028));border-radius:22px;padding:15px;color:var(--muted);font-size:.9rem}
.value-pill b{display:block;color:#fff;margin-bottom:4px;font-size:.98rem}
.value-pill::before{content:"";display:block;width:28px;height:4px;border-radius:99px;background:var(--grad);margin-bottom:12px}
.faq-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.faq-tags span{border:1px solid var(--line);background:rgba(255,255,255,.045);border-radius:999px;padding:.42rem .68rem;color:var(--muted);font-size:.78rem;font-weight:760}
.faq-list.compact summary{padding:17px 20px;font-size:1rem;line-height:1.18}
.faq-list.compact details p{padding:0 20px 18px;font-size:.91rem;line-height:1.48}
.contact-actions{grid-template-columns:repeat(3,minmax(0,1fr))}
.whatsapp-btn{border-color:rgba(134,239,172,.28)!important;background:rgba(134,239,172,.09)!important;color:#eafff0!important}
.whatsapp-btn:hover{background:rgba(134,239,172,.14)!important}
.hp-field{position:absolute!important;left:-10000px!important;top:auto!important;width:1px!important;height:1px!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important}
.desktop-sticky{position:fixed;right:18px;bottom:18px;z-index:78;display:block;max-width:320px}
.desktop-sticky-card{border:1px solid rgba(255,255,255,.12);background:rgba(7,7,15,.72);-webkit-backdrop-filter:blur(26px) saturate(1.4);backdrop-filter:blur(26px) saturate(1.4);box-shadow:0 22px 80px rgba(0,0,0,.38);border-radius:26px;padding:12px;display:grid;gap:10px}
.desktop-sticky-card small{color:var(--muted);font-weight:760;line-height:1.25}.desktop-sticky-actions{display:grid;grid-template-columns:1fr auto;gap:8px}.desktop-sticky .btn{min-height:40px;padding:.62rem .9rem;font-size:.86rem}
@media(max-width:920px){.value-frame{grid-template-columns:1fr}.desktop-sticky{display:none}.contact-actions{grid-template-columns:1fr}}
@media(max-width:700px){.faq-list.compact summary{padding:16px 18px}.faq-list.compact details p{padding:0 18px 17px}.value-pill{padding:14px}}



/* V16 final responsive + conversion refinements */
.carousel-progress{display:none;align-items:center;gap:6px;margin-top:2px;color:var(--muted2);font-size:.78rem;font-weight:760}
.carousel-progress i{width:6px;height:6px;border-radius:99px;background:rgba(255,255,255,.22);display:block;transition:.2s}
.carousel-progress i.active{width:18px;background:var(--violet3)}
.tel-link{color:#eee7ff;font-weight:820;text-decoration:none;border-bottom:1px solid rgba(192,132,252,.34)}
.tel-link:hover{color:#fff;border-bottom-color:rgba(255,255,255,.65)}
.mobile-sticky,.desktop-sticky{opacity:0;pointer-events:none;transform:translateY(18px);transition:opacity .24s ease,transform .24s ease}
body.sticky-cta-active:not(.sticky-cta-blocked) .mobile-sticky,
body.sticky-cta-active:not(.sticky-cta-blocked) .desktop-sticky{opacity:1;pointer-events:auto;transform:none}
body.sticky-cta-blocked .mobile-sticky,
body.sticky-cta-blocked .desktop-sticky{opacity:0;pointer-events:none;transform:translateY(18px)}
@media(max-width:760px){.carousel-progress{display:flex}.swipe-row{padding-bottom:14px}.swipe-card{flex-basis:82vw}}
@media(max-width:620px){
  .hero{padding-top:106px;padding-bottom:8px}
  .hero h1{font-size:clamp(2.78rem,13.6vw,4.28rem);max-width:10.8ch}
  .hero-sub{margin-top:1rem;font-size:1.02rem;line-height:1.42}
  .hero-ctas{margin-top:1.45rem;gap:.72rem}
  .risk-row{margin-top:.82rem}
  .product-stage{margin-top:25px;min-height:565px}
  .product-stage::before{bottom:56px;height:170px;filter:blur(24px)}
  .phone-device{width:190px;border-radius:40px;padding:12px;box-shadow:0 42px 110px rgba(0,0,0,.58),inset 0 0 0 7px #05050b}
  .phone-screen{border-radius:29px;padding:50px 12px 12px}
  .p-left{transform:translateX(-50%) translateX(-45%) translateY(70px) rotateY(18deg) rotateZ(-6deg) scale(.76);opacity:.43}
  .p-right{transform:translateX(-50%) translateX(45%) translateY(70px) rotateY(-18deg) rotateZ(6deg) scale(.76);opacity:.43}
  .product-caption{font-size:.78rem;bottom:12px;padding-inline:22px}
  .tile{font-size:.68rem;padding:8px;border-radius:14px}.tile b{font-size:.76rem}.big-num{font-size:1.52rem}.qr{width:70px;height:70px}
}
@media(max-width:430px){
  .container{width:min(var(--max),calc(100% - 24px))}
  .eyebrow{font-size:.76rem;padding:.42rem .7rem}
  .hero{padding-top:98px}
  .hero h1{font-size:clamp(2.42rem,12.6vw,3.82rem)}
  .hero-sub{font-size:.96rem;max-width:34ch}
  .product-stage{min-height:525px;margin-top:20px}
  .phone-device{width:174px}
  .p-center{transform:translateX(-50%) translateY(0) scale(.98)}
  .p-left{transform:translateX(-50%) translateX(-43%) translateY(66px) rotateY(18deg) rotateZ(-6deg) scale(.72)}
  .p-right{transform:translateX(-50%) translateX(43%) translateY(66px) rotateY(-18deg) rotateZ(6deg) scale(.72)}
  .product-caption{bottom:8px}
}
@media(min-width:921px){.form-section{scroll-margin-top:110px}.footer{scroll-margin-top:110px}}


/* V17 Apple-like motion layer */
.aurora-bg{position:fixed;inset:-18vmax;z-index:0;pointer-events:none;overflow:hidden;filter:blur(26px);opacity:.68;mix-blend-mode:screen}
.aurora-bg span{position:absolute;width:46vmax;height:46vmax;border-radius:999px;background:radial-gradient(circle at 35% 30%,rgba(192,132,252,.54),rgba(139,92,246,.22) 38%,rgba(93,93,252,.07) 64%,transparent 74%);animation:auroraDriftA 24s ease-in-out infinite alternate;will-change:transform}
.aurora-bg span:nth-child(1){left:4%;top:2%;animation-duration:28s}
.aurora-bg span:nth-child(2){right:-4%;top:22%;background:radial-gradient(circle at 50% 42%,rgba(93,93,252,.45),rgba(139,92,246,.20) 42%,rgba(103,232,249,.06) 66%,transparent 76%);animation-name:auroraDriftB;animation-duration:32s}
.aurora-bg span:nth-child(3){left:24%;bottom:-8%;background:radial-gradient(circle at 42% 50%,rgba(139,92,246,.38),rgba(192,132,252,.18) 44%,rgba(93,93,252,.05) 70%,transparent 78%);animation-name:auroraDriftC;animation-duration:36s}
@keyframes auroraDriftA{from{transform:translate3d(-4%,0,0) scale(1)}to{transform:translate3d(14%,8%,0) scale(1.16)}}
@keyframes auroraDriftB{from{transform:translate3d(7%,-4%,0) scale(1.08)}to{transform:translate3d(-12%,12%,0) scale(.96)}}
@keyframes auroraDriftC{from{transform:translate3d(-6%,10%,0) scale(.98)}to{transform:translate3d(10%,-8%,0) scale(1.14)}}
.nav,.hero,main,.footer,.mobile-sticky,.desktop-sticky,.skip-link{position:relative;z-index:2}.nav{position:fixed;z-index:100}.mobile-sticky,.desktop-sticky{position:fixed}
.phone-device{will-change:transform;transition:transform .18s ease-out}.product-stage{--phone-y-center:0px;--phone-y-left:0px;--phone-y-right:0px;--tilt-x:0deg;--tilt-y:0deg}
.p-center{transform:translateX(-50%) translateY(var(--phone-y-center)) rotateX(var(--tilt-x)) rotateY(var(--tilt-y)) scale(1)}
.p-left{transform:translateX(-50%) translateX(-86%) translateY(calc(56px + var(--phone-y-left))) rotateY(14deg) rotateZ(-5deg) scale(.91)}
.p-right{transform:translateX(-50%) translateX(86%) translateY(calc(56px + var(--phone-y-right))) rotateY(-14deg) rotateZ(5deg) scale(.91)}
.statement-section{position:relative;z-index:2;padding:96px 0 70px;min-height:72vh;display:grid;place-items:center;overflow:hidden}.statement-section::before{content:"";position:absolute;inset:14% 0 auto 50%;width:min(760px,90vw);height:360px;transform:translateX(-50%);border-radius:999px;background:radial-gradient(circle,rgba(139,92,246,.18),transparent 70%);filter:blur(22px);pointer-events:none}.statement-section .container{position:relative;z-index:2;text-align:center}.statement-kicker{display:inline-flex;border:1px solid var(--line2);background:rgba(255,255,255,.055);border-radius:999px;padding:.44rem .78rem;color:#d8d0f2;font-size:.78rem;font-weight:820;margin-bottom:22px}.word-statement{font-size:clamp(2.7rem,7.4vw,7.2rem);max-width:950px;margin:auto;line-height:.98}.word-statement span{display:inline-block;color:rgba(255,255,255,.16);filter:blur(5px);transform:translateY(18px);transition:color .42s ease,filter .42s ease,transform .42s ease,text-shadow .42s ease}.word-statement span.lit{color:#fff;filter:blur(0);transform:translateY(0);text-shadow:0 0 32px rgba(192,132,252,.14)}.word-statement .grad-word.lit{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none}
.tool-marquee-section{position:relative;z-index:2;padding:42px 0 62px;overflow:hidden}.marquee-head{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:end;margin-bottom:22px}.marquee-head h2{font-size:clamp(2.1rem,4.8vw,4.2rem)}.marquee-head p{color:var(--muted);font-size:1.02rem;max-width:430px}.tool-marquee{width:100%;overflow:hidden;border-block:1px solid rgba(255,255,255,.1);background:linear-gradient(90deg,rgba(255,255,255,.015),rgba(139,92,246,.07),rgba(255,255,255,.015));-webkit-mask-image:linear-gradient(90deg,transparent,#000 9%,#000 91%,transparent);mask-image:linear-gradient(90deg,transparent,#000 9%,#000 91%,transparent)}.tool-track{display:flex;width:max-content;gap:12px;padding:18px 0;animation:toolMarquee 34s linear infinite}.tool-marquee:hover .tool-track{animation-play-state:paused}.tool-track span{white-space:nowrap;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.055);border-radius:999px;padding:.72rem 1rem;color:#e6e0ff;font-weight:820;box-shadow:inset 0 1px 0 rgba(255,255,255,.055)}@keyframes toolMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media(min-width:1000px) and (prefers-reduced-motion:no-preference){.horizontal-pin-section{padding:0;min-height:220vh}.horizontal-pin-section>.container{position:sticky;top:86px;padding:70px 0 74px;overflow:hidden}.horizontal-pin-section .swipe-row{overflow:visible;scroll-snap-type:none;transform:translate3d(var(--pin-x,0px),0,0);will-change:transform}.horizontal-pin-section .arrows,.horizontal-pin-section .carousel-progress{display:none!important}.horizontal-pin-section .swipe-hint::after{content:" · scrollen"}}
@media(max-width:900px){.aurora-bg{opacity:.45;filter:blur(34px)}.marquee-head{grid-template-columns:1fr}.statement-section{padding:70px 0 48px;min-height:56vh}.word-statement{font-size:clamp(2.35rem,11vw,4.6rem)}}
@media(max-width:620px){.p-center{transform:translateX(-50%) translateY(var(--phone-y-center)) rotateX(0) rotateY(0) scale(.98)}.p-left{transform:translateX(-50%) translateX(-45%) translateY(calc(70px + var(--phone-y-left))) rotateY(18deg) rotateZ(-6deg) scale(.76)}.p-right{transform:translateX(-50%) translateX(45%) translateY(calc(70px + var(--phone-y-right))) rotateY(-18deg) rotateZ(6deg) scale(.76)}}
@media(max-width:430px){.p-left{transform:translateX(-50%) translateX(-43%) translateY(calc(66px + var(--phone-y-left))) rotateY(18deg) rotateZ(-6deg) scale(.72)}.p-right{transform:translateX(-50%) translateX(43%) translateY(calc(66px + var(--phone-y-right))) rotateY(-18deg) rotateZ(6deg) scale(.72)}.tool-track span{font-size:.86rem;padding:.62rem .82rem}.tool-track{animation-duration:28s}.statement-section{min-height:48vh}.word-statement span{filter:blur(3px)}}



/* V18 Premium product-film polish */
body{background-attachment:fixed}
.section{padding:96px 0}.section.compact{padding:74px 0}.section-head{margin-bottom:34px}
.hero{min-height:112vh;padding-top:150px;padding-bottom:40px;display:grid;align-items:start;isolation:isolate}
.hero::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:210px;background:linear-gradient(180deg,transparent,#05050b 86%);pointer-events:none;z-index:1}
.hero-copy{transition:opacity .22s linear,transform .22s linear;opacity:calc(1 - var(--hero-fade,0) * .38);transform:translateY(calc(var(--hero-fade,0) * -28px)) scale(calc(1 - var(--hero-fade,0) * .018))}
.hero h1{letter-spacing:-.072em;text-wrap:balance}.hero-sub{max-width:670px}.hero-ctas{margin-top:2.15rem}.product-stage{transition:transform .22s linear;transform:translateY(calc(var(--hero-fade,0) * -42px)) scale(calc(1 + var(--hero-fade,0) * .028))}
.hero-metric{border:1px solid rgba(255,255,255,.13);border-radius:24px;background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.038));padding:16px 13px;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
.hero-metric span{display:block;color:var(--muted2);font-size:.73rem;font-weight:820;text-transform:uppercase;letter-spacing:.06em}.hero-metric strong{display:block;font-size:2.85rem;line-height:.94;letter-spacing:-.07em;margin-top:5px}.hero-metric em{display:block;font-style:normal;color:var(--muted);font-size:.78rem;margin-top:4px}.mini-metrics{display:grid;grid-template-columns:1fr 1fr;gap:9px}.mini-metrics div{border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.055);border-radius:18px;padding:12px;text-align:left}.mini-metrics b{display:block;font-size:1.45rem;letter-spacing:-.05em}.mini-metrics span{color:var(--muted);font-size:.72rem}.phone-premium.side{justify-content:center}
.big-panel,.solution-panel,.analysis-shell,.report-panel,.trust-copy,.person,.plan,.faq-list,.form-copy,.contact-form,.swipe-card,.value-pill{box-shadow:inset 0 1px 0 rgba(255,255,255,.075),0 30px 110px rgba(0,0,0,.32)}
.big-panel::after,.solution-panel::after,.analysis-shell::after,.report-panel::after,.trust-copy::after,.plan::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(145deg,rgba(255,255,255,.10),transparent 28%,transparent 70%,rgba(139,92,246,.08));opacity:.72}
.big-panel,.solution-panel,.analysis-shell,.report-panel,.trust-copy,.plan{position:relative;overflow:hidden}.big-panel>*,.solution-panel>*,.analysis-shell>*,.report-panel>*,.trust-copy>*,.plan>*{position:relative;z-index:2}
.cinema-belief-section{position:relative;z-index:2;min-height:82vh;display:grid;place-items:center;padding:100px 0 80px;overflow:hidden}.cinema-belief-section::before{content:"";position:absolute;left:50%;top:50%;width:min(980px,94vw);height:520px;transform:translate(-50%,-50%);border-radius:999px;background:radial-gradient(circle,rgba(139,92,246,.2),rgba(93,93,252,.06) 48%,transparent 72%);filter:blur(26px)}.cinema-belief-section .container{position:relative;z-index:2;text-align:center}.word-statement.belief{max-width:1020px}
.product-stack-section{position:relative;z-index:2;padding:110px 0 120px;overflow:hidden}.product-stack-section::before{content:"";position:absolute;inset:8% auto auto 50%;width:min(860px,92vw);height:540px;transform:translateX(-50%);border-radius:999px;background:radial-gradient(circle,rgba(192,132,252,.18),transparent 72%);filter:blur(26px)}.stack-grid{position:relative;z-index:2;display:grid;grid-template-columns:.88fr 1.12fr;gap:44px;align-items:center}.stack-copy h2{font-size:clamp(2.55rem,5.8vw,5.75rem);max-width:650px}.stack-copy p{margin-top:18px;color:var(--muted);font-size:1.08rem;max-width:520px}.stack-mini-copy{display:grid;gap:10px;margin-top:26px}.stack-mini-copy span{font-size:1.15rem;font-weight:840;color:#fff;border-bottom:1px solid rgba(255,255,255,.11);padding-bottom:10px}.stack-stage{position:relative;min-height:560px;perspective:1500px}.stack-card{position:absolute;left:50%;top:50%;width:min(520px,92%);min-height:170px;transform:translate(-50%,-50%) rotateX(0) rotateZ(var(--rz,0deg)) translateY(var(--ty,0px)) scale(var(--sc,1));border:1px solid rgba(255,255,255,.14);border-radius:34px;background:linear-gradient(145deg,rgba(255,255,255,.10),rgba(255,255,255,.036));-webkit-backdrop-filter:blur(22px);backdrop-filter:blur(22px);padding:24px;box-shadow:0 35px 120px rgba(0,0,0,.38),inset 0 1px 0 rgba(255,255,255,.08);transition:transform .55s cubic-bezier(.2,.8,.2,1),opacity .55s cubic-bezier(.2,.8,.2,1)}.stack-card small{color:#d8ccff;font-weight:900;letter-spacing:.12em}.stack-card h3{font-size:2.05rem;margin-top:10px}.stack-card p{color:var(--muted);margin-top:8px}.stack-1{--ty:-160px;--sc:.86;--rz:-4deg;opacity:.34}.stack-2{--ty:-80px;--sc:.91;--rz:3deg;opacity:.48}.stack-3{--ty:0px;--sc:1;--rz:-1deg;opacity:1}.stack-4{--ty:88px;--sc:.91;--rz:4deg;opacity:.52}.stack-5{--ty:166px;--sc:.84;--rz:-3deg;opacity:.34}.product-stack-section.active .stack-1{--ty:-185px;--rz:-7deg}.product-stack-section.active .stack-2{--ty:-93px;--rz:4deg}.product-stack-section.active .stack-4{--ty:102px;--rz:6deg}.product-stack-section.active .stack-5{--ty:192px;--rz:-5deg}
.statement-section{min-height:86vh}.statement-section::after{content:"";position:absolute;left:0;right:0;bottom:0;height:180px;background:linear-gradient(180deg,transparent,#05050b);pointer-events:none}
.premium-close-section{position:relative;z-index:2;padding:110px 0 72px;overflow:hidden}.premium-close-section::before{content:"";position:absolute;left:50%;top:50%;width:min(940px,92vw);height:520px;transform:translate(-50%,-50%);border-radius:999px;background:radial-gradient(circle,rgba(139,92,246,.22),rgba(93,93,252,.055) 50%,transparent 74%);filter:blur(24px)}.premium-close{position:relative;z-index:2;text-align:center;border:1px solid rgba(255,255,255,.12);border-radius:46px;background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.028));padding:54px 34px;box-shadow:0 44px 150px rgba(0,0,0,.43),inset 0 1px 0 rgba(255,255,255,.08)}.premium-close h2{font-size:clamp(2.35rem,6.2vw,5.9rem);max-width:900px;margin:14px auto 0}.premium-close p{color:var(--muted);font-size:1.1rem;max-width:690px;margin:18px auto 0}.premium-close-actions{display:flex;justify-content:center;flex-wrap:wrap;gap:12px;margin-top:30px}.premium-footer{padding-top:22px;background:rgba(0,0,0,.12)}
@media(min-width:1000px) and (prefers-reduced-motion:no-preference){.hero{min-height:128vh}.product-stack-section{min-height:110vh}.product-stack-section .stack-grid{position:sticky;top:118px}}
@media(max-width:920px){.section{padding:70px 0}.cinema-belief-section{min-height:58vh;padding:72px 0 52px}.stack-grid{grid-template-columns:1fr;gap:28px}.product-stack-section{padding:72px 0}.stack-stage{min-height:520px}.premium-close{border-radius:32px;padding:34px 20px}.premium-close-actions .btn{width:100%}}
@media(max-width:620px){.hero{min-height:auto}.product-stage{transform:none}.stack-stage{min-height:470px}.stack-card{width:94%;padding:20px;border-radius:28px;min-height:145px}.stack-card h3{font-size:1.62rem}.stack-1{--ty:-132px}.stack-2{--ty:-66px}.stack-4{--ty:74px}.stack-5{--ty:140px}.hero-metric strong{font-size:2.25rem}.mini-metrics b{font-size:1.22rem}}

@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{animation:none!important;transition:none!important}.reveal{opacity:1;transform:none}.word-statement span{color:#fff;filter:none;transform:none}.word-statement .grad-word{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}.horizontal-pin-section{min-height:auto}.horizontal-pin-section>.container{position:relative;top:auto}.horizontal-pin-section .swipe-row{transform:none!important}}


/* V19 layout cleanup: fixed clipping, overlaps and line breaks */
.skip-link{left:-9999px!important;top:auto!important;transform:none!important}
.skip-link:focus{left:16px!important;top:14px!important;transform:none!important}
.nav{transition:transform .28s ease, opacity .28s ease}
.nav.nav-hidden{transform:translateY(-118%);opacity:0;pointer-events:none}
.hero{padding-top:132px!important;padding-bottom:38px!important;min-height:auto!important}
.hero-title{max-width:min(1080px,100%)!important;margin-left:auto!important;margin-right:auto!important;text-wrap:normal!important}
.hero-line{display:block;white-space:nowrap}
.product-stage{margin-top:38px!important;min-height:600px!important}
.hero-copy{opacity:1!important;transform:none!important}
.product-stage{transform:none!important}
.word-statement{line-height:1.04!important;text-wrap:balance;overflow-wrap:normal;word-break:normal}
.word-statement span{margin-inline:.03em}
.cinema-belief-section,.statement-section{padding-top:140px!important;padding-bottom:90px!important;min-height:auto!important}
.cinema-belief-section .statement-kicker,.statement-section .statement-kicker{margin-top:0}
.problem-grid{align-items:start}
.big-panel,.solution-panel{min-height:auto;overflow:hidden}
.pain b{line-height:1.14}
.product-stack-section{padding:105px 0 115px!important;min-height:auto!important}
.product-stack-section .stack-grid{position:relative!important;top:auto!important}
.stack-stage{min-height:660px!important;overflow:visible}
.stack-card{min-height:144px!important;padding:22px 24px!important}
.stack-card h3{font-size:clamp(1.45rem,2.4vw,1.95rem)!important;line-height:1.02!important}
.stack-card p{font-size:.95rem;line-height:1.4!important}
.stack-1{--ty:-230px!important;--sc:.88!important;opacity:.66!important}
.stack-2{--ty:-115px!important;--sc:.94!important;opacity:.82!important}
.stack-3{--ty:0px!important;--sc:1!important;opacity:1!important}
.stack-4{--ty:115px!important;--sc:.94!important;opacity:.82!important}
.stack-5{--ty:230px!important;--sc:.88!important;opacity:.66!important}
.product-stack-section.active .stack-1{--ty:-250px!important}
.product-stack-section.active .stack-2{--ty:-124px!important}
.product-stack-section.active .stack-4{--ty:124px!important}
.product-stack-section.active .stack-5{--ty:250px!important}
@media(min-width:1000px) and (prefers-reduced-motion:no-preference){
  .horizontal-pin-section{padding:80px 0!important;min-height:150vh}
  .horizontal-pin-section>.container{position:relative;top:auto;padding:0;overflow:visible}
  .horizontal-pin-section>.container.swipe-shell{position:sticky;top:118px;padding:28px 0 76px;overflow:hidden}
  .horizontal-pin-section>.container.section-head{margin-bottom:22px}
}
@media(max-width:920px){
  .nav-shell{max-width:calc(100vw - 24px)}
  .hero{padding-top:108px!important}
  .hero h1{font-size:clamp(2.55rem,11vw,4.6rem)!important;letter-spacing:-.075em!important;line-height:.95!important}
  .hero-sub{max-width:620px!important}
  .product-stage{min-height:575px!important;margin-top:26px!important}
  .cinema-belief-section,.statement-section{padding-top:88px!important;padding-bottom:64px!important}
  .word-statement{font-size:clamp(2.1rem,9.5vw,4.4rem)!important;line-height:1.04!important}
  .stack-grid{grid-template-columns:1fr!important}
  .stack-stage{min-height:auto!important;display:grid;gap:14px;perspective:none}
  .stack-card{position:relative!important;left:auto!important;top:auto!important;transform:none!important;width:100%!important;opacity:1!important;min-height:auto!important;border-radius:26px!important}
  .product-stack-section.active .stack-card{transform:none!important}
}
@media(max-width:560px){
  .logo > span:last-child{display:none!important}
  .nav-shell{min-height:58px}
  .nav-actions .primary{display:inline-flex;font-size:.86rem;padding:.62rem .86rem;max-width:210px}
  .hero{padding-top:100px!important}
  .hero h1{font-size:clamp(2.35rem,10.4vw,3.35rem)!important;line-height:.97!important}
  .hero-line{white-space:normal}
  .hero-sub{font-size:.98rem!important;line-height:1.48!important}
  .hero-ctas{gap:.75rem;margin-top:1.6rem!important}
  .product-stage{min-height:500px!important;margin-top:18px!important}
  .phone-device{width:188px!important}
  .p-center{transform:translateX(-50%) translateY(0) scale(.92)!important}
  .p-left{transform:translateX(-50%) translateX(-44%) translateY(72px) rotateY(18deg) rotateZ(-6deg) scale(.68)!important}
  .p-right{transform:translateX(-50%) translateX(44%) translateY(72px) rotateY(-18deg) rotateZ(6deg) scale(.68)!important}
  .product-caption{font-size:.78rem!important;bottom:10px!important;opacity:.72}
  .aha{padding-top:0!important}
  .word-statement{font-size:clamp(2.0rem,9.2vw,3.35rem)!important}
  .statement-kicker{font-size:.72rem!important}
  .premium-close h2,.section-head h2,.stack-copy h2,.big-panel h2{font-size:clamp(2.05rem,10vw,3.25rem)!important}
}
@media(max-width:380px){
  .nav-actions .primary{display:none!important}
  .hero h1{font-size:clamp(2.1rem,10vw,3rem)!important}
  .phone-device{width:176px!important}
  .product-stage{min-height:480px!important}
}



/* V20 sales clarity refinements */
.analysis-offer-panel{display:grid;grid-template-columns:.82fr 1.18fr;gap:18px;margin:22px 0 20px;border:1px solid rgba(255,255,255,.12);border-radius:32px;background:linear-gradient(135deg,rgba(139,92,246,.14),rgba(255,255,255,.035));padding:22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
.offer-copy small,.audit-recommendation small{color:#d8ccff;font-weight:850;text-transform:uppercase;letter-spacing:.09em;font-size:.72rem}.offer-copy h3{font-size:clamp(1.65rem,3vw,2.45rem);margin-top:10px;letter-spacing:-.05em}.offer-copy p{color:var(--muted);margin-top:12px}.offer-list{display:grid;grid-template-columns:1fr 1fr;gap:10px}.offer-list span{border:1px solid var(--line);background:rgba(0,0,0,.16);border-radius:18px;padding:13px;color:var(--muted);font-size:.9rem;line-height:1.38}.offer-list b{display:block;color:#fff;margin-bottom:3px}.subtle-contact,.secondary-contact-line{color:var(--muted2);font-size:.9rem;margin-top:12px}.subtle-contact a,.secondary-contact-line a{color:#e8ddff;text-decoration:underline;text-decoration-color:rgba(192,132,252,.45);text-underline-offset:3px}.cta-priority .btn.primary{min-width:min(360px,100%)}.cta-priority .whatsapp-btn{opacity:.94}
.mini-audit-section{position:relative;z-index:2}.audit-preview-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:18px}.audit-card-main,.audit-recommendation{border:1px solid var(--line);border-radius:36px;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.03));box-shadow:inset 0 1px 0 rgba(255,255,255,.075),0 30px 110px rgba(0,0,0,.32);padding:26px;position:relative;overflow:hidden}.audit-card-main::before,.audit-recommendation::before{content:"";position:absolute;right:-120px;top:-120px;width:290px;height:290px;border-radius:50%;background:radial-gradient(circle,rgba(139,92,246,.18),transparent 70%)}.audit-card-main>* ,.audit-recommendation>*{position:relative;z-index:2}.audit-head{display:flex;justify-content:space-between;gap:18px;align-items:center;margin-bottom:18px}.audit-head strong{color:var(--muted);font-size:.92rem}.audit-score{display:flex;align-items:flex-end;gap:6px;margin:4px 0 10px}.audit-score span{font-size:clamp(4rem,8vw,6.6rem);font-weight:900;line-height:.9;letter-spacing:-.08em}.audit-score em{font-style:normal;color:var(--muted);font-size:1.4rem;font-weight:800}.audit-card-main p,.audit-recommendation p{color:var(--muted);max-width:620px}.audit-bars{display:grid;gap:12px;margin-top:22px}.audit-bars div{display:grid;grid-template-columns:150px 1fr auto;gap:12px;align-items:center;color:var(--muted);font-size:.88rem}.audit-bars i{height:8px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden}.audit-bars b{display:block;height:100%;border-radius:99px;background:var(--grad)}.audit-bars em{font-style:normal;color:#e8ddff;font-weight:850}.audit-recommendation h3{font-size:clamp(1.8rem,3.6vw,3.1rem);margin-top:10px}.audit-recommendation ul{list-style:none;display:grid;gap:10px;margin:18px 0 22px}.audit-recommendation li{display:flex;gap:9px;color:var(--muted)}.audit-recommendation li::before{content:"✓";color:#e2d8ff;font-weight:900}.plan-value{border:1px solid rgba(192,132,252,.25);background:rgba(139,92,246,.09);border-radius:18px;padding:12px;margin:12px 0 0;color:#e9e2ff;font-size:.86rem;line-height:1.42}.contact-actions-priority{grid-template-columns:1.2fr .8fr}.faq-list.compact details[open]{background:rgba(139,92,246,.055)}
@media(max-width:920px){.analysis-offer-panel,.audit-preview-grid{grid-template-columns:1fr}.offer-list{grid-template-columns:1fr}.contact-actions-priority{grid-template-columns:1fr}.audit-bars div{grid-template-columns:1fr;gap:6px}.audit-bars em{justify-self:start}.audit-head{align-items:flex-start;flex-direction:column}.analysis-swipes{margin-top:12px}}
@media(max-width:520px){.analysis-offer-panel,.audit-card-main,.audit-recommendation{border-radius:26px;padding:18px}.offer-list span{font-size:.86rem}.audit-score span{font-size:4rem}.audit-recommendation h3{font-size:1.85rem}.plan-value{font-size:.82rem}}



/* ===== V21: Conversion-Politur — human beat, Versprechen, Preis-Brücke ===== */

/* Emotionaler Outcome-Beat (ersetzt das doppelte Wort-Statement) */
.human-beat{position:relative;z-index:2;padding:104px 0;text-align:center;overflow:hidden}
.human-beat::before{content:"";position:absolute;left:50%;top:50%;width:min(820px,92vw);height:380px;transform:translate(-50%,-50%);border-radius:999px;background:radial-gradient(circle,rgba(139,92,246,.16),transparent 72%);filter:blur(24px);pointer-events:none}
.human-beat .container{position:relative;z-index:2}
.human-beat h2{font-size:clamp(2.1rem,5.8vw,4.6rem);max-width:17ch;margin:14px auto 0;text-wrap:balance}
.human-beat .lead{color:var(--soft);font-size:clamp(1.06rem,2vw,1.32rem);max-width:40ch;margin:20px auto 0;font-weight:520;line-height:1.5}

/* Versprechen / Trust-Block — grüner Akzent codiert "verlässlich" */
.promise-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.promise-card{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:26px;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.028));padding:22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
.promise-card::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(150deg,rgba(134,239,172,.10),transparent 42%);opacity:.85}
.promise-card>*{position:relative;z-index:2}
.promise-ico{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:rgba(134,239,172,.12);border:1px solid rgba(134,239,172,.30);color:#bbf7d0;font-weight:900;margin-bottom:14px}
.promise-card b{display:block;font-size:1.06rem;letter-spacing:-.02em}
.promise-card span{display:block;color:var(--muted);font-size:.9rem;margin-top:7px;line-height:1.45}
@media(max-width:920px){.promise-grid{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.promise-grid{grid-template-columns:1fr}}

/* Preis-Brücke — kleinster möglicher "Ja"-Schritt, grün gerahmt */
.entry-bridge{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:18px;margin-top:16px;border:1px dashed rgba(134,239,172,.42);border-radius:26px;background:linear-gradient(135deg,rgba(134,239,172,.08),rgba(255,255,255,.03));padding:20px 22px}
.entry-bridge .tagico{width:46px;height:46px;border-radius:14px;background:rgba(134,239,172,.14);border:1px solid rgba(134,239,172,.32);display:grid;place-items:center;color:#bbf7d0;font-weight:900}
.entry-bridge b{display:block;font-size:1.08rem}
.entry-bridge span{color:var(--muted);font-size:.92rem}
@media(max-width:760px){.entry-bridge{grid-template-columns:1fr;text-align:left}.entry-bridge .btn{width:100%}}

/* Team-Avatar (Fallback) gestalterisch aufwerten — V21 */
.team-grid .photo{background:radial-gradient(circle at 50% 22%,rgba(192,132,252,.34),transparent 36%),linear-gradient(150deg,rgba(93,93,252,.26),rgba(139,92,246,.12) 60%,rgba(255,255,255,.05));border-color:var(--line2)}
.team-grid .photo::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),inset 0 0 60px rgba(139,92,246,.12)}
.photo-initials{font-weight:900;letter-spacing:-.06em;opacity:.94;text-shadow:0 8px 30px rgba(139,92,246,.42)}



/* ===== V22: Erweiterte Premium-Palette + inklusive Sprache ===== */
/* Violett bleibt Markenfarbe. Cyan, Grün und warme Akzente führen Analyse, Vertrauen und menschliche Nähe. */
body{background:
  radial-gradient(980px 600px at 50% -12%,rgba(139,92,246,.27),transparent 66%),
  radial-gradient(760px 560px at 8% 18%,rgba(93,93,252,.13),transparent 68%),
  radial-gradient(720px 520px at 92% 22%,rgba(103,232,249,.075),transparent 68%),
  radial-gradient(700px 520px at 82% 78%,rgba(251,146,60,.055),transparent 70%),
  linear-gradient(180deg,#05050b 0%,#090914 42%,#05050b 100%);
}

/* Wärmerer emotionaler Beat: menschlicher, weniger reines SaaS-Violett */
.human-beat::before{background:radial-gradient(circle,rgba(251,146,60,.16),rgba(139,92,246,.12) 42%,transparent 72%)}
.human-beat .kicker::before{background:var(--amber);box-shadow:0 0 16px rgba(251,191,36,.7)}
.human-beat h2 .grad,.human-beat strong{background:var(--grad-human);-webkit-background-clip:text;background-clip:text;color:transparent}

/* Analyse und Monatsreport bekommen kühle Klarheits-Akzente */
.analysis-shell::before{background:radial-gradient(circle,rgba(103,232,249,.13),transparent 68%)!important}
.analysis-shell .kicker::before,#analyse .kicker::before{background:var(--cyan);box-shadow:0 0 16px rgba(103,232,249,.72)}
.report-panel::before{background:radial-gradient(circle,rgba(103,232,249,.14),rgba(139,92,246,.08) 48%,transparent 72%)}
.metric-box:nth-child(1) b{background:var(--grad-cool);-webkit-background-clip:text;background-clip:text;color:transparent}
.metric-box:nth-child(2) b{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.metric-box:nth-child(3) b{background:var(--grad-trust);-webkit-background-clip:text;background-clip:text;color:transparent}

/* Karten bekommen subtile Farbrollen, ohne bunt zu wirken */
.swipe-row .swipe-card:nth-child(1)::before{background:radial-gradient(circle,rgba(139,92,246,.16),transparent 68%)}
.swipe-row .swipe-card:nth-child(2)::before{background:radial-gradient(circle,rgba(251,113,133,.13),transparent 68%)}
.swipe-row .swipe-card:nth-child(3)::before{background:radial-gradient(circle,rgba(103,232,249,.13),transparent 68%)}
.swipe-row .swipe-card:nth-child(4)::before{background:radial-gradient(circle,rgba(251,146,60,.13),transparent 68%)}
.swipe-row .swipe-card:nth-child(5)::before{background:radial-gradient(circle,rgba(134,239,172,.12),transparent 68%)}

/* Beispielanalyse: warme, menschliche Akzente für lokale Nähe */
.audit-card-main::before{background:radial-gradient(circle,rgba(251,146,60,.14),rgba(139,92,246,.08) 45%,transparent 70%)}
.audit-recommendation::before{background:radial-gradient(circle,rgba(134,239,172,.14),rgba(103,232,249,.08) 46%,transparent 70%)}
.audit-score strong{background:var(--grad-human);-webkit-background-clip:text;background-clip:text;color:transparent}

/* Preis-/Wertargumente: drei differenzierte Signalfarben */
.value-pill:nth-child(1)::before{background:var(--grad-trust)}
.value-pill:nth-child(2)::before{background:var(--grad-cool)}
.value-pill:nth-child(3)::before{background:var(--grad-warm)}
.plan-value{border-color:rgba(103,232,249,.22);background:linear-gradient(135deg,rgba(103,232,249,.08),rgba(139,92,246,.07));color:#eaf8ff}
.plan.featured .plan-value{border-color:rgba(251,191,36,.24);background:linear-gradient(135deg,rgba(251,191,36,.08),rgba(139,92,246,.10));color:#fff4d6}

/* Versprechen bleibt vertrauensgrün, aber mit leichter Lichtkante */
.promise-card{box-shadow:inset 0 1px 0 rgba(255,255,255,.075),0 22px 76px rgba(0,0,0,.24)}
.promise-card:nth-child(3)::before{background:linear-gradient(150deg,rgba(103,232,249,.10),transparent 42%)}
.promise-card:nth-child(4)::before{background:linear-gradient(150deg,rgba(251,191,36,.09),transparent 42%)}

/* Sprachlich inklusiver: optisch etwas hochwertigere Hinweis-Chips */
.included span,.faq-tags span{background:linear-gradient(180deg,rgba(255,255,255,.052),rgba(255,255,255,.026));box-shadow:inset 0 1px 0 rgba(255,255,255,.055)}

@media(max-width:560px){
  .human-beat{padding:78px 0}
  .human-beat .lead{max-width:32ch}
}



/* ===== V23: Anfrageklarheit, Branchen-Schärfung, Preis-Brücke final ===== */
.process-clarity-panel{display:grid;grid-template-columns:.95fr 1.05fr;gap:16px;margin:18px 0 22px;border:1px solid rgba(103,232,249,.22);border-radius:30px;background:linear-gradient(135deg,rgba(103,232,249,.075),rgba(255,255,255,.028));padding:22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
.process-copy small{display:inline-flex;color:#a5f3fc;font-weight:850;text-transform:uppercase;letter-spacing:.09em;font-size:.72rem}
.process-copy h3{font-size:clamp(1.75rem,3vw,2.6rem);margin-top:10px;letter-spacing:-.05em}
.process-copy p{color:var(--muted);margin-top:12px;line-height:1.5}
.process-steps{display:grid;gap:10px}
.process-steps span{border:1px solid var(--line);border-radius:18px;background:rgba(0,0,0,.14);padding:13px 14px;color:var(--muted);font-size:.9rem;line-height:1.44}
.process-steps b{display:block;color:#fff;margin-bottom:3px}
.segment-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:18px}
.segment-card{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:26px;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.028));padding:20px;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
.segment-card::before{content:"";position:absolute;right:-80px;bottom:-90px;width:190px;height:190px;border-radius:50%;background:radial-gradient(circle,rgba(251,191,36,.14),transparent 70%)}
.segment-card>*{position:relative;z-index:2}
.segment-card span{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:12px;background:rgba(251,191,36,.11);border:1px solid rgba(251,191,36,.25);color:#fde68a;font-weight:900;font-size:.78rem;margin-bottom:12px}
.segment-card b{display:block;font-size:1.05rem;letter-spacing:-.02em}
.segment-card p{color:var(--muted);font-size:.9rem;margin-top:7px;line-height:1.45}
.entry-bridge b{color:#fff}
.entry-bridge span strong{color:#fff}
@media(max-width:980px){.process-clarity-panel{grid-template-columns:1fr}.segment-grid{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.process-clarity-panel{border-radius:24px;padding:18px}.segment-grid{grid-template-columns:1fr}.process-copy h3{font-size:1.75rem}}



/* ===== V24: Mobile Phone-Hero — Geräte wieder klar als Smartphones erkennbar ===== */
@media(max-width:620px){
  .product-stage{
    min-height:610px!important;
    margin-top:24px!important;
    perspective:1200px;
  }
  .product-stage::before{
    bottom:48px!important;
    height:190px!important;
    width:min(520px,112vw)!important;
    opacity:.95;
  }
  .phone-device{
    width:220px!important;
    border-radius:44px!important;
    padding:13px!important;
    box-shadow:0 48px 125px rgba(0,0,0,.62),inset 0 0 0 8px #05050b!important;
  }
  .phone-device::before{
    top:17px!important;
    width:86px!important;
    height:24px!important;
  }
  .phone-screen{
    border-radius:31px!important;
    padding:52px 13px 13px!important;
  }
  .p-center{
    transform:translateX(-50%) translateY(0) scale(1)!important;
    z-index:5!important;
  }
  .p-left{
    transform:translateX(-50%) translateX(-58%) translateY(78px) rotateY(16deg) rotateZ(-5deg) scale(.78)!important;
    opacity:.58!important;
    z-index:3!important;
  }
  .p-right{
    transform:translateX(-50%) translateX(58%) translateY(78px) rotateY(-16deg) rotateZ(5deg) scale(.78)!important;
    opacity:.58!important;
    z-index:3!important;
  }
  .product-caption{
    bottom:8px!important;
    font-size:.8rem!important;
    max-width:32ch;
    margin:auto;
  }
}
@media(max-width:430px){
  .product-stage{
    min-height:590px!important;
    margin-top:22px!important;
  }
  .phone-device{
    width:212px!important;
    border-radius:43px!important;
    padding:13px!important;
  }
  .phone-screen{
    border-radius:30px!important;
    padding:51px 12px 12px!important;
  }
  .p-left{
    transform:translateX(-50%) translateX(-54%) translateY(80px) rotateY(16deg) rotateZ(-5deg) scale(.74)!important;
    opacity:.52!important;
  }
  .p-right{
    transform:translateX(-50%) translateX(54%) translateY(80px) rotateY(-16deg) rotateZ(5deg) scale(.74)!important;
    opacity:.52!important;
  }
  .tile{
    font-size:.69rem!important;
    padding:8px!important;
  }
  .tile b{font-size:.77rem!important}
  .hero-metric strong{font-size:2.35rem!important}
}
@media(max-width:380px){
  .product-stage{min-height:560px!important}
  .phone-device{width:202px!important}
  .p-left{
    transform:translateX(-50%) translateX(-51%) translateY(78px) rotateY(16deg) rotateZ(-5deg) scale(.70)!important;
    opacity:.46!important;
  }
  .p-right{
    transform:translateX(-50%) translateX(51%) translateY(78px) rotateY(-16deg) rotateZ(5deg) scale(.70)!important;
    opacity:.46!important;
  }
}



/* ===== V25: Mobile Conversion-Fix + Subtiler Desktop Cursor Glow ===== */
.cursor-glow{display:none}
@media(pointer:fine) and (min-width:921px){
  .cursor-glow{position:fixed;left:0;top:0;width:290px;height:290px;border-radius:999px;pointer-events:none;z-index:1;opacity:0;transform:translate3d(-400px,-400px,0);transition:opacity .28s ease;background:radial-gradient(circle,rgba(192,132,252,.18),rgba(103,232,249,.08) 34%,rgba(139,92,246,.045) 55%,transparent 72%);filter:blur(8px);mix-blend-mode:screen;will-change:transform,opacity}
  .cursor-glow.visible{opacity:.72}
  .nav,.desktop-sticky,.mobile-sticky{z-index:100}
  main,header,section,footer{position:relative;z-index:2}
}

.contact-split-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.contact-help{margin-top:-4px;color:var(--muted2);font-size:.8rem;line-height:1.4}
.form-copy .after-request span:first-child{border-color:rgba(134,239,172,.28);background:linear-gradient(135deg,rgba(134,239,172,.08),rgba(255,255,255,.03))}
.faq-more-btn{display:none;margin:14px auto 0;border:1px solid var(--line);background:rgba(255,255,255,.055);color:var(--soft);border-radius:999px;padding:.78rem 1rem;font-weight:820;cursor:pointer}
.mobile-sticky-actions{display:grid;grid-template-columns:1fr auto;gap:8px}.mobile-sticky-actions .btn{min-height:48px}.mobile-sticky-actions .whatsapp-btn{padding:.72rem .92rem;width:auto}

@media(max-width:700px){
  html{scroll-padding-top:76px}
  .hero{padding-top:104px;padding-bottom:10px}
  .hero-copy{max-width:370px}
  .hero h1{font-size:clamp(2.55rem,12.4vw,4.15rem);line-height:.94;max-width:10.8ch}
  .hero-sub{font-size:1rem;line-height:1.42;margin-top:1rem;max-width:34ch}
  .hero-ctas{margin-top:1.25rem;gap:.65rem}.hero-ctas .btn{min-height:50px}
  .risk-row{margin-top:.8rem}.risk-row span:nth-child(n+4){display:none}
  .product-stage{margin-top:24px;min-height:640px}.product-caption{font-size:.78rem;bottom:2px}
  .swipe-row{gap:14px;scroll-padding-left:0;padding-bottom:14px}.swipe-card{flex-basis:88vw;min-height:220px}
  .swipe-hint{font-size:.82rem}.carousel-progress{justify-content:center;margin-top:0}
  .contact-split-fields{grid-template-columns:1fr;gap:13px}.contact-help{font-size:.78rem;margin-top:-2px}
  .mobile-sticky{opacity:0;transform:translateY(18px);pointer-events:none;transition:opacity .22s ease,transform .22s ease;display:block}
  body.sticky-cta-active:not(.sticky-cta-blocked):not(.keyboard-active) .mobile-sticky{opacity:1;transform:none;pointer-events:auto}
  .mobile-sticky .btn{box-shadow:0 18px 55px rgba(139,92,246,.4)}
  .faq-list.compact details:nth-of-type(n+5){display:none}.faq-list.compact.show-all details{display:block}.faq-more-btn{display:inline-flex;align-items:center;justify-content:center;width:100%}
  .pricing-note,.entry-bridge{border-radius:22px}.pricing-note .btn,.entry-bridge .btn{width:100%}
  .premium-footer .footer-row{gap:10px}.premium-footer .legal{gap:8px}.premium-footer .legal a:nth-child(n+4){display:none}
  .premium-close-section{padding-bottom:42px}.premium-close-actions .btn{width:100%}
}

@media(max-width:430px){
  .product-stage{min-height:610px}.phone-device{width:214px}.p-left{opacity:.52}.p-right{opacity:.52}
  .swipe-card{flex-basis:89vw;padding:19px}.section{padding:46px 0}.section.compact{padding:42px 0}
}
@media(max-width:380px){
  .hero h1{font-size:2.48rem}.phone-device{width:200px}.product-stage{min-height:585px}.risk-row span{font-size:.74rem}
}

@media(max-width:700px), (pointer:coarse){
  .aurora-bg{filter:blur(18px);opacity:.42}.aurora-bg span{animation-duration:46s!important}
  .product-stage{--tilt-x:0deg!important;--tilt-y:0deg!important}
  .marquee{animation-duration:46s!important}
  .big-panel,.solution-panel,.analysis-shell,.report-panel,.trust-copy,.person,.plan,.swipe-card,.value-pill,.promise-card{box-shadow:0 14px 46px rgba(0,0,0,.24)}
}

@supports(content-visibility:auto){
  @media(max-width:700px){
    main section:nth-of-type(n+4),.premium-close-section,.footer{content-visibility:auto;contain-intrinsic-size:720px}
  }
}

@media(prefers-reduced-motion:reduce){.cursor-glow{display:none!important}}



/* MMOS integration: landing owns its footer; hide global legal footer on homepage. */
.mmosLandingV26 ~ .siteLegalFooter{display:none!important}
.mmosLandingV26{min-height:100vh;background:#05050b;color:#f8f7ff}
`

const landingHtml = `
<div class="aurora-bg" aria-hidden="true"><span></span><span></span><span></span></div>
<div class="cursor-glow" aria-hidden="true"></div>
<a class="skip-link" href="#start">Direkt zur Anfrage</a>
<nav class="nav" id="nav">
  <div class="nav-shell">
    <a class="logo" href="#top" aria-label="MecklenburgMarketing Startseite"><span class="logo-mark">M</span><span><span class="hide-sm">Mecklenburg</span><span>Marketing</span></span></a>
    <div class="nav-links"><a href="#problem">Problem</a><a href="#analyse">Analyse</a><a href="#report">Beispiel</a><a href="#team">Team</a><a href="#pakete">Preise</a></div>
    <div class="nav-actions"><a class="btn ghost login-link" href="/auth">Einloggen / Registrieren</a><a class="btn ghost" href="#pakete">Pakete</a><a class="btn primary" href="#start">Analyse anfragen</a><button class="menu-btn" id="menuBtn" type="button" aria-label="Menü öffnen" aria-expanded="false"><i></i></button></div>
    <div class="mobile-menu"><a href="#problem">Problem</a><a href="#analyse">Kostenlose Analyse</a><a href="#report">Beispiel</a><a href="#team">Team</a><a class="login-link" href="/auth">Einloggen / Registrieren</a><a class="menu-cta" href="#start">Kostenlos anfragen</a></div>
  </div>
</nav>

<header class="hero" id="top">
  <div class="container">
    <div class="hero-copy reveal">
      <span class="eyebrow"><span class="live-dot"></span> Lokal gedacht. Persönlich betreut.</span>
      <h1 class="hero-title"><span class="hero-line">Mehr Sichtbarkeit.</span><span class="hero-line">Mehr Bewertungen.</span><span class="hero-line grad">Mehr Kunden.</span></h1>
      <p class="hero-sub">Wir helfen lokalen Betrieben dabei, bei Google besser gefunden zu werden, mehr Vertrauen aufzubauen und aus zufriedenen Kunden echte Wiederbesucher zu machen.</p>
      <div class="hero-ctas"><a class="btn primary big" href="#start">Betrieb kostenlos prüfen lassen</a><a class="btn ghost big" href="#analyse">Was bekomme ich?</a></div>
      <div class="risk-row"><span>kostenlos</span><span>unverbindlich</span><span>keine Kaufpflicht</span><span>keine Vertragsbindung</span></div>
    </div>

    <div class="product-stage reveal delay1" aria-hidden="true">
      <div class="phone-device p-left"><div class="phone-screen"><div class="phone-content phone-premium side"><div class="phone-top"><b>QR</b><i></i></div><div class="qr" data-qr></div><div class="tile hl"><b>127 Scans</b>Diese Woche</div><div class="tile"><b>42 Wiederbesuche</b>Punkte gesammelt</div></div></div></div>
      <div class="phone-device p-center"><div class="phone-screen"><div class="phone-content phone-premium"><div class="phone-top"><b>Monatsblick</b><i></i></div><div class="hero-metric"><span>Profilaufrufe</span><strong class="grad">2.846</strong><em>+22% zum Vormonat</em></div><div class="mini-metrics"><div><b>+34</b><span>Reviews</span></div><div><b>512</b><span>QR-Scans</span></div></div><div class="tile hl"><b>Nächster sinnvoller Schritt</b>Bewertungs-Booster am Wochenende starten.</div></div></div></div>
      <div class="phone-device p-right"><div class="phone-screen"><div class="phone-content phone-premium side"><div class="phone-top"><b>Reviews</b><i></i></div><div class="tile hl"><b>+34 Reviews</b><span class="stars">★★★★★</span></div><div class="tile"><b>Antwortquote</b>100% beantwortet</div><div class="tile"><b>Chance</b>8 Gäste zurückholen</div></div></div></div>
      <p class="product-caption">Produktvorschau mit Beispieldaten · Mehr Anfragen, mehr Vertrauen und mehr Wiederbesuche verständlich zusammengeführt</p>
    </div>
  </div>
</header>

<section class="aha">
  <div class="container swipe-shell reveal" data-carousel>
    <div class="swipe-meta"><span class="swipe-hint">Schneller Aha-Moment — seitlich wischen</span><div class="arrows"><button class="arrow" data-prev aria-label="Zurück">‹</button><button class="arrow" data-next aria-label="Weiter">›</button></div></div>
    <div class="swipe-row">
      <article class="swipe-card aha-card"><small>Google Profil</small><div class="card-stat grad">2.846</div><h3>Profilaufrufe im Monat</h3><p>Mehr Menschen sehen deinen Betrieb genau dann, wenn sie lokal suchen.</p><span class="card-note">+22% zum Vormonat</span></article>
      <article class="swipe-card aha-card"><small>Bewertungen</small><div class="card-stat grad">+34</div><h3>neue Google-Bewertungen</h3><p>Zufriedene Kunden werden im richtigen Moment freundlich zur Bewertung geführt.</p><span class="card-note">4,8 Sterne aktuell</span></article>
      <article class="swipe-card aha-card"><small>QR-Kampagne</small><div class="card-stat grad">512</div><h3>QR-Scans</h3><p>Bewertung, Punkte und Rückholaktion werden direkt im Laden verbunden.</p><span class="card-note">127 diese Woche</span></article>
      <article class="swipe-card aha-card"><small>Wiederbesuche</small><div class="card-stat grad">8</div><h3>inaktive Gäste erkannt</h3><p>Stammkunden, die länger nicht da waren, können gezielter zurückgeholt werden.</p><span class="card-note">nächste Aktion bereit</span></article>
    </div>
  </div>
</section>

<section class="cinema-belief-section" data-word-reveal>
  <div class="container">
    <p class="statement-kicker">Premium-Prinzip</p>
    <h2 class="word-statement belief" aria-label="Sichtbarkeit ist kein Zufall. Bewertungen auch nicht. Wiederbesuche erst recht nicht.">
      <span>Sichtbarkeit</span> <span>ist</span> <span>kein</span> <span>Zufall.</span>
      <span>Bewertungen</span> <span>auch</span> <span>nicht.</span>
      <span class="grad-word">Wiederbesuche</span> <span class="grad-word">erst</span> <span class="grad-word">recht</span> <span class="grad-word">nicht.</span>
    </h2>
  </div>
</section>

<main>
<section class="section compact" id="problem">
  <div class="container problem-grid">
    <div class="big-panel reveal">
      <span class="kicker">Das eigentliche Problem</span>
      <h2>Viele gute Betriebe verlieren Kunden, obwohl sie gute Arbeit machen.</h2>
      <p>Nicht, weil das Angebot schlecht ist — sondern weil Google, Bewertungen und Wiederbesuche im Alltag liegen bleiben.</p>
      <div class="pain-list">
        <div class="pain"><i>!</i><div><b>Google-Sucher landen beim Konkurrenten</b>Wenn Profil, Fotos und Leistungen nicht gepflegt sind, wird Vertrauen verschenkt.</div></div>
        <div class="pain"><i>!</i><div><b>Zufriedene Kunden bewerten nicht automatisch</b>Jede fehlende Bewertung ist verlorene soziale Bestätigung.</div></div>
        <div class="pain"><i>!</i><div><b>Laufkundschaft kommt oft nicht wieder</b>Ohne System gibt es kaum Anreiz für den nächsten Besuch.</div></div>
      </div>
    </div>
    <div class="solution-panel reveal delay1">
      <span class="kicker">Die Lösung</span>
      <h3>Du musst dich nicht selbst um noch ein Tool kümmern.</h3>
      <p>Wir richten es ein. Wir betreuen es. Du siehst, was es bringt.</p>
      <div class="solution-points"><span>Google Business sichtbar und professionell pflegen</span><span>Bewertungen systematisch sammeln</span><span>QR-Codes für Bewertung, Punkte und Wiederbesuche nutzen</span><span>Monatsreport statt Agentur-Blabla</span></div>
    </div>
  </div>
</section>

<section class="human-beat reveal" id="warum">
  <div class="container">
    <span class="kicker">Worum es eigentlich geht</span>
    <h2>Am Ende zählt keine Kennzahl. Sondern der Kunde, der wiederkommt.</h2>
    <p class="lead">Sichtbarkeit, Bewertungen und Wiederbesuche sind nur Mittel zum Zweck — damit mehr Menschen den Weg zu dir finden und du dir weniger Sorgen um die nächste Woche machen musst.</p>
  </div>
</section>


<section class="product-stack-section" id="system" data-stack-reveal>
  <div class="container stack-grid">
    <div class="stack-copy reveal">
      <span class="kicker">Mehr Ergebnis. Weniger Tool-Chaos.</span>
      <h2>Ein klarer Weg zu mehr lokalen Kunden.</h2>
      <p>Mehr Menschen finden dich. Mehr Kunden entscheiden sich für dich. Mehr Gäste kommen wieder — ohne dass du selbst in komplizierten Tools arbeiten musst.</p>
      <div class="stack-mini-copy">
        <span>Kein neues Tool, das du lernen musst.</span>
        <span>Kein Vertrag, der dich bindet.</span>
        <span>Kein Monat ohne klare Übersicht.</span>
      </div>
    </div>
    <div class="stack-stage reveal delay1" aria-label="Product Stack MecklenburgMarketing">
      <article class="stack-card stack-1"><small>01</small><h3>Google Business</h3><p>Der erste Eindruck, wenn Kunden lokal suchen.</p></article>
      <article class="stack-card stack-2"><small>02</small><h3>Bewertungen</h3><p>Vertrauen sichtbar machen — im richtigen Moment.</p></article>
      <article class="stack-card stack-3"><small>03</small><h3>QR-Kampagnen</h3><p>Offline-Kontakt in digitale Aktion verwandeln.</p></article>
      <article class="stack-card stack-4"><small>04</small><h3>Loyalty</h3><p>Aus Laufkundschaft werden Wiederbesuche.</p></article>
      <article class="stack-card stack-5"><small>05</small><h3>Monatsreport</h3><p>Klar sehen, was getan wurde und was als Nächstes zählt.</p></article>
    </div>
  </div>
</section>

<section class="section horizontal-pin-section" id="features" data-horizontal-pin>
  <div class="container section-head reveal"><h2>Fünf Bausteine. Ein Ziel: mehr Nachfrage.</h2><p>Google, Bewertungen, QR, Loyalty und Monatsreport arbeiten zusammen — damit aus Sichtbarkeit echte Kundenkontakte werden.</p></div>
  <div class="container swipe-shell reveal delay1" data-carousel>
    <div class="swipe-meta"><span class="swipe-hint">Bausteine seitlich entdecken</span><div class="arrows"><button class="arrow" data-prev aria-label="Zurück">‹</button><button class="arrow" data-next aria-label="Weiter">›</button></div></div>
    <div class="swipe-row">
      <article class="swipe-card"><small>Google Business</small><h3>Gefunden werden, wenn Kunden suchen.</h3><p>Profil, Leistungen, Fotos, Produkte und Beiträge werden laufend gepflegt — nicht einmalig, sondern als Prozess.</p><span class="card-note">lokale Sichtbarkeit</span></article>
      <article class="swipe-card"><small>Review-Funnel</small><h3>Gute Kundenerlebnisse sichtbar machen.</h3><p>Zufriedene Kunden werden im richtigen Moment zur Bewertung geführt — freundlich, einfach und nachvollziehbar.</p><span class="card-note">mehr Vertrauen</span></article>
      <article class="swipe-card"><small>QR-Kampagnen</small><h3>Ein Scan verbindet Bewertung und Aktion.</h3><p>QR-Codes an Theke, Rechnung oder Tischaufsteller führen zu Bewertung, Punkteprogramm oder Prämie.</p><span class="card-note">weniger Reibung</span></article>
      <article class="swipe-card"><small>Loyalty</small><h3>Aus Laufkundschaft wird Wiederbesuch.</h3><p>Digitale Stempelkarte, Punkte, Prämien und Rückholaktionen — ohne App-Zwang.</p><span class="card-note">Stammkunden</span></article>
      <article class="swipe-card"><small>Monatsreport</small><h3>Du siehst, was es gebracht hat.</h3><p>Maßnahmen, Kennzahlen und nächste Empfehlung verständlich zusammengefasst.</p><span class="card-note">keine Tool-Flut</span></article>
    </div>
  </div>
</section>

<section class="tool-marquee-section" aria-label="Zubuchbare Tools von MecklenburgMarketing">
  <div class="container marquee-head reveal">
    <span class="kicker">Zubuchbare Tools</span>
    <h2>Alles modular. Nichts unnötig.</h2>
    <p>Du startest mit dem, was für deinen Betrieb Sinn ergibt — und erweiterst später, wenn es Wirkung zeigt.</p>
  </div>
  <div class="tool-marquee" aria-hidden="true">
    <div class="tool-track">
      <span>Google Business Optimierung</span><span>Bewertungs-Booster</span><span>QR-Kampagnen</span><span>Digitale Stempelkarte</span><span>Monatsreport</span><span>Rückholaktionen</span><span>Local SEO</span><span>Mini-Audit</span><span>Kundenportal</span><span>Review-Antworten</span><span>Foto-Check</span><span>Kampagnen-Auswertung</span>
      <span>Google Business Optimierung</span><span>Bewertungs-Booster</span><span>QR-Kampagnen</span><span>Digitale Stempelkarte</span><span>Monatsreport</span><span>Rückholaktionen</span><span>Local SEO</span><span>Mini-Audit</span><span>Kundenportal</span><span>Review-Antworten</span><span>Foto-Check</span><span>Kampagnen-Auswertung</span>
    </div>
  </div>
</section>

<section class="section compact" id="analyse">
  <div class="container analysis-shell reveal">
    <div class="analysis-top">
      <div>
        <span class="kicker">Kostenloses Einstiegsangebot</span>
        <h2>Was du in der kostenlosen Analyse bekommst.</h2>
      </div>
      <p>Die Analyse ist dein erster verwertbarer Überblick: Wo stehst du gerade, was bremst deine lokale Sichtbarkeit und welcher nächste Schritt bringt am meisten? Für die Ersteinschätzung reichen dein Betriebsname und eine Kontaktmöglichkeit.</p>
    </div>

    <div class="analysis-offer-panel">
      <div class="offer-copy">
        <small>Du bekommst kostenlos:</small>
        <h3>Eine klare Einschätzung statt Verkaufsdruck.</h3>
        <p>Wir prüfen die wichtigsten Punkte aus Kundensicht und fassen zusammen, welcher Einstieg für deinen Betrieb wirklich sinnvoll ist — ohne Zugangsdaten und ohne Vorbereitung.</p>
      </div>
      <div class="offer-list" aria-label="Bestandteile der kostenlosen Analyse">
        <span><b>Google-Profil</b> Kategorie, Leistungen, Öffnungszeiten, Fotos und erster Eindruck.</span>
        <span><b>Bewertungen</b> Sterne, Anzahl, Antwortquote und ungenutztes Review-Potenzial.</span>
        <span><b>Vertrauen</b> Ob dein Profil so wirkt, dass neue Kunden klicken, anrufen oder vorbeikommen.</span>
        <span><b>Sichtbarkeit</b> Erste Einschätzung, wo Konkurrenz stärker wirkt.</span>
        <span><b>Startempfehlung</b> Ein konkreter erster Schritt mit hohem Nutzen.</span>
      </div>
    </div>

    <div class="process-clarity-panel reveal delay1">
      <div class="process-copy">
        <small>Was passiert nach der Anfrage?</small>
        <h3>Für die Ersteinschätzung brauchst du nur deinen Betriebsnamen.</h3>
        <p>Du musst nichts vorbereiten und keine Zugangsdaten senden. Wir prüfen öffentlich sichtbare Punkte und melden uns mit einer verständlichen Einschätzung.</p>
      </div>
      <div class="process-steps" aria-label="Ablauf nach der Anfrage">
        <span><b>1. Rückmeldung innerhalb von 24–48 Stunden</b>Wir melden uns persönlich per gewünschtem Kontaktweg.</span>
        <span><b>2. Prüfung ohne Zugangsdaten</b>Google-Profil, Bewertungen, Fotos, Öffnungszeiten und sichtbare Potenziale.</span>
        <span><b>3. Klare Startempfehlung</b>Du bekommst verständlich erklärt, welcher erste Schritt wirklich Sinn ergibt.</span>
        <span><b>4. Entscheidung ohne Druck</b>Die Analyse ist ohne Vertragsbindung. Alles Weitere besprechen wir transparent.</span>
      </div>
    </div>

    <div class="swipe-shell analysis-swipes" data-carousel>
      <div class="swipe-meta"><span class="swipe-hint">Analyse-Bestandteile seitlich wischen</span><div class="arrows"><button class="arrow" data-prev aria-label="Zurück">‹</button><button class="arrow" data-next aria-label="Weiter">›</button></div></div>
      <div class="swipe-row">
        <article class="swipe-card"><small>01</small><h3>Google-Profil-Check</h3><p>Name, Kategorie, Leistungen, Fotos, Beiträge, Öffnungszeiten und erster Eindruck.</p></article>
        <article class="swipe-card"><small>02</small><h3>Bewertungs-Check</h3><p>Sterne, Anzahl, Antwortquote, Tonalität und Potenzial für neue Bewertungen.</p></article>
        <article class="swipe-card"><small>03</small><h3>Foto- & Vertrauens-Check</h3><p>Ob dein Profil so wirkt, dass neue Kunden wirklich klicken, anrufen oder vorbeikommen.</p></article>
        <article class="swipe-card"><small>04</small><h3>Sichtbarkeits-Check</h3><p>Erste Einschätzung, wie gut du lokal gefunden wirst und wo Konkurrenz stärker wirkt.</p></article>
        <article class="swipe-card"><small>05</small><h3>Klare Startempfehlung</h3><p>Eine verständliche Empfehlung, ob Google, Bewertungen, QR oder Loyalty zuerst Sinn ergibt.</p></article>
      </div>
    </div>

    <div class="included"><span>kostenlos</span><span>unverbindlich</span><span>Analyse ohne Vertragsbindung</span><span>ohne Kaufpflicht</span><span>verständlich erklärt</span></div>
    <div class="analysis-cta cta-priority"><a class="btn primary big" href="#start" data-event="analyse_cta">Betrieb kostenlos prüfen lassen</a><a class="btn ghost big whatsapp-btn" href="#start" data-whatsapp-link data-whatsapp-number="+491627533619" data-event="whatsapp_cta">Per WhatsApp kurz fragen</a></div>
    <p class="subtle-contact">Oder direkt per Mail: <a href="mailto:zapf@mecklenburgmarketing.de?subject=Kostenlose%20Analyse%20MecklenburgMarketing">zapf@mecklenburgmarketing.de</a></p>
  </div>
</section>

<section class="section compact mini-audit-section" id="beispielanalyse">
  <div class="container">
    <div class="section-head reveal">
      <h2>So sieht deine kostenlose Einschätzung aus.</h2>
      <p>Eine Beispielvorschau, wie wir Potenziale aus Kundensicht einordnen — kurz, verständlich und mit klarer Startempfehlung.</p>
    </div>
    <div class="audit-preview-grid reveal delay1">
      <article class="audit-card-main">
        <div class="audit-head"><span class="kicker">Kostenlose Ersteinschätzung</span><strong>lokales Café · Schwerin</strong></div>
        <div class="audit-score"><span class="grad">72</span><em>/100</em></div>
        <p>Solide Basis, aber sichtbares Potenzial bei Fotos, Bewertungsimpulsen und lokalen Suchbegriffen.</p>
        <div class="audit-bars" aria-label="Beispielwerte einer Analyse">
          <div><span>Google-Profil</span><i><b style="width:72%"></b></i><em>72%</em></div>
          <div><span>Bewertungen</span><i><b style="width:64%"></b></i><em>64%</em></div>
          <div><span>Fotos & Vertrauen</span><i><b style="width:48%"></b></i><em>48%</em></div>
          <div><span>Wiederbesuch-Potenzial</span><i><b style="width:82%"></b></i><em>hoch</em></div>
        </div>
      </article>
      <article class="audit-recommendation">
        <small>Nächster sinnvoller Schritt</small>
        <h3>Neue Profilfotos + Bewertungs-QR am Wochenende testen.</h3>
        <p>Ein kleiner Einstieg mit hoher Wirkung: besserer erster Eindruck, mehr Bewertungsanlässe und klarer Weg für zufriedene Gäste.</p>
        <ul>
          <li>5–8 aktuelle Fotos hochladen</li>
          <li>QR-Hinweis an Theke platzieren</li>
          <li>Bewertungen freundlich nach dem Kaufmoment anstoßen</li>
        </ul>
        <a class="btn ghost" href="#start" data-event="audit_preview_cta">Eigene Einschätzung anfragen</a>
      </article>
    </div>
  </div>
</section>

<section class="section compact" id="zielgruppe">
  <div class="container section-head reveal"><h2>Passt zu dir, wenn du lokal Kunden gewinnen willst.</h2><p>MecklenburgMarketing ist bewusst für Betriebe gebaut, bei denen Vertrauen, Nähe und Wiederbesuche entscheidend sind.</p></div>
  <div class="container fit-grid reveal delay1">
    <div class="fit-item"><div><b>Du willst mehr Kunden über Google bekommen.</b>Weil Menschen dich suchen, aber oft die Konkurrenz sichtbarer ist.</div></div>
    <div class="fit-item"><div><b>Du machst gute Arbeit, bekommst aber zu wenige Bewertungen.</b>Weil zufriedene Kunden selten von selbst daran denken.</div></div>
    <div class="fit-item"><div><b>Du willst Stammkunden gezielter zurückholen.</b>Weil ein Wiederbesuch oft wertvoller ist als ein einmaliger Kontakt.</div></div>
    <div class="fit-item"><div><b>Du willst kein kompliziertes Marketing-Tool bedienen.</b>Du möchtest eine klare Empfehlung und jemanden, der es verständlich erklärt.</div></div>
  </div>
  <div class="container segment-grid reveal delay2" aria-label="Geeignete Branchen und Nutzen">
    <article class="segment-card"><span>01</span><b>Cafés & Gastro</b><p>Mehr Bewertungen nach guten Besuchen, QR-Aktionen am Tresen und kleine Anreize für Wiederbesuche.</p></article>
    <article class="segment-card"><span>02</span><b>Friseure & Beauty</b><p>Mehr Vertrauen durch aktuelle Fotos, sichtbare Bewertungen und ein Google-Profil, das hochwertig wirkt.</p></article>
    <article class="segment-card"><span>03</span><b>Lokale Dienstleister</b><p>Mehr Anrufe, Routenplanungen und Anfragen, wenn Kundinnen und Kunden konkret in deiner Nähe suchen.</p></article>
    <article class="segment-card"><span>04</span><b>Einzelhandel & Studios</b><p>Lokale Sichtbarkeit, bessere Kundenwege und klare Aktionen, damit aus Interesse häufiger Besuch wird.</p></article>
  </div>
</section>

<section class="section" id="report">
  <div class="container section-head reveal"><h2>Ein Monatsblick, den sie direkt verstehen.</h2><p>Er zeigt nicht jedes Detail — sondern genau das, was lokale Betriebe schnell einordnen und entscheiden können.</p></div>
  <div class="container report-grid">
    <article class="report-panel reveal"><div class="report-title"><small>Beispielbetrieb</small><span>Mai 2026</span></div><div class="metric-row"><div class="metric-box"><small>Profilaufrufe</small><b class="grad">2.846</b><span>+22% zum Vormonat</span></div><div class="metric-box"><small>Bewertungen</small><b class="grad">+34</b><span>4,8 Sterne aktuell</span></div><div class="metric-box"><small>QR-Scans</small><b class="grad">512</b><span>127 diese Woche</span></div></div><div class="report-chart" aria-hidden="true"><svg viewBox="0 0 640 190" preserveAspectRatio="none"><path d="M0 148 C70 132 88 138 148 108 C214 74 244 118 306 82 C375 42 408 66 465 48 C532 28 572 41 640 22" fill="none" stroke="url(#reportLine)" stroke-width="7" stroke-linecap="round"/><path d="M0 148 C70 132 88 138 148 108 C214 74 244 118 306 82 C375 42 408 66 465 48 C532 28 572 41 640 22 L640 190 L0 190 Z" fill="url(#reportArea)"/><defs><linearGradient id="reportLine" x1="0" x2="1"><stop stop-color="#5d5dfc"/><stop offset=".55" stop-color="#8b5cf6"/><stop offset="1" stop-color="#c084fc"/></linearGradient><linearGradient id="reportArea" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#8b5cf6" stop-opacity=".27"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/></linearGradient></defs></svg></div></article>
    <article class="report-panel reveal delay1"><div class="report-title"><small>Nächste Empfehlung</small><span>Priorität hoch</span></div><div class="activity"><div class="activity-row"><i></i><div><b>Sommer-Fotos freigeben</b><span>Verbessert Vertrauen und Darstellung in Google Maps.</span></div><em>1</em></div><div class="activity-row"><i></i><div><b>Wochenend-Booster starten</b><span>QR-Hinweis an Theke + Bewertungsfrage nach Kaufmoment.</span></div><em>2</em></div><div class="activity-row"><i></i><div><b>8 inaktive Gäste zurückholen</b><span>Kleiner Anreiz für Stammgäste, die 30 Tage nicht aktiv waren.</span></div><em>3</em></div></div></article>
  </div>
</section>

<section class="section compact" id="team">
  <div class="container team-grid">
    <div class="trust-copy reveal"><span class="kicker">Persönlich statt anonym</span><h2>Persönlich betreut von Dominique Zapf & Janne Dickmann.</h2><p>MecklenburgMarketing ist lokal für Betriebe in Mecklenburg-Vorpommern gedacht. Du bekommst keine unverständliche Tool-Liste, sondern eine persönliche Einschätzung, klare Einrichtung und verständliche Monatsübersichten.</p><div class="trust-list"><span>echte Ansprechpartner statt anonymem Support-Ticket</span><span>Fokus auf Cafés, Beauty, Gastro, Friseure und lokale Dienstleister in MV</span><span>verständlich erklärt — ohne komplizierte Marketingsprache</span><span>klein starten, später sinnvoll erweitern</span></div></div>
    <!-- ECHTE FOTOS: Dateien unter assets/dominique-zapf.jpg und assets/janne-dickmann.jpg ablegen.
     Fehlen sie, zeigt sich automatisch das gestaltete Initialen-Avatar. Echte Gesichter konvertieren hier am besten. -->
    <div class="people reveal delay1"><article class="person"><div class="photo"><img src="assets/dominique-zapf.jpg" alt="Dominique Zapf" loading="lazy" decoding="async" width="600" height="700" onerror="this.remove()"><span class="photo-initials">DZ</span></div><h3>Dominique Zapf</h3><p>MecklenburgMarketing · Analyse, Beratung und Umsetzung für mehr lokale Sichtbarkeit.</p></article><article class="person"><div class="photo"><img src="assets/janne-dickmann.jpg" alt="Janne Dickmann" loading="lazy" decoding="async" width="600" height="700" onerror="this.remove()"><span class="photo-initials">JD</span></div><h3>Janne Dickmann</h3><p>Mitgesellschafter · Ansprechpartner für Umsetzung, Betreuung und Weiterentwicklung.</p></article></div>
  </div>
</section>

<section class="section compact" id="versprechen">
  <div class="container">
    <div class="section-head reveal"><h2>Was du von uns erwarten kannst.</h2><p>Bevor du irgendetwas buchst, weißt du genau, worauf du dich verlässt.</p></div>
    <div class="promise-grid reveal delay1">
      <div class="promise-card"><div class="promise-ico">✓</div><b>Kostenlos &amp; unverbindlich</b><span>Die Erstanalyse kostet nichts. Keine Kaufpflicht, keine versteckten Folgekosten.</span></div>
      <div class="promise-card"><div class="promise-ico">✓</div><b>Analyse ohne Vertragsbindung</b><span>Die kostenlose Analyse löst keine Vertragsbindung aus. Wenn du danach starten möchtest, besprechen wir Umfang, Laufzeit und Kosten transparent.</span></div>
      <div class="promise-card"><div class="promise-ico">✓</div><b>Echte Ansprechpartner</b><span>Persönlich betreut von Dominique &amp; Janne — kein anonymes Support-Ticket.</span></div>
      <div class="promise-card"><div class="promise-ico">✓</div><b>Verständlich erklärt</b><span>Keine komplizierte Marketingsprache, kein Tool-Zwang. Du bekommst klare Worte und einen verständlichen Monatsblick.</span></div>
    </div>
  </div>
</section>

<section class="section compact" id="pakete">
  <div class="container section-head reveal"><h2>Starte klein. Erweitere, wenn es Sinn ergibt.</h2><p>Die Pakete sind Orientierung. Die genaue Empfehlung bekommst du nach der kostenlosen Analyse.</p></div>
  <div class="container">
    <div class="pricing-note reveal"><span><b>Wichtig:</b> Die kostenlose Analyse ist ohne Vertragsbindung. Wenn du danach starten möchtest, besprechen wir Umfang, Laufzeit und Kosten transparent. Oft reicht ein kleiner Einstieg mit Google Business, Bewertungen oder QR-Kampagne.</span><a class="btn ghost" href="#start" data-event="pricing_recommendation">Empfehlung anfragen</a></div>
    <div class="value-frame reveal delay1">
      <div class="value-pill"><b>Preis greifbar gemacht</b>Schon wenige zusätzliche Stammkunden oder Anfragen pro Monat können den Einstieg wirtschaftlich sinnvoll machen.</div>
      <div class="value-pill"><b>Kein Blindflug</b>Du startest nicht mit einem Paket auf Verdacht, sondern nach einer kostenlosen Einschätzung.</div>
      <div class="value-pill"><b>Klein anfangen</b>Google, Bewertungen oder QR-Kampagne können einzeln starten und später wachsen.</div>
    </div>
    <div class="pricing">
      <article class="plan reveal"><h3>Starter</h3><p class="desc">Für Betriebe, die Google sichtbar und professionell aufstellen wollen.</p><div class="price">ab 149 €<small>/Monat</small></div><div class="setup">zzgl. Setup ab 199 € · Einstieg für klare Sichtbarkeit</div><p class="plan-value">Für weniger als viele Betriebe monatlich für klassische Werbung ausgeben, wird dein Google-Auftritt aktiv betreut.</p><ul><li>Google Business Optimierung</li><li>SEO-/Sichtbarkeits-Check</li><li>QR-Code-Grundkampagne</li><li>Monatsübersicht</li></ul><a class="btn ghost" href="#start">Starter anfragen</a></article>
      <article class="plan featured reveal delay1"><span class="badge">Beliebt</span><h3>Growth</h3><p class="desc">Für Betriebe, die Bewertungen und Kundenbindung aktiv aufbauen wollen.</p><div class="price">ab 399 €<small>/Monat</small></div><div class="setup">zzgl. Setup ab 199 € · Fokus auf Bewertungen & Wiederbesuche</div><p class="plan-value">Schon wenige zusätzliche Stammkunden oder Anfragen pro Monat können den Einstieg wirtschaftlich sinnvoll machen.</p><ul><li>Alles aus Starter</li><li>Bewertungen aktiv sammeln</li><li>Digitales Punkteprogramm</li><li>Rückholaktionen für Gäste</li><li>Monatsreport mit Empfehlungen</li></ul><a class="btn primary" href="#start">Growth anfragen</a></article>
      <article class="plan reveal delay2"><h3>Premium</h3><p class="desc">Für Betriebe, die Kundenbindung und Automationen stärker ausbauen möchten.</p><div class="price">individuell</div><div class="setup">nach Umfang und Ziel</div><p class="plan-value">Für Betriebe, die mehr Kundenbindung, Rückholaktionen und Auswertung dauerhaft ausbauen möchten.</p><ul><li>Alles aus Growth</li><li>Bonusstufen und Prämienlogik</li><li>Service-Recovery-Flows</li><li>KI-Empfehlungen</li><li>erweiterte Auswertungen</li></ul><a class="btn ghost" href="#start">Premium besprechen</a></article>
    </div>
    <div class="entry-bridge reveal">
      <div class="tagico">€</div>
      <div>
        <b>Noch nicht bereit für ein Monatspaket?</b>
        <span>Starte mit einem einmaligen Profil-Setup — einmalig, ohne Abo. Einmaliges Setup ab&nbsp;199&nbsp;€.</span>
      </div>
      <a class="btn ghost" href="#start" data-event="entry_bridge_cta">Einstieg anfragen</a>
    </div>
    <p class="fineprint reveal">Alle Preise sind Orientierungspreise. Die Analyse ist ohne Vertragsbindung; konkrete Laufzeit, Umfang und Kosten klären wir transparent, bevor du etwas buchst.</p>
  </div>
</section>

<section class="section compact" id="faq">
  <div class="container faq">
    <div class="reveal">
      <h2>Die wichtigsten Fragen — kurz beantwortet.</h2>
      <p>Sortiert nach den Einwänden, die lokale Betriebe vor einer Anfrage typischerweise haben.</p>
      <div class="faq-tags"><span>kostenlos</span><span>Analyse ohne Vertragsbindung</span><span>kein Zugang nötig</span><span>klein starten</span></div>
    </div>
    <div class="faq-list compact reveal delay1">
      <details open><summary>Ist die Analyse wirklich kostenlos?</summary><p>Ja. Die erste Analyse ist kostenlos, unverbindlich und ohne Vertragsbindung. Du bekommst eine klare Einschätzung, ohne dass daraus automatisch ein Auftrag entsteht.</p></details>
      <details><summary>Muss ich etwas vorbereiten oder Zugangsdaten senden?</summary><p>Nein. Für die kostenlose Ersteinschätzung reichen dein Betriebsname und eine Kontaktmöglichkeit. Zugangsdaten brauchst du erst, wenn du dich später bewusst für eine Umsetzung entscheidest.</p></details>
      <details><summary>Was passiert nach meiner Anfrage?</summary><p>Wir melden uns in der Regel innerhalb von 24–48 Stunden, prüfen öffentlich sichtbare Punkte und geben dir eine verständliche Einschätzung mit nächster Empfehlung.</p></details>
      <details><summary>Muss ich danach etwas buchen?</summary><p>Nein. Die Analyse löst keine Vertragsbindung und keine Kaufpflicht aus. Wenn du danach starten möchtest, besprechen wir Laufzeit, Umfang und Kosten transparent.</p></details>
      <details><summary>Brauche ich eine eigene Website?</summary><p>Nein. Google Business, QR-Zielseiten, Bewertungs-Funnel und Loyalty können auch ohne eigene Website funktionieren.</p></details>
      <details><summary>Funktioniert das auch für kleine Betriebe?</summary><p>Ja. Gerade kleinere lokale Betriebe profitieren, wenn Google-Profil, Bewertungen und Wiederbesuche systematisch gepflegt werden, ohne intern viel Zeit zu verlieren.</p></details>
      <details><summary>Was ist, wenn ich schon Social Media mache?</summary><p>Dann ergänzt MecklenburgMarketing deine bestehenden Maßnahmen. Social Media schafft Aufmerksamkeit — Google, Bewertungen und QR-Kampagnen helfen besonders beim konkreten lokalen Such- und Kaufmoment.</p></details>
      <details><summary>Muss ich selbst ein Tool bedienen?</summary><p>Nein. Ziel ist gerade, dass du nicht in komplizierten Tools arbeiten musst. Wir übernehmen Einrichtung, Betreuung und verständliche Monatsübersichten.</p></details>
      <details><summary>Wie schnell sieht man Ergebnisse?</summary><p>Erste Verbesserungen wie ein professionelleres Profil, bessere Bewertungsimpulse und klarere Kundenwege können schnell sichtbar werden. Rankings und Kundenbindung entwickeln sich realistisch über mehrere Wochen und Monate.</p></details>
    </div>
    <button class="faq-more-btn" type="button" data-faq-toggle>Weitere Fragen anzeigen</button>
  </div>
</section>

<section class="form-section" id="start">
  <div class="container form-box">
    <div class="form-copy reveal"><span class="kicker">Kostenlos & unverbindlich</span><h2>Lass deinen Betrieb kostenlos prüfen.</h2><p>Für die Ersteinschätzung reichen dein Betriebsname und eine Kontaktmöglichkeit. Du musst nichts vorbereiten und keine Zugangsdaten senden.</p><p>Wir prüfen Google-Sichtbarkeit, Bewertungen, Fotos, Öffnungszeiten und Potenziale für QR- oder Loyalty-Kampagnen. Danach bekommst du eine klare Empfehlung.</p><div class="after-request"><span><b>1.</b> Du trägst deinen Betrieb ein.</span><span><b>2.</b> Wir melden uns in der Regel innerhalb von 24–48 Stunden.</span><span><b>3.</b> Wir prüfen öffentlich sichtbare Potenziale — ohne Zugangsdaten.</span><span><b>4.</b> Du bekommst eine verständliche Empfehlung. Die Analyse ist ohne Vertragsbindung.</span></div></div>
    <form class="contact-form reveal delay1" data-lead-form data-email="zapf@mecklenburgmarketing.de" data-endpoint="" novalidate>
      <div class="hp-field" aria-hidden="true"><label for="company-website">Website</label><input id="company-website" name="Website" type="text" tabindex="-1" autocomplete="off" /></div>
      <div class="field"><label for="name">Name</label><input id="name" name="Name" type="text" placeholder="Dein Name" autocomplete="name" required /></div>
      <div class="field"><label for="business">Betrieb</label><input id="business" name="Betrieb" type="text" placeholder="z. B. Café Muster Schwerin" autocomplete="organization" required /></div>
      <div class="contact-split-fields">
        <div class="field"><label for="email">E-Mail</label><input id="email" name="E-Mail" type="email" placeholder="deine@mail.de" autocomplete="email" inputmode="email" enterkeyhint="next" /></div>
        <div class="field"><label for="phone">Telefon / WhatsApp</label><input id="phone" name="Telefon" type="tel" placeholder="0162 7533619" autocomplete="tel" inputmode="tel" enterkeyhint="next" /></div>
      </div>
      <div class="field"><label for="preferred">Bevorzugter Kontaktweg</label><select id="preferred" name="Bevorzugter Kontaktweg"><option>E-Mail</option><option>Telefon</option><option>WhatsApp</option></select></div><p class="contact-help">Für die Ersteinschätzung reicht dein Betriebsname und eine Kontaktmöglichkeit. Du musst nichts vorbereiten.</p>
      <div class="field"><label for="interest">Interesse</label><select id="interest" name="Interesse"><option>Kostenlose Analyse</option><option>Google Business Optimierung</option><option>Bewertungen sammeln</option><option>Digitales Punkteprogramm</option><option>QR-Kampagne</option><option>Komplettes Marketing-System</option></select></div>
      <div class="field"><label for="message">Nachricht</label><textarea id="message" name="Nachricht" placeholder="Kurze Info zu deinem Betrieb oder deinem Ziel"></textarea></div>
      <div class="contact-actions contact-actions-priority"><button class="btn primary" type="submit" data-event="form_submit_click">Betrieb kostenlos prüfen lassen</button><a class="btn ghost whatsapp-btn" href="#start" data-whatsapp-link data-whatsapp-number="+491627533619" data-event="whatsapp_form_click">Per WhatsApp kurz fragen</a></div><p class="secondary-contact-line">Oder direkt per Mail an <a href="mailto:zapf@mecklenburgmarketing.de?subject=Kostenlose%20Analyse%20MecklenburgMarketing" data-event="mail_form_click">zapf@mecklenburgmarketing.de</a></p>
      <p class="form-status info" data-form-status role="status" aria-live="polite"></p>
      <p class="form-note">Kostenlos. Unverbindlich. Analyse ohne Vertragsbindung. Keine Kaufpflicht. Keine Zugangsdaten nötig.</p>
      <p class="mail-note">Deine Anfrage wird an zapf@mecklenburgmarketing.de vorbereitet. Alternativ kannst du direkt per WhatsApp schreiben oder anrufen: <a class="tel-link" href="tel:+491627533619">0162 7533619</a>.</p>
    </form>
  </div>
</section>
</main>

<section class="premium-close-section" id="abschluss">
  <div class="container premium-close reveal">
    <span class="kicker">Bereit für den ersten Schritt?</span>
    <h2>Bereit, dass dein Betrieb sichtbarer wird?</h2>
    <p>Wir prüfen kostenlos, wo du aktuell stehst — und welcher erste Schritt wirklich Sinn ergibt.</p>
    <div class="premium-close-actions">
      <a class="btn primary big" href="#start" data-event="premium_close_analyse">Betrieb kostenlos prüfen lassen</a>
      <a class="btn ghost big whatsapp-btn" href="#start" data-whatsapp-link data-whatsapp-number="+491627533619" data-event="premium_close_whatsapp">Per WhatsApp schreiben</a>
    </div>
  </div>
</section>
<footer class="footer premium-footer"><div class="container footer-row"><span>© 2026 MecklenburgMarketing · zapf@mecklenburgmarketing.de · <a class="tel-link" href="tel:+491627533619">0162 7533619</a></span><span class="legal"><a href="/impressum">Impressum</a><a href="/datenschutz">Datenschutz</a><a href="/privacy/me">Meine Datenrechte</a><a href="/cookies">Cookie-Einstellungen</a><a href="/agb">AGB</a><a href="/widerruf">Widerruf</a></span></div></footer>
<div class="desktop-sticky" aria-label="Schnellanfrage">
  <div class="desktop-sticky-card">
    <small>Kostenlose Einschätzung für deinen Betrieb?</small>
    <div class="desktop-sticky-actions">
      <a class="btn primary" href="#start" data-event="desktop_sticky_analyse">Analyse anfragen</a>
      <a class="btn ghost whatsapp-btn" href="#start" data-whatsapp-link data-whatsapp-number="+491627533619" aria-label="WhatsApp öffnen" data-event="desktop_sticky_whatsapp">WhatsApp</a>
    </div>
  </div>
</div>
<div class="mobile-sticky"><div class="mobile-sticky-actions"><a class="btn primary" href="#start" data-event="mobile_sticky_analyse">Betrieb prüfen lassen</a><a class="btn ghost whatsapp-btn" href="#start" data-whatsapp-link data-whatsapp-number="+491627533619" aria-label="WhatsApp öffnen" data-event="mobile_sticky_whatsapp">WhatsApp</a></div></div>

<noscript><div class="container" style="padding:16px;color:#dfdcec">JavaScript ist deaktiviert. Du kannst uns direkt per E-Mail an zapf@mecklenburgmarketing.de oder per WhatsApp/Telefon unter <a class="tel-link" href="tel:+491627533619">0162 7533619</a> erreichen.</div></noscript>
`

const landingScript = `(function(){
  var nav=document.getElementById("nav");
  var menuBtn=document.getElementById("menuBtn");

  if(menuBtn&&nav){
    menuBtn.addEventListener("click",function(){
      var open=nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded",String(open));
    });
    var mobileLinks=document.querySelectorAll(".mobile-menu a");
    for(var ml=0;ml<mobileLinks.length;ml++){
      mobileLinks[ml].addEventListener("click",function(){
        nav.classList.remove("open");
        menuBtn.setAttribute("aria-expanded","false");
      });
    }
  }

  var revealItems=document.querySelectorAll(".reveal");
  if("IntersectionObserver" in window){
    var revealObserver=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },{threshold:.14});
    revealItems.forEach(function(el){revealObserver.observe(el);});
  }else{
    revealItems.forEach(function(el){el.classList.add("visible");});
  }

  document.querySelectorAll("[data-qr]").forEach(function(qr){
    qr.innerHTML="";
    for(var i=0;i<49;i++){
      var s=document.createElement("s");
      var r=Math.floor(i/7);
      var c=i%7;
      var finder=(r<2&&c<2)||(r<2&&c>4)||(r>4&&c<2);
      if(!finder&&((i*2654435761)>>>0)%5>=2)s.className="off";
      qr.appendChild(s);
    }
  });

  document.querySelectorAll("[data-carousel]").forEach(function(carousel){
    var row=carousel.querySelector(".swipe-row");
    var prev=carousel.querySelector("[data-prev]");
    var next=carousel.querySelector("[data-next]");
    if(!row)return;
    var step=function(){return Math.min(row.clientWidth*.86,420);};
    if(prev)prev.addEventListener("click",function(){row.scrollBy({left:-step(),behavior:"smooth"});});
    if(next)next.addEventListener("click",function(){row.scrollBy({left:step(),behavior:"smooth"});});
  });

  var whatsappText=encodeURIComponent("Hallo MecklenburgMarketing, ich interessiere mich für die kostenlose Analyse meines Betriebs.");
  document.querySelectorAll("[data-whatsapp-link]").forEach(function(link){
    var number=(link.getAttribute("data-whatsapp-number")||"").replace(/\\D/g,"");
    if(number){
      link.href="https://wa.me/"+number+"?text="+whatsappText;
      link.hidden=false;
      link.target="_blank";
      link.rel="noopener noreferrer";
    }
  });

  document.querySelectorAll("[data-event]").forEach(function(el){
    el.addEventListener("click",function(){
      window.dispatchEvent(new CustomEvent("mmos:cta",{detail:{name:el.getAttribute("data-event")}}));
    });
  });

  var leadForm=document.querySelector("[data-lead-form]");
  if(leadForm){
    var status=leadForm.querySelector("[data-form-status]");
    var setStatus=function(message,type){
      if(!status)return;
      status.textContent=message;
      status.className="form-status show "+(type||"info");
    };
    var buildMailto=function(){
      var data=new FormData(leadForm);
      var subject="Kostenlose Analyse MecklenburgMarketing";
      var lines=[
        "Neue Anfrage über die Landingpage:",
        "",
        "Name: "+(data.get("Name")||""),
        "Betrieb: "+(data.get("Betrieb")||""),
        "E-Mail: "+(data.get("E-Mail")||""),
        "Telefon / WhatsApp: "+(data.get("Telefon")||""),
        "Bevorzugter Kontaktweg: "+(data.get("Bevorzugter Kontaktweg")||""),
        "Interesse: "+(data.get("Interesse")||""),
        "Nachricht: "+(data.get("Nachricht")||""),
        "",
        "Bitte eine verständliche Einschätzung vorbereiten."
      ];
      return "mailto:"+(leadForm.dataset.email||"zapf@mecklenburgmarketing.de")+"?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(lines.join("\\n"));
    };

    leadForm.addEventListener("submit",async function(event){
      event.preventDefault();
      var honeypot=leadForm.querySelector("input[name='Website']");
      if(honeypot&&honeypot.value){
        setStatus("Danke! Deine Anfrage wurde entgegengenommen.","success");
        leadForm.reset();
        return;
      }
      var emailField=leadForm.querySelector("#email");
      var phoneField=leadForm.querySelector("#phone");
      var hasContact=(emailField&&emailField.value.trim())||(phoneField&&phoneField.value.trim());
      if(!leadForm.checkValidity()||!hasContact){
        leadForm.reportValidity();
        if(!hasContact){
          setStatus("Bitte gib mindestens eine Kontaktmöglichkeit an: E-Mail, Telefon oder WhatsApp.","info");
          if(emailField){emailField.focus();}
        }else{
          setStatus("Bitte fülle die Pflichtfelder aus. Danach bereiten wir deine Anfrage vor.","info");
        }
        return;
      }
      var endpoint=leadForm.dataset.endpoint;
      if(endpoint){
        try{
          var response=await fetch(endpoint,{method:"POST",body:new FormData(leadForm),headers:{"Accept":"application/json"}});
          if(!response.ok)throw new Error("Formular-Endpunkt nicht erreichbar");
          leadForm.reset();
          setStatus("Danke! Deine Anfrage wurde gesendet. Wir melden uns persönlich mit einer verständlichen Einschätzung.","success");
          return;
        }catch(error){
          setStatus("Der direkte Versand war nicht möglich. Wir öffnen stattdessen eine vorbereitete E-Mail.","info");
        }
      }else{
        setStatus("Wir öffnen jetzt eine vorbereitete E-Mail an zapf@mecklenburgmarketing.de. Bitte nur noch absenden.","info");
      }
      window.location.href=buildMailto();
    });
  }

  /* V16: smarter sticky CTAs and carousel orientation */
  var updateStickyState=function(){
    var y=window.scrollY||window.pageYOffset||0;
    var form=document.getElementById("start");
    var footer=document.querySelector("footer");
    var viewport=window.innerHeight||document.documentElement.clientHeight||0;
    var active=y>Math.max(420,viewport*.42);
    var blocked=false;
    var checkBlock=function(el){
      if(!el)return false;
      var rect=el.getBoundingClientRect();
      return rect.top < viewport*.78 && rect.bottom > 0;
    };
    blocked=checkBlock(form)||checkBlock(footer);
    document.body.classList.toggle("sticky-cta-active",active);
    document.body.classList.toggle("sticky-cta-blocked",blocked);
  };
  updateStickyState();
  window.addEventListener("scroll",updateStickyState,{passive:true});
  window.addEventListener("resize",updateStickyState);

  document.querySelectorAll("[data-carousel]").forEach(function(carousel){
    var row=carousel.querySelector(".swipe-row");
    if(!row||carousel.querySelector(".carousel-progress"))return;
    var cards=row.querySelectorAll(".swipe-card");
    if(cards.length<2)return;
    var progress=document.createElement("div");
    progress.className="carousel-progress";
    progress.setAttribute("aria-hidden","true");
    for(var i=0;i<cards.length;i++){
      var dot=document.createElement("i");
      if(i===0)dot.className="active";
      progress.appendChild(dot);
    }
    carousel.appendChild(progress);
    var dots=progress.querySelectorAll("i");
    var updateProgress=function(){
      var idx=0;
      var rowLeft=row.getBoundingClientRect().left;
      var best=Infinity;
      cards.forEach(function(card,index){
        var distance=Math.abs(card.getBoundingClientRect().left-rowLeft);
        if(distance<best){best=distance;idx=index;}
      });
      dots.forEach(function(dot,index){dot.classList.toggle("active",index===idx);});
    };
    row.addEventListener("scroll",function(){window.requestAnimationFrame(updateProgress);},{passive:true});
    window.addEventListener("resize",updateProgress);
    updateProgress();
  });


  /* V17: Aurora motion, phone parallax/tilt, word reveal and desktop horizontal pin */
  var reducedMotion=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var desktopMotion=window.matchMedia&&window.matchMedia("(min-width: 1000px)").matches&&!reducedMotion;
  var heroStage=document.querySelector(".product-stage");
  var rafQueued=false;

  var clamp=function(value,min,max){return Math.max(min,Math.min(max,value));};

  var updateV17Motion=function(){
    rafQueued=false;
    var viewport=window.innerHeight||document.documentElement.clientHeight||0;
    var scrollY=window.scrollY||window.pageYOffset||0;

    var hero=document.querySelector(".hero");
    if(hero&&!reducedMotion){
      var heroRect=hero.getBoundingClientRect();
      var heroProgress=clamp((-heroRect.top)/(Math.max(1,heroRect.height-viewport*.55)),0,1);
      hero.style.setProperty("--hero-fade",heroProgress.toFixed(3));
    }

    document.querySelectorAll("[data-stack-reveal]").forEach(function(section){
      var rect=section.getBoundingClientRect();
      var active=rect.top<viewport*.62&&rect.bottom>viewport*.18;
      section.classList.toggle("active",active);
    });

    if(heroStage&&!reducedMotion){
      var heroRect=heroStage.getBoundingClientRect();
      var progress=clamp((viewport-heroRect.top)/(viewport+heroRect.height),0,1);
      heroStage.style.setProperty("--phone-y-center",(progress*24).toFixed(1)+"px");
      heroStage.style.setProperty("--phone-y-left",(progress*46).toFixed(1)+"px");
      heroStage.style.setProperty("--phone-y-right",(progress*36).toFixed(1)+"px");
    }

    document.querySelectorAll("[data-word-reveal]").forEach(function(section){
      var words=section.querySelectorAll(".word-statement span");
      if(!words.length)return;
      var rect=section.getBoundingClientRect();
      var p=clamp((viewport*.72-rect.top)/(rect.height*.72),0,1);
      var litCount=Math.ceil(p*words.length);
      words.forEach(function(word,index){word.classList.toggle("lit",index<litCount);});
    });

    if(desktopMotion){
      document.querySelectorAll("[data-horizontal-pin]").forEach(function(section){
        var container=section.querySelector(".swipe-shell")||section.querySelector(".container");
        var row=section.querySelector(".swipe-row");
        if(!container||!row)return;
        var maxShift=parseFloat(section.dataset.pinMax||"0")||0;
        var start=section.offsetTop;
        var end=section.offsetTop+section.offsetHeight-viewport;
        var p=end>start?clamp((scrollY-start)/(end-start),0,1):0;
        row.style.setProperty("--pin-x",(-maxShift*p).toFixed(1)+"px");
      });
    }
  };

  var requestV17Motion=function(){
    if(!rafQueued){
      rafQueued=true;
      window.requestAnimationFrame(updateV17Motion);
    }
  };

  var setupHorizontalPins=function(){
    desktopMotion=window.matchMedia&&window.matchMedia("(min-width: 1000px)").matches&&!reducedMotion;
    document.querySelectorAll("[data-horizontal-pin]").forEach(function(section){
      var container=section.querySelector(".swipe-shell")||section.querySelector(".container");
      var row=section.querySelector(".swipe-row");
      if(!container||!row)return;
      if(!desktopMotion){
        section.style.minHeight="";
        section.dataset.pinMax="0";
        row.style.removeProperty("--pin-x");
        return;
      }
      row.style.setProperty("--pin-x","0px");
      var maxShift=Math.max(0,row.scrollWidth-container.clientWidth+24);
      section.dataset.pinMax=String(maxShift);
      section.style.minHeight=Math.max(window.innerHeight*1.65,window.innerHeight+maxShift+180)+"px";
    });
    requestV17Motion();
  };

  if(heroStage&&!reducedMotion){
    heroStage.addEventListener("mousemove",function(event){
      if(!desktopMotion)return;
      var rect=heroStage.getBoundingClientRect();
      var x=(event.clientX-rect.left)/rect.width-.5;
      var y=(event.clientY-rect.top)/rect.height-.5;
      heroStage.style.setProperty("--tilt-y",(x*7).toFixed(2)+"deg");
      heroStage.style.setProperty("--tilt-x",(-y*5).toFixed(2)+"deg");
    });
    heroStage.addEventListener("mouseleave",function(){
      heroStage.style.setProperty("--tilt-y","0deg");
      heroStage.style.setProperty("--tilt-x","0deg");
    });
  }

  setupHorizontalPins();
  updateV17Motion();
  window.addEventListener("scroll",requestV17Motion,{passive:true});
  window.addEventListener("resize",function(){setupHorizontalPins();requestV17Motion();});



  /* V25: mobile refinements, FAQ reveal and subtle desktop cursor glow */
  var faqToggle=document.querySelector("[data-faq-toggle]");
  if(faqToggle){
    var faqList=document.querySelector(".faq-list.compact");
    faqToggle.addEventListener("click",function(){
      if(!faqList)return;
      var open=faqList.classList.toggle("show-all");
      faqToggle.textContent=open?"Weniger Fragen anzeigen":"Weitere Fragen anzeigen";
    });
  }

  var formControls=document.querySelectorAll("input, textarea, select");
  var keyboardTimer;
  formControls.forEach(function(control){
    control.addEventListener("focus",function(){document.body.classList.add("keyboard-active");});
    control.addEventListener("blur",function(){
      window.clearTimeout(keyboardTimer);
      keyboardTimer=window.setTimeout(function(){document.body.classList.remove("keyboard-active");},180);
    });
  });

  var cursorGlow=document.querySelector(".cursor-glow");
  var finePointer=window.matchMedia&&window.matchMedia("(pointer: fine) and (min-width: 921px)").matches&&!reducedMotion;
  if(cursorGlow&&finePointer){
    var glowX=0,glowY=0,targetX=0,targetY=0,glowVisible=false,glowRaf=false;
    var animateGlow=function(){
      glowRaf=false;
      glowX+=(targetX-glowX)*0.18;
      glowY+=(targetY-glowY)*0.18;
      cursorGlow.style.transform="translate3d("+(glowX-145).toFixed(1)+"px,"+(glowY-145).toFixed(1)+"px,0)";
      if(Math.abs(targetX-glowX)>.2||Math.abs(targetY-glowY)>.2){
        glowRaf=true;
        window.requestAnimationFrame(animateGlow);
      }
    };
    window.addEventListener("pointermove",function(event){
      targetX=event.clientX; targetY=event.clientY;
      if(!glowVisible){
        glowVisible=true; glowX=targetX; glowY=targetY;
        cursorGlow.classList.add("visible");
      }
      if(!glowRaf){glowRaf=true;window.requestAnimationFrame(animateGlow);}
    },{passive:true});
    document.addEventListener("mouseleave",function(){cursorGlow.classList.remove("visible");glowVisible=false;});
  }
})();`

const organizationJsonLd = `
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "MecklenburgMarketing",
  "email": "zapf@mecklenburgmarketing.de",
  "telephone": "+49 162 7533619",
  "areaServed": "Mecklenburg-Vorpommern",
  "description": "MecklenburgMarketing unterstützt lokale Betriebe bei Google Business, Bewertungen, QR-Kampagnen, Loyalty und verständlichen Monatsreports."
}
`
const faqJsonLd = `
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {"@type":"Question","name":"Muss ich nach der Analyse etwas buchen?","acceptedAnswer":{"@type":"Answer","text":"Nein. Die Analyse ist kostenlos, unverbindlich und ohne Vertragsbindung. Wenn du danach starten möchtest, besprechen wir Laufzeit, Umfang und Kosten transparent."}},
    {"@type":"Question","name":"Brauche ich eine Website?","acceptedAnswer":{"@type":"Answer","text":"Nein. Google Business, QR-Zielseiten, Bewertungs-Funnel und Loyalty können auch ohne eigene Website funktionieren."}},
    {"@type":"Question","name":"Muss ich selbst ein Tool bedienen?","acceptedAnswer":{"@type":"Answer","text":"Nein. Ziel ist, dass du nicht in komplizierten Tools arbeiten musst. MecklenburgMarketing übernimmt Einrichtung, Betreuung und verständliche Monatsübersichten."}},
    {"@type":"Question","name":"Funktioniert das auch für kleine Betriebe?","acceptedAnswer":{"@type":"Answer","text":"Ja. Gerade lokale Cafés, Friseure, Beauty-Studios, Dienstleister und inhabergeführte Betriebe profitieren von klarer Google-Sichtbarkeit, Bewertungen und Wiederbesuchen."}},
    {"@type":"Question","name":"Wie schnell sieht man Ergebnisse?","acceptedAnswer":{"@type":"Answer","text":"Erste Verbesserungen wie ein professionelleres Google-Profil, bessere Auffindbarkeit und mehr Bewertungsimpulse können schnell sichtbar werden. Rankings und Kundenbindung entwickeln sich über mehrere Wochen und Monate."}},
    {"@type":"Question","name":"Kann ich erstmal nur mit Google starten?","acceptedAnswer":{"@type":"Answer","text":"Ja. Ein kleiner Einstieg mit Google Business, Bewertungen oder einer QR-Kampagne ist möglich. Erweiterungen kommen erst, wenn sie für den Betrieb sinnvoll sind."}}
  ]
}
`

// Markup (Styles, JSON-LD und HTML) wird einmalig in EIN dangerouslySetInnerHTML
// gefaltet. Werte sind konstant, daher außerhalb der Komponente berechnet.
const landingMarkup =
  '<style>' + landingCss + '</style>' +
  '<script type="application/ld+json">' + organizationJsonLd + '</script>' +
  '<script type="application/ld+json">' + faqJsonLd + '</script>' +
  landingHtml

// Wichtig: memo() ohne Props verhindert ein Re-Rendern nach dem Mount.
// Die umgebende page.tsx lädt Auth/Store-Daten asynchron und löst danach
// Re-Renders aus. Ohne memo committet React dabei das dangerouslySetInnerHTML-
// DOM neu (innerHTML wird auf den Ausgangszustand zurückgesetzt) und verwirft
// die imperativen Script-Effekte (Menü-Toggle, Scroll-Reveal, QR-Aufbau),
// die der useEffect-Script direkt im DOM erzeugt hat.
const CustomerLandingV26 = memo(function CustomerLandingV26() {
  useEffect(() => {
    document.body.classList.add('mmos-landing-v26-active')
    let disposed = false
    try {
      const run = new Function(landingScript)
      if (!disposed) run()
    } catch (error) {
      console.error('[MMOS Landing V26] Script konnte nicht initialisiert werden', error)
    }
    return () => {
      disposed = true
      document.body.classList.remove('mmos-landing-v26-active', 'sticky-cta-active', 'sticky-cta-blocked', 'keyboard-active')
    }
  }, [])

  return <div className="mmosLandingV26" dangerouslySetInnerHTML={{ __html: landingMarkup }} />
})

export default CustomerLandingV26
