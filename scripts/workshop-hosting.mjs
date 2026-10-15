import {createHash} from 'node:crypto';

// Keep portable files self-contained; hosted startup needs teaching text, not pictures.
export function hostedBundle(portable) {
  let media='',asset='';
  const html=portable.replace('<html lang="en">','<html lang="en" data-hosted="true">').replace(/<script type="application\/json" id="tutorial-data">([\s\S]*?)<\/script>/,(_,json)=>{
    media=json;
    asset='tutorial-media.'+createHash('sha256').update(media).digest('hex').slice(0,16)+'.json';
    const lean=JSON.stringify(JSON.parse(json),(key,value)=>['portrait','image'].includes(key)&&typeof value==='string'&&value.startsWith('data:image/')?'':value).replace(/</g,'\\u003c');
    return `<script type="application/json" id="tutorial-data" data-media-src="/${asset}">${lean}</script>`;
  });
  return {html,asset,media};
}
