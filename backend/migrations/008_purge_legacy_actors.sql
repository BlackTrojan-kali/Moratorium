-- Retire the actor roles that the current eight replaced
-- (employer, agent_dt, ce_cea, s_dct, dt, dg, cps, administrator).
--
-- The old constraint still allowed those roles, which also blocked creating a
-- staff account with any of the current ones.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Notifications are the only reference to an account without ON DELETE CASCADE.
DELETE FROM notifications n USING users u
 WHERE n.user_id = u.id
   AND u.role NOT IN ('employer','agent_dt','ce_cea','s_dct','dt','dg','cps','administrator');

-- Accounts left over from a retired role and holding no history are removed.
DELETE FROM users u
 WHERE u.role NOT IN ('employer','agent_dt','ce_cea','s_dct','dt','dg','cps','administrator')
   AND NOT EXISTS (SELECT 1 FROM moratorium_requests r WHERE r.created_by = u.id OR r.processor_id = u.id OR r.deposit_confirmed_by = u.id)
   AND NOT EXISTS (SELECT 1 FROM request_documents d WHERE d.uploaded_by = u.id)
   AND NOT EXISTS (SELECT 1 FROM request_events e WHERE e.actor_id = u.id)
   AND NOT EXISTS (SELECT 1 FROM request_approvals p WHERE p.user_id = u.id)
   AND NOT EXISTS (SELECT 1 FROM request_idempotency i WHERE i.user_id = u.id)
   AND NOT EXISTS (SELECT 1 FROM audit_events a WHERE a.actor_id = u.id)
   AND NOT EXISTS (SELECT 1 FROM payment_plans pl WHERE pl.created_by = u.id OR pl.activated_by = u.id)
   AND NOT EXISTS (SELECT 1 FROM observed_payments o WHERE o.recorded_by = u.id OR o.reversed_by = u.id)
   AND NOT EXISTS (SELECT 1 FROM recovery_notes n WHERE n.actor_id = u.id);

-- An account that still carries history cannot be erased without rewriting it:
-- it is retired instead, mapped to the least-privileged staff role.
UPDATE users SET active = false,
       role = CASE role
                WHEN 'processor' THEN 'agent_dt'
                WHEN 'approver' THEN 'dt'
                WHEN 'finance' THEN 'cps'
                WHEN 'auditor' THEN 'administrator'
                ELSE 'agent_dt'
              END
 WHERE role NOT IN ('employer','agent_dt','ce_cea','s_dct','dt','dg','cps','administrator');

ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
  'employer','agent_dt','ce_cea','s_dct','dt','dg','cps','administrator'
));
