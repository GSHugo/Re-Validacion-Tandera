const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={pallet:null,locations:[],stream:null,detector:null,detecting:false,pending:Promise.resolve(),pendingCount:0,scanFailed:false};
const cfg=window.TANDERA_CONFIG||{};
async function api(action,data={},silent=false){if(!cfg.API_URL||cfg.API_URL.includes('PEGAR_AQUI'))throw new Error('Configura API_URL en config.js.');if(!silent)loading(true);try{const r=await fetch(cfg.API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({...data,action,apiKey:cfg.API_KEY||''}),redirect:'follow'}),j=await r.json();if(!j.ok)throw new Error(j.error||'Error del servidor');return j.data}finally{if(!silent)loading(false)}}
function view(id){$$('.view').forEach(x=>x.classList.toggle('active',x.id===id));if(id!=='scan')stopCamera();scrollTo(0,0)}
function loading(on){$('#loading').classList.toggle('hidden',!on)}
function toast(msg){const x=$('#toast');x.textContent=msg;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),2500)}
function operator(){return $('#operator').value.trim()}
function saveCurrent(){state.pallet?localStorage.setItem('tandera_open',state.pallet.pallet.ID_TARIMA):localStorage.removeItem('tandera_open')}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function init(){
  $('#operator').value=localStorage.getItem('tandera_operator')||'';
  try{const d=await api('bootstrap');state.locations=d.locations;fillLocations();renderPallets(d.pallets);$('#continueBtn').classList.toggle('hidden',!localStorage.getItem('tandera_open'))}catch(e){toast(e.message)}
}
$('#newBtn').onclick=async()=>{try{localStorage.setItem('tandera_operator',operator());state.pallet=await api('createPallet',{operador:operator()});saveCurrent();renderScan();view('scan')}catch(e){toast(e.message)}};
$('#continueBtn').onclick=async()=>{try{state.pallet=await api('palletDetail',{idTarima:localStorage.getItem('tandera_open')});renderScan();view('scan')}catch(e){toast(e.message)}};
$('#scanForm').onsubmit=e=>{e.preventDefault();const i=$('#code'),codigo=i.value.trim().toUpperCase();if(!codigo)return;state.pallet.total++;state.pallet.pallet.TOTAL_BULTOS=state.pallet.total;const row=state.pallet.summary.find(x=>x.codigo===codigo);if(row)row.cantidad++;else state.pallet.summary.push({codigo,cantidad:1});state.pallet.summary.sort((a,b)=>a.codigo.localeCompare(b.codigo));i.value='';$('#lastScan').textContent='✓ '+codigo+' agregado · '+state.pallet.total+' bultos';renderScan();i.focus();navigator.vibrate?.(80);state.pendingCount++;state.pending=state.pending.then(async()=>{try{await api('scan',{idTarima:state.pallet.pallet.ID_TARIMA,codigo,operador:operator()},true)}catch(err){state.scanFailed=true;toast('No se guardó '+codigo+': '+err.message)}finally{state.pendingCount--}})};
function renderScan(){const d=state.pallet;$('#palletId').textContent=d.pallet.ID_TARIMA;$('#total').textContent=d.total;$('#summary').innerHTML=d.summary.length?d.summary.map(x=>`<div><span>${esc(x.codigo)}</span><b>${x.cantidad}</b></div>`).join(''):'<p class="muted">Aún no hay escaneos.</p>';saveCurrent()}
$('#finishBtn').onclick=()=>view('location');
function fillLocations(){
  $('#aisle').innerHTML='ABCDEFGHIJKLMNOPQRSTU'.split('').map(x=>`<option ${x==='S'?'selected':''}>${x}</option>`).join('');
  $('#position').innerHTML=Array.from({length:65},(_,i)=>i+11).map(x=>`<option ${x===36?'selected':''}>${x}</option>`).join('');
  $('#level').innerHTML=Array.from({length:6},(_,i)=>'N'+(i+1)).map(x=>`<option ${x==='N4'?'selected':''}>${x}</option>`).join('');updateLocation();
}
function updateLocation(){const s=`${$('#aisle').value}/${$('#position').value}/${$('#level').value}`;$('#shortLocation').textContent=s;$('#fullLocation').textContent='TEX 1/TANDERA/'+s}
['#aisle','#position','#level'].forEach(s=>$(s).onchange=updateLocation);
$('#closeBtn').onclick=async()=>{const id=$('#shortLocation').textContent;try{if(state.pendingCount)toast('Confirmando los últimos escaneos…');loading(true);await state.pending;if(state.scanFailed){state.pallet=await api('palletDetail',{idTarima:state.pallet.pallet.ID_TARIMA},true);state.scanFailed=false;renderScan();view('scan');throw new Error('Se corrigió el conteo. Revisa la tarima antes de cerrar.')}state.pallet=await api('assignLocation',{idTarima:state.pallet.pallet.ID_TARIMA,idUbicacion:id},true);localStorage.removeItem('tandera_open');toast('Tarima cerrada en '+id);await refreshPallets();renderDetail(state.pallet);view('detail')}catch(e){toast(e.message)}finally{loading(false)}};
$('#adminBtn').onclick=async()=>{await refreshPallets();view('admin')};
async function refreshPallets(){try{renderPallets(await api('listPallets',{query:$('#search').value}))}catch(e){toast(e.message)}}
function renderPallets(rows){$('#palletList').innerHTML=rows.length?rows.map(x=>`<article data-id="${esc(x.ID_TARIMA)}"><b>${esc(x.ID_TARIMA)}</b><div class="meta"><span>${esc(x.UBICACION_CORTA||'Sin ubicación')} · ${x.TOTAL_BULTOS||0} bultos</span><span class="pill">${esc(x.ESTADO)}</span></div></article>`).join(''):'<p class="muted">No hay tarimas.</p>';$$('#palletList article').forEach(x=>x.onclick=async()=>{try{const d=await api('palletDetail',{idTarima:x.dataset.id});renderDetail(d);view('detail')}catch(e){toast(e.message)}})}
function renderDetail(d){$('#detailBody').innerHTML=`<h2>${esc(d.pallet.ID_TARIMA)}</h2><div class="card"><p><b>Estado:</b> ${esc(d.pallet.ESTADO)}</p><p><b>Total:</b> ${d.total} bultos</p><p><b>Ubicación:</b> ${esc(d.pallet.UBICACION_COMPLETA||'Sin asignar')}</p></div><div class="card"><h3>Concentrado por código</h3><div class="summary">${d.summary.map(x=>`<div><span>${esc(x.codigo)}</span><b>${x.cantidad}</b></div>`).join('')||'<p class="muted">Sin escaneos</p>'}</div></div>`}
let searchTimer;$('#search').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(refreshPallets,300)};
$$('[data-back]').forEach(x=>x.onclick=()=>view(x.dataset.back));
$('#exportBtn').onclick=async()=>{try{const d=await api('exportOdoo'),b=new Blob(['\ufeff'+d.csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=d.filename;a.click();URL.revokeObjectURL(a.href)}catch(e){toast(e.message)}};
$('#cameraBtn').onclick=()=>state.stream?stopCamera():startCamera();
async function startCamera(){if(!('BarcodeDetector'in window)){toast('Este navegador no soporta lectura automática. Usa el campo de código.');return}try{state.detector=new BarcodeDetector({formats:['code_128','code_39','ean_13','ean_8','qr_code']});state.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});$('#video').srcObject=state.stream;await $('#video').play();$('#cameraBox').classList.remove('hidden');$('#cameraBtn').textContent='Detener cámara';state.detecting=true;detectLoop()}catch(e){toast('No se pudo abrir la cámara: '+e.message)}}
async function detectLoop(){if(!state.detecting)return;try{const c=await state.detector.detect($('#video'));if(c[0]){$('#code').value=c[0].rawValue;$('#scanForm').requestSubmit();stopCamera();return}}catch(e){}requestAnimationFrame(detectLoop)}
function stopCamera(){state.detecting=false;state.stream?.getTracks().forEach(t=>t.stop());state.stream=null;$('#cameraBox').classList.add('hidden');$('#cameraBtn').textContent='📷 Activar cámara'}
init();
