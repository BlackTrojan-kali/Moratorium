import {useEffect,useRef,useState,type ReactNode} from 'react';
import {api} from '../../app/api';
import '../../styles/actors.css';
export function useData<T>(path:string){
 const [data,setData]=useState<T|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
 useEffect(()=>{let live=true;setLoading(true);setData(null);setError('');void api<T>(path).then(v=>{if(live)setData(v);}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[path,revision]);
 return {data,error,loading,reload:()=>setRevision(v=>v+1)};
}
export function useWrite(reload:()=>void){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[stale,setStale]=useState(false);const lock=useRef(false);
 async function write(path:string,body:unknown){if(lock.current||stale)return;lock.current=true;setBusy(true);setError('');setMessage('');try{await api(path,body);setMessage('Saved.');reload();}catch(e){setError(e instanceof Error?e.message:'Unable to save.');setStale(true);}finally{setBusy(false);lock.current=false;}}
 return {write,busy,disabled:busy||stale,feedback:<>{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}{stale&&<button onClick={()=>{setStale(false);setError('');reload();}}>Reload saved data before retrying</button>}</>};
}
export function Frame({title,description,children}:{title:string;description?:string;children:ReactNode}){return <div className="actor-page"><header className="page-header"><h1>{title}</h1>{description&&<p>{description}</p>}</header>{children}</div>;}
export function Load({state}:{state:{loading:boolean;error:string;reload:()=>void}}){return state.loading?<p role="status">Loading…</p>:state.error?<p role="alert">{state.error} <button onClick={state.reload}>Retry</button></p>:null;}
export function money(v:string|null|undefined){if(v==null)return '—';try{return BigInt(v).toLocaleString('en-GB')+' XAF';}catch{return '—';}}
export function Pager({page,total,onPage}:{page:number;total:number;onPage:(n:number)=>void}){return <div className="actor-actions"><button disabled={page<=1} onClick={()=>onPage(page-1)}>Previous</button><span>Page {page} · {total} records</span><button disabled={page*50>=total} onClick={()=>onPage(page+1)}>Next</button></div>;}
