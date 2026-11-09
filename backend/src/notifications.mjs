import { randomUUID } from 'node:crypto';
import { fail, transaction, publicUser } from './auth.mjs';

export async function sendNotification(db, employerId, message, requestId = null, type = 'info') {
  try {
    // Get all users associated with the employer
    const users = await db.query(
      'SELECT id FROM users WHERE employer_id = $1 AND active = true',
      [employerId]
    );
    
    // Create notifications for each employer user
    for (const user of users.rows) {
      await db.query(
        'INSERT INTO notifications(id, user_id, request_id, message, created_at) VALUES($1, $2, $3, $4, NOW())',
        [randomUUID(), user.id, requestId, message]
      );
    }
    
    // Also send to administrators for important notifications
    if (type === 'urgent' || type === 'error') {
      const admins = await db.query(
        "SELECT id FROM users WHERE role = 'administrator' AND active = true"
      );
      for (const admin of admins.rows) {
        await db.query(
          'INSERT INTO notifications(id, user_id, request_id, message, created_at) VALUES($1, $2, $3, $4, NOW())',
          [randomUUID(), admin.id, requestId, `[Employer Alert] ${message}`]
        );
      }
    }
    
    return { success: true, notifiedUsers: users.rowCount };
  } catch (error) {
    console.error('Failed to send notification:', error);
    throw error;
  }
}

export async function sendDecisionNotification(db, requestId, decision, employerId, reference) {
  const message = decision === 'Approved' 
    ? `Your moratorium request ${reference} has been approved. You can now proceed with the payment plan setup.`
    : `Your moratorium request ${reference} has been ${decision.toLowerCase()}. Please review the decision details and contact support if needed.`;
  
  return await sendNotification(db, employerId, message, requestId, decision === 'Approved' ? 'success' : 'warning');
}

export async function sendAssignmentNotification(db, requestId, processorId, reference) {
  const processor = await db.query('SELECT display_name FROM users WHERE id = $1', [processorId]);
  const processorName = processor.rows[0]?.display_name || 'Assigned officer';
  
  const message = `Your moratorium request ${reference} has been assigned to ${processorName} for review.`;
  
  // Get employer_id from the request
  const request = await db.query('SELECT employer_id FROM moratorium_requests WHERE id = $1', [requestId]);
  if (request.rowCount) {
    return await sendNotification(db, request.rows[0].employer_id, message, requestId, 'info');
  }
}

export async function sendReturnNotification(db, requestId, reason, employerId, reference) {
  const message = `Your moratorium request ${reference} has been returned for review: ${reason}. Please update and resubmit.`;
  
  return await sendNotification(db, employerId, message, requestId, 'warning');
}

/**
 * Tells the decision actor whose stage is next that the file has reached them.
 * The recipient is already scoped to the request by request_approvals, and the
 * message never contains financial data.
 */
export async function sendStageNotification(db, requestId, userId, reference, stageLabel) {
  const message = `Moratorium request ${reference} is awaiting your decision at the "${stageLabel}" stage.`;

  await db.query(
    'INSERT INTO notifications(id, user_id, request_id, message) VALUES($1, $2, $3, $4)',
    [randomUUID(), userId, requestId, message]
  );

  return { success: true };
}

export async function getNotifications(db, userId, limit = 50) {
  const result = await db.query(
    `SELECT n.id, n.message, n.request_id, n.created_at, n.read_at, r.reference 
     FROM notifications n 
     LEFT JOIN moratorium_requests r ON r.id = n.request_id 
     WHERE n.user_id = $1 
     ORDER BY n.created_at DESC 
     LIMIT $2`,
    [userId, limit]
  );
  
  const unreadCount = await db.query(
    'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL',
    [userId]
  );
  
  return {
    items: result.rows.map(n => ({
      id: n.id,
      message: n.message,
      requestId: n.request_id,
      createdAt: n.created_at,
      readAt: n.read_at,
      reference: n.reference
    })),
    unreadCount: parseInt(unreadCount.rows[0].count)
  };
}

export async function markNotificationAsRead(db, notificationId, userId) {
  const result = await db.query(
    'UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING id',
    [notificationId, userId]
  );
  
  if (!result.rowCount) {
    fail(404, 'Notification not found or does not belong to user');
  }
  
  return { success: true };
}