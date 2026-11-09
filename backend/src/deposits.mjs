import { currentUser, digest, fail, sessionToken, transaction } from './auth.mjs';
import { audit } from './actor-utils.mjs';
import { detail, visible, formData, documentsComplete, requestRoute } from './requests.mjs';

const labels = {request_letter:'Request letter',debt_statement:'Debt statement',deposit_proof:'Advance payment proof',hardship_evidence:'Hardship evidence',cps_opinion:'CPS opinion',other:'Other document'};
const typeLabel = form => form.remissionRequested ? 'Moratorium with remission' : 'Moratorium';
const editable = status => ['Draft','Action required'].includes(status);
const csrf = req => digest(`moratorium-deposits:${sessionToken(req)}`);
function fields(form) {
  return {...form,typeCode:form.remissionRequested?'moratorium_remission':'moratorium',advanceAmount:form.advanceAmount??null};
}
function summary(r) {
  return {id:r.id,reference:r.reference,typeLabel:typeLabel(r.form),status:{code:r.status,label:r.status},updatedAt:r.updated_at,submittedAt:r.submitted_at};
}
function document(d,r) {
  return {id:d.id,depositId:r.id,requestReference:r.reference,category:d.kind,categoryLabel:labels[d.kind],fileName:d.fileName,sizeBytes:d.sizeBytes,uploadedAt:d.uploadedAt,scanState:'ready',scanMessage:'File format checked; malware scanning is not configured.',canDownload:true,canRemove:editable(r.status)};
}
async function record(db,user,id) {
  const r=await detail(db,user,id);
  return {id:r.id,reference:r.reference,typeLabel:typeLabel(r.form),status:{code:r.status,label:r.status},updatedAt:r.updatedAt,submittedAt:r.submittedAt,version:r.version,
    employer:{id:r.employer.id,name:r.employer.name,cnpsNumber:r.employer.cnps_number,email:r.form.contactEmail||null,address:r.form.address||null,active:null},
    debt:null,currency:'XAF',fields:fields(r.form),documents:r.documents.map(d=>document(d,r)),
    corrections:r.status==='Action required'?r.history.filter(e=>e.action==='return'&&e.to_status==='Action required').slice(-1).map(e=>e.note):[],
    history:r.history.map(e=>({id:e.id,label:e.action.replaceAll('_',' '),actorName:e.actorName,occurredAt:e.created_at,note:e.note})),
    receipt:r.receipt,permissions:{edit:editable(r.status),upload:editable(r.status),submit:editable(r.status),discard:editable(r.status)&&!r.submittedAt}};
}
function pagination(url) {
  const page=Number(url.searchParams.get('page')||1);
  if(!Number.isSafeInteger(page)||page<1||page>100000) fail(400,'Invalid page.');
  return {page,pageSize:50,offset:(page-1)*50};
}
function input(body) {
  if(!['moratorium','moratorium_remission'].includes(body.typeCode)) fail(400,'Select a supported request type.');
  return {...body,remissionRequested:body.typeCode==='moratorium_remission',remissionReason:body.typeCode==='moratorium_remission'?body.remissionReason:'',declaration:false};
}

export async function depositRoute({db,req,res,path,body,send}) {
  const user=await currentUser(db,req);
  if(user.role!=='employer') fail(403,'Use the staff request workspace.');
  const url=new URL(req.url,'http://localhost');
  if(req.method==='GET'&&path==='/api/v1/deposits/options') {
    const employer=(await db.query('SELECT * FROM employers WHERE id=$1',[user.employer_id])).rows[0];
    const documentRules=Object.entries(labels).map(([code,label])=>({code,label,required:['debt_statement','deposit_proof','hardship_evidence'].includes(code),employerCanUpload:code!=='cps_opinion',maxFiles:20,maxBytes:5242880,accept:['application/pdf','image/png','image/jpeg']}));
    return send(200,{employer:{id:employer.id,name:employer.name,cnpsNumber:employer.cnps_number,email:user.email,address:null,active:null},debt:null,currency:'XAF',moneyDecimals:0,
      requestTypes:[['moratorium','Moratorium'],['moratorium_remission','Moratorium with remission']].map(([code,label])=>({code,label,requiresMonths:true,minMonths:1,maxMonths:600,requiresAdvance:true,documentRules})),
      statuses:['Draft','Under review','Action required','Recommended','Approved','Rejected','Active','Completed','Overdue'].map(code=>({code,label:code})),csrfToken:csrf(req)});
  }
  if(req.method==='GET'&&(path==='/api/v1/deposits'||path==='/api/v1/deposits/documents')) {
    const {page,pageSize,offset}=pagination(url);const docs=path.endsWith('/documents');
    const args=[user.employer_id];let where='r.employer_id=$1';
    const search=url.searchParams.get('q');if(search){args.push(`%${search.slice(0,100)}%`);where+=` AND (r.reference ILIKE $${args.length}${docs?` OR d.file_name ILIKE $${args.length}`:''})`;}
    const status=url.searchParams.get('status');if(status){args.push(status);where+=` AND r.status=$${args.length}`;}
    const from=docs?'request_documents d JOIN moratorium_requests r ON r.id=d.request_id':'moratorium_requests r';
    if(docs) where+=' AND d.removed_at IS NULL';
    const total=Number((await db.query(`SELECT count(*) FROM ${from} WHERE ${where}`,args)).rows[0].count);
    const columns=docs?'r.id AS request_id,r.reference,r.status,d.id,d.kind,d.file_name AS "fileName",octet_length(d.content) AS "sizeBytes",d.uploaded_at AS "uploadedAt"':'r.*';
    const rows=(await db.query(`SELECT ${columns} FROM ${from} WHERE ${where} ORDER BY ${docs?'d.uploaded_at DESC,d.id':'r.updated_at DESC,r.id'} LIMIT 50 OFFSET $${args.length+1}`,[...args,offset])).rows;
    return send(200,{items:rows.map(r=>docs?document(r,{id:r.request_id,reference:r.reference,status:r.status}):summary(r)),total,page,pageSize});
  }
  const match=path.match(/^\/api\/v1\/deposits\/([a-f0-9-]{36})(?:\/(documents|validate|submit)(?:\/([a-f0-9-]{36})(\/content)?)?)?$/);
  if(req.method==='GET'&&match) {
    const [,id,action,docId,content]=match;
    if(!action) return send(200,await record(db,user,id));
    if(action==='documents'&&content) {
      await visible(db,user,id);
      if(!(await db.query('SELECT 1 FROM request_documents WHERE id=$1 AND request_id=$2 AND removed_at IS NULL',[docId,id])).rowCount) fail(404,'Document not found.');
      return requestRoute({db,req,res,path:`/api/v1/documents/${docId}/download`,body,send});
    }
  }
  if(req.headers['x-csrf-token']!==csrf(req)) fail(403,'Reload the page to authorize this action.');
  const create=path==='/api/v1/deposits'&&req.method==='POST';
  if(!create&&!match) fail(404,'Route not found.');
  const [,id,action,docId,content]=match||[];
  if(content || (!create&&!((!action&&['PUT','DELETE'].includes(req.method))||(action==='documents'&&((!docId&&req.method==='POST')||(docId&&req.method==='DELETE')))||(['submit','validate'].includes(action)&&!docId&&req.method==='POST')))) fail(405,'Method not allowed.');
  const version=Number(/^"([0-9]+)"$/.exec(req.headers['if-match']||'')?.[1]);
  if(!create&&!Number.isSafeInteger(version)) fail(428,'Supply the saved request version.');
  const key=req.headers['idempotency-key'];
  if((create||action==='submit')&&(typeof key!=='string'||!/^[a-zA-Z0-9-]{16,100}$/.test(key))) fail(400,'Supply a valid idempotency key.');
  const fingerprint=digest(JSON.stringify([req.method,path,version||null,body]));
  const result=await transaction(db,async client=>{
    if(create||action==='submit') {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${user.id}:${key}`]);
      const previous=(await client.query('SELECT * FROM request_idempotency WHERE user_id=$1 AND key=$2',[user.id,key])).rows[0];
      if(previous) {if(previous.fingerprint!==fingerprint) fail(409,'This retry key was already used for different information.');return previous;}
    }
    if(!create) {
      const locked=await visible(client,user,id,true);
      if(locked.version!==version) fail(409,'This request changed. Reload the saved request.');
      if(!action&&req.method==='DELETE') {
        // Discarding is limited to work that was never submitted, so no payment
        // plan or approval can be pointing at it yet.
        if(!editable(locked.status)||locked.submittedAt) fail(409,'Only a draft that was never submitted can be deleted.');
        // Nothing cascades from moratorium_requests: the children go first.
        for(const statement of [
          'DELETE FROM request_documents WHERE request_id=$1',
          'DELETE FROM request_events WHERE request_id=$1',
          'DELETE FROM request_approvals WHERE request_id=$1',
          'DELETE FROM notifications WHERE request_id=$1',
          'DELETE FROM request_submission_receipts WHERE request_id=$1',
          'UPDATE audit_events SET request_id=NULL WHERE request_id=$1'
        ]) await client.query(statement,[id]);
        // Idempotency rows hang off the account, not the request, so they are matched on the stored response.
        await client.query("DELETE FROM request_idempotency WHERE user_id=$2 AND (response->>'id'=$1 OR response->'deposit'->>'id'=$1)",[id,user.id]);
        await client.query('DELETE FROM moratorium_requests WHERE id=$1',[id]);
        await audit(client,user,`draft.deleted:${locked.reference}`);
        return {status:200,response:{deleted:id}};
      }
    }
    if(action==='validate') {
      const r=await visible(client,user,id);
      try {if(!editable(r.status)) fail(409,'This request cannot be submitted.');formData({...r.form,declaration:true},true);if(!r.form.advanceAmount) fail(400,'Enter the declared advance amount.');await documentsComplete(client,id);}
      catch(error){if(!error.status) throw error;return {status:200,response:{valid:false,issues:[{field:'request',message:error.message}]}};}
      return {status:200,response:{valid:true,issues:[]}};
    }
    if(action==='submit') {
      if(body.declaration!==true) fail(400,'Confirm the declaration before submitting.');
      if(!(await visible(client,user,id)).form.advanceAmount) fail(400,'Enter the declared advance amount.');
    }
    let legacyBody=create||!action?input(body):body;
    const legacyAction=!action?'save':action==='documents'&&docId?'remove-document':action;
    legacyBody={...legacyBody,version,documentId:docId};
    let saved;
    await requestRoute({db:client,req:{method:'POST',url:'/api/v1/requests',headers:req.headers},res,path:create?'/api/v1/requests':`/api/v1/requests/${id}/${legacyAction}`,body:legacyBody,send:(_status,data)=>{saved=data.request;},runTransaction:async(_db,work)=>work(client)});
    const deposit=await record(client,user,saved.id);
    const response=action==='submit'?{deposit,receipt:deposit.receipt}:deposit;
    const status=create?201:200;
    if(create||action==='submit') await client.query('INSERT INTO request_idempotency(user_id,key,fingerprint,status,response) VALUES($1,$2,$3,$4,$5)',[user.id,key,fingerprint,status,response]);
    return {status,response};
  });
  return send(result.status,result.response);
}
