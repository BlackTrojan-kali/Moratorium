import {canonicalJSON} from '../src/actor-utils.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import pg from 'pg';
import {migrate} from '../src/migrations.mjs';
import {createUser,digest,roles} from '../src/auth.mjs';
import {createApp} from '../src/app.mjs';
import {allocate} from '../src/payments.mjs';

test('allocation preserves exact XAF and handles partial, reversed and future payments',()=>{
 const inst=[{id:'a',amount_xaf:'9007199254740990',due_date:'2020-01-01'},{id:'b',amount_xaf:'1',due_date:'2020-02-01'}];
 const rows=allocate(inst,[{amount_xaf:'9007199254740989',paid_on:'2020-01-01'},{amount_xaf:'1',paid_on:'2030-01-01'},{amount_xaf:'100',paid_on:'2020-01-01',reversed_at:'2020-02-01'}],'2020-03-01');
 assert.equal(rows[0].outstanding,'1');assert.equal(rows[0].status,'Overdue');assert.equal(rows[1].amountPaid,'0');
});

test('all actor features: settings, administration, scopes, schedule approval, payments, defaults, archives, reports',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const root=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL}),schema='actors_'+randomUUID().replaceAll('-','');let db,server;
 try{
  await root.query(`CREATE SCHEMA "${schema}"`);db=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL,options:`-c search_path=${schema}`});await migrate(db);
  const users={},cookies={};const password='Actor-testing-pass-123!';
  for(const [name,role] of [['employer','employer'],['outsider','employer'],['processor','agent_dt'],['approver','dt'],['finance','cps'],['administrator','administrator']])users[name]=await createUser(db,{email:name+'@example.test',displayName:name,role,password,employerName:name,cnpsNumber:name});
  server=createApp({db});server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}/api/v1`;
  async function call(role,path,body){const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Origin:'http://localhost:5173','Content-Type':'application/json',Cookie:cookies[role]||''},body:body===undefined?undefined:JSON.stringify(body)});const data=r.headers.get('content-type')?.includes('json')?await r.json():await r.text();return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
  for(const role of Object.keys(users)){cookies[role]=(await call(role,'/auth/login',{email:role+'@example.test',password})).cookie;assert.equal((await call(role,'/settings/account')).status,200);assert.equal((await call(role,'/dashboard')).status,200);}
  let settings=(await call('employer','/settings/account')).data;
  assert.equal((await call('employer','/settings/account',{section:'account',version:settings.version,csrfToken:'wrong',values:{displayName:'New'}})).status,403);
  let changed=await call('employer','/settings/account',{section:'account',version:settings.version,csrfToken:settings.csrfToken,values:{displayName:'Changed name',phone:'+237 600000000'}});assert.equal(changed.status,200,JSON.stringify(changed));assert.equal(changed.data.account.displayName,'Changed name');
  assert.equal((await call('employer','/settings/account',{section:'account',version:settings.version,csrfToken:settings.csrfToken,values:{displayName:'Stale'}})).status,409);
  settings=changed.data;
  assert.equal((await call('employer','/settings/account',{section:'account',version:settings.version,csrfToken:settings.csrfToken,values:{role:'administrator'}})).status,400);
  assert.equal((await call('employer','/settings/account',{section:'preferences',version:settings.version,csrfToken:settings.csrfToken,values:{language:'en',theme:'dark',dateFormat:'yyyy-MM-dd'}})).status,200);
  for(const role of ['employer','processor','approver','finance'])assert.equal((await call(role,'/admin/roles')).status,403);
  assert.equal((await call('administrator','/admin/roles')).data.roles.length,roles.length);
  const permissions=(await call('administrator','/admin/roles/cps/permissions')).data;assert.equal(permissions.canEdit,false);assert.equal(permissions.areas.find(a=>a.id==='payments').permissions.find(p=>p.action==='reconcile').enabled,true);assert.equal((await call('employer','/admin/roles/cps/permissions')).status,403);assert.equal((await call('administrator','/admin/roles/cps/permissions',{changes:[]})).status,403);
  assert.equal((await call('administrator','/admin/reference-data',{code:'CPS-1',name:'Douala',active:true})).status,200);
  const centre=(await call('administrator','/admin/reference-data')).data.items[0];
  assert.equal((await call('administrator','/admin/reference-data',{...centre,name:'Updated'})).status,200);
  assert.equal((await call('administrator','/admin/reference-data',{...centre,name:'Stale'})).status,409);
  const template=(await call('administrator','/admin/templates')).data.items[0];assert.equal((await call('administrator','/admin/templates',{...template,title:'Updated title'})).status,200);
  const centreOptions=(await call('administrator','/admin/centres/options')).data;
  const centreInput={values:{code:'CENTRE-API',name:'Centre API test',regionCode:'LT',statusCode:'active',address:'Douala'},csrfToken:centreOptions.csrfToken,idempotencyKey:randomUUID()};
  const centreCreated=await call('administrator','/admin/centres',centreInput);assert.equal(centreCreated.status,201,JSON.stringify(centreCreated));
  assert.equal((await call('administrator','/admin/centres',centreInput)).data.id,centreCreated.data.id);
  assert.equal((await call('employer','/admin/centres')).status,403);
  assert.equal((await call('administrator','/admin/centres?q=CENTRE-API')).data.total,1);
  assert.equal((await call('administrator','/admin/reference-data',{operation:'assign-staff',userId:users.processor.id,centreId:centreCreated.data.id,version:1})).status,200);
  assert.equal((await call('administrator','/admin/centres/'+centreCreated.data.id)).data.staff[0].id,users.processor.id);
  assert.equal((await call('processor','/settings/account')).data.account.organisation,'Centre API test');
  const employerId=users.employer.employerId;
  assert.equal((await call('administrator','/admin/reference-data',{operation:'assign-employer',employerId,centreId:centre.id,version:1})).status,200);
  async function approved(ref){const id=randomUUID();await db.query("INSERT INTO moratorium_requests(id,reference,employer_id,created_by,status,debt_amount_xaf,proposed_months,form,processor_id,deposit_amount_xaf,deposit_reference,deposit_confirmed_by,deposit_confirmed_at,submitted_at,decided_at) VALUES($1,$2,$3,$4,'Approved',1000001,3,'{}',$5,300001,$6,$7,NOW(),NOW(),NOW())",[id,ref,employerId,users.employer.id,users.processor.id,'ADV-'+ref,users.finance.id]);await db.query("INSERT INTO request_approvals(request_id,position,user_id,label,approved_at) VALUES($1,1,$2,'Final',NOW())",[id,users.approver.id]);return id;}
  const id=await approved('TEST-1');const path='/payment-plans/'+id;const schedule={version:1,termsReference:'Signed schedule reference',instalments:[{dueDate:'2020-01-31',amount:'233334'},{dueDate:'2020-02-29',amount:'233333'},{dueDate:'2020-03-31',amount:'233333'}]};
  for(const role of ['employer','processor','approver','administrator'])assert.equal((await call(role,path+'/schedule',schedule)).status,403);
  assert.equal((await call('outsider',path+'/schedule',schedule)).status,404);
  assert.equal((await call('finance',path+'/schedule',{...schedule,instalments:[...schedule.instalments.slice(0,2),{dueDate:'2020-03-31',amount:'233334'}]})).status,400);
  let response=await call('finance',path+'/schedule',schedule);assert.equal(response.status,200,JSON.stringify(response));let plan=response.data;assert.equal(plan.state,'Draft');
  const action=async(role,name,body={},status=200)=>{const r=await call(role,path+'/'+name,{version:plan.version,...body});assert.equal(r.status,status,JSON.stringify(r));if(r.status===200)plan=r.data;return r;};
  await action('finance','activate',{note:'Cannot self approve'},403);
  await action('approver','activate',{note:'Dates and amounts validated.'});assert.equal(plan.state,'Active');
  for(const role of ['employer','processor','approver','finance','administrator'])assert.equal((await call(role,path)).status,200);
  assert.equal((await call('outsider',path)).status,404);assert.equal((await call('outsider','/payment-plans')).data.total,0);
  await action('finance','observe',{amount:'100000',reference:'ADV-TEST-1',paidOn:'2020-01-31',evidence:'Statement'},409);
  await action('employer','observe',{amount:'1',reference:'X',paidOn:'2020-01-31',evidence:'Statement'},403);
  await action('finance','observe',{amount:'100000',reference:'PAY-1',paidOn:'2020-01-31',evidence:'TOMPRO statement manually verified'});assert.equal(plan.instalments[0].amountPaid,'100000');
  await action('finance','observe',{amount:'100000',reference:'PAY-1',paidOn:'2020-01-31',evidence:'duplicate'},409);
  await action('finance','reconcile',{through:'2020-02-01',complete:true,evidence:'Complete statement'},409);
  const config=(await call('administrator','/admin/config')).data;
  assert.equal((await call('administrator','/admin/config',{...config,grace_days:5,support_contact:'support@example.test',basis:'Approved policy for test'})).status,200);
  assert.equal((await call('employer','/help')).data.supportContact,'support@example.test');
  await action('finance','reconcile',{through:'2020-02-10',complete:true,evidence:'Complete statement'});assert.equal(plan.defaults.length,1);assert.equal(plan.state,'Overdue');
  await action('finance','reconcile',{through:'2020-02-10',complete:true,evidence:'Rechecked statement'});assert.equal(plan.defaults.length,1);
  await action('processor','follow-up',{note:'Telephone contact recorded; payment expected.',deadline:'2020-02-20'});assert.equal(plan.notes.length,1);
  await action('finance','observe',{amount:'600001',reference:'TOO-MUCH',paidOn:'2020-02-11',evidence:'Statement'},400);
  await action('finance','observe',{amount:'600000',reference:'PAY-2',paidOn:'2020-02-11',evidence:'Statement'});assert.equal(plan.state,'Completed');assert.equal(plan.balance,'0');assert.equal(plan.archives.length,1);
  assert.equal((await call('outsider',path+'/archive/'+plan.archives[0].id)).status,404);
  const archive=await call('administrator',path+'/archive/'+plan.archives[0].id);assert.equal(archive.data.snapshot.state,'Completed');assert.equal(digest(canonicalJSON(archive.data.snapshot)),archive.data.sha256);
  const pay2=plan.payments.find(p=>p.reference==='PAY-2');await action('finance','reverse',{paymentId:pay2.id,note:'Incorrect accounting observation'});assert.equal(plan.state,'Active');assert.equal(plan.balance,'600000');assert.equal(plan.archives.length,1);
  await action('finance','reverse',{paymentId:pay2.id,note:'Duplicate reverse'},409);
  await action('finance','reconcile',{through:'2020-04-10',complete:true,evidence:'Verified complete statement'});assert.equal(plan.state,'Defaulted');assert.equal(plan.defaults.length,3);assert.equal(plan.archives.length,2);
  await action('finance','observe',{amount:'1',reference:'LATE',paidOn:'2020-04-10',evidence:'Statement'},409);
  assert.equal((await call('administrator','/reports?centre='+centre.id)).data.total,1);assert.equal((await call('administrator','/reports?centre='+randomUUID())).data.total,0);assert.equal((await call('administrator','/reports')).data.total,1);assert.equal((await call('administrator','/reports')).data.recovered,'100000');
  assert.equal((await call('finance','/reports?from=2030-01-01')).data.total,0);
  for(const role of ['employer','processor','approver']){assert.equal((await call(role,'/reports')).status,403);assert.equal((await call(role,'/exports')).status,403);assert.equal((await call(role,'/audit')).status,403);}
  assert.ok((await call('administrator','/audit')).data.items.some(e=>e.action==='payments_reconciled'));
  const exported=await call('administrator','/exports');assert.equal(exported.status,200);assert.match(exported.data,/TEST-1/);
  assert.equal((await call('employer','/correspondence/'+id+'/approval')).status,200);
  assert.equal((await call('outsider','/correspondence/'+id+'/approval')).status,404);
  const draft=await call('employer','/requests',{reason:'Private draft'});assert.equal(draft.status,201);assert.equal((await call('administrator','/audit?q='+draft.data.request.reference)).data.total,0);
 }finally{if(server)await new Promise(resolve=>server.close(resolve));await db?.end();await root.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await root.end();}
});
