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
  --bar:clamp(60px,8vh,78px);
  --gutter:clamp(10px,1.8vw,24px);
  --safe-b:max(var(--gutter),env(safe-area-inset-bottom));
  --safe-l:max(var(--gutter),env(safe-area-inset-left));
  --safe-r:max(var(--gutter),env(safe-area-inset-right));
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{height:100%;margin:0;overflow:hidden;background:var(--ink);color:var(--fg);
  font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
button,input{font:inherit;color:inherit}
button{cursor:pointer;border:0;background:none}
.ic{width:1em;height:1em;flex:none;display:block}

.stage{position:relative;width:100vw;height:100vh;height:100dvh;overflow:hidden;background:#000;user-select:none}
.video-wrap{position:absolute;inset:0;transition:transform .65s cubic-bezier(.3,.85,.3,1)}
video{width:100%;height:100%;object-fit:cover;display:block;background:#000}
.shade{position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(125% 95% at 50% 38%,transparent 52%,rgba(0,0,0,.55) 100%)}

/* ---------------- top bar ---------------- */
.top{position:absolute;left:0;right:0;top:0;z-index:30;display:flex;align-items:flex-start;
  gap:clamp(10px,2vw,28px);padding:calc(var(--gutter)*.85) var(--safe-r) calc(var(--gutter)*2.4) var(--safe-l);
  background:linear-gradient(to bottom,rgba(0,0,0,.8),rgba(0,0,0,.32),transparent)}
.brand{display:flex;align-items:center;gap:10px;flex:none;min-width:0;transform-origin:left center;
  filter:drop-shadow(0 2px 10px rgba(0,0,0,.7))}
.brand.right{order:3;margin-left:auto;transform-origin:right center}
.mark{width:clamp(30px,3.4vw,38px);height:clamp(30px,3.4vw,38px);border-radius:11px;display:grid;place-items:center;
  color:#0a0c10;background:linear-gradient(135deg,var(--amber),var(--ember));font-size:clamp(15px,1.8vw,19px)}
.brand-title{display:block;font-size:clamp(16px,2vw,23px);font-weight:800;line-height:1.05;letter-spacing:-.01em}
.brand-tag{display:block;font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:var(--dim);margin-top:3px}
.logo-img{height:clamp(30px,4vh,44px);max-width:min(42vw,180px);object-fit:contain;display:block}

.scrubber{flex:1;min-width:0;display:flex;flex-direction:column;gap:7px;
  max-width:min(640px,62vw);margin:0 auto;touch-action:pan-y}
.scrub-row{display:flex;align-items:center;gap:clamp(8px,1.2vw,14px)}
.sun{color:#fff;font-size:clamp(16px,2vw,21px);flex:none;opacity:.92}
.track{position:relative;flex:1;min-width:0;display:flex;align-items:center;height:22px}
.ticks{position:absolute;inset:0;display:flex;gap:2px;pointer-events:none;align-items:center}
.tick{height:9px;border-radius:2px;background:rgba(255,255,255,.25);transition:.25s}
.tick.on{background:#fff;height:13px}
input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:22px;background:none;cursor:ew-resize;position:relative;z-index:2}
input[type=range]::-webkit-slider-runnable-track{height:3px;border-radius:3px;
  background:linear-gradient(to right,#fff var(--fill,0%),rgba(255,255,255,.26) var(--fill,0%))}
input[type=range]::-moz-range-track{height:3px;border-radius:3px;background:rgba(255,255,255,.26)}
input[type=range]::-moz-range-progress{height:3px;border-radius:3px;background:#fff}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:10px;height:22px;margin-top:-10px;border-radius:3px;
  background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.45),0 0 14px rgba(255,255,255,.5)}
input[type=range]::-moz-range-thumb{width:10px;height:22px;border:0;border-radius:3px;background:#fff}
.clock{flex:none;min-width:clamp(58px,7vw,86px);text-align:right;font-weight:700;
  font-size:clamp(12px,1.4vw,15px);font-variant-numeric:tabular-nums;text-shadow:0 2px 8px rgba(0,0,0,.8)}
.scenes{display:flex;gap:5px;overflow-x:auto;scrollbar-width:none;padding-bottom:1px}
.scenes::-webkit-scrollbar{display:none}
.scene{flex:1 1 auto;min-width:64px;border:1px solid var(--line);border-radius:9px;background:rgba(255,255,255,.07);
  color:var(--dim);padding:5px 8px;font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:.2s;backdrop-filter:blur(8px)}
.scene:hover{color:#fff}
.scene.on{color:#fff;box-shadow:0 6px 20px -8px rgba(0,0,0,.9)}

/* ---------------- info cards ---------------- */
#cards{position:absolute;inset:0;z-index:16;pointer-events:none}
.card{position:absolute;top:50%;transform:translateY(-50%);width:clamp(186px,19vw,264px);pointer-events:auto;
  animation:pop .38s cubic-bezier(.2,.9,.25,1) both}
.card.left{left:var(--safe-l)} .card.right{right:var(--safe-r)}
.card-shell{overflow:hidden;border-radius:14px;border:1px solid var(--line);background:rgba(9,11,15,.82);
  backdrop-filter:blur(20px);box-shadow:0 24px 60px -20px rgba(0,0,0,.95)}
.card-img{width:100%;height:clamp(96px,14vh,140px);object-fit:cover;display:block}
.card-body{padding:11px 13px;text-align:center;min-width:0}
.card-title{margin:0;font-size:clamp(17px,2vw,23px);font-weight:800;line-height:1.1}
.card-sub{color:var(--ember);font-weight:800;font-size:13px;margin-top:1px}
.card-text{margin:7px 0 0;color:var(--mut);font-size:11.5px;line-height:1.4}
.cta{display:block;width:100%;padding:10px;font-weight:800;font-size:13px;color:#0b0e12;
  background:rgba(255,255,255,.9);transition:.18s}
.cta:hover{background:#fff}

/* ---------------- mode label ---------------- */
.mode{position:absolute;left:var(--safe-l);right:var(--safe-r);bottom:calc(var(--bar) + var(--safe-b) + 12px);
  z-index:14;pointer-events:none;animation:pop .4s ease both}
.mode h2{margin:0;font-size:clamp(21px,4.6vw,46px);font-weight:800;text-transform:uppercase;letter-spacing:.02em;
  line-height:1;text-shadow:0 3px 18px rgba(0,0,0,.85)}
.mode h2 span{color:var(--dim)}
.mode .line{margin-top:9px;height:2px;width:min(58%,420px);border-radius:2px;
  background:linear-gradient(to right,rgba(255,255,255,.9),transparent)}

/* ---------------- cue bar ---------------- */
.cuebar{position:absolute;left:var(--safe-l);right:var(--safe-r);bottom:var(--safe-b);z-index:45;
  display:flex;align-items:center;gap:8px;padding:8px;border-radius:18px;border:1px solid var(--line);
  background:var(--glass);backdrop-filter:blur(22px);box-shadow:0 20px 55px -22px rgba(0,0,0,.95)}
.cues{flex:1;min-width:0;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}
.cues::-webkit-scrollbar{display:none}
.cue{display:flex;align-items:center;gap:8px;padding:9px 13px;border-radius:12px;border:1px solid transparent;
  background:rgba(255,255,255,.06);color:var(--mut);font-size:clamp(10px,1.05vw,12px);font-weight:800;
  letter-spacing:.13em;text-transform:uppercase;white-space:nowrap;transition:.18s}
.cue .ic{font-size:16px}
.cue:hover{background:rgba(255,255,255,.14);color:#fff;transform:translateY(-1px)}
.cue.on{color:#fff}
.empty-cues{padding:10px 14px;color:var(--dim);font-size:12px}
.util{flex:none;display:flex;gap:4px;padding-left:8px;border-left:1px solid var(--line)}
.ubtn{width:clamp(38px,4vw,42px);height:clamp(38px,4vw,42px);border-radius:12px;display:grid;place-items:center;
  color:var(--mut);font-size:18px;transition:.18s}
.ubtn:hover{background:rgba(255,255,255,.14);color:#fff}
.ubtn.on{background:var(--amber);color:#0a0c10}

/* ---------------- dropdown cue groups ---------------- */
.groups{position:absolute;left:0;right:0;bottom:calc(var(--bar) + var(--safe-b) + 10px);height:0;z-index:42}
.group{position:absolute;bottom:0;width:clamp(196px,20vw,246px)}
.group.left{left:var(--safe-l)} .group.right{right:var(--safe-r)}
.gpanel{margin-bottom:9px;padding:9px;border-radius:20px;border:1px solid var(--line2);
  background:rgba(12,15,20,.42);backdrop-filter:blur(30px) saturate(140%);
  box-shadow:0 28px 70px -20px rgba(0,0,0,.95);animation:pop .3s cubic-bezier(.2,.9,.25,1) both;
  max-height:min(46vh,340px);overflow-y:auto;scrollbar-width:thin}
.ghead{display:flex;justify-content:space-between;gap:8px;padding:4px 8px 8px;
  font-size:9.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--dim)}
.subcue{display:flex;align-items:center;gap:9px;width:100%;padding:9px;border-radius:13px;
  color:var(--mut);font-size:12px;font-weight:700;text-align:left;transition:.16s}
.subcue:hover,.subcue.on{background:rgba(255,255,255,.14);color:#fff}
.sdot{width:28px;height:28px;flex:none;border-radius:9px;display:grid;place-items:center;font-size:15px}
.slabel{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.stime{flex:none;font-size:9.5px;font-weight:700;color:var(--dim);font-variant-numeric:tabular-nums}
.gtoggle{display:flex;align-items:center;gap:9px;width:100%;padding:11px 13px;border-radius:15px;
  border:1px solid var(--line2);background:rgba(10,13,18,.55);backdrop-filter:blur(20px);color:#fff;
  font-size:clamp(10px,1.05vw,12px);font-weight:800;letter-spacing:.12em;text-transform:uppercase;
  box-shadow:0 14px 38px -16px rgba(0,0,0,.9);transition:.18s}
.gtoggle:hover{background:rgba(255,255,255,.16)}
.gtoggle .ic{font-size:17px}
.gtoggle b{flex:1;min-width:0;text-align:left;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.chev{transition:transform .28s}
.chev.up{transform:rotate(180deg)}

/* ---------------- link pills ---------------- */
.link{position:absolute;z-index:40;display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;
  color:#0a0c10;font-size:clamp(10px,1.05vw,12px);font-weight:900;letter-spacing:.1em;text-transform:uppercase;
  text-decoration:none;box-shadow:0 14px 36px -12px rgba(0,0,0,.9);animation:pop .32s ease both;transition:.18s}
.link:hover{transform:translateY(-2px) scale(1.03)}
.link .ic{font-size:15px}
.link.tl{left:var(--safe-l);top:calc(var(--gutter)*5.2)}
.link.tr{right:var(--safe-r);top:calc(var(--gutter)*5.2)}
.link.bl{left:var(--safe-l);bottom:calc(var(--bar) + var(--safe-b) + 74px)}
.link.br{right:var(--safe-r);bottom:calc(var(--bar) + var(--safe-b) + 74px)}

/* ---------------- glass info panel ---------------- */
.info-panel{position:absolute;right:var(--safe-r);bottom:calc(var(--bar) + var(--safe-b) + 12px);z-index:50;
  width:clamp(260px,28vw,344px);max-width:calc(100vw - var(--safe-l) - var(--safe-r));overflow:hidden;border-radius:20px;
  border:1px solid var(--line2);background:rgba(255,255,255,.1);backdrop-filter:blur(30px) saturate(150%);
  box-shadow:0 30px 80px -22px rgba(0,0,0,.95);animation:pop .32s ease both}
.info-panel img{width:100%;height:clamp(110px,16vh,158px);object-fit:cover;display:block}
.info-body{padding:15px 16px 17px}
.info-body h3{margin:0 0 6px;font-size:clamp(16px,1.9vw,21px);font-weight:800}
.info-body p{margin:0;font-size:13.5px;line-height:1.5;color:rgba(255,255,255,.86)}
.close{position:absolute;right:10px;top:10px;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;
  background:rgba(0,0,0,.45);color:#fff;font-size:15px;backdrop-filter:blur(6px)}
.close:hover{background:rgba(0,0,0,.7)}

/* ---------------- touch to start ---------------- */
.touch{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:60;display:flex;flex-direction:column;
  align-items:center;gap:12px;padding:clamp(18px,2.6vh,26px) clamp(26px,4vw,38px);border-radius:24px;
  border:1px solid var(--line2);background:rgba(8,11,16,.42);backdrop-filter:blur(26px) saturate(150%);
  box-shadow:0 30px 80px -22px rgba(0,0,0,.95);color:#fff;font-size:clamp(11px,1.3vw,14px);font-weight:800;
  letter-spacing:.17em;text-transform:uppercase;transition:.25s;animation:pop .4s ease both}
.touch:hover{border-color:var(--amber);background:rgba(8,11,16,.62);transform:translate(-50%,-50%) scale(1.045)}
.finger{width:clamp(52px,7vh,64px);height:clamp(52px,7vh,64px);border-radius:50%;display:grid;place-items:center;
  color:#0a0c10;font-size:clamp(25px,3.4vh,31px);background:linear-gradient(140deg,var(--amber),#ffd27a);
  box-shadow:0 0 0 8px rgba(255,178,36,.14);animation:ring 2.4s ease-out infinite}

.notice{position:absolute;left:var(--safe-l);top:calc(var(--gutter)*5.2);z-index:20;padding:8px 13px;border-radius:999px;
  background:rgba(0,0,0,.6);border:1px solid rgba(255,178,36,.35);color:var(--amber);font-size:10.5px;font-weight:700;
  letter-spacing:.1em}
.loader{position:absolute;inset:0;z-index:70;display:grid;place-items:center;background:rgba(0,0,0,.72);
  color:var(--dim);font-size:11px;font-weight:700;letter-spacing:.28em;text-transform:uppercase}
.loader.hide{display:none}

@keyframes pop{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes ring{0%{box-shadow:0 0 0 0 rgba(255,178,36,.45)}70%{box-shadow:0 0 0 18px rgba(255,178,36,0)}100%{box-shadow:0 0 0 0 rgba(255,178,36,0)}}
.card.left{animation-name:popL}.card.right{animation-name:popR}
@keyframes popL{from{opacity:0;transform:translate(-16px,-50%)}to{opacity:1;transform:translate(0,-50%)}}
@keyframes popR{from{opacity:0;transform:translate(16px,-50%)}to{opacity:1;transform:translate(0,-50%)}}

/* ---------------- adaptive breakpoints ---------------- */
@media(max-width:1024px){ .scrubber{max-width:none} }
@media(max-width:860px){
  .brand-tag{display:none}
  .mode .line{width:70%}
  .group{width:clamp(170px,34vw,220px)}
}
@media(max-width:640px){
  .top{flex-wrap:wrap;gap:8px}
  .brand{order:0} .brand.right{order:0;margin-left:0}
  .scrubber{order:2;flex:1 1 100%;max-width:none;margin:0}
  #cards{display:flex;flex-direction:column;justify-content:flex-end;gap:8px;
    padding:0 var(--safe-r) calc(var(--bar) + var(--safe-b) + 12px) var(--safe-l)}
  .card{position:static;transform:none;width:auto;animation-name:pop}
  .card-shell{display:flex;align-items:stretch}
  .card-img{width:92px;height:auto;min-height:76px;flex:none}
  .card-body{flex:1;text-align:left;padding:9px 11px;display:flex;flex-direction:column;justify-content:center}
  .card-title{font-size:17px}
  .card-text{display:none}
  .cta{width:auto;display:grid;place-items:center;padding:0 15px;flex:none;font-size:12px}
  .cue .lbl{display:none}
  .cue{padding:10px 12px}
  .link.bl,.link.br{bottom:calc(var(--bar) + var(--safe-b) + 132px)}
  .info-panel{left:var(--safe-l);right:var(--safe-r);width:auto}
  .groups{bottom:calc(var(--bar) + var(--safe-b) + 8px)}
  .group{width:min(64vw,240px)}
}
@media(max-width:420px){
  .mode h2{font-size:19px}
  .clock{min-width:52px;font-size:11.5px}
  .scene{min-width:56px;font-size:8.5px;letter-spacing:.1em}
}
@media(max-height:460px) and (orientation:landscape){
  .top{padding-bottom:calc(var(--gutter)*1.3)}
  .card-img{height:64px}
  .mode h2{font-size:22px}
  .touch{padding:12px 22px;gap:8px}
  .finger{width:42px;height:42px;font-size:21px}
}
@media(hover:none){ .cue:hover,.link:hover{transform:none} }
`;

const RUNTIME = `
var PROJECT=__PROJECT__;
var $=function(s){return document.querySelector(s)};
var video=$('#video'),range=$('#range'),ticks=$('#ticks'),scenesEl=$('#scenes'),cardsEl=$('#cards'),
    linksEl=$('#links'),cuesEl=$('#cues'),groupsEl=$('#groups'),modeEl=$('#mode'),touchEl=$('#touch'),
    infoEl=$('#infoPanel'),wrap=$('#videoWrap'),clockEl=$('#clock'),stage=$('#stage'),loader=$('#loader'),
    utilEl=$('#util');
var duration=0,segEnd=null,activeId=null,openGroup=null,infoOpen=false,rot=0,wasPlaying=false,
    touchUsed=false,sceneIdx=0,lastWheel=0,swipeX=null,lastHtml={};

var P={
 walk:'<circle cx="13" cy="4" r="2"/><path d="M6.5 21l3-7 2.5-2-1-4"/><path d="M11 12l4 2 1.5 4"/><path d="M8.2 8.6L12 6.5"/>',
 bird:'<path d="M20.5 6.2A4.2 4.2 0 0 1 16.3 10H14l-6 9.5"/><path d="M14 10l-3.2 5.4"/><circle cx="18.4" cy="5" r="1"/>',
 satellite:'<path d="M4.5 10.2l5.7-5.7 3.8 3.8-5.7 5.7z"/><path d="M12.4 12.1l3.8 3.8 3.8-3.8-3.8-3.8"/><path d="M8.6 15.4L4 20"/>',
 units:'<rect x="3.5" y="3" width="7" height="18" rx="1"/><rect x="13.5" y="8" width="7" height="13" rx="1"/><path d="M6.2 7h1.6M6.2 11h1.6M6.2 15h1.6M16.2 12h1.6M16.2 16h1.6"/>',
 gallery:'<rect x="3" y="5" width="13" height="11" rx="2"/><path d="M6 16l3.5-3.5L13 16"/><circle cx="8.6" cy="9" r="1.1"/><path d="M20 8.5v9.5a2 2 0 0 1-2 2H7.5"/>',
 play:'<path d="M7 4.5l12 7.5-12 7.5z" fill="currentColor" stroke="none"/>',
 home:'<path d="M3.5 11L12 4l8.5 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
 map:'<path d="M9 4L3.5 6.6v13L9 17l6 3 5.5-2.6v-13L15 7z"/><path d="M9 4v13M15 7v13"/>',
 camera:'<path d="M3.5 8.5h3.2l1.8-2.2h7l1.8 2.2h3.2v10.5H3.5z"/><circle cx="12" cy="13.4" r="3.4"/>',
 compass:'<circle cx="12" cy="12" r="8.8"/><path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z"/>',
 layers:'<path d="M12 3l9 4.8-9 4.8-9-4.8z"/><path d="M3 12.6L12 17.4l9-4.8"/><path d="M3 16.9L12 21.7l9-4.8"/>',
 tree:'<path d="M12 3l4.6 6.4h-2.7L18 15.4H6l4.1-6H7.4z"/><path d="M12 15.4V21"/>',
 car:'<path d="M3.2 15.6h17.6v-3.4l-2-4.8H5.2l-2 4.8z"/><path d="M6 15.6v2.6M18 15.6v2.6"/><circle cx="7.6" cy="15.6" r="1.4"/><circle cx="16.4" cy="15.6" r="1.4"/>',
 sun:'<circle cx="12" cy="12" r="4.1"/><path d="M12 2.2v2.3M12 19.5v2.3M2.2 12h2.3M19.5 12h2.3M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M18.9 5.1l-1.6 1.6M6.7 17.3l-1.6 1.6"/>',
 star:'<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.7l6.1-.9z"/>',
 eye:'<path d="M2.2 12S5.8 5.9 12 5.9 21.8 12 21.8 12 18.2 18.1 12 18.1 2.2 12 2.2 12z"/><circle cx="12" cy="12" r="3"/>',
 vol:'<path d="M4 9.2v5.6h3.6L13 19V5L7.6 9.2z"/><path d="M16.4 9.2a4 4 0 0 1 0 5.6"/><path d="M18.9 6.7a7.5 7.5 0 0 1 0 10.6"/>',
 mute:'<path d="M4 9.2v5.6h3.6L13 19V5L7.6 9.2z"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/>',
 info:'<circle cx="12" cy="12" r="8.8"/><path d="M12 11.2v5.1"/><path d="M12 7.9h.01"/>',
 rotate:'<path d="M20.8 12a8.8 8.8 0 1 1-2.9-6.5"/><path d="M20.8 3.9v5h-5"/>',
 reset:'<path d="M3.2 12a8.8 8.8 0 1 0 2.9-6.5"/><path d="M3.2 3.9v5h5"/>',
 full:'<path d="M4 9.2V4h5.2M20 9.2V4h-5.2M4 14.8V20h5.2M20 14.8V20h-5.2"/>',
 exitfull:'<path d="M9.2 4v5.2H4M14.8 4v5.2H20M9.2 20v-5.2H4M14.8 20v-5.2H20"/>',
 hand:'<path d="M8.4 12.6V5.4a1.6 1.6 0 1 1 3.2 0v5.4"/><path d="M11.6 10.8V4.2a1.6 1.6 0 1 1 3.2 0v6.6"/><path d="M14.8 10.8V6.6a1.6 1.6 0 1 1 3.2 0v6.2"/><path d="M18 12.8a1.6 1.6 0 1 1 3.2 0v3.1A6.1 6.1 0 0 1 15.1 22h-1.7a6.1 6.1 0 0 1-6.1-6.1v-2.6a1.6 1.6 0 1 1 3.1 0"/>',
 ext:'<path d="M14 3.8h6.2V10"/><path d="M20.2 3.8l-9 9"/><path d="M18.2 14v5.2a1 1 0 0 1-1 1H4.8a1 1 0 0 1-1-1V6.8a1 1 0 0 1 1-1H10"/>',
 chev:'<path d="M6 9.2l6 6 6-6"/>',
 close:'<path d="M6 6l12 12M18 6L6 18"/>'
};
function icon(n,cls){return '<svg class="ic '+(cls||'')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+(P[n]||P.play)+'</svg>'}
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
function gotoScene(i,play){var sp=spans();if(!sp.list.length)return;
  var n=Math.max(0,Math.min(sp.list.length-1,i));sceneIdx=n;
  if(play!==false)playSegment(sp.list[n].s.start,sp.list[n].s.end);else video.currentTime=sp.list[n].s.start}

function renderBrand(){var l=PROJECT.logo||{},b=$('#brand');
  b.className='brand'+(l.position==='top-right'?' right':'');
  b.style.opacity=(l.opacity==null?100:l.opacity)/100;
  b.style.transform='scale('+((l.size||100)/100)+')';
  b.innerHTML=(l.mode==='image'&&l.image)
    ?'<img class="logo-img" src="'+attr(l.image)+'" alt="logo">'
    :'<span class="mark">'+icon('layers')+'</span><span style="min-width:0"><span class="brand-title">'+esc(l.text||'Logo')+'</span>'+(l.tagline?'<span class="brand-tag">'+esc(l.tagline)+'</span>':'')+'</span>'}

function renderUtil(){
  setHtml(utilEl,'util',
    '<button class="ubtn" id="mute" title="Mute (M)" aria-label="Mute">'+icon(video.muted?'mute':'vol')+'</button>'+
    '<button class="ubtn'+(infoOpen?' on':'')+'" id="info" title="Info (I)" aria-label="Info">'+icon('info')+'</button>'+
    '<button class="ubtn" id="rotate" title="Rotate screen (R)" aria-label="Rotate">'+icon('rotate')+'</button>'+
    '<button class="ubtn" id="reset" title="Reset (0)" aria-label="Reset">'+icon('reset')+'</button>'+
    '<button class="ubtn" id="full" title="Fullscreen (F)" aria-label="Fullscreen">'+icon(document.fullscreenElement?'exitfull':'full')+'</button>')}

function render(){
  var t=video.currentTime||0,l=limits(),sp=spans(),useS=sp.list.length>0;
  var cur=useS?sceneAt(t,sp):-1, act=cur>=0?cur:Math.min(sceneIdx,sp.list.length-1);
  var rmin=useS?0:l.min, rmax=useS?sp.total:l.max, rval=useS?toVirtual(t,sp):Math.max(l.min,Math.min(l.max,t));

  $('#scrubber').style.display=PROJECT.slider.enabled?'flex':'none';
  range.min=rmin;range.max=rmax;range.step=1/30;range.value=rval;
  range.style.setProperty('--fill',(rmax>rmin?((rval-rmin)/(rmax-rmin))*100:0)+'%');
  clockEl.textContent=PROJECT.slider.labelMode==='clock'?clock(rmax>rmin?(rval-rmin)/(rmax-rmin):0):fmt(t);

  setHtml(ticks,'ticks',useS?sp.list.map(function(x,i){
    return '<span class="tick'+(i===act?' on':'')+'" style="flex:'+x.dur+';background:'+(i===act?attr(x.s.color):'rgba(255,255,255,.25)')+'"></span>'}).join(''):'');
  scenesEl.style.display=useS?'flex':'none';
  setHtml(scenesEl,'scenes',useS?sp.list.map(function(x,i){
    return '<button class="scene'+(i===act?' on':'')+'" data-scene="'+i+'" style="flex:'+x.dur+';'+
      (i===act?'background:'+attr(x.s.color)+'2e;border-color:'+attr(x.s.color):'')+'">'+esc(x.s.label)+'</button>'}).join(''):'');

  touchEl.style.display=(!touchUsed&&video.paused&&!video.ended)?'flex':'none';

  setHtml(cardsEl,'cards',(PROJECT.cards||[]).filter(function(c){return t>=c.start&&t<=c.end}).map(function(c){
    return '<div class="card '+c.side+'"><div class="card-shell">'+
      (c.image?'<img class="card-img" src="'+attr(c.image)+'" alt="">':'')+
      '<div class="card-body"><h3 class="card-title" style="color:'+attr(c.accent)+'">'+esc(c.title)+'</h3>'+
      (c.subtitle?'<div class="card-sub">'+esc(c.subtitle)+'</div>':'')+
      (c.body?'<p class="card-text">'+esc(c.body)+'</p>':'')+'</div>'+
      '<button class="cta" data-card="'+attr(c.id)+'">'+esc(c.cta||'Explore')+'</button></div></div>'}).join(''));

  setHtml(linksEl,'links',(PROJECT.links||[]).filter(function(x){return t>=x.start&&t<=x.end}).map(function(x){
    var pos={'top-left':'tl','top-right':'tr','bottom-left':'bl','bottom-right':'br'}[x.corner]||'bl';
    return '<a class="link '+pos+'" href="'+attr(x.url)+'" target="_blank" rel="noopener" style="background:'+attr(x.color)+'">'+
      icon('ext')+esc(x.label)+'</a>'}).join(''));

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
}

function tick(){
  if(segEnd!=null&&!video.paused&&video.currentTime>=segEnd-.03){video.pause();segEnd=null}
  var l=limits();
  if(PROJECT.slider.limitEnabled&&!video.paused&&video.currentTime>=l.max-.03)video.pause();
  render();requestAnimationFrame(tick)}

function applyRotation(){var odd=rot===90||rot===270;
  var sc=odd?Math.max(innerWidth/innerHeight,innerHeight/innerWidth):1;
  wrap.style.transform='rotate('+rot+'deg) scale('+sc+')'}

function resetAll(){var sp=spans(),l=limits();
  video.pause();segEnd=null;activeId=null;openGroup=null;infoOpen=false;touchUsed=false;sceneIdx=0;rot=0;
  video.muted=false;applyRotation();
  video.currentTime=sp.list.length?sp.list[0].s.start:l.min;
  renderUtil();render()}

renderBrand();renderUtil();applyRotation();

video.addEventListener('loadedmetadata',function(){duration=video.duration||0;render()});
video.addEventListener('loadeddata',function(){loader.classList.add('hide')});
video.addEventListener('error',function(){loader.textContent='Video could not load';loader.classList.remove('hide')});
video.addEventListener('ended',function(){segEnd=null});
video.addEventListener('volumechange',renderUtil);

range.addEventListener('pointerdown',function(){wasPlaying=!video.paused;video.pause()});
range.addEventListener('input',function(){var sp=spans();
  video.currentTime=sp.list.length?toActual(Number(range.value),sp):Number(range.value)});
range.addEventListener('pointerup',function(){if(wasPlaying){var p=video.play();if(p&&p.catch)p.catch(function(){})}wasPlaying=false});

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

touchEl.addEventListener('click',function(){var sp=spans(),l=limits();touchUsed=true;
  if(sp.list.length){var i=Math.max(0,Math.min(sceneIdx,sp.list.length-1));playSegment(sp.list[i].s.start,sp.list[i].s.end)}
  else playSegment(l.min,PROJECT.slider.limitEnabled?l.max:null)});

document.addEventListener('click',function(e){
  var cue=e.target.closest('[data-cue]');
  if(cue){var c=(PROJECT.buttons||[]).filter(function(x){return x.id===cue.dataset.cue})[0];
    if(c){activeId=c.id;touchUsed=true;playSegment(c.start,c.end)}}
  var sub=e.target.closest('[data-sub]');
  if(sub){var s=allCues().filter(function(x){return x.id===sub.dataset.sub})[0];
    if(s){activeId=s.id;openGroup=null;touchUsed=true;playSegment(s.start,s.end)}}
  var grp=e.target.closest('[data-group]');
  if(grp){openGroup=openGroup===grp.dataset.group?null:grp.dataset.group;render()}
  var sc=e.target.closest('[data-scene]');
  if(sc){touchUsed=true;gotoScene(Number(sc.dataset.scene))}
  var card=e.target.closest('[data-card]');
  if(card){var cc=(PROJECT.cards||[]).filter(function(x){return x.id===card.dataset.card})[0];
    if(cc){touchUsed=true;playSegment(cc.start,cc.end)}}
  if(e.target.closest('#mute')){video.muted=!video.muted;renderUtil()}
  if(e.target.closest('#info')){infoOpen=!infoOpen;renderUtil();render()}
  if(e.target.closest('[data-close-info]')){infoOpen=false;renderUtil();render()}
  if(e.target.closest('#rotate')){rot=(rot+90)%360;applyRotation()}
  if(e.target.closest('#reset')){resetAll()}
  if(e.target.closest('#full')){if(document.fullscreenElement)document.exitFullscreen();
    else if(stage.requestFullscreen)stage.requestFullscreen()}
});

document.addEventListener('fullscreenchange',renderUtil);
addEventListener('resize',applyRotation);
addEventListener('orientationchange',function(){setTimeout(applyRotation,220)});

addEventListener('keydown',function(e){
  var k=e.key.toLowerCase();
  if(e.code==='Space'){e.preventDefault();touchUsed=true;
    if(video.paused){var p=video.play();if(p&&p.catch)p.catch(function(){})}else video.pause()}
  else if(e.key==='ArrowRight'){e.preventDefault();video.pause();segEnd=null;video.currentTime+=1/30}
  else if(e.key==='ArrowLeft'){e.preventDefault();video.pause();segEnd=null;video.currentTime-=1/30}
  else if(k==='m'){video.muted=!video.muted;renderUtil()}
  else if(k==='i'){infoOpen=!infoOpen;renderUtil();render()}
  else if(k==='r'){rot=(rot+90)%360;applyRotation()}
  else if(k==='0'){resetAll()}
  else if(k==='f'){if(document.fullscreenElement)document.exitFullscreen();else if(stage.requestFullscreen)stage.requestFullscreen()}
  else if(e.key==='Escape'){openGroup=null;infoOpen=false;renderUtil();render()}
});

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
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1" />
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
        <span class="track"><span class="ticks" id="ticks"></span><input id="range" type="range" min="0" max="1" step="0.03333" value="0" aria-label="Scrub video" /></span>
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

  <button class="touch" id="touch" aria-label="Touch to start">
    <span class="finger" id="fingerIcon"></span><span>Touch to start</span>
  </button>

  <div class="cuebar">
    <div class="cues" id="cues"></div>
    <div class="util" id="util"></div>
  </div>

  <div class="loader" id="loader">Loading</div>
</main>
<script>${runtime}
document.getElementById('sun').innerHTML=icon('sun');
document.getElementById('fingerIcon').innerHTML=icon('hand');
</script>
</body>
</html>`;
}
