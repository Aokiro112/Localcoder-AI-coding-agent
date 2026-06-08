import { Router } from 'express';
import { safetyLayer } from '../agent/SafetyLayer';
import { getDb } from '../db/database';

export const approvalRouter = Router();

// POST /api/approval/:id/approve
approvalRouter.post('/:id/approve', (req, res) => {
  const resolved = safetyLayer.resolveApproval(req.params.id, true);
  if (!resolved) {
    // Maybe it already timed out
    res.status(404).json({ error: 'Approval request not found or already resolved' });
    return;
  }
  res.json({ id: req.params.id, status: 'approved' });
});

// POST /api/approval/:id/reject
approvalRouter.post('/:id/reject', (req, res) => {
  const resolved = safetyLayer.resolveApproval(req.params.id, false);
  if (!resolved) {
    res.status(404).json({ error: 'Approval request not found or already resolved' });
    return;
  }
  res.json({ id: req.params.id, status: 'rejected' });
});

// GET /api/approval (list pending)
approvalRouter.get('/', (_req, res) => {
  const approvals = getDb()
    .prepare(`SELECT * FROM approvals WHERE status='pending' ORDER BY created_at DESC`)
    .all();
  res.json({ approvals });
});
