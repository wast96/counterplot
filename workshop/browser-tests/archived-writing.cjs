// Keep the archived views exercised without enabling them in the published app.
const {createHash}=require('node:crypto');
module.exports=async function enableArchivedWriting(page,{drafting=true,choices=false}={}){
 await page.route('http://127.0.0.1:8791/',async route=>{
  const response=await route.fetch(),html=await response.text(),flag='Object.freeze({drafting:false,choices:false})';
  const script=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].find(m=>m[1].includes(flag))?.[1];
  if(!script)throw Error('The archived writing feature switch is missing.');
  const enabled=script.replace(flag,`Object.freeze({drafting:${drafting},choices:${choices}})`),hash=s=>createHash('sha256').update(s).digest('base64'),headers=response.headers();
  headers['content-security-policy']=headers['content-security-policy'].replace(hash(script),hash(enabled));
  await route.fulfill({response,headers,body:html.replace(script,()=>enabled)});
 });
};
