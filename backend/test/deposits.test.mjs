import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import pg from 'pg';
import {migrate} from '../src/migrations.mjs';
import {createUser} from '../src/auth.mjs';
import {createApp} from '../src/app.mjs';

test('employer deposit API: retries, ownership, stale updates, attachments, corrections and immutable receipts',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const root=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});const schema='deposits_'+randomUUID().replaceAll('-','');let db,server;
 try {
  await root.query(`CREATE SCHEMA "${schema}"`);db=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL,options:`-c search_path=${schema}`});await migrate(db);
  const users={},cookies={},tokens={};const password='Deposit-test-pass-123!';
  for(const [name,role] of [['employer','employer'],['outsider','employer'],['administrator','administrator'],['processor','agent_dt'],['approver','ce_cea'],['finance','cps']]) users[name]=await createUser(db,{email:name+'@example.test',displayName:name,role,password,employerName:name,cnpsNumber:name});
  server=createApp({db});server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}/api/v1`;
  async function call(role,path,method='GET',body,headers={}) {
   const r=await fetch(base+path,{method,headers:{Origin:'http://localhost:5173','Content-Type':'application/json',Cookie:cookies[role]||'','X-CSRF-Token':tokens[role]||'',...headers},body:body===undefined?undefined:JSON.stringify(body)});
   return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
  }
  for(const role of Object.keys(users)){const r=await call(role,'/auth/login','POST',{email:role+'@example.test',password});cookies[role]=r.cookie;}
  const options=await call('employer','/deposits/options');assert.equal(options.status,200);tokens.employer=options.data.csrfToken;
  tokens.outsider=(await call('outsider','/deposits/options')).data.csrfToken;
  for(const role of ['administrator','processor','approver','finance']) assert.equal((await call(role,'/deposits')).status,403);
  const input={typeCode:'moratorium',contactName:'Contact',contactEmail:'contact@example.test',address:'Douala',debtAmount:'1000000',advanceAmount:'300000',reason:'Temporary cash flow difficulty',months:6,remissionReason:''};
  const key=randomUUID();const headers={'Idempotency-Key':key};
  assert.equal((await call('employer','/deposits','POST',input,{...headers,'X-CSRF-Token':'invalid'})).status,403);
  const concurrent=await Promise.all([call('employer','/deposits','POST',input,headers),call('employer','/deposits','POST',input,headers)]);
  assert.ok(concurrent.every(r=>r.status===201),JSON.stringify(concurrent));assert.equal(concurrent[0].data.id,concurrent[1].data.id);
  let r=concurrent[0].data;const path='/deposits/'+r.id;
  assert.equal((await call('employer','/deposits','POST',{...input,reason:'Changed'},headers)).status,409);
  assert.equal((await call('outsider',path)).status,404);
  const draftCount=async()=>(await call('employer','/deposits?status=Draft')).data.total;
  const scratch=(await call('employer','/deposits','POST',{...input,reason:'Scratch draft'},{'Idempotency-Key':randomUUID()})).data;
  assert.equal(scratch.permissions.discard,true);assert.equal(await draftCount(),2);
  assert.equal((await call('employer','/deposits/'+scratch.id,'DELETE',undefined,{'If-Match':'"9"'})).status,409);
  assert.equal((await call('outsider','/deposits/'+scratch.id,'DELETE',undefined,{'If-Match':`"${scratch.version}"`})).status,404);
  const dropped=await call('employer','/deposits/'+scratch.id,'DELETE',undefined,{'If-Match':`"${scratch.version}"`});
  assert.equal(dropped.status,200,JSON.stringify(dropped));assert.deepEqual(dropped.data,{deleted:scratch.id});
  assert.equal((await call('employer','/deposits/'+scratch.id)).status,404);assert.equal(await draftCount(),1);
  for(const table of ['request_documents','request_events','request_submission_receipts']) assert.equal((await db.query(`SELECT count(*) FROM ${table} WHERE request_id=$1`,[scratch.id])).rows[0].count,'0',table);
  assert.equal((await db.query('SELECT count(*) FROM request_idempotency WHERE user_id=$1',[users.employer.id])).rows[0].count,'1');
  assert.equal((await db.query('SELECT count(*) FROM audit_events WHERE action=$1',['draft.deleted:'+scratch.reference])).rows[0].count,'1');
  const version=()=>({'If-Match':`"${r.version}"`});
  const change=async(suffix,method,body,expected=200,extra={})=>{const result=await call('employer',path+suffix,method,body,{...version(),...extra});assert.equal(result.status,expected,JSON.stringify(result));if(result.data.id)r=result.data;return result.data;};
  assert.equal((await change('/validate','POST',{})).valid,false);
  await change('','PUT',{...input,address:'New address'});
  await change('','PUT',input,409,{'If-Match':'"1"'});
  const data=Buffer.from('%PDF-1.4\nTest\n%%EOF').toString('base64');
  await change('/documents','POST',{kind:'cps_opinion',fileName:'office.pdf',data},403);
  await change('/documents','POST',{kind:'other',fileName:'bad.pdf',data:Buffer.from('<html>no</html>').toString('base64')},400);
  for(const kind of ['request_letter','debt_statement','deposit_proof','hardship_evidence']) await change('/documents','POST',{kind,fileName:kind+'.pdf',data});
  const first=r.documents[0];
  assert.equal((await fetch(base+path+'/documents/'+first.id+'/content',{headers:{Cookie:cookies.outside||cookies.outsider}})).status,404);
  assert.equal((await fetch(base+path+'/documents/'+first.id+'/content',{headers:{Cookie:cookies.employer}})).status,200);
  const listed=await call('employer','/deposits/documents?q=debt_statement');assert.equal(listed.data.total,1);assert.equal(listed.data.items[0].depositId,r.id);
  await change('/documents/'+first.id,'DELETE');assert.equal(r.documents.length,3);
  await change('/documents','POST',{kind:'request_letter',fileName:'letter.pdf',data});
  assert.equal((await change('/validate','POST',{})).valid,true);
  const submitHeaders={...version(),'Idempotency-Key':randomUUID()};
  const submitted=await call('employer',path+'/submit','POST',{declaration:true},submitHeaders);assert.equal(submitted.status,200,JSON.stringify(submitted));r=submitted.data.deposit;
  const receipt=submitted.data.receipt;assert.equal(receipt.documents.length,4);assert.equal(receipt.fields.address,'New address');
  assert.deepEqual((await call('employer',path+'/submit','POST',{declaration:true},submitHeaders)).data,submitted.data);
  await change('','PUT',input,409);
  for(const role of ['administrator','finance']) assert.equal((await call(role,'/requests/'+r.id)).status,200);
  async function staff(role,action,body){const current=(await call(role,'/requests/'+r.id)).data.request;const result=await call(role,'/requests/'+r.id+'/'+action,'POST',{version:current.version,...body});assert.equal(result.status,200,JSON.stringify(result));}
  await staff('administrator','assign',{processorId:users.processor.id,route:'Centre',routingBasis:'Test delegation',approvals:[{userId:users.approver.id,label:'Decision'}]});
  await staff('processor','return',{note:'Correct the debt explanation.'});
  r=(await call('employer',path)).data;assert.deepEqual(r.corrections,['Correct the debt explanation.']);
  await change('','PUT',{...input,reason:'Corrected explanation'});
  assert.deepEqual(r.receipt,receipt);assert.equal(r.fields.reason,'Corrected explanation');
  const again=await change('/submit','POST',{declaration:true},200,{'Idempotency-Key':randomUUID()});assert.equal(again.receipt.fields.reason,'Corrected explanation');
  assert.equal((await call('employer','/deposits?status=Under%20review')).data.total,1);
  assert.equal((await call('employer',path,'DELETE',undefined,version())).status,409);
  const receipts=(await db.query('SELECT receipt FROM request_submission_receipts WHERE request_id=$1 ORDER BY request_version',[r.id])).rows;
  assert.equal(receipts.length,2);assert.deepEqual(receipts[0].receipt,receipt);
 } finally {if(server)await new Promise(resolve=>server.close(resolve));await db?.end();await root.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await root.end();}
});
