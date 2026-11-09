import { randomUUID } from 'node:crypto';
import { currentUser, fail, transaction } from './auth.mjs';
import { sendDecisionNotification, sendAssignmentNotification, sendReturnNotification, sendStageNotification } from './notifications.mjs';

export const documentKinds = ['request_letter','debt_statement','deposit_proof','hardship_evidence','cps_opinion','other'];
const decisionRoles = ['ce_cea','s_dct','dt','dg'];
const requiredDocuments = ['debt_statement','deposit_proof','hardship_evidence'];
const editable = ['Draft','Action required'];
const closed = ['Approved','Rejected','Active','Completed','Overdue'];
const maxMoney = 9007199254740991n;
// Any resubmission or return invalidates every stage record, including the
// structured decision grounds added in migration 009.
const resetApprovals = "UPDATE request_approvals SET approved_at=NULL,note=NULL,legal_reference='',assessment='',remission=FALSE,remission_rationale='',decided_action=NULL WHERE request_id=$1";
function text(value, name, max = 4000, required = true) {
  if (value == null && !required) return '';
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(400, `${name} is required (maximum ${max} characters).`);
  return value.trim();
}
function money(value, name, required = true) {
  if ((value === '' || value == null) && !required) return null;
  if (!/^[0-9]{1,16}$/.test(String(value)) || BigInt(value) < 1n || BigInt(value)>maxMoney) fail(400, `${name} must be a positive whole XAF amount.`);
  return String(value);
}
export function formData(body, complete = false) {
  const form = {};
  for (const [key,label,max] of [['contactName','Contact name',120],['contactEmail','Contact email',254],['address','Registered address',500]]) form[key] = text(body[key],label,max,complete);
  form.reason = text(body.reason,'Reason for request',4000,false);
  if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) fail(400,'Enter a valid contact email.');
  form.debtAmount = money(body.debtAmount,'Debt amount',complete);
  if(body.months!=null && typeof body.months!=='string' && typeof body.months!=='number') fail(400,'Repayment months must be a whole number.');
  form.months = body.months === '' || body.months == null ? null : Number(body.months);
  if ((complete && !form.months) || (form.months !== null && (!Number.isInteger(form.months) || form.months < 1 || form.months > 600))) fail(400,'Repayment months must be a whole number between 1 and 600.');
  form.remissionRequested = body.remissionRequested === true;
  form.remissionReason = text(body.remissionReason,'Remission reason',4000,complete && form.remissionRequested);
  if (complete && body.declaration !== true) fail(400,'Confirm the declaration before submitting.');
  form.declaration = body.declaration === true;
  form.advanceAmount = money(body.advanceAmount,'Declared advance',false);
  if(form.advanceAmount && form.debtAmount && BigInt(form.advanceAmount)>BigInt(form.debtAmount)) fail(400,'The advance cannot exceed the declared debt.');
  return form;
}
export function scope(user, alias = 'r') {
  if (user.role === 'employer') return {sql:`${alias}.employer_id=$1`,args:[user.employer_id]};
  if (user.role === 'administrator') return {sql:`${alias}.status<>'Draft'`,args:[]};
  if (user.role === 'cps') return {sql:`${alias}.status<>'Draft'`,args:[]};
  if (user.role === 'agent_dt') return {sql:`${alias}.processor_id=$1 AND ${alias}.status<>'Draft'`,args:[user.id]};
  if (decisionRoles.includes(user.role)) return {sql:`${alias}.status<>'Draft' AND EXISTS(SELECT 1 FROM request_approvals a WHERE a.request_id=${alias}.id AND a.user_id=$1)`,args:[user.id]};
  fail(403,'Request access denied.');
}
export async function visible(db,user,id,lock=false) {
  const s=scope(user); const result=await db.query(`SELECT r.* FROM moratorium_requests r WHERE ${s.sql} AND r.id=$${s.args.length+1}${lock?' FOR UPDATE OF r':''}`,[...s.args,id]);
  if(!result.rowCount) fail(404,'Request not found.'); return result.rows[0];
}
function summary(r) { return {id:r.id,reference:r.reference,status:r.status,submittedAt:r.submitted_at,createdAt:r.created_at,updatedAt:r.updated_at,version:r.version,employerName:r.employer_name,debtAmount:r.debt_amount_xaf,months:r.proposed_months,processorId:r.processor_id,assignedTo:r.processor_name||null,route:r.route,agentNotes:r.review_note||'',agentRecommendation:r.review_note||'',documentCompleteness:Number(r.document_completeness||0),daysInQueue:Number(r.days_in_queue||0),priority:r.priority||'low',currentPosition:Number(r.current_position||1),totalPositions:Number(r.total_positions||1),isRemissionRequest:r.form?.remissionRequested===true}; }
function role(user,...allowed) { if(!allowed.includes(user.role)) fail(403,'This action is not permitted for your role.'); }
export async function event(db,r,user,action,next,note='') {
  await db.query('INSERT INTO request_events(id,request_id,actor_id,action,from_status,to_status,note) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),r.id,user.id,action,r.status,next,note]);
  await db.query('INSERT INTO audit_events(id,actor_id,request_id,action) VALUES($1,$2,$3,$4)',[randomUUID(),user.id,r.id,action]);
  // Notify only assigned staff, the owning employer and administrators. Notifications never contain financial data.
  const recipients=await db.query(`SELECT id FROM users WHERE active AND (employer_id=$1 OR id=$2 OR role='administrator' OR id IN(SELECT user_id FROM request_approvals WHERE request_id=$3) OR (role='cps' AND $4='Approved'))`,[r.employer_id,r.processor_id,r.id,next]);
  for(const recipient of recipients.rows) if(recipient.id!==user.id) await db.query('INSERT INTO notifications(id,user_id,request_id,message) VALUES($1,$2,$3,$4)',[randomUUID(),recipient.id,r.id,`${r.reference}: ${action.replaceAll('_',' ')} — ${next}`]);
}
export async function documentsComplete(db,id,includeOpinion=false) {
  const kinds=new Set((await db.query('SELECT kind FROM request_documents WHERE request_id=$1 AND removed_at IS NULL',[id])).rows.map(d=>d.kind));
  const missing=[...requiredDocuments,...(includeOpinion?['cps_opinion']:[])].filter(k=>!kinds.has(k));
  if(missing.length) fail(400,`Missing supporting documents: ${missing.join(', ')}.`);
}
export async function detail(db,user,id) {
  const r=await visible(db,user,id);
  const employer=(await db.query('SELECT id,name,cnps_number FROM employers WHERE id=$1',[r.employer_id])).rows[0];
  const documents=(await db.query('SELECT d.id,d.kind,d.file_name AS "fileName",d.mime_type AS "mimeType",octet_length(d.content) AS "sizeBytes",d.uploaded_at AS "uploadedAt",u.display_name AS "uploadedBy" FROM request_documents d JOIN users u ON u.id=d.uploaded_by WHERE d.request_id=$1 AND removed_at IS NULL ORDER BY uploaded_at',[id])).rows;
  const history=(await db.query('SELECT e.*,u.display_name AS "actorName" FROM request_events e JOIN users u ON u.id=e.actor_id WHERE request_id=$1 ORDER BY created_at,id',[id])).rows;
  const approvals=(await db.query('SELECT a.*,u.display_name AS "displayName" FROM request_approvals a JOIN users u ON u.id=a.user_id WHERE request_id=$1 ORDER BY position',[id])).rows;
  return {...summary(r),form:r.form,receipt:r.submission_receipt,employer,documents,history,approvals,reviewNote:r.review_note,routingBasis:r.routing_basis,deposit:{amount:r.deposit_amount_xaf,reference:r.deposit_reference,confirmedAt:r.deposit_confirmed_at},decidedAt:r.decided_at};
}
export async function requestRoute({db,req,res,path,body,send,runTransaction=transaction}) {
  const user=await currentUser(db,req);
  const url=new URL(req.url,'http://localhost');
  if(path==='/api/v1/employer' && req.method==='GET') {
    role(user,'employer'); return send(200,{employer:(await db.query('SELECT id,name,cnps_number FROM employers WHERE id=$1',[user.employer_id])).rows[0],contactName:user.display_name,contactEmail:user.email});
  }
  if(path==='/api/v1/workflow/staff' && req.method==='GET') {
    role(user,'administrator'); return send(200,{staff:(await db.query("SELECT id,display_name AS name,role FROM users WHERE active AND role IN('agent_dt','ce_cea','s_dct','dt','dg','cps') ORDER BY role,display_name")).rows});
  }
  if(path==='/api/v1/notifications' && req.method==='GET') {
    const s=scope(user); const args=[...s.args,user.id];
    return send(200,{items:(await db.query(`SELECT n.id,n.message,n.request_id AS "requestId",n.created_at AS "createdAt",n.read_at AS "readAt",r.reference AS title FROM notifications n JOIN moratorium_requests r ON r.id=n.request_id WHERE ${s.sql} AND n.user_id=$${args.length} ORDER BY n.created_at DESC LIMIT 100`,args)).rows});
  }
  // Bulk acknowledgement for the notifications page.
  if(path==='/api/v1/notifications/read-all' && req.method==='POST') { await db.query('UPDATE notifications SET read_at=NOW() WHERE user_id=$1 AND read_at IS NULL',[user.id]);return send(200,{ok:true}); }
  const notification=path.match(/^\/api\/v1\/notifications\/([a-f0-9-]{36})\/read$/);
  if(notification && req.method==='POST') { await db.query('UPDATE notifications SET read_at=NOW() WHERE id=$1 AND user_id=$2',[notification[1],user.id]);return send(200,{ok:true}); }
  if(path==='/api/v1/documents' && req.method==='GET') {
    const s=scope(user);
    return send(200,{documents:(await db.query(`SELECT d.id,d.file_name AS "fileName",r.reference AS "requestReference",r.id AS "requestId",d.uploaded_at AS "uploadedAt",octet_length(d.content) AS "sizeBytes" FROM request_documents d JOIN moratorium_requests r ON r.id=d.request_id WHERE ${s.sql} AND d.removed_at IS NULL ORDER BY d.uploaded_at DESC LIMIT 500`,s.args)).rows});
  }
  const download=path.match(/^\/api\/v1\/documents\/([a-f0-9-]{36})\/download$/);
  if(download && req.method==='GET') {
    const doc=(await db.query('SELECT * FROM request_documents WHERE id=$1 AND removed_at IS NULL',[download[1]])).rows[0];
    if(!doc) fail(404,'Document not found.'); await visible(db,user,doc.request_id);
    res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(doc.file_name).replace(/'/g,'%27')}`,'Content-Length':doc.content.length,'Content-Security-Policy':"default-src 'none'; sandbox"});return res.end(doc.content);
  }
  if(path==='/api/v1/requests' && req.method==='GET') {
    const view=url.searchParams.get('view');
    const s=user.role==='agent_dt'&&view==='work-queue'?{sql:"r.status<>'Draft' AND (r.processor_id=$1 OR r.processor_id IS NULL)",args:[user.id]}:scope(user); const params=[...s.args]; let where=s.sql;
    const status=url.searchParams.get('status'); if(status) {const statuses=status.split(',').map(v=>v.trim()).filter(Boolean);params.push(statuses);where+=` AND r.status=ANY($${params.length}::text[])`;}
    const search=url.searchParams.get('q'); if(search) {params.push(`%${search.slice(0,100)}%`);where+=` AND (r.reference ILIKE $${params.length} OR e.name ILIKE $${params.length})`;}
    if(view==='work-queue') where+=" AND r.status='Under review'";
    if(view==='returned') where+=decisionRoles.includes(user.role)?" AND r.status='Under review'":" AND r.status='Action required'";
    if(view==='decision-history') where+=" AND r.status IN('Approved','Rejected','Active','Completed','Overdue')";
    if(view==='decisions') {
      role(user,...decisionRoles);params.push(user.id);
      where+=` AND r.status='Recommended' AND (SELECT a.user_id FROM request_approvals a WHERE a.request_id=r.id AND a.approved_at IS NULL ORDER BY a.position LIMIT 1)=$${params.length}`;
    }
    const page=Math.max(1,Math.min(100000,Number(url.searchParams.get('page'))||1));if(!Number.isInteger(page)) fail(400,'Invalid page.');
    const total=(await db.query(`SELECT count(*) FROM moratorium_requests r JOIN employers e ON e.id=r.employer_id WHERE ${where}`,params)).rows[0].count;
    const result=await db.query(`SELECT r.*,e.name AS employer_name,p.display_name processor_name,
      LEAST(100,(SELECT COUNT(*)*25 FROM request_documents d WHERE d.request_id=r.id AND d.removed_at IS NULL AND d.kind=ANY($${params.length+1}::text[]))) document_completeness,
      GREATEST(0,EXTRACT(day FROM NOW()-COALESCE(r.submitted_at,r.created_at))::int) days_in_queue,
      CASE WHEN COALESCE(r.submitted_at,r.created_at)<NOW()-INTERVAL '7 days' THEN 'high' WHEN COALESCE(r.submitted_at,r.created_at)<NOW()-INTERVAL '3 days' THEN 'medium' ELSE 'low' END priority,
      COALESCE((SELECT MIN(position) FROM request_approvals a WHERE a.request_id=r.id AND a.approved_at IS NULL),1) current_position,
      GREATEST((SELECT COUNT(*) FROM request_approvals a WHERE a.request_id=r.id),1) total_positions
      FROM moratorium_requests r JOIN employers e ON e.id=r.employer_id LEFT JOIN users p ON p.id=r.processor_id WHERE ${where} ORDER BY r.created_at DESC,r.id LIMIT 50 OFFSET $${params.length+2}`,[...params,requiredDocuments,(page-1)*50]);
    const requests=result.rows.map(summary);
    return send(200,{requests,items:requests,total:Number(total),page,pageSize:50});
  }
  if(path==='/api/v1/requests' && req.method==='POST') {
    role(user,'employer'); const form=formData(body);
    const id=await runTransaction(db,async client=>{
      const sequence=(await client.query("SELECT nextval('request_reference_seq') AS n")).rows[0].n;
      const r=(await client.query(`INSERT INTO moratorium_requests(id,reference,employer_id,created_by,debt_amount_xaf,proposed_months,reason,form) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[randomUUID(),`MOR-${new Date().getUTCFullYear()}-${String(sequence).padStart(6,'0')}`,user.employer_id,user.id,form.debtAmount,form.months,form.reason,form])).rows[0];
      await event(client,r,user,'draft_created','Draft');return r.id;
    });return send(201,{request:await detail(db,user,id)});
  }
  const match=path.match(/^\/api\/v1\/requests\/([a-f0-9-]{36})(?:\/([a-z-]+))?$/);
  if(!match) fail(404,'Route not found.'); const [,id,action]=match;
  if(req.method==='GET' && !action) return send(200,{request:await detail(db,user,id)});
  if(req.method!=='POST' || !action) fail(405,'Method not allowed.');
  if((action==='claim'||action==='release') && user.role==='agent_dt') {
    await runTransaction(db,async client=>{
      const r=(await client.query('SELECT * FROM moratorium_requests WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if(!r) fail(404,'Request not found.');
      if(!Number.isInteger(body.version)||body.version!==r.version) fail(409,'This request has changed. Reload it before trying again.');
      if(r.status!=='Under review') fail(409,'Only requests under review can be assigned.');
      if(action==='claim'&&r.processor_id&&r.processor_id!==user.id) fail(409,'This request is already assigned.');
      if(action==='release'&&r.processor_id!==user.id) fail(403,'Only the assigned AGENT (DT) can release this request.');
      await client.query('UPDATE moratorium_requests SET processor_id=$1,version=version+1,updated_at=NOW() WHERE id=$2',[action==='claim'?user.id:null,id]);
      await event(client,r,user,action,r.status);
    });
    return send(200,{ok:true});
  }
  await runTransaction(db,async client=>{
    const r=await visible(client,user,id,true);
    if(!Number.isInteger(body.version) || body.version!==r.version) fail(409,'This request has changed. Reload it before trying again.');
    if(closed.includes(r.status)) fail(409,'The decided request is locked.');
    let next=r.status, note='';
    if(action==='save') {
      role(user,'employer');if(!editable.includes(r.status)) fail(409,'This request is not editable.');
      const form=formData(body);
      await client.query('UPDATE moratorium_requests SET form=$1,debt_amount_xaf=$2,proposed_months=$3,reason=$4,deposit_amount_xaf=NULL,deposit_reference=NULL,deposit_confirmed_by=NULL,deposit_confirmed_at=NULL,review_note=NULL WHERE id=$5',[form,form.debtAmount,form.months,form.reason,id]);
    } else if(action==='documents') {
      const agentUpload=user.role==='agent_dt'&&r.processor_id===user.id&&r.status==='Under review'&&body.kind!=='cps_opinion';
      const cpsUpload=user.role==='cps'&&['Under review','Recommended'].includes(r.status)&&body.kind==='cps_opinion';
      if(!((user.role==='employer' && editable.includes(r.status)) || agentUpload || cpsUpload)) fail(403,'Documents cannot be changed at this stage.');
      if(user.role==='employer' && body.kind==='cps_opinion') fail(403,'The CPS opinion must be supplied by the responsible office.');
      if(!documentKinds.includes(body.kind)) fail(400,'Choose a document category.');
      const name=text(body.fileName,'Filename',200);
      if(/[\x00-\x1f/\\]/.test(name)) fail(400,'Invalid filename.');
      if(typeof body.data!=='string' || body.data.length>6990508 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(body.data)) fail(400,'Invalid document data.');
      const content=Buffer.from(body.data,'base64');
      if(!content.length || content.length>5242880) fail(400,'Documents must be between 1 byte and 5 MiB.');
      const mime=content.subarray(0,5).toString()==='%PDF-'?'application/pdf':content.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':content[0]===255&&content[1]===216&&content[2]===255?'image/jpeg':null;
      if(!mime) fail(400,'Upload a PDF, PNG or JPEG file.');
      if(Number((await client.query('SELECT count(*) FROM request_documents WHERE request_id=$1 AND removed_at IS NULL',[id])).rows[0].count)>=20) fail(400,'Maximum 20 active documents per request.');
      await client.query('INSERT INTO request_documents(id,request_id,kind,file_name,mime_type,content,uploaded_by) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),id,body.kind,name,mime,content,user.id]);note=`${body.kind}: ${name}`;
      if(user.role==='employer') await client.query('UPDATE moratorium_requests SET deposit_confirmed_at=NULL,deposit_confirmed_by=NULL,deposit_amount_xaf=NULL,deposit_reference=NULL WHERE id=$1',[id]);
    } else if(action==='remove-document') {
      role(user,'employer');if(!editable.includes(r.status)) fail(409,'Documents cannot be removed at this stage.');
      const result=await client.query('UPDATE request_documents SET removed_at=NOW() WHERE id=$1 AND request_id=$2 AND removed_at IS NULL RETURNING file_name',[text(body.documentId,'Document',36),id]);if(!result.rowCount) fail(404,'Document not found.');note=result.rows[0].file_name;
      await client.query('UPDATE moratorium_requests SET deposit_confirmed_at=NULL,deposit_confirmed_by=NULL,deposit_amount_xaf=NULL,deposit_reference=NULL WHERE id=$1',[id]);
    } else if(action==='submit') {
      role(user,'employer'); if(!editable.includes(r.status)) fail(409,'Only a draft or returned request can be submitted.');
      formData({...r.form,declaration:body.declaration===true || r.form.declaration},true);await documentsComplete(client,id);next='Under review';
      const snapshot=await detail(client,user,id);
      const receipt={reference:r.reference,submittedAt:new Date().toISOString(),employerName:snapshot.employer.name,cnpsNumber:snapshot.employer.cnps_number,typeLabel:r.form.remissionRequested?'Moratorium with remission':'Moratorium',currency:'XAF',fields:{...r.form,typeCode:r.form.remissionRequested?'moratorium_remission':'moratorium'},documents:snapshot.documents.map(d=>({id:d.id,categoryLabel:d.kind.replaceAll('_',' '),fileName:d.fileName}))};
      await client.query('INSERT INTO request_submission_receipts(request_id,request_version,receipt) VALUES($1,$2,$3)',[id,r.version+1,receipt]);
      await client.query(`UPDATE moratorium_requests SET submission_receipt=$1,form=jsonb_set(form,'{declaration}','true') WHERE id=$2`,[receipt,id]);
      await client.query('UPDATE moratorium_requests SET submitted_at=COALESCE(submitted_at,NOW()),review_note=NULL WHERE id=$1',[id]);
      await client.query(resetApprovals,[id]);
    } else if(action==='assign') {
      role(user,'administrator');if(!['Under review','Action required'].includes(r.status)) fail(409,'Return the file for review before changing its assignment.');
      note=text(body.routingBasis,'Routing and signature delegation basis');
      if(!['Centre','Regional','Technical','General'].includes(body.route)) fail(400,'Select the competent authority route.');
      if(r.form.remissionRequested && body.route!=='General') fail(400,'Requests with remission must route to General Directorate.');
      if(!r.form.remissionRequested) {
        const permitted=r.proposed_months===12?['Regional','Technical']:r.proposed_months<=6?['Centre']:r.proposed_months<12?['Regional']:['Technical'];
        if(!permitted.includes(body.route)) fail(400,`The documented duration band requires routing to ${permitted.join(' or ')}.`);
      }
      const processor=(await client.query("SELECT id,display_name FROM users WHERE id=$1 AND role='agent_dt' AND active",[text(body.processorId,'AGENT (DT)',36)])).rows[0];if(!processor) fail(400,'Select an active AGENT (DT).');
      if(!Array.isArray(body.approvals) || body.approvals.length<1 || body.approvals.length>8 || new Set(body.approvals.map(a=>a?.userId)).size!==body.approvals.length) fail(400,'Choose 1–8 distinct approvers in order.');
      await client.query('DELETE FROM request_approvals WHERE request_id=$1',[id]);
      const chainDescription=[];
      for(const [index,step] of body.approvals.entries()) {
        const label=text(step.label,'Approval stage',80);
        const actor=(await client.query("SELECT display_name FROM users WHERE id=$1 AND role=ANY($2::text[]) AND active",[text(step.userId,'Decision actor',36),decisionRoles])).rows[0];
        if(!actor) fail(400,'Choose active CE / CEA, S-DCT, DT or DG actors.');
        chainDescription.push(`${index+1}. ${label}: ${actor.display_name}`);
        await client.query('INSERT INTO request_approvals(request_id,position,user_id,label) VALUES($1,$2,$3,$4)',[id,index+1,step.userId,label]);
      }
      await client.query('UPDATE moratorium_requests SET processor_id=$1,route=$2,routing_basis=$3 WHERE id=$4',[processor.id,body.route,note,id]);r.processor_id=processor.id;
      note += ` | Route: ${body.route}; processor: ${processor.display_name}; approval chain: ${chainDescription.join('; ')}`;
      // Send notification to employer about assignment
      await sendAssignmentNotification(client, id, processor.id, r.reference);
    } else if(action==='return' || action==='recommend') {
      role(user,'agent_dt',...decisionRoles);note=text(body.note,'Review comments');
      if(user.role==='agent_dt') {if(r.processor_id!==user.id || r.status!=='Under review') fail(403,'Only the assigned AGENT (DT) can review this file.');next=action==='return'?'Action required':'Recommended';}
      else {if(action!=='return' || r.status!=='Recommended') fail(403,'This review action is not available.');const step=(await client.query('SELECT * FROM request_approvals WHERE request_id=$1 AND approved_at IS NULL ORDER BY position LIMIT 1',[id])).rows[0];if(step?.user_id!==user.id) fail(403,'Wait for your approval stage.');next='Under review';}
      // Send notification to employer if request is returned
      if(action==='return') {
        await sendReturnNotification(client, id, note, r.employer_id, r.reference);
      }
      if(action==='recommend') {formData(r.form,true);await documentsComplete(client,id,true);if(!r.route || !(await client.query('SELECT 1 FROM request_approvals WHERE request_id=$1',[id])).rowCount) fail(400,'An administrator must assign the route and approval chain first.');await client.query('UPDATE moratorium_requests SET review_note=$1 WHERE id=$2',[note,id]);}
      if(action==='return') {await client.query(resetApprovals,[id]);await client.query('UPDATE moratorium_requests SET review_note=NULL WHERE id=$1',[id]);}
    } else if(action==='confirm-deposit') {
      role(user,'cps');if(!['Under review','Recommended'].includes(r.status)) fail(409,'Deposit confirmation is not available at this stage.');
      const amount=money(body.amount,'Confirmed deposit');const reference=text(body.reference,'Verified payment reference',200);
      if(BigInt(amount)>BigInt(r.debt_amount_xaf)) fail(400,'The deposit cannot exceed the stated debt.');
      await client.query('UPDATE moratorium_requests SET deposit_amount_xaf=$1,deposit_reference=$2,deposit_confirmed_by=$3,deposit_confirmed_at=NOW() WHERE id=$4',[amount,reference,user.id,id]);note=`Verified deposit ${amount} XAF; reference ${reference}`;
    } else if(action==='approve' || action==='reject') {
      role(user,...decisionRoles); if(r.status!=='Recommended') fail(409,'The request must be recommended before a decision.');
      const step=(await client.query('SELECT * FROM request_approvals WHERE request_id=$1 AND approved_at IS NULL ORDER BY position LIMIT 1',[id])).rows[0];if(step?.user_id!==user.id) fail(403,'Only the decision actor at the current stage may decide.');
      note=text(body.note,action==='reject'?'Reason for rejection':'Decision grounds and legal reference');
      // Structured grounds recorded alongside the free-text decision note.
      const legalReference=text(body.legalReference,'Legal or delegation reference',400,false);
      const assessment=text(body.assessment,'Stage assessment',4000,false);
      const remission=body.remission===true;
      const remissionRationale=text(body.remissionRationale,'Remission rationale',4000,remission);
      if(action==='approve' && !legalReference) fail(400,'Record the legal or delegation reference for this approval.');
      if(remission && user.role!=='dg') fail(403,'Only the General Directorate may record a remission decision.');
      if(action==='reject') {
        next='Rejected';
        await client.query('UPDATE request_approvals SET note=$1,legal_reference=$2,assessment=$3,decided_action=$4 WHERE request_id=$5 AND position=$6',[note,legalReference,assessment,action,id,step.position]);
      } else {
        if(!r.deposit_confirmed_at || BigInt(r.deposit_amount_xaf||0)*100n<BigInt(r.debt_amount_xaf)*30n) fail(400,'CPS must confirm a deposit of at least 30% before approval.');
        await client.query('UPDATE request_approvals SET approved_at=NOW(),note=$1,legal_reference=$2,assessment=$3,remission=$4,remission_rationale=$5,decided_action=$6 WHERE request_id=$7 AND position=$8',[note,legalReference,assessment,remission,remissionRationale,action,id,step.position]);
        // Tell the next decision actor that the file has reached their stage.
        const nextStep=(await client.query('SELECT a.user_id,a.label FROM request_approvals a WHERE a.request_id=$1 AND a.approved_at IS NULL ORDER BY a.position LIMIT 1',[id])).rows[0];
        if(nextStep) await sendStageNotification(client, id, nextStep.user_id, r.reference, nextStep.label);
        else next='Approved';
      }
      if(closed.includes(next)) {
        await client.query('UPDATE moratorium_requests SET decided_at=NOW() WHERE id=$1',[id]);
        // Send notification to employer on final decision
        await sendDecisionNotification(client, id, next, r.employer_id, r.reference);
      }
    } else fail(404,'Unknown request action.');
    await client.query('UPDATE moratorium_requests SET status=$1,version=version+1,updated_at=NOW() WHERE id=$2',[next,id]);
    await event(client,r,user,action,next,note);
  });
  return send(200,{request:await detail(db,user,id)});
}
