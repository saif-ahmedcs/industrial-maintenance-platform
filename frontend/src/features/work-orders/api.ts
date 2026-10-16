import { z } from 'zod';
import { request, type QueryParams } from '../../lib/api/client';
import { paginated } from '../../lib/api/pagination';

export const workOrderStatusSchema = z.enum([
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'BLOCKED',
  'COMPLETED',
  'CANCELLED',
]);
export type WorkOrderStatus = z.infer<typeof workOrderStatusSchema>;

export const workOrderSourceSchema = z.enum(['MANUAL', 'PLANNED', 'AUTO']);
export type WorkOrderSource = z.infer<typeof workOrderSourceSchema>;

export const workOrderPrioritySchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
]);
export type WorkOrderPriority = z.infer<typeof workOrderPrioritySchema>;

const workOrderPartSchema = z.object({
  sparePartId: z.string(),
  quantityUsed: z.number(),
  unitCostAtCompletion: z.number(),
});

export const workOrderSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  maintenancePlanId: z.string().nullable(),
  status: workOrderStatusSchema,
  source: workOrderSourceSchema,
  priority: workOrderPrioritySchema,
  assignedToUserId: z.string().nullable(),
  description: z.string(),
  openedAt: z.string(),
  assignedAt: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  totalCost: z.number().nullable(),
  aiNote: z.string().nullable(),
  parts: z.array(workOrderPartSchema),
});
export type WorkOrder = z.infer<typeof workOrderSchema>;

export interface ListWorkOrdersParams extends QueryParams {
  page?: number;
  limit?: number;
  assetId?: string;
  status?: WorkOrderStatus;
  source?: WorkOrderSource;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC' | 'asc' | 'desc';
}

/** GET /work-orders */
export async function listWorkOrders(params: ListWorkOrdersParams = {}) {
  const data = await request<unknown>('/work-orders', { query: params });
  return paginated(workOrderSchema).parse(data);
}
