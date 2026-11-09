import {randomUUID} from 'node:crypto';
import {digest,fail,transaction,sessionToken} from './auth.mjs';
import {text,version,page,audit} from './actor-utils.mjs';
const regions=[['AD','Adamawa'],['CE','Centre'],['ES','East'],['EN','Far North'],['LT','Littoral'],['NO','North'],['NW','North West'],['OU','West'],['SU','South'],['SW','South West']].map(([code,label])=>({code,label}));
const token=req=>digest('centre-settings:'+sessionToken(req));
function summary(r){return {id:r.id,code:r.code,name:r.name,regionLabel:regions.find(x=>x.code===r.region_code)?.label||'Not assigned',status:{code:r.active?'active':'inactive',label:r.active?'Active':'Inactive'}};}
async function record(db,id){const row=(await db.query('SELECT * FROM reference_centres WHERE id=$1',[id])).rows[0];if(!row)fail(404,'Centre not found.');return {...summary(row),version:String(row.version),regionCode:row.region_code||'',address:row.address,canEdit:true,staff:(await db.query('SELECT id,display_name AS "displayName",role AS "roleLabel" FROM users WHERE centre_id=$1 AND active ORDER BY display_name',[id])).rows};}
// The caller authenticates and requires the administrator role before dispatch.
export async function centreRoute({db,user,req,path,body,send}){
 const url=new URL(req.url,'http://localhost');
 if(path==='/api/v1/admin/centres/options'&&req.method==='GET')return send(200,{regions,statuses:[{code:'active',label:'Active'},{code:'inactive',label:'Inactive'}],canCreate:true,csrfToken:token(req)});
 if(path==='/api/v1/admin/centres'&&req.method==='GET'){
  const paging=page(url),args=[];let where='TRUE';const q=url.searchParams.get('q');if(q){args.push(`%${q.slice(0,100)}%`);where+=` AND (code ILIKE $${args.length} OR name ILIKE $${args.length})`;}
  const status=url.searchParams.get('status');if(status){if(!['active','inactive'].includes(status))fail(400,'Unknown status.');args.push(status==='active');where+=` AND active=$${args.length}`;}
  const total=Number((await db.query(`SELECT count(*) FROM reference_centres WHERE ${where}`,args)).rows[0].count);
  const items=(await db.query(`SELECT * FROM reference_centres WHERE ${where} ORDER BY name,id LIMIT 50 OFFSET $${args.length+1}`,[...args,paging.offset])).rows.map(summary);
  return send(200,{items,total,page:paging.page,pageSize:50});
 }
 const match=path.match(/^\/api\/v1\/admin\/centres\/([a-f0-9-]{36})$/);const id=match?.[1];
 if(id&&req.method==='GET')return send(200,await record(db,id));
 if(req.method!=='POST'||(!id&&path!=='/api/v1/admin/centres'))fail(404,'Centre route not found.');
 if(body.csrfToken!==token(req))fail(403,'Reload the centre options before saving.');
 const v=body.values;if(!v)fail(400,'Centre details required.');
 const code=text(v.code,'Centre code',40),name=text(v.name,'Centre name',160),address=v.address?text(v.address,'Address',500):null;
 if(!regions.some(r=>r.code===v.regionCode)||!['active','inactive'].includes(v.statusCode))fail(400,'Select a valid region and status.');
 if(!id&&(typeof body.idempotencyKey!=='string'||!/^[a-zA-Z0-9-]{16,100}$/.test(body.idempotencyKey)))fail(400,'Supply a valid creation key.');
 const fingerprint=digest(JSON.stringify([path,v]));
 const result=await transaction(db,async client=>{
  if(!id){await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${user.id}:${body.idempotencyKey}`]);const previous=(await client.query('SELECT * FROM request_idempotency WHERE user_id=$1 AND key=$2',[user.id,body.idempotencyKey])).rows[0];if(previous){if(previous.fingerprint!==fingerprint)fail(409,'This retry key was used for different information.');return previous.response;}}
  const targetId=id||randomUUID();
  if(id){const row=(await client.query('SELECT * FROM reference_centres WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!row)fail(404,'Centre not found.');version(body,row);await client.query('UPDATE reference_centres SET code=$1,name=$2,active=$3,region_code=$4,address=$5,version=version+1 WHERE id=$6',[code,name,v.statusCode==='active',v.regionCode,address,id]);}
  else await client.query('INSERT INTO reference_centres(id,code,name,active,region_code,address) VALUES($1,$2,$3,$4,$5,$6)',[targetId,code,name,v.statusCode==='active',v.regionCode,address]);
  await audit(client,user,'reference.centre_updated:'+code);const response=await record(client,targetId);
  if(!id)await client.query('INSERT INTO request_idempotency(user_id,key,fingerprint,status,response) VALUES($1,$2,$3,201,$4)',[user.id,body.idempotencyKey,fingerprint,response]);return response;
 });return send(id?200:201,result);
}
