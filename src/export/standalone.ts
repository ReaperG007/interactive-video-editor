import type { Project } from "../types";

export type VideoMode = "bundled" | "linked" | "missing";

function htmlJson(data: unknown) {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function escapeHtml(value: string) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const STYLES = `
:root{
  --amber:#ffb224; --ember:#ff6b4a; --sky:#4cc3ff; --mint:#3ddc97;
  --ink:#06080b; --fg:#eef1f6; --mut:rgba(255,255,255,.68); --dim:rgba(255,255,255,.45);
  --line:rgba(255,255,255,.16); --line2:rgba(255,255,255,.28);
  --glass:rgba(10,13,18,.55); --glass2:rgba(255,255,255,.09);
  --bar:clamp(60px,8svh,78px);
  --gutter:clamp(10px,1.8vw,24px);
  --safe-b:max(var(--gutter),env(safe-area-inset-bottom,0px));
  --safe-l:max(var(--gutter),env(safe-area-inset-left,0px));
  --safe-r:max(var(--gutter),env(safe-area-inset-right,0px));
  --tap:44px;
  --group-slot:clamp(185px,21vw,255px);
}
*,*::before,*::after{box-sizing:border-box}
html{height:100%;-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{height:100%;margin:0;overflow:hidden;background:var(--ink);color:var(--fg);
  font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;
  -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;
  -webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;
  touch-action:manipulation}
button,input{font:inherit;color:inherit;margin:0;padding:0}
button{cursor:pointer;border:0;background:none;-webkit-tap-highlight-color:transparent}
input{touch-action:manipulation}
a{-webkit-tap-highlight-color:transparent}
.ic{width:1em;height:1em;flex:none;display:block}

/* ---------- stage ---------- */
.stage{position:relative;width:100vw;height:100vh;height:100svh;height:100dvh;overflow:hidden;background:#000}
.video-wrap{position:absolute;inset:0;transition:transform .65s cubic-bezier(.3,.85,.3,1);pointer-events:none}
video{width:100%;height:100%;object-fit:cover;display:block;background:#000;pointer-events:none}
.shade{position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(125% 95% at 50% 38%,transparent 52%,rgba(0,0,0,.55) 100%)}

/* ---------- top bar ---------- */
.top{position:absolute;left:0;right:0;top:0;z-index:30;display:flex;align-items:flex-start;
  gap:clamp(8px,2vw,28px);padding:calc(var(--gutter)*.85) var(--safe-r) calc(var(--gutter)*2.4) var(--safe-l);
  background:linear-gradient(to bottom,rgba(0,0,0,.8),rgba(0,0,0,.32),transparent)}
.brand{display:flex;align-items:center;gap:clamp(6px,1vw,10px);flex:none;min-width:0;transform-origin:left center;
  filter:drop-shadow(0 2px 10px rgba(0,0,0,.7))}
.brand.right{order:3;margin-left:auto;transform-origin:right center}
.mark{position:relative;width:clamp(26px,3.4vw,38px);height:clamp(26px,3.4vw,38px);display:grid;place-items:center;
  color:var(--amber);filter:drop-shadow(0 2px 8px rgba(0,0,0,.6))}
.mark .ic{width:100%;height:100%}
.mark-inner{position:absolute;inset:0;display:grid;place-items:center;color:var(--ember)}
.mark-inner .ic{width:56%;height:56%}
.brand-title{display:block;font-size:clamp(14px,2vw,23px);font-weight:800;line-height:1.05;letter-spacing:-.01em}
.brand-tag{display:block;font-size:clamp(8px,.9vw,9px);letter-spacing:.24em;text-transform:uppercase;color:var(--dim);margin-top:3px}
.logo-img{height:clamp(26px,4svh,44px);max-width:min(42vw,180px);object-fit:contain;display:block}

/* ---------- start play / scrubber ---------- */
.scrubber{flex:1;min-width:0;display:flex;flex-direction:column;gap:clamp(4px,.8svh,7px);
  max-width:min(640px,62vw);margin:0 auto;touch-action:pan-y}
.scrub-row{display:flex;align-items:center;gap:clamp(6px,1.2vw,14px)}
.sun{color:#fff;font-size:clamp(14px,2vw,21px);flex:none;opacity:.92}
.track{position:relative;flex:1;min-width:0;display:flex;align-items:center;height:clamp(18px,3svh,22px)}
.ticks{position:absolute;inset:0;display:flex;gap:2px;pointer-events:none;align-items:center}
.tick{height:clamp(7px,1.2svh,9px);border-radius:2px;background:rgba(255,255,255,.25);transition:.25s}
.tick.on{background:#fff;height:clamp(10px,1.8svh,13px)}
input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:clamp(18px,3svh,22px);
  background:none;cursor:ew-resize;position:relative;z-index:2}
input[type=range]::-webkit-slider-runnable-track{height:3px;border-radius:3px;
  background:linear-gradient(to right,#fff var(--fill,0%),rgba(255,255,255,.26) var(--fill,0%))}
input[type=range]::-moz-range-track{height:3px;border-radius:3px;background:rgba(255,255,255,.26)}
input[type=range]::-moz-range-progress{height:3px;border-radius:3px;background:#fff}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:clamp(8px,1.2vw,10px);height:clamp(18px,3svh,22px);
  margin-top:-9px;border-radius:3px;background:#fff;
  box-shadow:0 0 0 1px rgba(0,0,0,.45),0 0 14px rgba(255,255,255,.5)}
input[type=range]::-moz-range-thumb{width:clamp(8px,1.2vw,10px);height:clamp(18px,3svh,22px);
  border:0;border-radius:3px;background:#fff}
.clock{flex:none;min-width:clamp(50px,7vw,86px);text-align:right;font-weight:700;
  font-size:clamp(11px,1.4vw,15px);font-variant-numeric:tabular-nums;text-shadow:0 2px 8px rgba(0,0,0,.8)}
.scenes{display:flex;gap:clamp(3px,.5vw,5px);overflow-x:auto;scrollbar-width:none;padding-bottom:1px}
.scenes::-webkit-scrollbar{display:none}
.scene{flex:1 1 auto;min-width:clamp(50px,8vw,64px);border:1px solid var(--line);border-radius:clamp(6px,1vw,9px);
  background:rgba(255,255,255,.07);color:var(--dim);padding:clamp(3px,.6svh,5px) clamp(5px,.8vw,8px);pointer-events:auto;
  font-size:clamp(7px,.9vw,9px);font-weight:800;letter-spacing:.14em;text-transform:uppercase;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:.2s;backdrop-filter:blur(8px)}
.scene:hover{color:#fff}
.scene.on{color:#fff;box-shadow:0 6px 20px -8px rgba(0,0,0,.9)}

/* ---------- info cards ---------- */
#cards{position:absolute;inset:0;z-index:16;pointer-events:none}
.card{position:absolute;top:50%;transform:translateY(-50%);width:clamp(170px,19vw,264px);pointer-events:auto;
  animation:pop .38s cubic-bezier(.2,.9,.25,1) both}
.card.left{left:var(--safe-l)} .card.right{right:var(--safe-r)}
.card-shell{overflow:hidden;border-radius:clamp(10px,1.6vw,14px);border:1px solid var(--line);
  background:rgba(9,11,15,.82);backdrop-filter:blur(20px);box-shadow:0 24px 60px -20px rgba(0,0,0,.95)}
.card-img{width:100%;height:clamp(80px,14svh,140px);object-fit:cover;display:block}
.card-body{padding:clamp(8px,1.2svh,11px) clamp(9px,1.4vw,13px);text-align:center;min-width:0}
.card-title{margin:0;font-size:clamp(15px,2vw,23px);font-weight:800;line-height:1.1}
.card-sub{color:var(--ember);font-weight:800;font-size:clamp(11px,1.2vw,13px);margin-top:1px}
.card-text{margin:clamp(4px,.6svh,7px) 0 0;color:var(--mut);font-size:clamp(10px,1.1vw,11.5px);line-height:1.4}
.cta{display:block;width:100%;padding:clamp(8px,1.2svh,10px);font-weight:800;font-size:clamp(11px,1.2vw,13px);color:#0b0e12;
  background:rgba(255,255,255,.9);transition:.18s;min-height:var(--tap);display:grid;place-items:center}
.cta:hover{background:#fff}

/* ---------- mode label ---------- */
.mode{position:absolute;left:var(--safe-l);right:var(--safe-r);bottom:calc(var(--bar) + var(--safe-b) + clamp(6px,1.4svh,12px));
  z-index:14;pointer-events:none;animation:pop .4s ease both}
.mode h2{margin:0;font-size:clamp(18px,4.6vw,46px);font-weight:800;text-transform:uppercase;letter-spacing:.02em;
  line-height:1;text-shadow:0 3px 18px rgba(0,0,0,.85)}
.mode h2 span{color:var(--dim)}
.mode .line{margin-top:clamp(5px,.8svh,9px);height:2px;width:min(58%,420px);border-radius:2px;
  background:linear-gradient(to right,rgba(255,255,255,.9),transparent)}

/* ---------- cue bar ---------- */
.cuebar{position:absolute;left:var(--safe-l);right:var(--safe-r);bottom:var(--safe-b);z-index:45;pointer-events:auto;
  display:flex;align-items:center;gap:clamp(4px,.6vw,8px);padding:clamp(5px,.8svh,8px);border-radius:clamp(12px,2vw,18px);
  border:1px solid var(--line);background:var(--glass);backdrop-filter:blur(22px);
  box-shadow:0 20px 55px -22px rgba(0,0,0,.95)}
.cues{flex:1;min-width:0;display:flex;gap:clamp(3px,.5vw,6px);overflow-x:auto;scrollbar-width:none;flex-wrap:nowrap}
.cues::-webkit-scrollbar{display:none}
.cue{display:flex;align-items:center;gap:clamp(5px,.8vw,8px);padding:clamp(6px,1svh,9px) clamp(8px,1.2vw,13px);
  border-radius:clamp(8px,1.2vw,12px);border:1px solid transparent;pointer-events:auto;
  background:rgba(255,255,255,.06);color:var(--mut);font-size:clamp(9px,1.05vw,12px);font-weight:800;
  letter-spacing:.13em;text-transform:uppercase;white-space:nowrap;transition:.18s;min-height:var(--tap)}
.cue .ic{font-size:clamp(13px,1.6vw,16px)}
.cue:hover{background:rgba(255,255,255,.14);color:#fff;transform:translateY(-1px)}
.cue.on{color:#fff}
.empty-cues{padding:clamp(8px,1svh,10px) clamp(10px,1.4vw,14px);color:var(--dim);font-size:clamp(10px,1.1vw,12px)}
.util{flex:none;display:flex;gap:clamp(2px,.4vw,4px);padding-left:clamp(5px,.8vw,8px);
  border-left:1px solid var(--line)}
.ubtn{width:clamp(34px,4vw,42px);height:clamp(34px,4vw,42px);min-width:var(--tap);min-height:var(--tap);pointer-events:auto;
  border-radius:clamp(8px,1.2vw,12px);display:grid;place-items:center;
  color:var(--mut);font-size:clamp(14px,1.8vw,18px);transition:.18s}
.ubtn:hover{background:rgba(255,255,255,.14);color:#fff}
.ubtn.on{background:var(--amber);color:#0a0c10}

/* ---------- dropdown cue groups ---------- */
.groups{position:absolute;left:0;right:0;bottom:calc(var(--bar) + var(--safe-b) + clamp(6px,1svh,10px));height:0;z-index:42}
.group{position:absolute;bottom:0;width:clamp(180px,20vw,246px)}
.group.left{left:var(--safe-l)} .group.right{right:var(--safe-r)}
.gpanel{margin-bottom:clamp(5px,.8svh,9px);padding:clamp(6px,.8svh,9px);border-radius:clamp(14px,2vw,20px);
  border:1px solid var(--line2);background:rgba(12,15,20,.42);backdrop-filter:blur(30px) saturate(140%);pointer-events:auto;
  box-shadow:0 28px 70px -20px rgba(0,0,0,.95);animation:pop .3s cubic-bezier(.2,.9,.25,1) both;
  max-height:min(46svh,340px);overflow-y:auto;scrollbar-width:thin}
.ghead{display:flex;justify-content:space-between;gap:8px;padding:clamp(3px,.4svh,4px) clamp(5px,.8vw,8px) clamp(5px,.6svh,8px);
  font-size:clamp(8px,.9vw,9.5px);font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--dim)}
.subcue{display:flex;align-items:center;gap:clamp(6px,.8vw,9px);width:100%;padding:clamp(7px,1svh,9px);
  border-radius:clamp(10px,1.4vw,13px);color:var(--mut);font-size:clamp(10px,1.1vw,12px);font-weight:700;
  text-align:left;transition:.16s;min-height:var(--tap);pointer-events:auto}
.subcue:hover,.subcue.on{background:rgba(255,255,255,.14);color:#fff}
.sdot{width:clamp(24px,3vw,28px);height:clamp(24px,3vw,28px);flex:none;border-radius:clamp(7px,1vw,9px);
  display:grid;place-items:center;font-size:clamp(12px,1.4vw,15px)}
.slabel{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.gtoggle{display:flex;align-items:center;gap:clamp(6px,.8vw,9px);width:100%;pointer-events:auto;
  padding:clamp(8px,1.2svh,11px) clamp(9px,1.2vw,13px);border-radius:clamp(11px,1.6vw,15px);
  border:1px solid var(--line2);background:rgba(10,13,18,.55);backdrop-filter:blur(20px);color:#fff;
  font-size:clamp(9px,1.05vw,12px);font-weight:800;letter-spacing:.12em;text-transform:uppercase;
  box-shadow:0 14px 38px -16px rgba(0,0,0,.9);transition:.18s;min-height:var(--tap)}
.gtoggle:hover{background:rgba(255,255,255,.16)}
.gtoggle .ic{font-size:clamp(14px,1.6vw,17px)}
.gtoggle b{flex:1;min-width:0;text-align:left;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.chev{transition:transform .28s}
.chev.up{transform:rotate(180deg)}

/* ---------- link pills ---------- */
.link{position:absolute;z-index:40;display:inline-flex;align-items:center;gap:clamp(5px,.7vw,8px);pointer-events:auto;
  padding:clamp(8px,1svh,10px) clamp(10px,1.4vw,16px);border-radius:999px;
  color:#0a0c10;font-size:clamp(9px,1.05vw,12px);font-weight:900;letter-spacing:.1em;text-transform:uppercase;
  text-decoration:none;box-shadow:0 14px 36px -12px rgba(0,0,0,.9);animation:pop .32s ease both;transition:.18s;
  min-height:var(--tap)}
.link:hover{transform:translateY(-2px) scale(1.03)}
.link .ic{font-size:clamp(12px,1.4vw,15px)}
.link.tl{left:var(--safe-l);top:calc(var(--gutter)*5.2)}
.link.tr{right:var(--safe-r);top:calc(var(--gutter)*5.2)}
.link.bl{left:var(--safe-l);bottom:calc(var(--bar) + var(--safe-b) + clamp(56px,8svh,74px))}
.link.br{right:var(--safe-r);bottom:calc(var(--bar) + var(--safe-b) + clamp(56px,8svh,74px))}

/* ---------- glass info panel ---------- */
.info-panel{position:absolute;right:var(--safe-r);bottom:calc(var(--bar) + var(--safe-b) + clamp(6px,1.4svh,12px));z-index:50;
  width:clamp(220px,28vw,344px);max-width:calc(100vw - var(--safe-l) - var(--safe-r));overflow:hidden;border-radius:clamp(14px,2vw,20px);
  border:1px solid var(--line2);background:rgba(255,255,255,.1);backdrop-filter:blur(30px) saturate(150%);
  box-shadow:0 30px 80px -22px rgba(0,0,0,.95);animation:pop .32s ease both}
.info-panel img{width:100%;height:clamp(90px,16svh,158px);object-fit:cover;display:block}
.info-body{padding:clamp(10px,1.6svh,15px) clamp(11px,1.6vw,16px) clamp(12px,1.8svh,17px)}
.info-body h3{margin:0 0 clamp(3px,.5svh,6px);font-size:clamp(13px,1.9vw,21px);font-weight:800}
.info-body p{margin:0;font-size:clamp(11px,1.2vw,13.5px);line-height:1.5;color:rgba(255,255,255,.86)}
.close{position:absolute;right:clamp(6px,.8vw,10px);top:clamp(6px,.8vw,10px);
  width:clamp(26px,3vw,30px);height:clamp(26px,3vw,30px);min-width:var(--tap);min-height:var(--tap);
  border-radius:50%;display:grid;place-items:center;
  background:rgba(0,0,0,.45);color:#fff;font-size:clamp(12px,1.4vw,15px);backdrop-filter:blur(6px)}
.close:hover{background:rgba(0,0,0,.7)}

/* ---------- cue gallery ---------- */
.gback{position:absolute;inset:0;z-index:80;display:grid;place-items:center;touch-action:pan-y;
  background:rgba(0,0,0,.72);backdrop-filter:blur(3px);animation:pop .28s ease both}
.gframe{width:clamp(240px,34vw,430px);max-width:calc(100vw - var(--safe-l) - var(--safe-r));touch-action:pan-y;
  display:flex;flex-direction:column;overflow:hidden;border-radius:clamp(14px,2.2vw,20px);
  border:1px solid var(--line2);background:rgba(6,8,12,.92);backdrop-filter:blur(28px) saturate(150%);
  box-shadow:0 34px 90px -24px rgba(0,0,0,.98)}
.ghead{display:flex;align-items:center;gap:10px;padding:clamp(8px,1.2svh,10px) clamp(10px,1.4vw,14px);
  border-bottom:1px solid var(--line)}
.ghead b{flex:1;min-width:0;font-size:clamp(11px,1.3vw,14px);font-weight:800;letter-spacing:.06em;
  text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ghead b i{font-style:normal;color:var(--dim);font-weight:700}
.gcount{flex:none;font-size:clamp(9px,1vw,10.5px);font-weight:700;color:var(--dim);font-variant-numeric:tabular-nums}
.gclose{width:clamp(26px,3vw,30px);height:clamp(26px,3vw,30px);min-width:var(--tap);min-height:var(--tap);
  border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.1);
  color:rgba(255,255,255,.85);font-size:clamp(12px,1.4vw,15px);transition:.18s}
.gclose:hover{background:rgba(255,255,255,.24);color:#fff}
.gimgwrap{position:relative;overflow:hidden;background:#000}
.gimgwrap img{width:100%;height:clamp(180px,34svh,300px);object-fit:cover;display:block;animation:pop .3s ease both}
.garr{position:absolute;top:50%;transform:translateY(-50%);width:clamp(34px,4vw,42px);height:clamp(34px,4vw,42px);
  min-width:var(--tap);min-height:var(--tap);border-radius:50%;display:grid;place-items:center;
  background:rgba(0,0,0,.55);color:#fff;font-size:clamp(16px,1.8vw,20px);
  box-shadow:0 8px 24px rgba(0,0,0,.5);transition:.18s;touch-action:manipulation}
.garr:hover{background:rgba(0,0,0,.85);transform:translateY(-50%) scale(1.08)}
.gprev{left:clamp(8px,1.2vw,12px)} .gnext{right:clamp(8px,1.2vw,12px)}
.gdots{display:flex;align-items:center;justify-content:center;gap:clamp(4px,.6vw,6px);
  padding:clamp(8px,1.2svh,10px) clamp(10px,1.4vw,14px);border-top:1px solid var(--line)}
.gdot{position:relative;width:clamp(24px,3vw,30px);height:clamp(24px,3vw,30px);display:grid;place-items:center}
.gdot::after{content:'';width:clamp(6px,.8vw,8px);height:clamp(6px,.8vw,8px);border-radius:999px;
  background:rgba(255,255,255,.3);transition:.25s}
.gdot.on::after{width:clamp(20px,2.6vw,28px);background:var(--amber)}
@media(max-width:420px){.gimgwrap img{height:clamp(150px,30svh,210px)}}
@media(max-height:460px) and (orientation:landscape){.gimgwrap img{height:clamp(130px,40svh,170px)}}
@media(hover:none){.garr:hover{transform:translateY(-50%)}}

/* ---------- notice ---------- */
.notice{position:absolute;left:var(--safe-l);top:calc(var(--gutter)*5.2);z-index:20;
  padding:clamp(6px,.8svh,8px) clamp(8px,1.2vw,13px);border-radius:999px;
  background:rgba(0,0,0,.6);border:1px solid rgba(255,178,36,.35);color:var(--amber);
  font-size:clamp(9px,1vw,10.5px);font-weight:700;letter-spacing:.1em}

/* ---------- loader ---------- */
.loader{position:absolute;inset:0;z-index:70;display:grid;place-items:center;background:rgba(0,0,0,.72);pointer-events:none;
  color:var(--dim);font-size:clamp(9px,1.1vw,11px);font-weight:700;letter-spacing:.28em;text-transform:uppercase}
.loader.hide{display:none}

/* ---------- tap to start ---------- */
.tap-start{position:absolute;inset:0;z-index:65;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(8px,1.2svh,14px);background:rgba(0,0,0,.32);pointer-events:none;animation:pop .4s ease both}
.tap-pill{pointer-events:auto;cursor:pointer;touch-action:manipulation;display:flex;flex-direction:column;align-items:center;gap:clamp(8px,1.2svh,14px);
  padding:clamp(14px,2.6svh,24px) clamp(26px,4.6vw,44px);border-radius:clamp(22px,3.2vw,30px);
  background:rgba(8,10,14,.5);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(16px);
  box-shadow:0 24px 60px -20px rgba(0,0,0,.95);transition:transform .18s ease}
.tap-pill:active{transform:scale(.94)}
.tap-ring{width:clamp(58px,10vw,84px);height:clamp(58px,10vw,84px);border-radius:50%;display:grid;place-items:center;background:rgba(255,178,36,.14);border:1.5px solid var(--amber);color:var(--amber);animation:blink 1.15s ease-in-out infinite}
.tap-ring .ic{width:clamp(26px,4.5vw,38px);height:clamp(26px,4.5vw,38px)}
.tap-label{font-size:clamp(10px,1.3vw,13px);font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.6);animation:blink 1.15s ease-in-out infinite}
.tap-hint{font-size:clamp(9px,1.05vw,11px);font-weight:600;color:rgba(255,255,255,.75);letter-spacing:.06em}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.28}}

/* ---------- animations ---------- */
@keyframes pop{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes ring{
  0%{box-shadow:0 0 0 0 rgba(255,178,36,.45)}
  70%{box-shadow:0 0 0 clamp(10px,2svh,18px) rgba(255,178,36,0)}
  100%{box-shadow:0 0 0 0 rgba(255,178,36,0)}
}
.card.left{animation-name:popL}.card.right{animation-name:popR}
@keyframes popL{from{opacity:0;transform:translate(-16px,-50%)}to{opacity:1;transform:translate(0,-50%)}}
@keyframes popR{from{opacity:0;transform:translate(16px,-50%)}to{opacity:1;transform:translate(0,-50%)}}

/* ---------- tablet ---------- */
@media(max-width:1024px){
  .scrubber{max-width:none}
}

/* ---------- small tablet ---------- */
@media(max-width:860px){
  .brand-tag{display:none}
  .mode .line{width:70%}
  :root{--group-slot:clamp(165px,35vw,228px)}
  .group{width:clamp(160px,34vw,220px)}
  .link.bl,.link.br{bottom:calc(var(--bar) + var(--safe-b) + clamp(44px,6svh,60px))}
}


/* ---------- mobile active feedback ---------- */
@media(hover:none){
  .cue:active{transform:scale(.96);filter:brightness(1.2)}
  .ubtn:active{transform:scale(.92);filter:brightness(1.3)}
  .scene:active{transform:scale(.96);filter:brightness(1.2)}
  .subcue:active{transform:scale(.97);filter:brightness(1.2)}
  .gtoggle:active{transform:scale(.97);filter:brightness(1.15)}
  .link:active{transform:scale(.96)}
  .cta:active{filter:brightness(.85)}
  .garr:active{transform:translateY(-50%) scale(.9)}
  .gclose:active{transform:scale(.9)}
  .gdot:active{transform:scale(.85)}
  .close:active{transform:scale(.9)}
  .card .cta:active{filter:brightness(.85)}
}

/* ---------- mobile ---------- */
@media(max-width:640px){

  .top{flex-wrap:wrap;gap:clamp(3px,.5vw,6px);padding:calc(var(--gutter)*.5) var(--safe-r) calc(var(--gutter)*1) var(--safe-l)}
  .brand{order:0;flex:1 1 100%;margin-bottom:clamp(2px,.4svh,4px)} .brand.right{order:0;margin-left:0;margin-bottom:0;flex:0 0 auto}
  .brand-title{font-size:clamp(15px,4vw,21px)}
  .brand-tag{display:block;font-size:clamp(7px,1.6vw,9px);letter-spacing:.16em;margin-top:2px}
  .mark{width:clamp(26px,6.5vw,34px);height:clamp(26px,6.5vw,34px)}
  .scrubber{order:2;flex:1 1 100%;max-width:none;margin:0;gap:clamp(2px,.3svh,3px)}
  .scrub-row{gap:clamp(3px,.6vw,6px)}
  .sun{font-size:clamp(11px,2.4vw,15px)}
  .clock{min-width:clamp(40px,10vw,52px);font-size:clamp(10px,2.4vw,13px)}
  .scenes{gap:clamp(4px,.6vw,6px)}
  .scene{min-width:clamp(40px,11vw,52px);font-size:clamp(8px,2.2vw,10px);padding:clamp(4px,.7svh,6px) clamp(5px,1.1vw,7px);letter-spacing:.07em;border-radius:clamp(5px,1.2vw,8px)}
  #cards{display:flex;flex-direction:column;justify-content:flex-end;gap:clamp(3px,.5svh,6px);
    padding:0 var(--safe-r) calc(var(--bar) + var(--safe-b) + clamp(6px,1svh,10px)) var(--safe-l)}
  .card{position:static;transform:none;width:auto;animation-name:pop}
  .card-shell{display:flex;align-items:stretch}
  .card-img{width:clamp(44px,12vw,56px);height:auto;min-height:clamp(34px,7svh,44px);flex:none}
  .card-body{flex:1;text-align:left;padding:clamp(5px,.7svh,7px) clamp(6px,.8vw,8px);
    display:flex;flex-direction:column;justify-content:center}
  .card-title{font-size:clamp(11px,2.8vw,14px)}
  .card-text{display:none}
  .cta{width:auto;display:grid;place-items:center;padding:0 clamp(7px,1.6vw,10px);flex:none;font-size:clamp(9px,2vw,11px);min-height:var(--tap)}
  .cue .lbl{display:inline}
  .cue{padding:clamp(5px,1svh,8px) clamp(6px,1.8vw,10px);font-size:clamp(9px,2.4vw,12px);gap:clamp(3px,.7vw,6px);flex:0 0 auto;justify-content:center;min-width:0}
  .cue .ic{font-size:clamp(12px,3.2vw,16px)}
  .cuebar{padding:clamp(5px,1svh,8px);gap:clamp(3px,.6vw,5px);border-radius:clamp(8px,2vw,12px)}
  .ubtn{width:clamp(32px,8vw,40px);height:clamp(32px,8vw,40px);font-size:clamp(13px,3.2vw,16px)}
  .mode h2{font-size:clamp(14px,4vw,19px)}
  .mode .line{width:60%}
  .mode{bottom:calc(var(--bar) + var(--safe-b) + clamp(4px,1svh,8px))}
  .gtoggle{width:100%;font-size:clamp(8px,2.2vw,11px);padding:clamp(6px,1svh,9px) clamp(7px,1.5vw,11px);border-radius:clamp(7px,1.8vw,11px)}
  .group{width:min(60vw,210px)}
  .link.bl,.link.br{bottom:calc(var(--bar) + var(--safe-b) + clamp(55px,9svh,75px))}
  .link{padding:clamp(3px,.5svh,5px) clamp(5px,1.1vw,7px);font-size:clamp(7px,1.5vw,8px);gap:clamp(2px,.3vw,3px)}
  .info-panel{left:var(--safe-l);right:var(--safe-r);width:auto}
  .info-panel img{height:clamp(44px,8svh,64px)}
  .info-body{padding:clamp(4px,.7svh,7px)}
  .info-body h3{font-size:clamp(11px,2.6vw,14px)}
  .info-body p{font-size:clamp(9px,2vw,11px)}
  .groups{bottom:calc(var(--bar) + var(--safe-b) + clamp(3px,.6svh,5px))}
  :root{--group-slot:min(52vw,198px)}
  .group{width:min(50vw,190px)}
  .gtoggle{padding:clamp(5px,.8svh,7px) clamp(6px,1.3vw,9px);font-size:clamp(7px,1.8vw,9px);border-radius:clamp(6px,1.5vw,9px)}
  .gpanel{padding:clamp(3px,.5svh,5px);border-radius:clamp(8px,1.8vw,12px)}
  .subcue{padding:clamp(3px,.5svh,5px);font-size:clamp(8px,2vw,10px)}
  .sdot{width:clamp(16px,4vw,20px);height:clamp(16px,4vw,20px);font-size:clamp(8px,2vw,11px)}
  .ghead{padding:clamp(2px,.3svh,3px) clamp(4px,.8vw,6px) clamp(3px,.5svh,5px);font-size:clamp(7px,.9vw,9px)}
}

/* ---------- small mobile ---------- */
@media(max-width:420px){
  .brand-title{font-size:clamp(14px,3.8vw,20px)}
  .brand-tag{display:block;font-size:clamp(7px,1.5vw,9px);letter-spacing:.14em;margin-top:2px}
  .mark{width:clamp(24px,6vw,30px);height:clamp(24px,6vw,30px)}
  .scrub-row{gap:clamp(3px,.6vw,6px)}
  .clock{min-width:clamp(36px,9vw,44px);font-size:clamp(9px,2.2vw,11px)}
  .scene{min-width:clamp(36px,10vw,48px);font-size:clamp(7px,2vw,9px);letter-spacing:.06em;padding:clamp(3px,.5svh,5px) clamp(4px,.8vw,6px)}
  .cuebar{padding:clamp(6px,1svh,9px);gap:clamp(3px,.6vw,6px)}
  .cue{padding:clamp(5px,.9svh,8px) clamp(6px,1.6vw,10px);font-size:clamp(9px,2.2vw,11px);gap:clamp(3px,.6vw,5px);flex:0 0 auto;justify-content:center}
  .ubtn{width:clamp(30px,7.5vw,38px);height:clamp(30px,7.5vw,38px);font-size:clamp(12px,3vw,15px)}
  .mode h2{font-size:clamp(13px,3.5vw,17px)}
  .gtoggle{width:100%;font-size:clamp(8px,2vw,10px);padding:clamp(5px,.9svh,8px) clamp(7px,1.5vw,10px);border-radius:clamp(8px,1.8vw,10px)}
  .gpanel{padding:clamp(2px,.3svh,3px);border-radius:clamp(7px,1.6vw,10px)}
  .subcue{padding:clamp(3px,.5svh,5px);font-size:clamp(7px,1.8vw,9px)}
  .sdot{width:clamp(16px,4vw,20px);height:clamp(16px,4vw,20px);font-size:clamp(8px,2vw,11px)}
  .ghead{font-size:clamp(7px,.8vw,9px)}
  :root{--group-slot:min(42vw,148px)}
  .group{width:min(40vw,140px)}
  .link{padding:clamp(3px,.5svh,5px) clamp(5px,1vw,8px);font-size:clamp(6px,1.6vw,8px)}
  .card-img{width:clamp(44px,13vw,56px);min-height:clamp(34px,7svh,44px)}
  .card-title{font-size:clamp(10px,2.8vw,13px)}
  .info-panel img{height:clamp(44px,9svh,60px)}
  .info-body h3{font-size:clamp(10px,2.2vw,12px)}
  .info-body p{font-size:clamp(8px,1.8vw,10px)}
  .info-body{padding:clamp(4px,.6svh,6px)}
  .gback{background:rgba(0,0,0,.85)}
  .gframe{border-radius:clamp(8px,2vw,14px)}
  .gimgwrap img{height:clamp(110px,22svh,150px)}
  .ghead{padding:clamp(4px,.6svh,6px) clamp(6px,1.2vw,10px)}
  .gdots{padding:clamp(4px,.6svh,6px)}
}

/* ---------- landscape phone ---------- */
@media(max-height:460px) and (orientation:landscape){
  .top{display:none}
  .card-img{height:clamp(40px,8svh,52px)}
  .mode h2{font-size:clamp(14px,3.5svh,18px)}
  .mode{bottom:calc(var(--bar) + var(--safe-b) + 2px)}
  .cuebar{padding:clamp(2px,.4svh,4px);gap:clamp(2px,.3vw,4px)}
  .cue{padding:clamp(3px,.5svh,5px) clamp(4px,.8vw,6px);font-size:clamp(7px,1.5svh,9px)}
  .ubtn{width:clamp(24px,5svh,30px);height:clamp(24px,5svh,30px);font-size:clamp(10px,2svh,14px)}
  .scene{min-width:clamp(32px,7vw,44px);font-size:clamp(6px,1.4svh,8px)}
  .groups{bottom:calc(var(--bar) + var(--safe-b) + 2px)}
  :root{--group-slot:min(32vw,168px)}
  .group{width:min(30vw,160px)}
  .gtoggle{padding:clamp(3px,.5svh,5px) clamp(4px,.8vw,6px);font-size:clamp(6px,1.4svh,8px)}
  .subcue{padding:clamp(3px,.5svh,4px);font-size:clamp(7px,1.5svh,9px)}
  .link.bl,.link.br{bottom:calc(var(--bar) + var(--safe-b) + clamp(40px,8svh,56px))}
}

/* ---------- touch devices ---------- */
@media(hover:none){
  .cue:hover,.link:hover,.gtoggle:hover{transform:none}
  .cue,.link,.gtoggle,.subcue,.cta,.ubtn,.close{min-height:var(--tap);min-width:var(--tap)}
  input[type=range]::-webkit-slider-thumb{width:14px;height:28px;margin-top:-12px}
  input[type=range]::-moz-range-thumb{width:14px;height:28px}
}

/* ---------- very short screens ---------- */
@media(max-height:380px){
  .top{display:none}
  .mode{bottom:calc(var(--bar) + var(--safe-b) + 4px)}
  .mode h2{font-size:16px}
  .groups{display:none}
}
`;

const RUNTIME = `
var PROJECT=__PROJECT__;
var $=function(s){return document.querySelector(s)};
var video=$('#video'),range=$('#range'),ticks=$('#ticks'),scenesEl=$('#scenes'),cardsEl=$('#cards'),
    linksEl=$('#links'),cuesEl=$('#cues'),groupsEl=$('#groups'),modeEl=$('#mode'),
    infoEl=$('#infoPanel'),wrap=$('#videoWrap'),clockEl=$('#clock'),stage=$('#stage'),loader=$('#loader'),
    utilEl=$('#util'),tapStart=$('#tapStart'),tapRing=$('#tapRing');
var duration=0,segEnd=null,activeId=null,openGroup=null,infoOpen=false,
    rot=(PROJECT.display&&[0,90,180,270].indexOf(Number(PROJECT.display.rotation))>=0?Number(PROJECT.display.rotation):0),
    wasPlaying=false,playIntent=false,
    sceneIdx=0,lastWheel=0,swipeX=null,lastHtml={},lastCueId=null,galleryId=null,gIdx=0,gSwipe=null,tapDismissed=false,scrubbing=false,
    frameRate=([30,40,50,60].indexOf(Number(PROJECT.slider&&PROJECT.slider.fps))>=0?Number(PROJECT.slider.fps):30);

var P={
 walk:'<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"></path><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"></path><path d="M16 17h4"></path><path d="M4 13h4"></path>',
 bird:'<path d="M16 7h.01"></path><path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"></path><path d="m20 7 2 .5-2 .5"></path><path d="M10 18v3"></path><path d="M14 17.75V21"></path><path d="M7 18a6 6 0 0 0 3.84-10.61"></path>',
 satellite:'<path d="m13.5 6.5-3.148-3.148a1.205 1.205 0 0 0-1.704 0L6.352 5.648a1.205 1.205 0 0 0 0 1.704L9.5 10.5"></path><path d="M16.5 7.5 19 5"></path><path d="m17.5 10.5 3.148 3.148a1.205 1.205 0 0 1 0 1.704l-2.296 2.296a1.205 1.205 0 0 1-1.704 0L13.5 14.5"></path><path d="M9 21a6 6 0 0 0-6-6"></path><path d="M9.352 10.648a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l4.296-4.296a1.205 1.205 0 0 0 0-1.704l-2.296-2.296a1.205 1.205 0 0 0-1.704 0z"></path>',
 units:'<path d="M10 12h4"></path><path d="M10 8h4"></path><path d="M14 21v-3a2 2 0 0 0-4 0v3"></path><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"></path><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"></path>',
 gallery:'<path d="m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16"></path><path d="M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2"></path><circle cx="13" cy="7" r="1" fill="currentColor"></circle><rect x="8" y="2" width="14" height="14" rx="2"></rect>',
 play:'<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path>',
 home:'<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>',
 map:'<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"></path><path d="M15 5.764v15"></path><path d="M9 3.236v15"></path>',
 camera:'<path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"></path><circle cx="12" cy="13" r="3"></circle>',
 compass:'<circle cx="12" cy="12" r="10"></circle><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"></path>',
 layers:'<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"></path><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"></path><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"></path>',
 hex:'<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>',
 tree:'<path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"></path><path d="M12 22v-3"></path>',
 car:'<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><path d="M9 17h6"></path><circle cx="17" cy="17" r="2"></circle>',
 sun:'<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>',
 star:'<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>',
 eye:'<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path><circle cx="12" cy="12" r="3"></circle>',
 vol:'<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"></path><path d="M16 9a5 5 0 0 1 0 6"></path><path d="M19.364 18.364a9 9 0 0 0 0-12.728"></path>',
 mute:'<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"></path><line x1="22" x2="16" y1="9" y2="15"></line><line x1="16" x2="22" y1="9" y2="15"></line>',
 info:'<circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path>',
 rotate:'<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path>',
 reset:'<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path>',
 full:'<path d="M8 3H5a2 2 0 0 0-2 2v3"></path><path d="M21 8V5a2 2 0 0 0-2-2h-3"></path><path d="M3 16v3a2 2 0 0 0 2 2h3"></path><path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>',
 exitfull:'<path d="M8 3v3a2 2 0 0 1-2 2H3"></path><path d="M21 8h-3a2 2 0 0 1-2-2V3"></path><path d="M3 16h3a2 2 0 0 1 2 2v3"></path><path d="M16 21v-3a2 2 0 0 1 2-2h3"></path>',
 tap:'<path d="M12 17v4"></path><path d="M10 21h4"></path><path d="M18 11V6a2 2 0 0 0-4 0v3"></path><path d="M14 10V5a2 2 0 0 0-4 0v6"></path><path d="M10 10.5V7a2 2 0 0 0-4 0v9"></path><path d="M18 11a2 2 0 1 1 4 0v5a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path>',  ext:'<path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>',
 chev:'<path d="m6 9 6 6 6-6"></path>',
 chevl:'<path d="m15 18-6-6 6-6"></path>',
 chevr:'<path d="m9 18 6-6-6-6"></path>',
 close:'<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>',
 whatsapp:'<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>',
 telegram:'<path d="M22 2L11 13"></path><path d="M22 2l-7 20-4-9-9-4 20-7z"></path>',
 email:'<rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>',
 chat:'<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"></path>',
 contact:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
 location:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle>'
};
function icon(n,cls){return '<svg class="ic '+(cls||'')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+(P[n]||P.play)+'</svg>'}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function attr(v){return esc(v).replace(new RegExp(String.fromCharCode(96),'g'),'&#96;')}
function fmt(t){t=Math.max(0,Math.floor(t||0));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')}
function setHtml(el,key,html){if(lastHtml[key]!==html){lastHtml[key]=html;el.innerHTML=html}}
function clock(r){var s=PROJECT.slider,h=s.clockFrom+Math.max(0,Math.min(1,r))*(s.clockTo-s.clockFrom);
  var hr=Math.floor(h),m=Math.round((h-hr)*60);if(m===60){hr++;m=0}
  var ap=hr>=12&&hr<24?'PM':'AM',h12=hr%12===0?12:hr%12;
  return m<5?h12+' '+ap:h12+':'+String(m).padStart(2,'0')+' '+ap}
function limits(){var s=PROJECT.slider,d=duration||s.limitEnd||1;
  return s.limitEnabled?{min:s.limitStart,max:Math.min(s.limitEnd,d)}:{min:0,max:Math.max(d,.01)}}
function spans(){var s=PROJECT.slider||{};if(!s.sceneMode)return{list:[],total:0};
  var acc=0,list=[];(s.scenes||[]).forEach(function(x){if(x.end>x.start){list.push({s:x,off:acc,dur:x.end-x.start});acc+=x.end-x.start}});
  return{list:list,total:acc}}
function sceneAt(t,sp){for(var i=0;i<sp.list.length;i++){if(t>=sp.list[i].s.start&&t<=sp.list[i].s.end)return i}return -1}
function toVirtual(t,sp){var i=sceneAt(t,sp);if(i>=0)return sp.list[i].off+(t-sp.list[i].s.start);
  var f=Math.min(sceneIdx,sp.list.length-1);return f>=0?sp.list[f].off:0}
function toActual(v,sp){for(var i=0;i<sp.list.length;i++){var x=sp.list[i];if(v>=x.off&&v<=x.off+x.dur)return x.s.start+(v-x.off)}
  return sp.list.length?sp.list[sp.list.length-1].s.end:0}
function allCues(){var g=(PROJECT.cueGroups||[]).reduce(function(a,x){return a.concat(x.subCues||[])},[]);return (PROJECT.buttons||[]).concat(g)}
function playSegment(a,b){segEnd=b;video.currentTime=Math.max(0,a||0);var p=video.play();if(p&&p.catch)p.catch(function(){})}
function startAssigned(){var sp=spans(),l=limits();if(sp.list.length)playSegment(sp.list[0].s.start,sp.list[0].s.end);else{video.currentTime=l.min;var p=video.play();if(p&&p.catch)p.catch(function(){})}}
function gotoScene(i,play){var sp=spans();if(!sp.list.length)return;
  var n=Math.max(0,Math.min(sp.list.length-1,i));sceneIdx=n;
  if(play!==false)playSegment(sp.list[n].s.start,sp.list[n].s.end);else video.currentTime=sp.list[n].s.start}
function showGallery(id){var c=allCues().filter(function(x){return x.id===id})[0];
  var imgs=c&&(c.gallery||[]).filter(function(s){return s&&s.trim()});
  if(c&&imgs.length){galleryId=id;gIdx=0;render()}lastCueId=null}
function gstep(d){var c=galleryId&&allCues().filter(function(x){return x.id===galleryId})[0];
  var n=c?(c.gallery||[]).filter(function(s){return s&&s.trim()}).length:0;
  if(!n)return;gIdx=(gIdx+d+n)%n;render()}

function renderBrand(){var l=PROJECT.logo||{},b=$('#brand');
  b.className='brand'+(l.position==='top-right'?' right':'');
  b.style.opacity=(l.opacity==null?100:l.opacity)/100;
  b.style.transform='scale('+((l.size||100)/100)+')';
  b.innerHTML=(l.mode==='image'&&l.image)
    ?'<img class="logo-img" src="'+attr(l.image)+'" alt="logo">'
    :'<span class="mark">'+icon('hex')+'<span class="mark-inner">'+icon('hex')+'</span></span><span style="min-width:0"><span class="brand-title">'+esc(l.text||'Logo')+'</span>'+(l.tagline?'<span class="brand-tag">'+esc(l.tagline)+'</span>':'')+'</span>'}

function renderUtil(){
  setHtml(utilEl,'util',
    '<button class="ubtn'+(infoOpen?' on':'')+'" id="info" title="Info (I)" aria-label="Info">'+icon('info')+'</button>'+
    '<button class="ubtn" id="rotate" title="Rotate screen (R)" aria-label="Rotate">'+icon('rotate')+'</button>'+
    '<button class="ubtn" id="reset" title="Reset (0)" aria-label="Reset">'+icon('reset')+'</button>'+
    '<button class="ubtn" id="full" title="Fullscreen (F)" aria-label="Fullscreen">'+icon(document.fullscreenElement?'exitfull':'full')+'</button>')}

function render(){
  // crash guard: if any required element is missing (e.g. stale/partial export),
  // skip this frame instead of throwing inside the 60fps loop.
  if(!video||!range||!clockEl||!ticks||!scenesEl||!cuesEl)return;
  var t=video.currentTime||0,l=limits(),sp=spans(),useS=sp.list.length>0;
  var cur=useS?sceneAt(t,sp):-1, act=cur>=0?cur:Math.min(sceneIdx,sp.list.length-1);
  var rmin=useS?0:l.min, rmax=useS?sp.total:l.max, rval=useS?toVirtual(t,sp):Math.max(l.min,Math.min(l.max,t));

  $('#scrubber').style.display=PROJECT.slider.enabled?'flex':'none';
  range.min=rmin;range.max=rmax;range.step=1/frameRate;
  // while the user is dragging, never overwrite range.value/fill/clock from the
  // playback clock - the seek is async in real browsers, so writing here every
  // rAF yanks the thumb back and kills the drag on touch devices.
  if(!scrubbing){range.value=rval;range.style.setProperty('--fill',(rmax>rmin?((rval-rmin)/(rmax-rmin))*100:0)+'%');
    clockEl.textContent=PROJECT.slider.labelMode==='clock'?clock(rmax>rmin?(rval-rmin)/(rmax-rmin):0):fmt(t)}

  setHtml(ticks,'ticks',useS?sp.list.map(function(x,i){
    return '<span class="tick'+(i===act?' on':'')+'" style="flex:'+x.dur+';background:'+(i===act?attr(x.s.color):'rgba(255,255,255,.25)')+'"></span>'}).join(''):'');
  scenesEl.style.display=useS?'flex':'none';
  setHtml(scenesEl,'scenes',useS?sp.list.map(function(x,i){
    return '<button class="scene'+(i===act?' on':'')+'" data-scene="'+i+'" style="flex:'+x.dur+';'+
      (i===act?'background:'+attr(x.s.color)+'2e;border-color:'+attr(x.s.color):'')+'">'+esc(x.s.label)+'</button>'}).join(''):'');


  setHtml(cardsEl,'cards',(PROJECT.cards||[]).filter(function(c){return t>=c.start&&t<=c.end}).map(function(c){
    return '<div class="card '+c.side+'"><div class="card-shell">'+
      (c.image?'<img class="card-img" src="'+attr(c.image)+'" alt="">':'')+
      '<div class="card-body"><h3 class="card-title" style="color:'+attr(c.accent)+'">'+esc(c.title)+'</h3>'+
      (c.subtitle?'<div class="card-sub">'+esc(c.subtitle)+'</div>':'')+
      (c.body?'<p class="card-text">'+esc(c.body)+'</p>':'')+'</div>'+
      '<button class="cta" data-card="'+attr(c.id)+'">'+esc(c.cta||'Explore')+'</button></div></div>'}).join(''));

  setHtml(linksEl,'links',(PROJECT.links||[]).filter(function(x){return t>=x.start&&t<=x.end}).map(function(x){
    var pos={'top-left':'tl','top-right':'tr','bottom-left':'bl','bottom-right':'br'}[x.corner]||'bl';
    var linkIcon=(x.icon&&P[x.icon])?x.icon:'ext';
    return '<a class="link '+pos+'" href="'+attr(x.url)+'" target="_blank" rel="noopener" style="background:'+attr(x.color)+'">'+
      icon(linkIcon)+esc(x.label)+'</a>'}).join(''));

  var active=allCues().filter(function(x){return x.id===activeId})[0];
  setHtml(modeEl,'mode',active?'<h2>'+esc(active.label)+' <span>mode</span></h2><div class="line"></div>':'');

  setHtml(cuesEl,'cues',(PROJECT.buttons||[]).length
    ?(PROJECT.buttons).map(function(c){var on=c.id===activeId;
      return '<button class="cue'+(on?' on':'')+'" data-cue="'+attr(c.id)+'" style="'+
        (on?'background:'+attr(c.color)+'26;border-color:'+attr(c.color):'')+'">'+
        '<span style="color:'+attr(c.color)+';display:flex">'+icon(c.icon)+'</span><span class="lbl">'+esc(c.label)+'</span></button>'}).join('')
    :'<span class="empty-cues">No cue buttons in this project.</span>');

  setHtml(groupsEl,'groups',(PROJECT.cueGroups||[]).map(function(g){
    var open=openGroup===g.id;
    return '<div class="group '+g.side+'">'+
      (open?'<div class="gpanel"><div class="ghead"><span>'+esc(g.label)+'</span><span>choose scene</span></div>'+
        (g.subCues||[]).map(function(s){
          return '<button class="subcue'+(s.id===activeId?' on':'')+'" data-sub="'+attr(s.id)+'">'+
            '<span class="sdot" style="background:'+attr(s.color)+'2e;color:'+attr(s.color)+'">'+icon(s.icon)+'</span>'+
            '<span class="slabel">'+esc(s.label)+'</span><span class="stime">'+fmt(s.start)+'</span></button>'}).join('')+
        '</div>':'')+
      '<button class="gtoggle" data-group="'+attr(g.id)+'" style="border-color:'+attr(g.color)+'88'+(open?';background:'+attr(g.color)+'26':'')+'">'+
      '<span style="color:'+attr(g.color)+';display:flex">'+icon(g.icon)+'</span><b>'+esc(g.label)+'</b>'+
      '<span class="chev'+(open?' up':'')+'" style="display:flex;color:'+attr(g.color)+'">'+icon('chev')+'</span></button></div>'}).join(''));

  setHtml(infoEl,'info',infoOpen
    ?'<div class="info-panel">'+(PROJECT.info&&PROJECT.info.image?'<img src="'+attr(PROJECT.info.image)+'" alt="">':'')+
     '<button class="close" data-close-info aria-label="Close">'+icon('close')+'</button>'+
     '<div class="info-body"><h3>'+esc((PROJECT.info&&PROJECT.info.title)||'Info')+'</h3>'+
     '<p>'+esc((PROJECT.info&&PROJECT.info.body)||'')+'</p></div></div>'
    :'');

  var gc=galleryId&&allCues().filter(function(x){return x.id===galleryId})[0];
  var gimgs=gc&&(gc.gallery||[]).filter(function(s){return s&&s.trim()});
  setHtml($('#gallery'),'gallery',gc&&gimgs.length
    ?'<div class="gback"><div class="gframe">'
      +'<div class="ghead"><b>'+esc(gc.label)+' <i>gallery</i></b><span class="gcount">'+(gIdx+1)+' / '+gimgs.length+'</span>'
      +'<button class="gclose" data-gclose aria-label="Close gallery">'+icon('close')+'</button></div>'
      +'<div class="gimgwrap"><img src="'+attr(gimgs[Math.min(gIdx,gimgs.length-1)])+'" alt="" draggable="false">'
      +(gimgs.length>1?'<button class="garr gprev" data-gprev aria-label="Previous image">'+icon('chevl')+'</button><button class="garr gnext" data-gnext aria-label="Next image">'+icon('chevr')+'</button>':'')+'</div>'
      +(gimgs.length>1?'<div class="gdots">'+gimgs.map(function(_,i){return '<button class="gdot'+(i===gIdx?' on':'')+'" data-gdot="'+i+'" aria-label="Image '+(i+1)+'"></button>'}).join('')+'</div>':'')+'</div></div>':'');
}

function tick(){
  if(segEnd!=null&&!video.paused&&video.currentTime>=segEnd-.03){video.pause();showGallery(lastCueId);segEnd=null}
  var l=limits();
  if(PROJECT.slider.limitEnabled&&!video.paused&&video.currentTime>=l.max-.03)video.pause();
  render();requestAnimationFrame(tick)}

function applyRotation(){var odd=rot===90||rot===270;
  var sc=odd?Math.max(innerWidth/innerHeight,innerHeight/innerWidth):1;
  wrap.style.transform='rotate('+rot+'deg) scale('+sc+')'}

function resetAll(){var sp=spans(),l=limits();
  video.pause();segEnd=null;activeId=null;openGroup=null;infoOpen=false;sceneIdx=0;rot=0;lastCueId=null;galleryId=null;
  video.muted=false;applyRotation();
  video.currentTime=sp.list.length?sp.list[0].s.start:l.min;
  renderUtil();render()}

renderBrand();renderUtil();applyRotation();


video.addEventListener('loadedmetadata',function(){duration=video.duration||0;render();
  // Always show the tap-to-start overlay once the video is ready, regardless of
  // the autoPlay flag, so the experience can never be stuck paused with no way
  // to start. One tap anywhere dismisses it and plays the assigned part.
  if(tapStart&&!tapDismissed){tapRing.innerHTML=icon('tap');tapStart.style.display='flex'}});
video.addEventListener('loadeddata',function(){loader.classList.add('hide')});
video.addEventListener('error',function(){loader.textContent='Video could not load';loader.classList.remove('hide')});
video.addEventListener('ended',function(){showGallery(lastCueId);segEnd=null});

range.addEventListener('pointerdown',function(){wasPlaying=!video.paused;video.pause();scrubbing=true});
range.addEventListener('input',function(){var sp=spans();
  video.currentTime=sp.list.length?toActual(Number(range.value),sp):Number(range.value)});
function resumeScrub(){scrubbing=false;if(wasPlaying){var p=video.play();if(p&&p.catch)p.catch(function(){})}wasPlaying=false;render()}
range.addEventListener('pointerup',resumeScrub);
range.addEventListener('pointercancel',resumeScrub);
range.addEventListener('lostpointercapture',resumeScrub);

$('#scrubber').addEventListener('wheel',function(e){var sp=spans();if(!sp.list.length)return;
  var now=Date.now();if(now-lastWheel<320)return;
  var d=Math.abs(e.deltaY)>=Math.abs(e.deltaX)?e.deltaY:e.deltaX;if(Math.abs(d)<2)return;
  lastWheel=now;var cur=sceneAt(video.currentTime||0,sp);gotoScene((cur>=0?cur:sceneIdx)+(d>0?1:-1))},{passive:true});
$('#scrubber').addEventListener('touchstart',function(e){swipeX=e.touches[0].clientX},{passive:true});
$('#scrubber').addEventListener('touchend',function(e){var sp=spans();
  if(swipeX==null||!sp.list.length)return;
  var dx=e.changedTouches[0].clientX-swipeX;swipeX=null;
  if(Math.abs(dx)<45)return;
  var cur=sceneAt(video.currentTime||0,sp);gotoScene((cur>=0?cur:sceneIdx)+(dx<0?1:-1))},{passive:true});


var galleryEl=$('#gallery');
galleryEl.addEventListener('touchstart',function(e){gSwipe=e.touches[0].clientX},{passive:true});
galleryEl.addEventListener('touchend',function(e){if(gSwipe==null)return;
  var dx=e.changedTouches[0].clientX-gSwipe;gSwipe=null;
  if(galleryId&&Math.abs(dx)>40)gstep(dx<0?1:-1)},{passive:true});
galleryEl.addEventListener('click',function(e){if(e.target.closest('.gframe'))return;galleryId=null;render()});

document.addEventListener('click',function(e){
  var cue=e.target.closest('[data-cue]');
  if(cue){var c=(PROJECT.buttons||[]).filter(function(x){return x.id===cue.dataset.cue})[0];
    if(c){activeId=c.id;lastCueId=c.id;galleryId=null;playSegment(c.start,c.end)}}
  var sub=e.target.closest('[data-sub]');
  if(sub){var s=allCues().filter(function(x){return x.id===sub.dataset.sub})[0];
    if(s){activeId=s.id;openGroup=null;lastCueId=s.id;galleryId=null;playSegment(s.start,s.end)}}
  var grp=e.target.closest('[data-group]');
  if(grp){openGroup=openGroup===grp.dataset.group?null:grp.dataset.group;render()}
  var sc=e.target.closest('[data-scene]');
  if(sc){lastCueId=null;galleryId=null;gotoScene(Number(sc.dataset.scene))}
  var card=e.target.closest('[data-card]');
  if(card){var cc=(PROJECT.cards||[]).filter(function(x){return x.id===card.dataset.card})[0];
    if(cc){lastCueId=null;galleryId=null;playSegment(cc.start,cc.end)}}
  if(e.target.closest('#tapStart')){tapDismissed=true;tapStart.style.display='none';startAssigned()}
  if(e.target.closest('#info')){infoOpen=!infoOpen;renderUtil();render()}
  if(e.target.closest('[data-close-info]')){infoOpen=false;renderUtil();render()}
  if(e.target.closest('#rotate')){rot=(rot+90)%360;applyRotation()}
  if(e.target.closest('#reset')){resetAll()}
  if(e.target.closest('#full')){if(document.fullscreenElement)document.exitFullscreen();
    else if(stage.requestFullscreen)stage.requestFullscreen()}
  if(e.target.closest('[data-gclose]')){galleryId=null;render()}
  if(e.target.closest('[data-gprev]')){gstep(-1)}
  if(e.target.closest('[data-gnext]')){gstep(1)}
  if(e.target.closest('[data-gdot]')){var gc=galleryId&&allCues().filter(function(x){return x.id===galleryId})[0];
    var gn=gc?(gc.gallery||[]).filter(function(s){return s&&s.trim()}).length:0;
    if(gn){gIdx=Math.max(0,Math.min(gn-1,Number(e.target.closest('[data-gdot]').dataset.gdot)));render()}}
});

// First interaction anywhere dismisses the tap overlay, but the tap is NEVER
// swallowed: if it lands on a control (cue, dropdown, scrubber, link...), that
// control handles it and plays its own scene; only empty-stage taps auto-play.
stage.addEventListener('pointerdown',function(e){
  if(!(tapStart&&tapStart.style.display!=='none'&&!tapDismissed))return;
  tapDismissed=true;tapStart.style.display='none';
  if(!(e.target&&e.target.closest&&e.target.closest('button,input,select,textarea,a,[role="button"]')))startAssigned();
},true);

document.addEventListener('fullscreenchange',renderUtil);
// resize/orientation handled by device detection above

addEventListener('keydown',function(e){
  var k=e.key.toLowerCase();
  if(e.code==='Space'){e.preventDefault();
    if(video.paused){var p=video.play();if(p&&p.catch)p.catch(function(){})}else video.pause()}
  else if(e.key==='ArrowRight'){e.preventDefault();video.pause();segEnd=null;video.currentTime+=1/frameRate}
  else if(e.key==='ArrowLeft'){e.preventDefault();video.pause();segEnd=null;video.currentTime-=1/frameRate}
  else if(k==='i'){infoOpen=!infoOpen;renderUtil();render()}
  else if(k==='r'){rot=(rot+90)%360;applyRotation()}
  else if(k==='0'){resetAll()}
  else if(k==='f'){if(document.fullscreenElement)document.exitFullscreen();else if(stage.requestFullscreen)stage.requestFullscreen()}
  else if(e.key==='Escape'){openGroup=null;infoOpen=false;galleryId=null;renderUtil();render()}
});


// ---- device detection & dynamic scaling ----
(function(){
  var html=document.documentElement;
  var stage=document.getElementById('stage');
  function detect(){
    var w=window.innerWidth||document.documentElement.clientWidth;
    var h=window.innerHeight||document.documentElement.clientHeight;
    var shortSide=Math.min(w,h);
    var dpr=window.devicePixelRatio||1;
    var dev;
    if(shortSide<380) dev='phone-sm';
    else if(shortSide<480) dev='phone';
    else if(shortSide<768) dev='phablet';
    else if(shortSide<1024) dev='tablet';
    else dev='desktop';
    html.setAttribute('data-device',dev);
    html.setAttribute('data-w',w);
    html.setAttribute('data-h',h);
    html.setAttribute('data-dpr',dpr);
    // Dynamic CSS custom property for viewport scaling
    html.style.setProperty('--vw',w+'px');
    html.style.setProperty('--vh',h+'px');
    html.style.setProperty('--short',Math.min(w,h)+'px');
    html.style.setProperty('--scale',Math.min(1,w/414).toFixed(4));
  }
  detect();
  // ResizeObserver for dynamic viewport (address bar hide/show on mobile)
  if(typeof ResizeObserver!=='undefined'&&stage){
    var ro=new ResizeObserver(function(){detect()});
    ro.observe(stage);
  }
  window.addEventListener('resize',function(){detect();applyRotation()});
  window.addEventListener('orientationchange',function(){setTimeout(function(){detect();applyRotation()},220)});
  // matchMedia listeners for breakpoint changes
  var mqs=[
    {q:'(max-width:420px)',v:'phone-sm'},
    {q:'(max-width:640px)',v:'phone'},
    {q:'(max-width:768px)',v:'phablet'},
    {q:'(min-width:769px)',v:'desktop'}
  ];
  mqs.forEach(function(m){
    var mq=window.matchMedia(m.q);
    if(mq.addEventListener){mq.addEventListener('change',detect)}
    else if(mq.addListener){mq.addListener(detect)}
  });
})();

tick();
`;

export function makeStandaloneHtml(project: Project, videoMode: VideoMode) {
  const title = escapeHtml(project.logo.text || "CueWalk");
  const notice =
    videoMode === "missing"
      ? '<div class="notice">Video file missing — see src/video-source.txt</div>'
      : "";
  const runtime = RUNTIME.replace("__PROJECT__", htmlJson(project));

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1, user-scalable=no" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="theme-color" content="#06080b" />
<title>${title}</title>
<style>${STYLES}</style>
</head>
<body>
<main class="stage" id="stage">
  <div class="video-wrap" id="videoWrap">
    <video id="video" src="${escapeHtml(project.videoUrl)}" playsinline webkit-playsinline preload="metadata"></video>
  </div>
  <div class="shade"></div>

  <div class="top">
    <div class="brand" id="brand"></div>
    <div class="scrubber" id="scrubber">
      <div class="scrub-row">
        <span class="sun" id="sun"></span>
        <span class="track"><span class="ticks" id="ticks"></span><input id="range" type="range" min="0" max="1" step="0.03333" value="0" aria-label="Start play" /></span>
        <span class="clock" id="clock">0:00</span>
      </div>
      <div class="scenes" id="scenes"></div>
    </div>
  </div>

  ${notice}
  <div id="cards"></div>
  <div id="links"></div>
  <div class="groups" id="groups"></div>
  <div class="mode" id="mode"></div>
  <div id="infoPanel"></div>
  <div id="gallery"></div>


  <div class="cuebar">
    <div class="cues" id="cues"></div>
    <div class="util" id="util"></div>
  </div>

  <div class="loader" id="loader">Loading</div>
  <div class="tap-start" id="tapStart" style="display:none">
    <div class="tap-pill" id="tapPill">
      <span class="tap-ring" id="tapRing"></span>
      <span class="tap-label">Tap to start</span>
      <span class="tap-hint">Your experience begins here</span>
    </div>
  </div>
</main>
<script>${runtime}
document.getElementById('sun').innerHTML=icon('sun');
</script>
</body>
</html>`;
}
