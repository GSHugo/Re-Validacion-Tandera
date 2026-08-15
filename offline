window.TanderaOffline=(()=>{
  const DB='tandera_offline_v1', STORE='operations'; let syncing=false,sequence=0;
  function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(STORE)){const s=db.createObjectStore(STORE,{keyPath:'id'});s.createIndex('created','created')}};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
  async function tx(mode,fn){const db=await open();return new Promise((resolve,reject)=>{const t=db.transaction(STORE,mode),s=t.objectStore(STORE);let result;try{result=fn(s)}catch(e){reject(e);return}t.oncomplete=()=>resolve(result);t.onerror=()=>reject(t.error)})}
  const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  async function add(type,payload){const op={id:payload.operationId||crypto.randomUUID(),type,payload,created:Date.now()*1000+(sequence++%1000),attempts:0};await tx('readwrite',s=>s.put(op));emit();return op}
  async function all(){const db=await open();return new Promise((resolve,reject)=>{const t=db.transaction(STORE),r=t.objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result.sort((a,b)=>a.created-b.created));r.onerror=()=>reject(r.error)})}
  async function remove(id){await tx('readwrite',s=>s.delete(id));emit()}
  async function count(){const db=await open();return request(db.transaction(STORE).objectStore(STORE).count())}
  async function sync(handler){if(syncing||!navigator.onLine)return;syncing=true;try{for(const op of await all()){try{await handler(op);await remove(op.id)}catch(e){if(!navigator.onLine||e.name==='TypeError')break;throw e}}}finally{syncing=false;emit()}}
  async function emit(){window.dispatchEvent(new CustomEvent('tandera-queue',{detail:{count:await count(),online:navigator.onLine}}))}
  window.addEventListener('online',emit);window.addEventListener('offline',emit);setTimeout(emit,0);
  return{add,all,remove,count,sync,emit};
})();
