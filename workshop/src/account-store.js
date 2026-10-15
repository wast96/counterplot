/* Resolve identity before reading private local records. Portable copies stay local. */
const CounterplotAccount = {hosted:document.documentElement.dataset.hosted==='true'&&!window.__COUNTERPLOT_STUDIO__,user:'',email:'',error:''};
const unscopedStore=CounterplotTutorialStore;
async function resolveAccountIdentity(){
  const response=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(response.ok){const identity=await response.json();CounterplotAccount.user=identity.user;CounterplotAccount.email=identity.email;}
  else if(response.status!==401)throw Error('The account service is unavailable.');
  CounterplotAccount.error='';
}
if(CounterplotAccount.hosted){
  try{await resolveAccountIdentity();}
  catch(error){
    CounterplotAccount.error=error.message;
    // Never silently open another library when identity could not be checked.
    await new Promise(resolve=>{
      const root=document.querySelector('#app');
      root.innerHTML='<section class="startup-card" aria-labelledby="startup-title"><h1 id="startup-title">Your account is temporarily unavailable</h1><p>Your saved writing has not been reset. Retry to open your account, or choose the separate stories saved on this device.</p><div class="row wrap"><button class="btn primary" id="retry-identity">Retry account connection</button><button class="btn" id="open-device-stories">Open device-only stories</button></div><p id="startup-status" role="status"></p></section>';
      const retry=document.querySelector('#retry-identity'),local=document.querySelector('#open-device-stories'),status=document.querySelector('#startup-status');
      retry.onclick=async()=>{retry.disabled=local.disabled=true;status.textContent='Checking your account…';try{await resolveAccountIdentity();resolve();}catch(error){CounterplotAccount.error=error.message;status.textContent='Still unable to connect. Your writing is safe on this device.';retry.disabled=local.disabled=false;}};
      local.onclick=()=>resolve();
    });
  }
}
if(CounterplotAccount.user){
  const prefix='counterplot.account.'+CounterplotAccount.user+'.';
  const keyFor=key=>{const result=prefix+key;unscopedStore.registerKey(result);return result;};
  CounterplotTutorialStore={...unscopedStore,
    getItem:key=>unscopedStore.getItem(keyFor(key)),
    setItem:(key,value,expected)=>unscopedStore.setItem(keyFor(key),value,expected),
    refresh:key=>unscopedStore.refresh(keyFor(key)),
    registerKey:key=>unscopedStore.registerKey(keyFor(key)),
    keys:()=>unscopedStore.keys().filter(key=>key.startsWith(prefix)).map(key=>key.slice(prefix.length)),
    legacyCopy:key=>unscopedStore.legacyCopy(keyFor(key)),
    transaction:(keys,change,options)=>unscopedStore.transaction(keys.map(keyFor),before=>{
      const logical=Object.fromEntries(keys.map(key=>[key,before[keyFor(key)]]));
      const result=change(logical)||{};return Object.fromEntries(Object.entries(result).map(([key,value])=>[keyFor(key),value]));
    },options)
  };
}
