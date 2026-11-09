import type { RequestListItem } from '../../types/domain';
export type RequestForm = {contactName:string;contactEmail:string;address:string;reason:string;debtAmount:string|null;months:number|null;remissionRequested:boolean;remissionReason:string;declaration:boolean;advanceAmount?:string|null};
export type RequestFile = RequestListItem & {
 version:number;createdAt:string;employerName:string;debtAmount:string|null;months:number|null;processorId:string|null;assignedTo:string|null;route:string|null;
 currentPosition:number;totalPositions:number;daysInQueue:number;
 form:RequestForm;employer:{id:string;name:string;cnps_number:string};
 documents:{id:string;kind:string;fileName:string;sizeBytes:number;uploadedAt:string}[];
 history:{id:string;actorName:string;action:string;from_status:string;to_status:string;note:string;created_at:string}[];
 approvals:{position:number;user_id:string;label:string;displayName:string;approved_at:string|null;note:string|null;legal_reference:string;assessment:string;remission:boolean;remission_rationale:string;decided_action:'approve'|'reject'|null}[];
 reviewNote:string|null;routingBasis:string|null;deposit:{amount:string|null;reference:string|null;confirmedAt:string|null};decidedAt:string|null;
};
export const blankForm: RequestForm={contactName:'',contactEmail:'',address:'',reason:'',debtAmount:null,months:null,remissionRequested:false,remissionReason:'',declaration:false};
export const kinds:Record<string,string>={request_letter:'Signed request letter',debt_statement:'Debt statement',deposit_proof:'Deposit payment proof',hardship_evidence:'Evidence of financial difficulty',cps_opinion:'CPS reasoned opinion',other:'Other supporting document'};
export const downloadUrl=(id:string)=>`${import.meta.env.VITE_API_URL||'http://localhost:3000/api/v1'}/documents/${id}/download`;
export async function filePayload(file:File) {
 if(file.size>5242880 || !file.size) throw new Error('Choose a PDF, PNG or JPEG file up to 5 MiB.');
 return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Cannot read the file.'));reader.readAsDataURL(file);});
}
