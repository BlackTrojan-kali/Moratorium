import {randomUUID} from 'node:crypto';
import {currentUser,fail,transaction,digest} from './auth.mjs';
import {visible,scope,event} from './requests.mjs';
import {requireRole,text,money,date,version,page,today,canonicalJSON} from './actor-utils.mjs';
const decisionRoles=['ce_cea','s_dct','dt','dg'];

export function allocate(instalments,payments,asOf=today()) {
 let available=payments.filter(p=>!p.reversed_at&&p.paid_on<=asOf).reduce((n,p)=>n+BigInt(p.amount_xaf),0n);
 return instalments.map(i=>{const due=BigInt(i.amount_xaf);const paid=available>due?due:available;available-=paid;
  return {...i,amountDue:due.toString(),amountPaid:paid.toString(),outstanding:(due-paid).toString(),status:paid===due?'Paid':i.due_date<asOf?'Overdue':paid>0n?'Partially paid':'Scheduled'};});
}
export async function planDetail(db,user,id) {
 const r=await visible(db,user,id);const p=(await db.query('SELECT *,checked_through::text FROM payment_plans WHERE id=$1',[id])).rows[0];
 if(!p)fail(404,'Payment plan not found.');
 const employer=r.employer_id?(await db.query('SELECT name,cnps_number FROM employers WHERE id=$1',[r.employer_id])).rows[0]:null;
 const instalments=(await db.query('SELECT *,due_date::text FROM payment_instalments WHERE plan_id=$1 ORDER BY position',[id])).rows;
 const payments=(await db.query('SELECT p.*,paid_on::text,u.display_name AS "recordedBy" FROM observed_payments p JOIN users u ON u.id=p.recorded_by WHERE plan_id=$1 ORDER BY p.paid_on,p.recorded_at,p.id',[id])).rows;
 const rows=allocate(instalments,payments);const totalPaid=payments.filter(p=>!p.reversed_at).reduce((n,p)=>n+BigInt(p.amount_xaf),0n);
 const final=(await db.query('SELECT user_id FROM request_approvals WHERE request_id=$1 ORDER BY position DESC LIMIT 1',[id])).rows[0];
 return {...p,reference:r.reference,requestStatus:r.status,debtAmount:r.debt_amount_xaf,depositAmount:r.deposit_amount_xaf,depositReference:r.deposit_reference,employerName:employer?.name||r.employer_name,cnpsNumber:employer?.cnps_number||null,proposedMonths:r.proposed_months,instalments:rows,payments,totalPaid:totalPaid.toString(),balance:(BigInt(p.principal_xaf)-totalPaid).toString(),
  history:(await db.query('SELECT e.*,u.display_name AS "actorName" FROM request_events e JOIN users u ON u.id=e.actor_id WHERE request_id=$1 ORDER BY e.created_at,e.id',[id])).rows,
  defaults:(await db.query('SELECT *,identified_on::text FROM payment_defaults WHERE plan_id=$1 ORDER BY payment_defaults.identified_on',[id])).rows,
  notes:(await db.query('SELECT n.*,deadline::text,u.display_name AS "actorName" FROM recovery_notes n JOIN users u ON u.id=n.actor_id WHERE request_id=$1 ORDER BY n.created_at DESC',[id])).rows,
  archives:(await db.query('SELECT id,state,sha256,created_at FROM payment_archives WHERE plan_id=$1 ORDER BY created_at DESC',[id])).rows,
  permissions:{edit:user.role==='cps'&&p.state==='Draft',activate:decisionRoles.includes(user.role)&&final?.user_id===user.id&&p.state==='Draft',record:user.role==='cps'&&['Active','Overdue'].includes(p.state),reverse:user.role==='cps'&&p.state!=='Draft'&&p.state!=='Defaulted',followUp:['cps','agent_dt'].includes(user.role)}};
}
async function stateChange(db,r,user,p,next,action,note){
 await db.query('UPDATE payment_plans SET state=$1,closed_at=CASE WHEN $1 IN (\'Completed\',\'Defaulted\') THEN NOW() ELSE NULL END WHERE id=$2',[next,r.id]);
 const requestState=next==='Defaulted'?'Overdue':next;
 await db.query('UPDATE moratorium_requests SET status=$1,version=version+1,updated_at=NOW() WHERE id=$2',[requestState,r.id]);
 await event(db,r,user,action,requestState,note);
 if(['Completed','Defaulted'].includes(next)&&p.state!==next){
  const snapshot=await planDetail(db,user,r.id);snapshot.version=p.version+1;delete snapshot.permissions;const serialized=canonicalJSON(snapshot);
  await db.query('INSERT INTO payment_archives(id,plan_id,state,snapshot,sha256) VALUES($1,$2,$3,$4,$5)',[randomUUID(),r.id,next,snapshot,digest(serialized)]);
 }
}

export async function paymentRoute({db,req,res,path,body,send}) {
 const user=await currentUser(db,req);const url=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&path==='/api/v1/payment-plans') {
  const s=scope(user),args=[...s.args];let where=s.sql;const q=url.searchParams.get('q');if(q){args.push(`%${q.slice(0,100)}%`);where+=` AND (r.reference ILIKE $${args.length} OR e.name ILIKE $${args.length})`;}
  if(url.searchParams.get('view')==='overdue')where+=" AND (p.state IN('Overdue','Defaulted') OR EXISTS(SELECT 1 FROM payment_instalments i WHERE i.plan_id=p.id AND i.due_date<CURRENT_DATE AND (SELECT COALESCE(sum(j.amount_xaf),0) FROM payment_instalments j WHERE j.plan_id=p.id AND j.position<=i.position)>(SELECT COALESCE(sum(o.amount_xaf),0) FROM observed_payments o WHERE o.plan_id=p.id AND o.reversed_at IS NULL)))";
  const paging=page(url),from='payment_plans p JOIN moratorium_requests r ON r.id=p.id JOIN employers e ON e.id=r.employer_id';
  const total=Number((await db.query(`SELECT count(*) FROM ${from} WHERE ${where}`,args)).rows[0].count);
  const items=(await db.query(`SELECT p.*,r.reference,r.status AS "requestStatus",r.debt_amount_xaf AS "debtAmount",r.deposit_amount_xaf AS "depositAmount",r.deposit_reference AS "depositReference",e.name AS "employerName",e.cnps_number AS "cnpsNumber",COALESCE((SELECT sum(amount_xaf) FROM observed_payments o WHERE o.plan_id=p.id AND o.reversed_at IS NULL),0)::text AS "totalPaid",(p.principal_xaf::bigint - COALESCE((SELECT sum(amount_xaf) FROM observed_payments o WHERE o.plan_id=p.id AND o.reversed_at IS NULL),0))::text AS balance FROM ${from} WHERE ${where} ORDER BY p.created_at DESC,p.id LIMIT 50 OFFSET $${args.length+1}`,[...args,paging.offset])).rows;
  const eligible=user.role==='cps'?(await db.query("SELECT id,reference,debt_amount_xaf,deposit_amount_xaf,proposed_months FROM moratorium_requests r WHERE status='Approved' AND NOT EXISTS(SELECT 1 FROM payment_plans p WHERE p.id=r.id) ORDER BY decided_at DESC LIMIT 100")).rows:[];
  return send(200,{items,total,page:paging.page,pageSize:50,eligible});
 }
 const match=path.match(/^\/api\/v1\/payment-plans\/([a-f0-9-]{36})(?:\/(schedule|activate|observe|reverse|reconcile|follow-up|archive)(?:\/([a-f0-9-]{36}))?)?$/);
 if(!match)fail(404,'Payment route not found.');const [,id,action,archiveId]=match;
 if(req.method==='GET'&&!action)return send(200,await planDetail(db,user,id));
 if(req.method==='GET'&&action==='archive'&&archiveId){await visible(db,user,id);const a=(await db.query('SELECT * FROM payment_archives WHERE id=$1 AND plan_id=$2',[archiveId,id])).rows[0];if(!a)fail(404,'Archive not found.');return send(200,a);}
 if(req.method!=='POST'||archiveId)fail(405,'Method not allowed.');
 await transaction(db,async client=>{
  const r=await visible(client,user,id,true);const p=(await client.query('SELECT *,checked_through::text FROM payment_plans WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(action==='schedule') {
   requireRole(user,'cps');if(r.status!=='Approved'||(p&&p.state!=='Draft'))fail(409,'Only an approved request with no active plan can receive a schedule.');
   if(p)version(body,p);else version(body,r);
   if(!r.deposit_confirmed_at)fail(400,'CPS must verify the advance first.');
   const remaining=BigInt(r.debt_amount_xaf)-BigInt(r.deposit_amount_xaf);if(remaining<1n)fail(400,'There is no remaining debt to schedule.');
   const terms=text(body.termsReference,'Schedule authority/reference',300);
   if(!Array.isArray(body.instalments)||body.instalments.length!==r.proposed_months)fail(400,`Supply exactly ${r.proposed_months} instalments.`);
   let sum=0n,previous='';const rows=body.instalments.map(i=>{if(!i||typeof i!=='object')fail(400,'Invalid instalment.');const day=date(i.dueDate);if(day<=previous)fail(400,'Due dates must be strictly increasing.');previous=day;const amount=money(i.amount);sum+=amount;return {day,amount:amount.toString()};});
   if(sum!==remaining)fail(400,'The schedule must equal the declared debt less the verified advance.');
   if(p)await client.query('DELETE FROM payment_instalments WHERE plan_id=$1',[id]);
   await client.query('INSERT INTO payment_plans(id,principal_xaf,terms_reference,created_by) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET terms_reference=$3,version=payment_plans.version+1',[id,remaining.toString(),terms,user.id]);
   for(const [index,i] of rows.entries())await client.query('INSERT INTO payment_instalments(id,plan_id,position,due_date,amount_xaf) VALUES($1,$2,$3,$4,$5)',[randomUUID(),id,index+1,i.day,i.amount]);
   await event(client,r,user,'schedule_proposed',r.status,terms);return;
  }
  if(!p)fail(404,'Payment plan not found.');version(body,p);
  if(action==='activate') {
   requireRole(user,...decisionRoles);const final=(await client.query('SELECT user_id FROM request_approvals WHERE request_id=$1 ORDER BY position DESC LIMIT 1',[id])).rows[0];
   if(final?.user_id!==user.id)fail(403,'Only the final assigned decision actor can validate the schedule.');
   if(p.state!=='Draft')fail(409,'The schedule is already active.');
   const grounds=text(body.note,'Schedule approval grounds');
   await client.query('UPDATE payment_plans SET activated_by=$1,activated_at=NOW() WHERE id=$2',[user.id,id]);
   await stateChange(client,r,user,p,'Active','schedule_approved',grounds);
  } else if(action==='observe') {
   requireRole(user,'cps');if(!['Active','Overdue'].includes(p.state))fail(409,'Payments can only be recorded against an active plan.');
   const reference=text(body.reference,'Accounting transaction reference',200),evidence=text(body.evidence,'Accounting evidence and source',2000),paidOn=date(body.paidOn),amount=money(body.amount);
   if(paidOn>today())fail(400,'A payment cannot be dated in the future.');
   if((await client.query('SELECT 1 FROM moratorium_requests WHERE deposit_reference=$1',[reference])).rowCount)fail(409,'This reference is already recorded as an advance.');
   const existing=(await client.query('SELECT 1 FROM observed_payments WHERE reference=$1',[reference])).rowCount;if(existing)fail(409,'This accounting transaction was already recorded.');
   const paid=BigInt((await client.query('SELECT COALESCE(sum(amount_xaf),0)::text AS amount FROM observed_payments WHERE plan_id=$1 AND reversed_at IS NULL',[id])).rows[0].amount);
   if(paid+amount>BigInt(p.principal_xaf))fail(400,'This payment exceeds the remaining plan balance.');
   await client.query('INSERT INTO observed_payments(id,plan_id,reference,amount_xaf,paid_on,evidence,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),id,reference,amount.toString(),paidOn,evidence,user.id]);
   await client.query('UPDATE payment_plans SET checked_through=NULL WHERE id=$1',[id]);
   const next=paid+amount===BigInt(p.principal_xaf)?'Completed':'Active';
   await stateChange(client,r,user,p,next,'payment_observed',`${reference}: ${amount} XAF; ${evidence}`);
  } else if(action==='reverse') {
   requireRole(user,'cps');if(['Draft','Defaulted'].includes(p.state))fail(409,'This plan does not allow payment corrections.');
   const reason=text(body.note,'Correction reason');
   const changed=await client.query('UPDATE observed_payments SET reversed_at=NOW(),reversed_by=$1,reversal_reason=$2 WHERE id=$3 AND plan_id=$4 AND reversed_at IS NULL RETURNING reference',[user.id,reason,text(body.paymentId,'Payment id',36),id]);
   if(!changed.rowCount)fail(409,'Payment not found or already reversed.');
   await client.query('UPDATE payment_plans SET checked_through=NULL WHERE id=$1',[id]);
   await stateChange(client,r,user,p,'Active','payment_reversed',`${changed.rows[0].reference}: ${reason}`);
  } else if(action==='reconcile') {
   requireRole(user,'cps');if(!['Active','Overdue'].includes(p.state))fail(409,'Only active plans can be reconciled.');
   const through=date(body.through);if(through>today()||(p.checked_through&&through<p.checked_through))fail(400,'Use a completed period no earlier than the last reconciliation.');
   if(body.complete!==true)fail(400,'Confirm that all accounting payments through this date were checked.');
   const evidence=text(body.evidence,'Complete accounting statement reference');
   const config=(await client.query('SELECT grace_days FROM service_config WHERE id=1')).rows[0];if(config.grace_days===null)fail(409,'An administrator must configure the approved grace period first.');
   const inst=(await client.query('SELECT *,due_date::text FROM payment_instalments WHERE plan_id=$1 ORDER BY position',[id])).rows;
   const payments=(await client.query('SELECT *,paid_on::text FROM observed_payments WHERE plan_id=$1',[id])).rows;
   const rows=allocate(inst,payments,through);let overdue=false;
   for(const i of rows){if(i.status!=='Overdue')continue;overdue=true;
    const deadline=new Date(i.due_date+'T00:00:00Z');deadline.setUTCDate(deadline.getUTCDate()+config.grace_days);
    if(deadline.toISOString().slice(0,10)>=through)continue;
    const inserted=await client.query('INSERT INTO payment_defaults(instalment_id,plan_id,identified_on,grace_days) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING instalment_id',[i.id,id,through,config.grace_days]);
    if(inserted.rowCount)await event(client,r,user,'instalment_default','Overdue',`Instalment ${i.position}: ${i.outstanding} XAF outstanding; statement ${evidence}.`);
   }
   await client.query('UPDATE payment_plans SET checked_through=$1,checked_at=NOW() WHERE id=$2',[through,id]);
   const count=Number((await client.query('SELECT count(*) FROM payment_defaults WHERE plan_id=$1',[id])).rows[0].count);
   const next=count>=3?'Defaulted':overdue?'Overdue':'Active';
   await stateChange(client,r,user,p,next,'payments_reconciled',`Through ${through}: ${evidence}; ${count} distinct missed instalments.${next==='Defaulted'?' Legal referral required; no external message has been sent.':''}`);
  } else if(action==='follow-up') {
   requireRole(user,'cps','agent_dt');const note=text(body.note,'Follow-up note'),deadline=body.deadline?date(body.deadline):null;
   await client.query('INSERT INTO recovery_notes(id,request_id,actor_id,note,deadline) VALUES($1,$2,$3,$4,$5)',[randomUUID(),id,user.id,note,deadline]);
   await event(client,r,user,'recovery_follow_up',r.status,note+(deadline?` Deadline: ${deadline}`:''));
  } else fail(404,'Unknown payment action.');
  await client.query('UPDATE payment_plans SET version=version+1 WHERE id=$1',[id]);
 });
 return send(200,await planDetail(db,user,id));
}

