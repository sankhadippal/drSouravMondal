import { query } from '../config/db';
import { Request } from 'express';
import { AuthenticatedRequest } from '../types';

interface AuditLogParams {
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export const createAuditLog = async (params: AuditLogParams): Promise<void> => {
  try {
    await query(
      `INSERT INTO audit_logs 
        (user_id, user_name, user_role, action, entity_type, entity_id, description, ip_address, user_agent, old_values, new_values)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        params.userId || null,
        params.userName || null,
        params.userRole || null,
        params.action,
        params.entityType || null,
        params.entityId || null,
        params.description || null,
        params.ipAddress || null,
        params.userAgent || null,
        params.oldValues ? JSON.stringify(params.oldValues) : null,
        params.newValues ? JSON.stringify(params.newValues) : null,
      ]
    );
  } catch {
    // Audit log failures should never break the main flow
  }
};

export const auditFromRequest = (
  req: AuthenticatedRequest,
  action: string,
  entityType?: string,
  entityId?: string,
  description?: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>
): Promise<void> => {
  return createAuditLog({
    userId: req.user?.id,
    userName: req.user?.name,
    userRole: req.user?.role,
    action,
    entityType,
    entityId,
    description,
    ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
    oldValues,
    newValues,
  });
};
