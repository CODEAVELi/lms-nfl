const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
function context(storage={}){
 const ctx=vm.createContext({console,window:{},localStorage:{getItem:k=>storage[k]||null}});
 for(const f of ['data/week1-2026.js','tracker.js','companion.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
 return {ctx,run:c=>vm.runInContext(c,ctx)};
}
const sheets=[{name:'Entries',rows:[['Name','Week 1','Week 14 - Pick 1','Week 14 - Pick 2','Week 17 - Pick 1','Week 17 - Pick 2','Week 17 - Pick 3'],['Entry A','Chiefs','Chiefs','Bills','Chiefs','Bills','49ers'],['Entry B','No Pick','Chiefs','49ers','Chiefs','49ers','Seahawks'],['Entry C','Bills','','','','','']]}];
test('detects populated weeks and two/three pick headers; blank rows have an explicit policy',()=>{
 const {ctx,run}=context();ctx.sheets=sheets;
 assert.equal(run('detectWorkbookSheets(sheets)[0].weeks.length'),3);
 assert.equal(run('workbookPreview(sheets,"Entries",14,2026).week.requiredPicks'),2);
 assert.equal(run('workbookPreview(sheets,"Entries",17,2026).week.requiredPicks'),3);
 assert.equal(run('workbookPreview(sheets,"Entries",14,2026).incomplete'),1);
 assert.equal(run('workbookPreview(sheets,"Entries",14,2026,true).week.entries.length'),2);
 assert.equal(run('workbookPreview(sheets,"Entries",1,2026).noPickCount'),1);
});
test('invalid team, duplicate names and duplicate picks block workbook application',()=>{
 const {ctx,run}=context();ctx.sheets=[{name:'Entries',rows:[['Name','Week 14 - Pick 1','Week 14 - Pick 2'],['A','Chiefs','KC'],['A','Bogus','Bills']]}];
 const errors=run('workbookPreview(sheets,"Entries",14,2026).errors').join(' ');
 assert.match(errors,/same team/);assert.match(errors,/duplicate entry/);assert.match(errors,/unknown team/);
});
test('matching summary validates; a changed count blocks application',()=>{
 const {ctx,run}=context();ctx.sheets=[...sheets,{name:'Counts',rows:[['Week 1','Count of Week 1'],['Chiefs',1],['Bills',1],['No Pick',1],['Grand Total',3]]}];
 assert.equal(run('workbookPreview(sheets,"Entries",1,2026).reconciliation'),'Summary matched');
 ctx.sheets[1].rows[1][1]=2;
 assert.equal(run('workbookPreview(sheets,"Entries",1,2026).errors.length'),1);
});
test('what-if accounts for existing elimination overlap and does not mutate actual results',()=>{
 const {ctx,run}=context();ctx.sheets=sheets;
 run('var week=workbookPreview(sheets,"Entries",14,2026,true).week; week.teams.find(t=>t.team==="Bills").result=RESULT.Lose');
 assert.equal(run('teamExposure(week,"Chiefs").count'),2);
 assert.equal(run('teamExposure(week,"Chiefs").additionalOut'),1);
 assert.equal(run('teamExposure(week,"Chiefs").remaining'),0);
 assert.equal(run('calculateWeek(week).eliminated'),1);
 assert.equal(run('teamExposure({...week,entries:[],totalsMode:"teams"},"Chiefs").exact'),false);
});
test('watchlist handles malformed storage and preserves season/week isolation',()=>{
 const {run}=context({'lmsNFL.watchlist.v1':JSON.stringify({'2026:2:1':['KC','Chiefs','bogus'],'2025:2:11':['BUF']})});
 assert.equal(run('readWatchlists()["2026:2:1"].length'),1);
 assert.equal(run('readWatchlists()["2025:2:11"][0]'),'BUF');
 assert.equal(context({'lmsNFL.watchlist.v1':'broken'}).run('Object.keys(readWatchlists()).length'),0);
});
test('recaps contain aggregate outcomes only and never carry the new prize into the archive',()=>{
 const {ctx,run}=context();ctx.sheets=sheets;
 const recap=run('recapModel(workbookPreview(sheets,"Entries",1,2026).week)');
 assert.equal(recap.prize,'$390,000');assert.equal(recap.out,1);assert.equal(recap.provisional,true);
 assert(!JSON.stringify(recap).includes('Entry A'));
 assert.equal(run('recapModel(DEFAULT_WEEK11).prize'),null);
});
test('worker rejects oversized sheet ranges and reports corrupt workbooks',()=>{
 let message;const ctx=vm.createContext({importScripts(){},self:{postMessage:m=>message=m},XLSX:{read:()=>({SheetNames:['Large'],Sheets:{Large:{'!ref':'A1:CV30000'}}}),utils:{decode_range:()=>({e:{r:29999,c:99}})}}});
 vm.runInContext(fs.readFileSync(path.join(root,'workbook-worker.js'),'utf8'),ctx);
 ctx.self.onmessage({data:new ArrayBuffer(0)});assert.match(message.error,/20,000/);
 ctx.XLSX.read=()=>{throw Error('Corrupt file')};ctx.self.onmessage({data:new ArrayBuffer(0)});assert.equal(message.error,'Corrupt file');
});
