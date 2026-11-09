import { currentUser, fail } from './auth.mjs';
import { scope } from './requests.mjs';

const integer = value => Number.parseInt(value || '0', 10);
async function approvalMetrics(db, user) {
  const row = (await db.query(`SELECT COUNT(*) FILTER (WHERE approved_at IS NULL AND EXISTS (SELECT 1 FROM moratorium_requests r WHERE r.id=request_approvals.request_id AND r.status='Recommended')) pending, COUNT(*) FILTER (WHERE approved_at>=date_trunc('month',CURRENT_DATE)) completed FROM request_approvals WHERE user_id=$1`, [user.id])).rows[0];
  return { pending: integer(row.pending), completed: integer(row.completed) };
}

export async function dashboardRoute({ db, req, send }) {
  if (req.method !== 'GET') fail(405, 'Method not allowed.');
  const user = await currentUser(db, req);
  const url = new URL(req.url, 'http://localhost');
  const requestedRole = url.searchParams.get('role');
  const view = url.searchParams.get('view');
  if (requestedRole && requestedRole !== user.role) fail(403, 'Dashboard access denied.');

  if (user.role === 'employer' && view === 'actions') {
    const rows = (await db.query(`SELECT id,reference,COALESCE(review_note,'Update and resubmit your request.') action,(updated_at+INTERVAL '7 days') deadline FROM moratorium_requests WHERE employer_id=$1 AND status='Action required' ORDER BY updated_at DESC LIMIT 20`, [user.employer_id])).rows;
    return send(200, { items: rows });
  }
  if (user.role === 'employer' && view === 'instalments') {
    const rows = (await db.query(`SELECT r.id,r.reference,pi.amount_xaf amount,pi.due_date "dueDate" FROM payment_instalments pi JOIN payment_plans pp ON pp.id=pi.plan_id JOIN moratorium_requests r ON r.id=pp.id WHERE r.employer_id=$1 AND pp.state IN ('Active','Overdue') AND pi.due_date>=CURRENT_DATE ORDER BY pi.due_date LIMIT 20`, [user.employer_id])).rows;
    return send(200, { items: rows });
  }
  if (user.role === 'cps' && view === 'deposits') {
    const rows = (await db.query(`SELECT r.id,r.reference,e.name "employerName",COALESCE((r.form->>'advanceAmount')::numeric,0)::text "depositAmount",r.submitted_at "submittedAt" FROM moratorium_requests r JOIN employers e ON e.id=r.employer_id WHERE r.submitted_at IS NOT NULL AND r.deposit_amount_xaf IS NULL AND EXISTS (SELECT 1 FROM request_documents d WHERE d.request_id=r.id AND d.kind='deposit_proof') ORDER BY r.submitted_at LIMIT 50`)).rows;
    return send(200, { items: rows });
  }
  if (view) fail(404, 'Dashboard view not found.');

  if (user.role === 'employer') {
    const s=scope(user); const row=(await db.query(`SELECT COUNT(*) total,COUNT(*) FILTER (WHERE status='Under review') under_review,COUNT(*) FILTER (WHERE status='Action required') action_required FROM moratorium_requests r WHERE ${s.sql}`,s.args)).rows[0];
    const next=(await db.query(`SELECT pi.amount_xaf, pi.due_date::text AS "dueDate", pi.position, pp.id AS "planId", r.reference FROM payment_instalments pi JOIN payment_plans pp ON pp.id=pi.plan_id JOIN moratorium_requests r ON r.id=pp.id WHERE r.employer_id=$1 AND pp.state IN ('Active','Overdue') AND pi.due_date>=CURRENT_DATE ORDER BY pi.due_date LIMIT 1`,[user.employer_id])).rows[0];
    const activePlan=(await db.query(`SELECT pp.id, pp.state, pp.principal_xaf AS scheduled, r.reference, COALESCE((SELECT sum(amount_xaf) FROM observed_payments o WHERE o.plan_id=pp.id AND o.reversed_at IS NULL), 0)::text AS paid FROM payment_plans pp JOIN moratorium_requests r ON r.id=pp.id WHERE r.employer_id=$1 ORDER BY pp.created_at DESC LIMIT 1`,[user.employer_id])).rows[0]||null;
    const notifications=(await db.query('SELECT id, message, created_at, read_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5',[user.id])).rows;
    return send(200,{totalRequests:integer(row.total),underReview:integer(row.under_review),actionRequired:integer(row.action_required),nextAmountDue:next?.amount_xaf||null,nextInstalment:next?{amount:next.amount_xaf,dueDate:next.dueDate,position:next.position,planId:next.planId,reference:next.reference}:null,activePlan,notifications});
  }
  if (user.role === 'agent_dt') {
    const row=(await db.query(`SELECT COUNT(*) FILTER (WHERE processor_id=$1 AND status='Under review') assigned,COUNT(*) FILTER (WHERE processor_id IS NULL AND status='Under review') unassigned,COUNT(*) FILTER (WHERE status='Action required') awaiting,COUNT(*) FILTER (WHERE status='Under review' AND COALESCE(submitted_at,created_at)<NOW()-INTERVAL '7 days') old FROM moratorium_requests`,[user.id])).rows[0];
    return send(200,{assignedToMe:integer(row.assigned),unassigned:integer(row.unassigned),awaitingEmployer:integer(row.awaiting),over7Days:integer(row.old),averageProcessingTime:'—'});
  }
  if (['ce_cea','s_dct','dt','dg'].includes(user.role)) {
    const m=await approvalMetrics(db,user); const returned=integer((await db.query("SELECT COUNT(*) count FROM request_events WHERE action='return' AND created_at>=date_trunc('month',CURRENT_DATE)")).rows[0].count);
    if(user.role==='ce_cea')return send(200,{awaitingDecision:m.pending,returned,approvedThisMonth:m.completed,averageDecisionTime:'—',pendingCPSInput:0});
    if(user.role==='s_dct')return send(200,{awaitingEndorsement:m.pending,returned,endorsedThisMonth:m.completed,averageReviewTime:'—',pendingLetters:m.pending});
    if(user.role==='dt')return send(200,{awaitingValidation:m.pending,lettersToSign:m.pending,remissionDrafts:0,validatedThisMonth:m.completed,averageValidationTime:'—'});
    return send(200,{awaitingDecision:m.pending,returned,approvedThisMonth:m.completed,averageDecisionTime:'—',remissionRequests:0});
  }
  if (user.role === 'cps') {
    const row=(await db.query(`SELECT COUNT(DISTINCT pp.id) FILTER (WHERE pp.state IN ('Active','Overdue')) active,COUNT(pi.id) FILTER (WHERE pi.due_date>=CURRENT_DATE AND pi.due_date<CURRENT_DATE+INTERVAL '1 month') due,COUNT(pi.id) FILTER (WHERE pi.due_date<CURRENT_DATE AND pp.state IN ('Active','Overdue')) overdue FROM payment_plans pp LEFT JOIN payment_instalments pi ON pi.plan_id=pp.id`)).rows[0];
    const recovered=(await db.query("SELECT COALESCE(SUM(amount_xaf),0)::text total FROM observed_payments WHERE reversed_at IS NULL AND recorded_at>=date_trunc('year',CURRENT_DATE)")).rows[0].total;
    return send(200,{activePlans:integer(row.active),dueThisMonth:integer(row.due),overdue:integer(row.overdue),recoveredYTD:recovered});
  }
  if (user.role === 'administrator') {
    const row=(await db.query('SELECT COUNT(*) FILTER (WHERE active) active,COUNT(*) FILTER (WHERE NOT active) pending FROM users')).rows[0];
    return send(200,{activeUsers:integer(row.active),pendingActivation:integer(row.pending),workflowRules:1,deliveryFailures:0});
  }
  fail(403,'Dashboard access denied.');
}
