function isAiPhotoStudio(){return window.location.pathname.startsWith("/menu-studio/ai-images");}

function safeName(value){return String(value||"beyond-ai-photo").replace(/[^a-z0-9-_]+/gi,"-").replace(/^-+|-+$/g,"")||"beyond-ai-photo";}

async function downloadImage(url,name){
  try{
    const response=await fetch(url,{mode:"cors",credentials:"omit"});
    if(!response.ok) throw new Error("download failed");
    const blob=await response.blob();
    const blobUrl=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=blobUrl;
    a.download=`${safeName(name)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(blobUrl),1000);
  }catch{
    const a=document.createElement("a");
    a.href=url;
    a.target="_blank";
    a.rel="noopener noreferrer";
    a.download=`${safeName(name)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

function makeButton(label,title){const button=document.createElement("button");button.type="button";button.className="beyond-ai-image-tool";button.textContent=label;button.title=title;button.setAttribute("aria-label",title);return button;}

function openViewer(src,alt="AI generated photo"){
  document.querySelector(".beyond-ai-image-viewer")?.remove();
  let scale=1;
  const overlay=document.createElement("div");
  overlay.className="beyond-ai-image-viewer";
  overlay.innerHTML=`<div class="beyond-ai-image-viewer-shell" role="dialog" aria-modal="true" aria-label="AI photo viewer"><div class="beyond-ai-image-viewer-toolbar"><button type="button" data-action="out" aria-label="Zoom out">−</button><span data-role="zoom">100%</span><button type="button" data-action="in" aria-label="Zoom in">+</button><button type="button" data-action="reset">Reset</button><button type="button" data-action="download">Download</button><button type="button" data-action="close" aria-label="Close">×</button></div><div class="beyond-ai-image-viewer-stage"><img draggable="false" alt=""></div></div>`;
  const image=overlay.querySelector("img");image.src=src;image.alt=alt;
  const zoomLabel=overlay.querySelector('[data-role="zoom"]');
  const apply=()=>{image.style.transform=`scale(${scale})`;zoomLabel.textContent=`${Math.round(scale*100)}%`;};
  const change=(delta)=>{scale=Math.max(.5,Math.min(4,Number((scale+delta).toFixed(2))));apply();};
  overlay.addEventListener("click",event=>{
    const action=event.target.closest("button")?.dataset?.action;
    if(action==="in") change(.25);
    if(action==="out") change(-.25);
    if(action==="reset"){scale=1;apply();}
    if(action==="download") downloadImage(src,alt);
    if(action==="close"||event.target===overlay) overlay.remove();
  });
  overlay.querySelector(".beyond-ai-image-viewer-stage").addEventListener("wheel",event=>{event.preventDefault();change(event.deltaY<0?.15:-.15);},{passive:false});
  const keyHandler=event=>{if(event.key==="Escape"){overlay.remove();window.removeEventListener("keydown",keyHandler);}if(event.key==="+"||event.key==="=")change(.25);if(event.key==="-")change(-.25);};
  window.addEventListener("keydown",keyHandler);
  document.body.appendChild(overlay);apply();
}

function enhanceImage(container){
  if(container.dataset.beyondImageTools==="1")return;
  const image=container.querySelector("img");if(!image)return;
  container.dataset.beyondImageTools="1";
  container.classList.add("beyond-ai-image-tools-host");
  const tools=document.createElement("div");tools.className="beyond-ai-image-tools";
  const zoom=makeButton("⌕","Open and zoom image");
  const download=makeButton("↓","Download image");
  zoom.addEventListener("click",event=>{event.stopPropagation();openViewer(image.currentSrc||image.src,image.alt||"beyond-ai-photo");});
  download.addEventListener("click",event=>{event.stopPropagation();downloadImage(image.currentSrc||image.src,image.alt||"beyond-ai-photo");});
  tools.append(zoom,download);container.appendChild(tools);
  image.style.cursor="zoom-in";
  image.addEventListener("click",()=>openViewer(image.currentSrc||image.src,image.alt||"beyond-ai-photo"));
}

function scan(){
  if(!isAiPhotoStudio())return;
  document.querySelectorAll(".ai-dish-v1-result-image").forEach(enhanceImage);
}

export default function installMenuAiImageViewerOverlay(){
  scan();
  const observer=new MutationObserver(()=>scan());observer.observe(document.documentElement,{childList:true,subtree:true});
  const rerun=()=>queueMicrotask(scan);window.addEventListener("popstate",rerun);window.addEventListener("hashchange",rerun);
}
