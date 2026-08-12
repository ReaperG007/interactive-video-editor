import { makeStandaloneHtml as makeBaseStandaloneHtml, type VideoMode } from "./standalone";

export type { VideoMode } from "./standalone";
import type { Project } from "../types";

/**
 * Adds output-frame sizing to the legacy standalone runtime without duplicating
 * its large inline player implementation. The wrapper keeps the export and the
 * live editor on the same project display settings.
 */
export function makeStandaloneHtml(project: Project, videoMode: VideoMode) {
  let html = makeBaseStandaloneHtml(project, videoMode);

  const runtimeStart = html.indexOf("<script>") + "<script>".length;
  const runtimeEnd = html.indexOf("</script>", runtimeStart);
  if (runtimeStart <= "<script>".length || runtimeEnd < runtimeStart) return html;

  let runtime = html.slice(runtimeStart, runtimeEnd);

  const varEnd = "tapStart=$('#tapStart'),tapRing=$('#tapRing');";
  const setup = `${varEnd}
// Move every output layer into the rotating screen so controls, cards, menus
// and the video always share the same orientation.
['.shade','.top','#cards','#links','#groups','#mode','#infoPanel','#gallery','.cuebar','#loader','#tapStart'].forEach(function(selector){
  var node=$(selector);
  if(node&&node!==wrap)wrap.appendChild(node);
});
// The base video wrapper is click-through; once controls are moved inside it,
// make the wrapper interactive so gallery swipes and info close can receive input.
wrap.style.pointerEvents='auto';
`;
  runtime = runtime.replace(varEnd, setup);

  // Keep dropdown groups side-by-side when several are assigned to the same
  // corner, and remove editor-only helper text from the standalone player.
  runtime = runtime.replace(
    "setHtml(groupsEl,'groups',(PROJECT.cueGroups||[]).map(function(g){",
    "setHtml(groupsEl,'groups',(PROJECT.cueGroups||[]).map(function(g,groupIndex){"
  );
  runtime = runtime.replace(
    "    var open=openGroup===g.id;",
    "    var open=openGroup===g.id;\n    var sideIndex=(PROJECT.cueGroups||[]).slice(0,groupIndex).filter(function(candidate){return candidate.side===g.side}).length;\n    var offsetParts=[];for(var oi=0;oi<sideIndex;oi++)offsetParts.push('var(--group-slot)');\n    var sideOffset=offsetParts.length?' style=\"'+(g.side==='left'?'left':'right')+':calc(var(--safe-'+(g.side==='left'?'l':'r')+') + '+offsetParts.join(' + ')+')\"':' style=\"\"';"
  );
  runtime = runtime.replace(
    "return '<div class=\"group '+g.side+'\">'+",
    "return '<div class=\"group '+g.side+'\"'+sideOffset+'>'+"
  );
  runtime = runtime.replace("choose scene", "");
  runtime = runtime.replace(
    "<span class=\"slabel\">'+esc(s.label)+'</span><span class=\"stime\">'+fmt(s.start)+'</span>",
    "<span class=\"slabel\">'+esc(s.label)+'</span>"
  );
  runtime = runtime.replace(
    /galleryEl\.addEventListener\('touchstart'[\s\S]*?galleryEl\.addEventListener\('click'/,
    "galleryEl.addEventListener('pointerdown',function(e){if(!e.isPrimary)return;gSwipe={x:e.clientX,y:e.clientY,id:e.pointerId};if(galleryEl.setPointerCapture)galleryEl.setPointerCapture(e.pointerId)},{passive:true});\ngalleryEl.addEventListener('pointerup',function(e){if(!gSwipe||gSwipe.id!==e.pointerId)return;var dx=e.clientX-gSwipe.x,dy=e.clientY-gSwipe.y;gSwipe=null;if(galleryId&&Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy))gstep(dx<0?1:-1)});\ngalleryEl.addEventListener('pointercancel',function(){gSwipe=null});\ngalleryEl.addEventListener('click'"
  );

  const oldRotation = `function applyRotation(){var odd=rot===90||rot===270;
  var sc=odd?Math.max(innerWidth/innerHeight,innerHeight/innerWidth):1;
  wrap.style.transform='rotate('+rot+'deg) scale('+sc+')'}`;
  const newRotation = `function outputAspect(){
  var a=PROJECT.display&&PROJECT.display.aspectRatio;
  if(a==='square')return 1;
  if(a==='5:4')return 5/4;
  if(a==='4:3')return 4/3;
  if(a==='3:2')return 3/2;
  if(a==='16:9')return 16/9;
  return video.videoWidth&&video.videoHeight?video.videoWidth/video.videoHeight:16/9;
}
function fitOutput(){
  // The exported player is always a true viewport screen. Do not size the
  // stage to the selected aspect ratio: that creates a letterbox at the
  // bottom on displays whose viewport ratio is different.
  var vw=window.innerWidth||document.documentElement.clientWidth||1;
  var vh=window.innerHeight||document.documentElement.clientHeight||1;
  var quarter=rot===90||rot===270;
  var w=vw,h=vh;
  // The layer is sized in its unrotated orientation, then its exact bounds are
  // rotated into the full viewport. This keeps every panel inside the screen.
  var innerW=quarter?h:w,innerH=quarter?w:h;
  stage.style.width=w+'px';stage.style.height=h+'px';
  stage.style.left='0px';stage.style.top='0px';
  stage.style.aspectRatio='auto';
  wrap.style.width=innerW+'px';wrap.style.height=innerH+'px';
  // Set right/bottom before left/top; do not use the inset shorthand here,
  // because it would reset the calculated offsets back to auto.
  wrap.style.right='auto';wrap.style.bottom='auto';
  wrap.style.left=((w-innerW)/2)+'px';wrap.style.top=((h-innerH)/2)+'px';
  applyRotation();
}
function applyRotation(){
  wrap.style.transform='rotate('+rot+'deg)';
}`;
  runtime = runtime.replace(oldRotation, newRotation);

  runtime = runtime.replace("renderBrand();renderUtil();applyRotation();", "renderBrand();renderUtil();fitOutput();");
  runtime = runtime.replace(
    "video.addEventListener('loadedmetadata',function(){duration=video.duration||0;render();",
    "video.addEventListener('loadedmetadata',function(){duration=video.duration||0;fitOutput();render();"
  );
  runtime = runtime.replace(
    "if(e.target.closest('#rotate')){rot=(rot+90)%360;applyRotation()}",
    "if(e.target.closest('#rotate')){rot=rot===90?0:90;fitOutput()}"
  );
  runtime = runtime.replace(
    "video.muted=false;applyRotation();",
    "video.muted=false;fitOutput();"
  );
  runtime = runtime.replace(
    "else if(k==='r'){rot=(rot+90)%360;applyRotation()}",
    "else if(k==='r'){rot=rot===90?0:90;fitOutput()}"
  );
  runtime = runtime.replace(
    "window.addEventListener('resize',function(){detect();applyRotation()});",
    "window.addEventListener('resize',function(){detect();fitOutput()});"
  );
  runtime = runtime.replace(
    "window.addEventListener('orientationchange',function(){setTimeout(function(){detect();applyRotation()},220)});",
    "window.addEventListener('orientationchange',function(){setTimeout(function(){detect();fitOutput()},220)});"
  );
  runtime = runtime.replace(
    "document.addEventListener('fullscreenchange',renderUtil);",
    "document.addEventListener('fullscreenchange',function(){renderUtil();fitOutput()});"
  );

  html = `${html.slice(0, runtimeStart)}${runtime}${html.slice(runtimeEnd)}`;
  return html;
}
