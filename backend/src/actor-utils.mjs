import {randomUUID} from 'node:crypto';
import {fail} from './auth.mjs';
export const today=()=>new Date().toISOString().slice(0,10);
export function requireRole(user,...roles){if(!roles.includes(user.role)) fail(403,'This action is not permitted for your role.');}
export function text(value,label,max=4000){if(typeof value!=='string'||!value.trim()||value.length>max)fail(400,`${label} is required (maximum ${max} characters).`);return value.trim();}
export function money(value){if(typeof value!=='string'||!/^\d{1,16}$/.test(value)||BigInt(value)<1n||BigInt(value)>9007199254740991n)fail(400,'Enter a positive whole XAF amount.');return BigInt(value);}
export function date(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)fail(400,'Enter a valid calendar date.');return value;}
export function version(body,row){if(!Number.isInteger(Number(body.version))||String(row.version)!==String(body.version))fail(409,'This record changed. Reload before saving.');}
export function page(url){const n=Number(url.searchParams.get('page')||1);if(!Number.isInteger(n)||n<1||n>100000)fail(400,'Invalid page.');return {page:n,pageSize:50,offset:(n-1)*50};}
export async function audit(db,user,action,requestId=null){await db.query('INSERT INTO audit_events(id,actor_id,request_id,action) VALUES($1,$2,$3,$4)',[randomUUID(),user.id,requestId,action]);}
export function csv(rows,headers){const cell=value=>'"'+String(value??'').replace(/^[\s]*[=+@-]/,"'$&").replaceAll('"','""')+'"';return '\uFEFF'+[headers,...rows].map(row=>row.map(cell).join(',')).join('\r\n');}

export function canonicalJSON(value){if(value===null||typeof value!=='object')return JSON.stringify(value);if(value instanceof Date)return JSON.stringify(value.toISOString());if(Array.isArray(value))return '['+value.map(canonicalJSON).join(',')+']';return '{'+Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>JSON.stringify(k)+':'+canonicalJSON(value[k])).join(',')+'}';}
