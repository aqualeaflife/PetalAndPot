
const DB_KEY = "cutesyPlantShelf.v1";
let state = loadState();
let pendingPlantPhotos = [];
let pendingWishPhoto = "";
let pendingCormPhotos = [];
let activeCormStatus = "all";

function defaultState(){ return {plants:[], wishlist:[], corms:[]}; }
function loadState(){
  try{
    const raw=localStorage.getItem(DB_KEY);
    return raw?{...defaultState(),...JSON.parse(raw)}:defaultState();
  }catch(e){return defaultState();}
}
function saveState(){ localStorage.setItem(DB_KEY,JSON.stringify(state)); render(); }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function esc(s=""){ return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m])); }

const placeholderPlant = `
<svg viewBox="0 0 64 64" aria-hidden="true">
  <path d="M32 53V24M32 30c-12 2-20-5-20-17 12-2 20 5 20 17Zm0 4c12 2 20-5 20-17-12-2-20 5-20 17Z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
const placeholderHeart = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.4-7 10-7 10Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const $=s=>document.querySelector(s);
const els={
  plantTypes:$("#plantTypes"),plantCount:$("#plantCount"),wishCount:$("#wishCount"),
  collectionGrid:$("#collectionGrid"),wishlistGrid:$("#wishlistGrid"),
  collectionEmpty:$("#collectionEmpty"),wishlistEmpty:$("#wishlistEmpty"),
  collectionSearch:$("#collectionSearch"),wishlistSearch:$("#wishlistSearch"),
  plantDialog:$("#plantDialog"),wishDialog:$("#wishDialog"),cormDialog:$("#cormDialog"),
  cormGrid:$("#cormGrid"),cormEmpty:$("#cormEmpty"),cormSearch:$("#cormSearch"),cormCount:$("#cormCount")
};

document.querySelectorAll(".nav-item").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
    $("#"+btn.dataset.page).classList.add("active");
  });
});

function currentPage(){
  return document.querySelector(".page.active")?.id || "homePage";
}

$("#navAddBtn").addEventListener("click",()=>{
  if(currentPage()==="wishlistPage") openWish();
  else if(currentPage()==="cormsPage") openCorm();
  else openPlant();
});
["addPlantTop","addPlantEmpty"].forEach(id=>$("#"+id).addEventListener("click",()=>openPlant()));
["addWishTop","addWishEmpty"].forEach(id=>$("#"+id).addEventListener("click",()=>openWish()));
["addCormTop","addCormEmpty"].forEach(id=>$("#"+id).addEventListener("click",()=>openCorm()));
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>$("#"+b.dataset.close).close()));
els.collectionSearch.addEventListener("input",renderPlants);
els.wishlistSearch.addEventListener("input",renderWishlist);
els.cormSearch.addEventListener("input",renderCorms);
document.querySelectorAll(".filter-chip").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".filter-chip").forEach(x=>x.classList.remove("active"));btn.classList.add("active");activeCormStatus=btn.dataset.status;renderCorms();}));

function render(){
  els.plantTypes.textContent=state.plants.length;
  els.plantCount.textContent=state.plants.reduce((s,p)=>s+(Number(p.qty)||0),0);
  els.wishCount.textContent=state.wishlist.length;
  els.cormCount.textContent=state.corms.reduce((s,c)=>s+(Number(c.qty)||0),0);
  const hp=document.querySelector("#heroPlants"), hc=document.querySelector("#heroCorms"), hw=document.querySelector("#heroWish");
  if(hp) hp.textContent=state.plants.reduce((s,p)=>s+(Number(p.qty)||0),0);
  if(hc) hc.textContent=state.corms.reduce((s,c)=>s+(Number(c.qty)||0),0);
  if(hw) hw.textContent=state.wishlist.length;
  renderPlants(); renderWishlist(); renderCorms();
}
function renderPlants(){
  const q=els.collectionSearch.value.trim().toLowerCase();
  const list=state.plants.filter(p=>`${p.name} ${p.variety||""} ${p.notes||""}`.toLowerCase().includes(q));
  els.collectionEmpty.style.display=state.plants.length?"none":"block";
  els.collectionGrid.style.display=state.plants.length?"grid":"none";
  els.collectionGrid.innerHTML=list.map(p=>{
    const photo=p.photos?.[0]?`<img src="${p.photos[0]}" alt="">`:`<div class="photo-placeholder">${placeholderPlant}</div>`;
    const sub=[p.variety,p.notes].filter(Boolean).join(" · ");
    return `<article class="plant-card" onclick="openPlantDetail('${p.id}')">
      <div class="photo-wrap">${photo}<div class="qty">×${Number(p.qty)||1}</div></div>
      <div class="card-copy">
        <h3>${esc(p.name)}</h3>
        <div class="card-sub">${esc(sub)}</div>
        <div class="card-actions">
          <button onclick="event.stopPropagation();editPlant('${p.id}')">Edit</button>
          <button class="danger" onclick="event.stopPropagation();deletePlant('${p.id}')">Delete</button>
        </div>
      </div>
    </article>`;
  }).join("");
}
function renderWishlist(){
  const q=els.wishlistSearch.value.trim().toLowerCase();
  const list=state.wishlist.filter(p=>`${p.name} ${p.notes||""}`.toLowerCase().includes(q));
  els.wishlistEmpty.style.display=state.wishlist.length?"none":"block";
  els.wishlistGrid.style.display=state.wishlist.length?"grid":"none";
  els.wishlistGrid.innerHTML=list.map(p=>{
    const photo=p.photo?`<img src="${p.photo}" alt="">`:`<div class="photo-placeholder">${placeholderPlant}</div>`;
    return `<article class="plant-card">
      <div class="photo-wrap">${photo}<div class="heart-chip">${placeholderHeart}</div></div>
      <div class="card-copy">
        <h3>${esc(p.name)}</h3>
        <div class="card-sub">${esc(p.notes||"")}</div>
        <div class="card-actions">
          <button class="pink-action" onclick="acquireWish('${p.id}')">I got it!</button>
          <button onclick="editWish('${p.id}')">Edit</button>
        </div>
      </div>
    </article>`;
  }).join("");
}


let activePlantDetailId = null;

function renderPlantDetail(){
  if(!activePlantDetailId) return;
  const p=state.plants.find(x=>x.id===activePlantDetailId);
  if(!p){
    closePlantDetail();
    return;
  }
  $("#detailPlantName").textContent=p.name;
  $("#detailPlantVariety").textContent=p.variety || "No variety added";
  $("#detailPlantQty").textContent=Number(p.qty)||1;
  $("#detailPhotoCount").textContent=(p.photos||[]).length;
  $("#detailPlantNotes").textContent=p.notes || "No notes yet.";

  const photos=(p.photos||[]);
  $("#detailGallery").innerHTML = photos.length
    ? photos.map(src=>`<div class="detail-photo"><img src="${src}" alt=""></div>`).join("")
    : `<div class="detail-photo"><div class="photo-placeholder">${placeholderPlant}</div></div>`;
}

function openPlantDetail(id){
  activePlantDetailId=id;
  renderPlantDetail();
  const view=$("#plantDetailView");
  view.classList.add("open");
  view.setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";
}
window.openPlantDetail=openPlantDetail;

function closePlantDetail(){
  const view=$("#plantDetailView");
  view.classList.remove("open");
  view.setAttribute("aria-hidden","true");
  document.body.style.overflow="";
  setTimeout(()=>{ activePlantDetailId=null; },220);
}

$("#detailBackBtn").addEventListener("click",closePlantDetail);
$("#detailEditBtn").addEventListener("click",()=>{ if(activePlantDetailId) openPlant(activePlantDetailId); });
$("#detailEditMainBtn").addEventListener("click",()=>{ if(activePlantDetailId) openPlant(activePlantDetailId); });

function changeDetailQty(delta){
  const p=state.plants.find(x=>x.id===activePlantDetailId);
  if(!p) return;
  p.qty=Math.max(1,(Number(p.qty)||1)+delta);
  saveState();
  renderPlantDetail();
}
$("#detailQtyMinus").addEventListener("click",()=>changeDetailQty(-1));
$("#detailQtyPlus").addEventListener("click",()=>changeDetailQty(1));
$("#detailDeleteBtn").addEventListener("click",()=>{
  if(!activePlantDetailId) return;
  const p=state.plants.find(x=>x.id===activePlantDetailId);
  if(confirm(`Remove ${p?.name||"this plant"} from your collection?`)){
    state.plants=state.plants.filter(x=>x.id!==activePlantDetailId);
    saveState();
    closePlantDetail();
  }
});

function openPlant(id=null){
  $("#plantForm").reset(); $("#plantId").value=""; $("#plantQty").value=1; pendingPlantPhotos=[];
  if(id){
    const p=state.plants.find(x=>x.id===id); if(!p)return;
    $("#plantDialogTitle").textContent="Edit your plant";
    $("#plantId").value=p.id; $("#plantName").value=p.name; $("#plantQty").value=p.qty;
    $("#plantVariety").value=p.variety||""; $("#plantNotes").value=p.notes||"";
    pendingPlantPhotos=[...(p.photos||[])];
  }else $("#plantDialogTitle").textContent="Add a plant";
  previewPlants(); els.plantDialog.showModal();
}
window.editPlant=openPlant;

function compressImage(file){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        let w=img.width,h=img.height,max=1100;
        if(Math.max(w,h)>max){const s=max/Math.max(w,h);w=Math.round(w*s);h=Math.round(h*s);}
        const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);
        resolve(c.toDataURL("image/jpeg",.8));
      };
      img.onerror=reject;img.src=r.result;
    };
    r.onerror=reject;r.readAsDataURL(file);
  });
}
$("#plantPhotos").addEventListener("change",async e=>{
  const slots=Math.max(0,6-pendingPlantPhotos.length);
  const files=[...e.target.files].slice(0,slots);
  for(const f of files) pendingPlantPhotos.push(await compressImage(f));
  previewPlants();
});
function previewPlants(){ $("#plantPhotoPreview").innerHTML=pendingPlantPhotos.map(s=>`<img src="${s}" alt="">`).join(""); }

$("#plantForm").addEventListener("submit",e=>{
  e.preventDefault();
  const id=$("#plantId").value;
  const obj={id:id||uid(),name:$("#plantName").value.trim(),qty:Math.max(1,+$("#plantQty").value||1),
    variety:$("#plantVariety").value.trim(),notes:$("#plantNotes").value.trim(),photos:pendingPlantPhotos};
  if(id){const i=state.plants.findIndex(x=>x.id===id);state.plants[i]=obj;}else state.plants.unshift(obj);
  els.plantDialog.close();saveState();
  if(activePlantDetailId===obj.id) renderPlantDetail();
});
window.deletePlant=id=>{
  const p=state.plants.find(x=>x.id===id);
  if(confirm(`Remove ${p?.name||"this plant"} from your collection?`)){state.plants=state.plants.filter(x=>x.id!==id);saveState();}
};

function openWish(id=null){
  $("#wishForm").reset();$("#wishId").value="";pendingWishPhoto="";
  if(id){
    const p=state.wishlist.find(x=>x.id===id);if(!p)return;
    $("#wishDialogTitle").textContent="Edit dream plant";$("#wishId").value=p.id;$("#wishName").value=p.name;
    $("#wishNotes").value=p.notes||"";pendingWishPhoto=p.photo||"";
    if(p.photo?.startsWith("http"))$("#wishImageUrl").value=p.photo;
  }else $("#wishDialogTitle").textContent="Add a dream plant";
  previewWish();els.wishDialog.showModal();
}
window.editWish=openWish;
$("#wishPhoto").addEventListener("change",async e=>{
  if(e.target.files[0])pendingWishPhoto=await compressImage(e.target.files[0]);previewWish();
});
$("#wishImageUrl").addEventListener("input",e=>{if(e.target.value.trim())pendingWishPhoto=e.target.value.trim();previewWish();});
function previewWish(){ $("#wishPhotoPreview").innerHTML=pendingWishPhoto?`<img src="${pendingWishPhoto}" alt="" onerror="this.style.display='none'">`:""; }

$("#wishForm").addEventListener("submit",e=>{
  e.preventDefault();
  const id=$("#wishId").value,url=$("#wishImageUrl").value.trim();
  const obj={id:id||uid(),name:$("#wishName").value.trim(),photo:url||pendingWishPhoto||"",notes:$("#wishNotes").value.trim()};
  if(id){const i=state.wishlist.findIndex(x=>x.id===id);state.wishlist[i]=obj;}else state.wishlist.unshift(obj);
  els.wishDialog.close();saveState();
});
window.acquireWish=id=>{
  const w=state.wishlist.find(x=>x.id===id);if(!w)return;
  state.plants.unshift({id:uid(),name:w.name,qty:1,variety:"",notes:w.notes||"",photos:w.photo?[w.photo]:[]});
  state.wishlist=state.wishlist.filter(x=>x.id!==id);saveState();
};


function renderCorms(){
  const q=els.cormSearch.value.trim().toLowerCase();
  const list=state.corms.filter(c=>{
    const matchesText=`${c.name} ${c.status||""} ${c.notes||""}`.toLowerCase().includes(q);
    const matchesStatus=activeCormStatus==="all" || c.status===activeCormStatus;
    return matchesText && matchesStatus;
  });
  els.cormEmpty.style.display=state.corms.length?"none":"block";
  els.cormGrid.style.display=state.corms.length?"grid":"none";
  els.cormGrid.innerHTML=list.map(c=>{
    const photo=c.photos?.[0]?`<img src="${c.photos[0]}" alt="">`:`<div class="photo-placeholder">${placeholderPlant}</div>`;
    return `<article class="plant-card">
      <div class="photo-wrap">${photo}<div class="status-badge">${esc(c.status||"Dormant")}</div><div class="qty">×${Number(c.qty)||1}</div></div>
      <div class="card-copy">
        <h3>${esc(c.name)}</h3>
        <div class="card-sub">${esc(c.notes||"")}</div>
        <div class="card-actions">
          <button onclick="editCorm('${c.id}')">Edit</button>
          <button class="danger" onclick="deleteCorm('${c.id}')">Delete</button>
        </div>
      </div>
    </article>`;
  }).join("");
}

function openCorm(id=null){
  $("#cormForm").reset(); $("#cormId").value=""; $("#cormQty").value=1; pendingCormPhotos=[];
  if(id){
    const c=state.corms.find(x=>x.id===id); if(!c)return;
    $("#cormDialogTitle").textContent="Edit corm";
    $("#cormId").value=c.id; $("#cormName").value=c.name; $("#cormQty").value=c.qty;
    $("#cormStatus").value=c.status||"Dormant"; $("#cormNotes").value=c.notes||"";
    pendingCormPhotos=[...(c.photos||[])];
  }else $("#cormDialogTitle").textContent="Add a corm";
  previewCorms(); els.cormDialog.showModal();
}
window.editCorm=openCorm;

$("#cormPhotos").addEventListener("change",async e=>{
  const slots=Math.max(0,6-pendingCormPhotos.length);
  const files=[...e.target.files].slice(0,slots);
  for(const f of files) pendingCormPhotos.push(await compressImage(f));
  previewCorms();
});
function previewCorms(){ $("#cormPhotoPreview").innerHTML=pendingCormPhotos.map(s=>`<img src="${s}" alt="">`).join(""); }

$("#cormForm").addEventListener("submit",e=>{
  e.preventDefault();
  const id=$("#cormId").value;
  const obj={id:id||uid(),name:$("#cormName").value.trim(),qty:Math.max(1,+$("#cormQty").value||1),
    status:$("#cormStatus").value,notes:$("#cormNotes").value.trim(),photos:pendingCormPhotos};
  if(id){const i=state.corms.findIndex(x=>x.id===id);state.corms[i]=obj;}else state.corms.unshift(obj);
  els.cormDialog.close();saveState();
});
window.deleteCorm=id=>{
  const c=state.corms.find(x=>x.id===id);
  if(confirm(`Remove ${c?.name||"this corm"} from your tracker?`)){state.corms=state.corms.filter(x=>x.id!==id);saveState();}
};

$("#downloadBackupBtn").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const a=document.createElement("a");const url=URL.createObjectURL(blob);
  a.href=url;a.download=`petal-and-pot-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);
});
$("#restoreBackupInput").addEventListener("change",e=>{
  const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{try{const d=JSON.parse(r.result);if(!Array.isArray(d.plants)||!Array.isArray(d.wishlist))throw 0;d.corms=Array.isArray(d.corms)?d.corms:[];state=d;saveState();alert("Your plant shelf has been restored.");}
  catch{alert("That backup file could not be read.");}};
  r.readAsText(f);
});

if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
render();
