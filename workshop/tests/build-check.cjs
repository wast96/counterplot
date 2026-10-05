const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.join(__dirname,'..'),ctx=vm.createContext({crypto:require('node:crypto').webcrypto,URL});
vm.runInContext(['core','vocabulary','content'].map(x=>fs.readFileSync(path.join(dir,'src',x+'.js'),'utf8')).join('\n')+'\nthis.fixture=exampleWorkspace();',ctx);
const data=JSON.parse(JSON.stringify(ctx.fixture));data.saveKey='counterplot.qa.colors.20261003';data.projects[0].title='Workshop improvements · test';
const html=fs.readFileSync(path.join(dir,'Counterplot Workshop.html'),'utf8').replace('<script type="application/json" id="embedded-workspace">null</script>','<script type="application/json" id="embedded-workspace">'+JSON.stringify(data).replace(/</g,'\\u003c')+'</script>');fs.writeFileSync(path.join(__dirname,'features-check.html'),html);
