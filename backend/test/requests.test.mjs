import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import pg from 'pg';
import { migrate } from '../src/migrations.mjs';
import { createUser } from '../src/auth.mjs';
import { createApp } from '../src/app.mjs';

test('request lifecycle across actors, tenant isolation, documents, deposit and ordered decisions',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const root=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});const schema=`requests_test_${randomUUID().replaceAll('-','')}`;let db,server;
 try {
  await root.query(`CREATE SCHEMA "${schema}"`);db=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL,options:`-c search_path=${schema}`});await migrate(db);
  const password='Testing-password-123!';const users={},cookies={};
  for(const [name,role] of [['admin','administrator'],['employer','employer'],['outsider','employer'],['processor','agent_dt'],['otherProcessor','agent_dt'],['approver','ce_cea'],['finalApprover','dt'],['director','dg'],['finance','cps']]) users[name]=await createUser(db,{email:`${name}@example.test`,displayName:name,role,password,employerName:name,cnpsNumber:name});
  server=createApp({db,logger:{error(e){console.error(e);}}});server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}/api/v1`;
  async function call(name,path,body) {const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Origin:'http://localhost:5173','Content-Type':'application/json',Cookie:cookies[name]||''},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};}
  for(const name of Object.keys(users)){const signed=await call(name,'/auth/login',{email:`${name}@example.test`,password});assert.equal(signed.status,200);cookies[name]=signed.cookie;}
  const form={contactName:'Employer contact',contactEmail:'employer@example.test',address:'Douala',reason:'Cash flow difficulty',debtAmount:'1000001',months:12,remissionRequested:false,remissionReason:'',declaration:true};
  let result=await call('employer','/requests',form);assert.equal(result.status,201,JSON.stringify(result.data));let request=result.data.request;const id=request.id;
  async function action(name,action,body={},expected=200) {const response=await call(name,`/requests/${id}/${action}`,{version:request.version,...body});assert.equal(response.status,expected,JSON.stringify(response.data));if(response.status===200) request=response.data.request;return response;}
  assert.equal((await call('outsider',`/requests/${id}`)).status,404);
  assert.equal((await call('admin',`/requests/${id}`)).status,404);
  await action('employer','submit',{},400);
  const data=Buffer.from('%PDF-1.4\nTest supporting document\n%%EOF').toString('base64');
  await action('employer','documents',{kind:'request_letter',fileName:'bad.html',data:Buffer.from('<html>bad</html>').toString('base64')},400);
  for(const kind of ['request_letter','debt_statement','deposit_proof','hardship_evidence']) await action('employer','documents',{kind,fileName:`${kind}.pdf`,data});
  const document=request.documents[0];
  assert.equal((await fetch(`${base}/documents/${document.id}/download`,{headers:{Cookie:cookies.outsider}})).status,404);
  const downloaded=await fetch(`${base}/documents/${document.id}/download`,{headers:{Cookie:cookies.employer}});assert.equal(downloaded.status,200);assert.match(downloaded.headers.get('content-disposition'),/attachment/);
  await action('employer','submit');assert.equal(request.status,'Under review');
  await action('employer','save',form,409);
  assert.equal((await call('processor','/requests')).data.total,0);
  await action('admin','assign',{processorId:users.processor.id,route:'Regional',routingBasis:'Test delegation explicitly resolves the 12-month boundary.',approvals:[{userId:users.approver.id,label:'Technical review'},{userId:users.finalApprover.id,label:'Final decision'}]});
  assert.equal((await call('otherProcessor',`/requests/${id}`)).status,404);
  await action('admin','reject',{note:'Not authorized'},403);
  await action('processor','return',{note:''},400);
  await action('processor','return',{note:'Correct the employer address.'});assert.equal(request.status,'Action required');
  await action('employer','save',{...form,address:'Corrected Douala address'});
  await action('employer','submit');
  await action('processor','recommend',{note:'Reviewed'},400);
  await action('finance','documents',{kind:'cps_opinion',fileName:'cps.pdf',data});
  await action('processor','recommend',{note:'Compared the supplied statement with the reference record manually; evidence reviewed.'});assert.equal(request.status,'Recommended');
  assert.equal((await call('approver','/requests?view=decisions')).data.total,1);
  assert.equal((await call('finalApprover','/requests?view=decisions')).data.total,0);
  await action('finalApprover','approve',{note:'Too soon',legalReference:'Delegation 1/2026'},403);
  await action('approver','approve',{note:'Decision grounds',legalReference:'Delegation 1/2026'},400);
  await action('finance','confirm-deposit',{amount:'300000',reference:'BANK-1'});
  await action('approver','approve',{note:'Decision grounds',legalReference:'Delegation 1/2026'},400);
  await action('finance','confirm-deposit',{amount:'300001',reference:'BANK-2'});
  // Approval requires the legal or delegation reference.
  await action('approver','approve',{note:'Decision grounds without a reference'},400);
  // Only the General Directorate may record a remission decision.
  await action('approver','approve',{note:'Attempted remission',legalReference:'Delegation 1/2026',remission:true,remissionRationale:'Not authorized at this stage.'},403);
  const stale=request.version;
  await action('approver','approve',{note:'First stage endorsed under delegation.',legalReference:'Delegation CE 14/2026',assessment:'Documents and proposal verified.'});
  assert.equal(request.status,'Recommended');
  const endorsed=request.approvals.find(a=>a.user_id===users.approver.id);
  assert.equal(endorsed.decided_action,'approve');
  assert.equal(endorsed.legal_reference,'Delegation CE 14/2026');
  assert.equal(endorsed.assessment,'Documents and proposal verified.');
  assert.equal(endorsed.note,'First stage endorsed under delegation.');
  assert.equal(endorsed.remission,false);
  assert.equal((await call('approver','/requests?view=decisions')).data.total,0);
  assert.equal((await call('finalApprover','/requests?view=decisions')).data.total,1);
  await action('finalApprover','approve',{version:stale,note:'Stale decision',legalReference:'Delegation DT 3/2026'},409);
  await action('finalApprover','return',{note:'Clarify repayment proposal.'});assert.equal(request.status,'Under review');assert.ok(request.approvals.every(a=>!a.approved_at));
  // A return clears the recorded grounds of every earlier stage.
  assert.ok(request.approvals.every(a=>a.decided_action===null && a.legal_reference==='' && a.note===null && a.remission===false));
  await action('processor','recommend',{note:'Proposal clarified and rechecked.'});
  await action('approver','approve',{note:'Endorsed again.',legalReference:'Delegation CE 14/2026'});
  await action('finalApprover','approve',{note:'Final approval under test delegation.',legalReference:'Delegation DT 3/2026'});assert.equal(request.status,'Approved');assert.ok(request.decidedAt);
  assert.equal(request.approvals.filter(a=>a.decided_action==='approve').length,2);
  await action('finance','confirm-deposit',{amount:'400000',reference:'BANK-3'},409);
  await action('admin','assign',{processorId:users.otherProcessor.id},409);
  assert.equal((await call('admin',`/requests/${id}`)).data.request.status,'Approved');
  assert.ok(request.history.length>=15);
  assert.ok((await call('employer','/notifications')).data.items.length>0);
  assert.equal((await call('outsider','/documents')).data.documents.length,0);
  assert.equal((await call('outsider','/requests')).data.total,0);
  const second=await call('employer','/requests',form);assert.equal(second.status,201);assert.notEqual(second.data.request.reference,request.reference);
  // Concurrent writes to a draft cannot silently overwrite each other.
  const concurrent=await Promise.all([call('employer',`/requests/${second.data.request.id}/save`,{...form,version:1}),call('employer',`/requests/${second.data.request.id}/save`,{...form,version:1})]);
  assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
  let r2=(await call('employer',`/requests/${second.data.request.id}`)).data.request;
  async function act2(name,action,fields={},expected=200) {const response=await call(name,`/requests/${r2.id}/${action}`,{version:r2.version,...fields});assert.equal(response.status,expected,JSON.stringify(response.data));if(response.status===200)r2=response.data.request;}
  await act2('employer','save',{...form,remissionRequested:true,remissionReason:'Request relief on penalties.'});
  for(const kind of ['request_letter','debt_statement','deposit_proof','hardship_evidence'])await act2('employer','documents',{kind,fileName:`${kind}.pdf`,data});
  await act2('employer','submit');
  const assignment={processorId:users.processor.id,route:'Regional',routingBasis:'Test delegation',approvals:[{userId:users.approver.id,label:'DG decision'}]};
  await act2('admin','assign',assignment,400);
  await act2('admin','assign',{...assignment,route:'General'});
  await act2('finance','documents',{kind:'cps_opinion',fileName:'opinion.pdf',data});
  await act2('processor','recommend',{note:'Submitted for decision.'});
  await act2('approver','reject',{note:''},400);
  await act2('approver','reject',{note:'Rejected with recorded grounds.',legalReference:'Delegation CE 21/2026'});
  assert.equal(r2.status,'Rejected');
  const rejected=r2.approvals.find(a=>a.user_id===users.approver.id);
  assert.equal(rejected.decided_action,'reject');
  assert.equal(rejected.legal_reference,'Delegation CE 21/2026');
  assert.equal(rejected.note,'Rejected with recorded grounds.');
  await act2('employer','save',form,409);
  // The General Directorate records the remission decision on a General route.
  const third=await call('employer','/requests',form);assert.equal(third.status,201);
  let r3=third.data.request;
  async function act3(name,action,fields={},expected=200){const response=await call(name,`/requests/${r3.id}/${action}`,{version:r3.version,...fields});assert.equal(response.status,expected,JSON.stringify(response.data));if(response.status===200)r3=response.data.request;}
  await act3('employer','save',{...form,remissionRequested:true,remissionReason:'Request relief on penalties.'});
  for(const kind of ['request_letter','debt_statement','deposit_proof','hardship_evidence'])await act3('employer','documents',{kind,fileName:`${kind}.pdf`,data});
  await act3('employer','submit');
  await act3('admin','assign',{processorId:users.processor.id,route:'General',routingBasis:'Remission delegation.',approvals:[{userId:users.director.id,label:'DG decision'}]});
  await act3('finance','documents',{kind:'cps_opinion',fileName:'cps-opinion-3.pdf',data});
  await act3('processor','recommend',{note:'Remission file reviewed.'});
  await act3('finance','confirm-deposit',{amount:'400000',reference:'BANK-4'});
  // A remission decision requires a rationale.
  await act3('director','approve',{note:'Remission granted.',legalReference:'Delegation DG 7/2026',remission:true},400);
  await act3('director','approve',{note:'Remission granted on penalties.',legalReference:'Delegation DG 7/2026',assessment:'Seasonal hardship confirmed.',remission:true,remissionRationale:'Verified seasonal hardship.'});
  assert.equal(r3.status,'Approved');
  const remission=r3.approvals.find(a=>a.user_id===users.director.id);
  assert.equal(remission.decided_action,'approve');
  assert.equal(remission.remission,true);
  assert.equal(remission.remission_rationale,'Verified seasonal hardship.');
  assert.equal(remission.legal_reference,'Delegation DG 7/2026');
  assert.equal(remission.assessment,'Seasonal hardship confirmed.');
 } finally {if(server?.listening)await new Promise(resolve=>server.close(resolve));await db?.end();await root.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await root.end();}
});
