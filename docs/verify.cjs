const { chromium } = require('C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 const context = await browser.newContext({viewport:{width:1440,height:1100}});
 let page = await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173');
 await page.getByLabel('给它取个名字').fill('Amoo 验收');
 await page.getByRole('button',{name:'与 Amoo 初次见面 →'}).click();
 await page.getByText('身份与状态已写入 IndexedDB').waitFor();
 const read=()=>page.evaluate(async()=>{const d=await new Promise((resolve,reject)=>{const r=indexedDB.open('amoo-desktop-p0');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return new Promise((resolve,reject)=>{const r=d.transaction('pets').objectStore('pets').get('primary');r.onsuccess=()=>{d.close();resolve(r.result)};r.onerror=()=>reject(r.error)})});
 const initial=await read();
 await page.reload();await page.getByText('身份与状态已写入 IndexedDB').waitFor();
 if(JSON.stringify(initial)!==JSON.stringify(await read()))throw Error('Reload persistence failed');
 await page.close();page=await context.newPage();await page.goto('http://127.0.0.1:5173');await page.getByText('身份与状态已写入 IndexedDB').waitFor();
 if(JSON.stringify(initial)!==JSON.stringify(await read()))throw Error('Reopen persistence failed');
 const media=[];
 for(const name of ['待机','游动','吃饭','玩耍','开心','睡觉']){
  await page.getByRole('button',{name:new RegExp(name+' ')}).click();
  await page.locator('video').evaluate(v=>new Promise((resolve,reject)=>{if(v.readyState>=2)return resolve();v.addEventListener('loadeddata',resolve,{once:true});v.addEventListener('error',()=>reject(Error('Video decode failed')),{once:true})}));
  media.push(await page.locator('video').evaluate(v=>({src:v.getAttribute('src'),width:v.videoWidth,height:v.videoHeight,duration:v.duration,loop:v.loop,decoded:v.readyState>=2})));
 }
 if(JSON.stringify(initial)!==JSON.stringify(await read()))throw Error('Preview changed pet state');
 await page.getByRole('button',{name:/待机 /}).click();
 fs.mkdirSync('artifacts',{recursive:true});await page.screenshot({path:'artifacts/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');
 await page.screenshot({path:'artifacts/mobile.png',fullPage:true});
 const report={creation:true,reload:true,reopen:true,previewPreservesState:true,mobileOverflow:false,errors,media};
 fs.writeFileSync('docs/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 await browser.close();if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
