import {currentUser,roles,fail,digest,sessionToken} from './auth.mjs';
// This catalogue describes enforced capabilities. Scope and workflow-stage checks
// still apply to every operation; this endpoint cannot grant new permissions.
const grants={
 employer:{deposits:['view'],requests:['view','create','edit'],documents:['view','create','edit'],payments:['view'],notifications:['view','edit'],settings:['view','edit']},
 agent_dt:{deposits:['view'],requests:['view','review'],documents:['view','create'],payments:['view','follow-up'],notifications:['view','edit'],settings:['view','edit']},
 ce_cea:{deposits:['view'],requests:['view','decide'],documents:['view'],payments:['view','activate'],notifications:['view','edit'],settings:['view','edit']},
 s_dct:{deposits:['view'],requests:['view','decide'],documents:['view'],payments:['view','activate'],notifications:['view','edit'],settings:['view','edit']},
 dt:{deposits:['view'],requests:['view','decide'],documents:['view'],payments:['view','activate'],notifications:['view','edit'],settings:['view','edit']},
 dg:{deposits:['view'],requests:['view','decide'],documents:['view'],payments:['view','activate'],notifications:['view','edit'],settings:['view','edit']},
 cps:{requests:['view'],documents:['view','create'],deposits:['view','verify'],payments:['view','create','edit','reconcile','follow-up'],reports:['view','export'],notifications:['view','edit'],settings:['view','edit']},
 administrator:{deposits:['view'],requests:['view','assign'],documents:['view'],users:['view','edit'],centres:['view','create','edit'],roles:['view'],payments:['view'],reports:['view','export'],audit:['view'],configuration:['view','edit'],notifications:['view','edit'],settings:['view','edit']},
};
const areas={requests:'Requests (ownership and assignment apply)',documents:'Supporting documents',deposits:'Advance verification',payments:'Payment plans (stage and final decision actor checks apply)',users:'Accounts',centres:'Centres',roles:'Role catalogue',reports:'Reports',audit:'Audit log',configuration:'System configuration',notifications:'Own notifications',settings:'Own account settings'};
const actions=['view','create','edit','review','decide','assign','verify','activate','reconcile','follow-up','export'].map(code=>({code,label:code}));
export async function rolesRoute({db,req,path,send}){
 const user=await currentUser(db,req);if(user.role!=='administrator')fail(403,'Administrator access required.');
 const roleId=path.match(/\/roles\/([^/]+)\/permissions$/)?.[1];if(!roles.includes(roleId))fail(404,'Role not found.');
 if(req.method!=='GET')fail(403,'Permissions are enforced by the workflow services and cannot be changed in this catalogue.');
 return send(200,{roleId,version:'1',csrfToken:digest('roles:'+sessionToken(req)),canEdit:false,actions,areas:Object.entries(areas).map(([id,label])=>({id,label,permissions:actions.map(({code})=>({action:code,enabled:grants[roleId][id]?.includes(code)||false,editable:false}))}))});
}
