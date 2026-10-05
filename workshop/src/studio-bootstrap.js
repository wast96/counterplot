/* Same audited script in the main page and tutorial frames. The seed is data only. */
{
  const element=document.querySelector('#studio-seed');
  if(element){
    const seed=JSON.parse(element.textContent);
    window.__COUNTERPLOT_STUDIO__=true;
    Object.defineProperty(window,'localStorage',{configurable:true,value:new class {
      constructor(){this.items=new Map(Object.entries(seed));}
      getItem(key){return this.items.get(String(key))??null;}
      setItem(key,value){this.items.set(String(key),String(value));}
      removeItem(key){this.items.delete(String(key));}
      clear(){this.items.clear();}
      key(index){return [...this.items.keys()][index]??null;}
      get length(){return this.items.size;}
    }});
  }
}
