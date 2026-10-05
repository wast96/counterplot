/* Resolve identity before reading private local records. Portable copies stay local. */
const CounterplotAccount = {hosted:document.documentElement.dataset.hosted==='true'&&!window.__COUNTERPLOT_STUDIO__,user:'',email:'',error:''};
const unscopedStore=CounterplotTutorialStore;
if(CounterplotAccount.hosted){
  try{const response=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});if(response.ok){const identity=await response.json();CounterplotAccount.user=identity.user;CounterplotAccount.email=identity.email;}else if(response.status!==401)throw Error('The account service is unavailable.');}
  catch(error){CounterplotAccount.error=error.message;}
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
