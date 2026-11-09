import {centreRoute} from './centres.mjs';
import {defaultHelpContent} from './help-content.mjs';
import {randomUUID} from 'node:crypto';
import {currentUser,fail,transaction,digest,sessionToken,roles} from './auth.mjs';
import {scope,visible} from './requests.mjs';
import {requireRole,text,version,page,audit,csv,date} from './actor-utils.mjs';

const decisionRoles=['ce_cea','s_dct','dt','dg'];
const roleLabels={employer:'Employer representative',agent_dt:'AGENT (DT)',ce_cea:'CE / CEA',s_dct:'S-DCT',dt:'DT — Directeur Technique',dg:'DG — Directeur Général',cps:'CPS',administrator:'System administrator'};
const roleDescriptions={employer:'Own organization: draft, submit, correct, download and track requests and schedules.',agent_dt:'Handles assigned files, checks completeness, compares supporting data, drafts notes and prepares letters.',ce_cea:'Analyses the AGENT (DT) notes, gives an opinion and coordinates exchanges with CPS.',s_dct:'Assesses and endorses notes and draft letters.',dt:'Validates notes, signs acceptance and rejection letters, and endorses draft remise gracieuse decisions.',dg:'Makes the final decision on DT notes and signs remise gracieuse decisions.',cps:'Issues the reasoned opinion, follows local moratorium execution and submits tracking information.',administrator:'Manage accounts, assignment and delegation references, reference centres, correspondence templates and system configuration.'};
const token=req=>digest('account-settings:'+sessionToken(req));
async function account(db,user,req){
 const employer=user.employer_id?(await db.query('SELECT name,cnps_number FROM employers WHERE id=$1',[user.employer_id])).rows[0]:null;
 const centre=user.centre_id?(await db.query('SELECT name FROM reference_centres WHERE id=$1',[user.centre_id])).rows[0]:null;
 return {version:String(user.settings_version),csrfToken:token(req),account:{displayName:user.display_name,email:user.email,phone:user.phone,organisation:employer?.name||centre?.name||null,officialIdentifier:employer?.cnps_number||null,editable:user.role==='employer'?['displayName','phone','organisation','officialIdentifier']:['displayName','phone']},security:{canChangePassword:true,minimumLength:12,maximumLength:128,requirements:['Use between 12 and 128 characters.']},
 notifications:[{id:'workflow',label:'Workflow and payment notices',description:'Required notices are delivered inside SIFOR. Email delivery is not configured.',channels:[{id:'in-app',label:'In app',enabled:true,editable:false,required:true}]}],preferences:user.preferences,
 options:{languages:[{value:'en',label:'English'},{value:'fr',label:'Français'}],dateFormats:[{value:'dd/MM/yyyy',label:'Day / month / year'},{value:'yyyy-MM-dd',label:'Year-month-day'}]}};
}
function range(url,args,column){let sql='';for(const [key,operator] of [['from','>='],['to','<=']]){const value=url.searchParams.get(key);if(value){args.push(date(value));sql+=` AND ${column}::date${operator}$${args.length}::date`;}}if(url.searchParams.get('from')>url.searchParams.get('to')&&url.searchParams.has('to'))fail(400,'The start date must not follow the end date.');return sql;}

export async function actorRoute({db,req,res,path,body,send}) {
 const user=await currentUser(db,req);const url=new URL(req.url,'http://localhost');
 if(path==='/api/v1/settings/account'){
  if(req.method==='GET')return send(200,await account(db,user,req));
  if(req.method!=='POST')fail(405,'Method not allowed.');
  if(body.csrfToken!==token(req))fail(403,'Reload settings to authorize this change.');
  await transaction(db,async client=>{
   const current=(await client.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[user.id])).rows[0];version(body,{version:current.settings_version});
   if(body.section==='account'){
    const employerFields=user.role==='employer';
    const allowed=employerFields?['displayName','phone','organisation','officialIdentifier']:['displayName','phone'];
    if(!body.values||Object.keys(body.values).some(k=>!allowed.includes(k)))fail(400,employerFields?'Only your name, phone number and organisation details can be changed here.':'Only your name and phone number can be changed here.');
    const name=body.values.displayName===undefined?current.display_name:text(body.values.displayName,'Name',120);
    const phone=body.values.phone===undefined?current.phone:body.values.phone===null||body.values.phone===''?null:text(body.values.phone,'Phone',40);
    await client.query('UPDATE users SET display_name=$1,phone=$2 WHERE id=$3',[name,phone,user.id]);
    if(employerFields&&(body.values.organisation!==undefined||body.values.officialIdentifier!==undefined)){
      const employer=(await client.query('SELECT * FROM employers WHERE id=$1 FOR UPDATE',[user.employer_id])).rows[0];
      if(!employer)fail(404,'Employer record not found.');
      const organisation=body.values.organisation===undefined?employer.name:text(body.values.organisation,'Organisation',200);
      // An empty CNPS number means "not recorded yet", not an empty identifier.
      const cnps=body.values.officialIdentifier===undefined?employer.cnps_number:body.values.officialIdentifier===null||body.values.officialIdentifier===''?null:text(body.values.officialIdentifier,'CNPS number',80);
      await client.query('UPDATE employers SET name=$1,cnps_number=$2,version=version+1 WHERE id=$3',[organisation,cnps,employer.id]);
    }
   }else if(body.section==='preferences'){
    const v=body.values;if(!v||!['en','fr'].includes(v.language)||!['light','dark','system'].includes(v.theme)||!['dd/MM/yyyy','yyyy-MM-dd'].includes(v.dateFormat))fail(400,'Select a supported language, appearance and date format.');
    await client.query('UPDATE users SET preferences=$1 WHERE id=$2',[{language:v.language,theme:v.theme,dateFormat:v.dateFormat},user.id]);
   }else if(body.section==='notifications'){
    if(!Array.isArray(body.values)||body.values.length!==1||body.values[0]?.id!=='workflow'||body.values[0]?.channels?.length!==1||body.values[0]?.channels[0]?.id!=='in-app'||body.values[0]?.channels[0]?.enabled!==true)fail(400,'Required service notices must remain enabled.');
   }else fail(400,'Unknown settings section.');
   await client.query('UPDATE users SET settings_version=settings_version+1 WHERE id=$1',[user.id]);await audit(client,user,'account.settings_updated:'+body.section);
  });return send(200,await account(db,await currentUser(db,req),req));
 }
 if(path==='/api/v1/dashboard'&&req.method==='GET'){
  const s=scope(user);const counts=(await db.query(`SELECT status,count(*)::int AS count FROM moratorium_requests r WHERE ${s.sql} GROUP BY status ORDER BY status`,s.args)).rows;
  const recent=(await db.query(`SELECT r.id,r.reference,r.status,r.updated_at,e.name AS employer FROM moratorium_requests r JOIN employers e ON e.id=r.employer_id WHERE ${s.sql} ORDER BY r.updated_at DESC,r.id LIMIT 8`,s.args)).rows;
  const payments=(await db.query(`SELECT count(*)::int AS plans,COALESCE(sum(p.principal_xaf),0)::text AS scheduled,COALESCE(sum((SELECT COALESCE(sum(o.amount_xaf),0) FROM observed_payments o WHERE o.plan_id=p.id AND o.reversed_at IS NULL)),0)::text AS paid FROM payment_plans p JOIN moratorium_requests r ON r.id=p.id WHERE ${s.sql} AND p.state<>'Draft'`,s.args)).rows[0];
  let pending=counts.filter(r=>['Under review','Action required','Recommended'].includes(r.status)).reduce((n,r)=>n+r.count,0);
  if(decisionRoles.includes(user.role))pending=Number((await db.query("SELECT count(*) FROM moratorium_requests r WHERE status='Recommended' AND (SELECT user_id FROM request_approvals WHERE request_id=r.id AND approved_at IS NULL ORDER BY position LIMIT 1)=$1",[user.id])).rows[0].count);
  const total=counts.reduce((n,r)=>n+r.count,0);
  const actorMetric={agent_dt:'Assigned files',ce_cea:'Awaiting your opinion',s_dct:'Awaiting your endorsement',dt:'Awaiting validation',dg:'Awaiting final decision',cps:'Files requiring CPS action'}[user.role];
  const metrics=[{label:'Visible requests',value:String(total),hint:'Limited to your authorized files'},{label:actorMetric||'Open requests',value:String(pending),hint:'Current request workflow'},{label:'Payment plans',value:String(payments.plans),hint:'Validated schedules'},{label:'Recorded recovery (XAF)',value:payments.paid,hint:'Instalment observations; excludes advances'}];
  if(user.role==='administrator'){const count=(await db.query('SELECT count(*)::int AS count FROM users WHERE active')).rows[0].count;metrics[3]={label:'Active accounts',value:String(count),hint:'All roles'};}
  if(user.role==='cps')metrics[1]={label:'Outstanding (XAF)',value:(BigInt(payments.scheduled)-BigInt(payments.paid)).toString(),hint:'Validated plans less observed instalment payments'};
  let nextInstalment=null,activePlan=null,notifications=[];
  if(user.role==='employer'){
    nextInstalment=(await db.query(`SELECT i.amount_xaf AS amount,i.due_date::text AS "dueDate",i.position,p.id AS "planId",r.reference FROM payment_instalments i JOIN payment_plans p ON p.id=i.plan_id JOIN moratorium_requests r ON r.id=p.id WHERE ${s.sql} AND p.state IN('Active','Draft') ORDER BY i.due_date ASC LIMIT 1`,s.args)).rows[0]||null;
    activePlan=(await db.query(`SELECT p.id,p.state,p.principal_xaf AS scheduled,r.reference,COALESCE((SELECT sum(amount_xaf) FROM observed_payments o WHERE o.plan_id=p.id AND o.reversed_at IS NULL),0)::text AS paid FROM payment_plans p JOIN moratorium_requests r ON r.id=p.id WHERE ${s.sql} ORDER BY p.created_at DESC LIMIT 1`,s.args)).rows[0]||null;
    notifications=(await db.query('SELECT id,message,created_at,read_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5',[user.id])).rows;
  }
  return send(200,{metrics,counts,recent,payments,totalRequests:total,underReview:counts.find(c=>c.status==='Under review')?.count||0,actionRequired:counts.find(c=>c.status==='Action required')?.count||0,nextAmountDue:nextInstalment?`${nextInstalment.amount} XAF`:null,nextInstalment,activePlan,notifications});
 }
 if(path==='/api/v1/help'&&req.method==='GET'){const contact=(await db.query('SELECT support_contact FROM service_config WHERE id=1')).rows[0].support_contact;return send(200,{...defaultHelpContent,supportContact:contact,support:{email:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)?contact:null,phone:/^\+?[0-9 ()-]+$/.test(contact)?contact:null,hours:null,contact:contact||null}});}
 if(path.startsWith('/api/v1/admin/')){
  requireRole(user,'administrator');
  if(/^\/api\/v1\/admin\/centres(\/|$)/.test(path))return centreRoute({db,user,req,path,body,send});
  if(path==='/api/v1/admin/workflow-rules'&&req.method==='GET')return send(200,{rules:[{name:'Request access',value:'Employers see their organization; AGENT (DT) and decision actors see assigned files; administrators and CPS see submitted files within their authority.'},{name:'Duration routing',value:'1–6 months: Centre; 7–11: Regional; 13+: Technical. Exactly 12 months requires an explicit Regional or Technical choice with authority reference.'},{name:'Remission routing',value:'Requests that include remission route to the DG. Routing does not grant a penalty waiver.'},{name:'Approval order',value:'The chain uses CE / CEA, S-DCT, DT and DG actors as required. Only the current stage can decide. Returns clear prior endorsements.'},{name:'Advance',value:'CPS must verify at least 30% of the stated debt before request approval.'},{name:'Schedule',value:'CPS proposes the remaining balance and dates; the final assigned decision actor validates the schedule.'},{name:'Default monitoring',value:'CPS verifies a complete accounting period. Three distinct missed instalments after the configured grace period close the plan for default.'}]});
  if(path==='/api/v1/admin/roles'&&req.method==='GET')return send(200,{roles:roles.map(code=>({id:code,code,label:roleLabels[code],description:roleDescriptions[code]})),policy:'One actor role per account. Permissions are enforced by the server; administrators do not inherit operational decision or CPS permissions.'});
  if(path==='/api/v1/admin/config'){
   if(req.method==='GET')return send(200,(await db.query('SELECT * FROM service_config WHERE id=1')).rows[0]);
   if(req.method==='POST'){
    if(!Number.isInteger(body.grace_days)||body.grace_days<0||body.grace_days>365)fail(400,'Enter the approved grace period from 0 to 365 days.');
    const basis=text(body.basis,'Configuration authority/reference',500);const contact=typeof body.support_contact==='string'&&body.support_contact.length<=300?body.support_contact.trim():fail(400,'Invalid support contact.');
    await transaction(db,async client=>{const c=(await client.query('SELECT * FROM service_config WHERE id=1 FOR UPDATE')).rows[0];version(body,c);await client.query('UPDATE service_config SET grace_days=$1,support_contact=$2,version=version+1,updated_at=NOW() WHERE id=1',[body.grace_days,contact]);await audit(client,user,`config.updated: grace_days=${body.grace_days}; ${basis}`);});
    return send(200,(await db.query('SELECT * FROM service_config WHERE id=1')).rows[0]);
   }
  }
  if(path==='/api/v1/admin/reference-data'){
   if(req.method==='GET')return send(200,{items:(await db.query('SELECT * FROM reference_centres ORDER BY code')).rows,employers:(await db.query('SELECT id,name,cnps_number,centre_id,version FROM employers ORDER BY name LIMIT 500')).rows,staff:(await db.query("SELECT id,display_name AS name,role,centre_id,centre_version AS version FROM users WHERE role<>'employer' ORDER BY display_name LIMIT 500")).rows});
   if(req.method==='POST'){
    if(body.operation==='assign-staff'){
      await transaction(db,async client=>{const u=(await client.query("SELECT * FROM users WHERE id=$1 AND role<>'employer' FOR UPDATE",[body.userId])).rows[0];if(!u)fail(404,'Staff account not found.');version(body,{version:u.centre_version});if(body.centreId && !(await client.query('SELECT 1 FROM reference_centres WHERE id=$1 AND active',[body.centreId])).rowCount)fail(400,'Select an active centre.');await client.query('UPDATE users SET centre_id=$1,centre_version=centre_version+1 WHERE id=$2',[body.centreId||null,u.id]);await audit(client,user,'staff.centre_assigned:'+u.id+':'+(body.centreId||'none'));});return send(200,{ok:true});
    }
    if(body.operation==='assign-employer'){
      await transaction(db,async client=>{const e=(await client.query('SELECT * FROM employers WHERE id=$1 FOR UPDATE',[body.employerId])).rows[0];if(!e)fail(404,'Employer not found.');version(body,e);if(body.centreId && !(await client.query('SELECT 1 FROM reference_centres WHERE id=$1 AND active',[body.centreId])).rowCount)fail(400,'Select an active centre.');await client.query('UPDATE employers SET centre_id=$1,version=version+1 WHERE id=$2',[body.centreId||null,e.id]);await audit(client,user,'employer.centre_assigned:'+e.id+':'+(body.centreId||'none'));});return send(200,{ok:true});
    }
    const code=text(body.code,'Centre code',40),name=text(body.name,'Centre name',160);if(typeof body.active!=='boolean')fail(400,'Select active or inactive.');
    await transaction(db,async client=>{if(body.id){const row=(await client.query('SELECT * FROM reference_centres WHERE id=$1 FOR UPDATE',[body.id])).rows[0];if(!row)fail(404,'Centre not found.');version(body,row);await client.query('UPDATE reference_centres SET code=$1,name=$2,active=$3,version=version+1 WHERE id=$4',[code,name,body.active,body.id]);}else await client.query('INSERT INTO reference_centres(id,code,name,active) VALUES($1,$2,$3,$4)',[randomUUID(),code,name,body.active]);await audit(client,user,'reference.centre_updated:'+code);});return send(200,{ok:true});
   }
  }
  if(path==='/api/v1/admin/templates'){
   if(req.method==='GET')return send(200,{items:(await db.query('SELECT * FROM correspondence_templates ORDER BY code')).rows});
   if(req.method==='POST'){
    const title=text(body.title,'Title',160),content=text(body.body,'Template body',6000);
    await transaction(db,async client=>{const row=(await client.query('SELECT * FROM correspondence_templates WHERE code=$1 FOR UPDATE',[body.code])).rows[0];if(!row)fail(404,'Template not found.');version(body,row);await client.query('UPDATE correspondence_templates SET title=$1,body=$2,version=version+1 WHERE code=$3',[title,content,body.code]);await audit(client,user,'template.updated:'+body.code);});return send(200,{ok:true});
   }
  }
 }
 if(path==='/api/v1/audit'&&req.method==='GET'){
  requireRole(user,'administrator');const paging=page(url),args=[];let where="(a.request_id IS NULL OR r.status<>'Draft')";const q=url.searchParams.get('q');if(q){args.push(`%${q.slice(0,100)}%`);where+=` AND (a.action ILIKE $1 OR u.display_name ILIKE $1 OR r.reference ILIKE $1)`;}where+=range(url,args,'a.created_at');
  const from='audit_events a LEFT JOIN users u ON u.id=a.actor_id LEFT JOIN moratorium_requests r ON r.id=a.request_id';const total=Number((await db.query(`SELECT count(*) FROM ${from} WHERE ${where}`,args)).rows[0].count);
  const items=(await db.query(`SELECT a.id,a.action,a.created_at,u.display_name AS actor,r.reference,a.request_id FROM ${from} WHERE ${where} ORDER BY a.created_at DESC,a.id LIMIT 50 OFFSET $${args.length+1}`,[...args,paging.offset])).rows;
  return send(200,{items,total,page:paging.page,pageSize:50});
 }
 if((path==='/api/v1/reports'||path==='/api/v1/exports')&&req.method==='GET'){
  requireRole(user,'administrator','cps');const s=scope(user),args=[...s.args];let where=s.sql+range(url,args,'r.submitted_at');const centre=url.searchParams.get('centre');if(centre){args.push(centre);where+=` AND e.centre_id=$${args.length}`;}
  const rows=(await db.query(`SELECT r.id,r.reference,r.status,r.submitted_at,e.name AS employer,r.debt_amount_xaf::text AS debt,p.state AS plan_state,p.principal_xaf::text AS scheduled,COALESCE((SELECT sum(o.amount_xaf) FROM observed_payments o WHERE o.plan_id=p.id AND o.reversed_at IS NULL),0)::text AS recovered FROM moratorium_requests r JOIN employers e ON e.id=r.employer_id LEFT JOIN payment_plans p ON p.id=r.id WHERE ${where} ORDER BY r.submitted_at DESC,r.id LIMIT 10001`,args)).rows;
  if(rows.length>10000)fail(400,'Narrow the date range to at most 10,000 requests.');
  if(path.endsWith('/exports')){const data=csv(rows.map(r=>[r.reference,r.employer,r.status,r.debt,r.plan_state,r.scheduled,r.recovered]),['Reference','Employer','Request status','Declared debt XAF','Plan status','Scheduled XAF','Observed recovery XAF']);await audit(db,user,'report.exported');res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="moratorium-report.csv"'});return res.end(data);}
  const grouped=Object.entries(rows.reduce((a,r)=>{a[r.status]=(a[r.status]||0)+1;return a;},{})).map(([status,count])=>({status,count}));
  const plans=rows.filter(r=>r.plan_state&&r.plan_state!=='Draft'),completed=plans.filter(r=>r.plan_state==='Completed').length;
  return send(200,{centres:(await db.query('SELECT id,name FROM reference_centres ORDER BY name')).rows,items:rows,counts:grouped,total:rows.length,scheduled:plans.reduce((n,r)=>n+BigInt(r.scheduled||0),0n).toString(),recovered:plans.reduce((n,r)=>n+BigInt(r.recovered||0),0n).toString(),executionRate:plans.length?Math.round(completed/plans.length*10000)/100:null,basis:'Requests submitted in the selected period; current balances; observed instalment recovery excludes verified advances.'});
 }
 const doc=path.match(/^\/api\/v1\/correspondence\/([a-f0-9-]{36})\/(approval|rejection|reminder)$/);
 if(doc&&req.method==='GET'){
  const r=await visible(db,user,doc[1]);const kind=doc[2];
  if(kind==='approval'&&!['Approved','Active','Completed','Overdue'].includes(r.status)||kind==='rejection'&&r.status!=='Rejected')fail(409,'No matching decision is available.');
  if(kind==='reminder'&&!(await db.query('SELECT 1 FROM payment_plans WHERE id=$1',[r.id])).rowCount)fail(409,'No payment plan exists.');
  const e=(await db.query('SELECT name FROM employers WHERE id=$1',[r.employer_id])).rows[0];const t=(await db.query('SELECT * FROM correspondence_templates WHERE code=$1',[kind])).rows[0];
  const grounds=(await db.query("SELECT note FROM request_events WHERE request_id=$1 AND action IN('approve','reject') ORDER BY created_at DESC LIMIT 1",[r.id])).rows[0]?.note||'';
  let amount='Not applicable',deadline='Not set';
  if(kind==='reminder'){
   const p=(await db.query('SELECT principal_xaf FROM payment_plans WHERE id=$1',[r.id])).rows[0];
   const paid=(await db.query('SELECT COALESCE(sum(amount_xaf),0)::text AS paid FROM observed_payments WHERE plan_id=$1 AND reversed_at IS NULL',[r.id])).rows[0].paid;
   amount=(BigInt(p.principal_xaf)-BigInt(paid)).toString();
   deadline=(await db.query('SELECT deadline::text FROM recovery_notes WHERE request_id=$1 AND deadline IS NOT NULL ORDER BY created_at DESC LIMIT 1',[r.id])).rows[0]?.deadline||'Contact the responsible office';
  }
  const values={reference:r.reference,employer:e.name,date:(r.decided_at||new Date()).toISOString().slice(0,10),grounds,amount,deadline};
  return send(200,{title:t.title,body:t.body.replace(/\{\{(\w+)\}\}/g,(_,key)=>values[key]??`{{${key}}}`),templateVersion:t.version,reference:r.reference,notice:'Draft correspondence for review. No signature or external delivery is performed.'});
 }
 fail(404,'Route not found.');
}
