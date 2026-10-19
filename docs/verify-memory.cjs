const { chromium } = require('C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(15000);
 // Seed the actual v1 IndexedDB schema before loading the upgraded application.
 await page.route('**/src/main.tsx*',route=>route.abort());await page.goto('http://127.0.0.1:5173');
 const legacy={key:'primary',profile:{petId:'legacy-amoo',name:'老朋友',birthday:1700000000000},state:{satiety:44,energy:66,mood:77,bond:8,currentBehavior:'idle',updatedAt:1700000000000}};
 await page.evaluate(pet=>new Promise((resolve,reject)=>{const r=indexedDB.open('amoo-desktop-p0',10);r.onupgradeneeded=()=>r.result.createObjectStore('pets',{keyPath:'key'});r.onsuccess=()=>{const db=r.result;const tx=db.transaction('pets','readwrite');tx.objectStore('pets').put(pet);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)};r.onerror=()=>reject(r.error)}),legacy);
 await page.unroute('**/src/main.tsx*');const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.reload();await page.getByText('身份与状态已写入 IndexedDB').waitFor();
 const read=()=>page.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('amoo-desktop-p0');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return new Promise((resolve,reject)=>{const r=db.transaction('pets').objectStore('pets').get('primary');r.onsuccess=()=>{db.close();resolve(r.result)};r.onerror=()=>reject(r.error)})});
 const send=async text=>{console.log('send',text);await page.getByLabel('给 Amoo 发指令').fill(text);await page.getByRole('button',{name:'发送指令',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#command').disabled)};
 let p=await read();if(JSON.stringify(p.profile)!==JSON.stringify(legacy.profile)||JSON.stringify(p.state)!==JSON.stringify(legacy.state)||p.events.length!==2||p.memories.length!==2)throw Error('Legacy migration');
 await send('喂它');await send('喂它');p=await read();if(p.events.filter(e=>e.type==='feed').length!==2||p.memories.filter(m=>m.id==='first_feed').length!==1)throw Error('Feed event / dedup');
 for(let i=0;i<7;i++)await send('陪它玩');
 p=await read();if(p.events.filter(e=>e.type==='play').length!==7||p.memories.filter(m=>m.id==='first_play').length!==1||p.memories.filter(m=>m.type==='preference').length!==1)throw Error('Preference threshold');
 await send('睡觉');const snapshot=await read();await send('你记得什么');
 if(!await page.locator('.conversation').innerText().then(t=>t.includes('你给我取名叫「老朋友」')&&t.includes('第一次喂我吃饭')&&t.includes('7 次陪玩')))throw Error('Memory response');
 if(JSON.stringify(snapshot)!==JSON.stringify(await read()))throw Error('Recall mutated or woke pet');
 await page.reload();await page.getByText('身份与状态已写入 IndexedDB').waitFor();if(JSON.stringify(snapshot)!==JSON.stringify(await read()))throw Error('History persistence');
 // A failed write must leave state, events and memories unchanged.
 await page.evaluate(()=>{const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){IDBObjectStore.prototype.put=original;throw new DOMException('Simulated storage failure','QuotaExceededError')}});
 await send('醒来');if(JSON.stringify(snapshot)!==JSON.stringify(await read()))throw Error('Failed write changed context');
 await send('醒来');p=await read();if(p.events.at(-1).type!=='wake')throw Error('Recovery after failed write');
 await page.screenshot({path:'artifacts/memory.png',fullPage:true});
 // Exercise boundary conditions of the rule with deterministic timestamps.
 const rules=await page.evaluate(async()=>{const {remember}=await import('/src/memory.ts');const make=(i,h)=>({id:String(i),type:'play',timestamp:Date.parse(`2026-10-15T${h}:00:00+08:00`)});const seven=[0,1,2,3,4,5,6].map(i=>make(i,i<5?'20':'10'));return {six:remember(seven.slice(0,6),[],seven[5]).some(m=>m.type==='preference'),five:remember(seven,[],seven[6]).some(m=>m.type==='preference'),four:remember(seven.map((e,i)=>i===4?make(i,'10'):e),[],seven[6]).some(m=>m.type==='preference')}});
 if(rules.six||!rules.five||rules.four)throw Error('Preference boundary');
 if(errors.length)throw Error(errors.join('\n'));
 const report={legacyMigration:true,identityPreserved:true,actionEvents:true,milestoneDedup:true,preference:true,memoryQueryReadOnly:true,sleepRecallDoesNotWake:true,refreshPersistence:true,failedWriteAtomic:true,retryAfterFailure:true,ruleBoundaries:rules,errors};fs.writeFileSync('docs/memory-verification.json',JSON.stringify(report,null,2));console.log(report);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
