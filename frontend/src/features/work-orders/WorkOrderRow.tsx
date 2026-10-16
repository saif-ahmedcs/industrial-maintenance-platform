import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Eyebrow } from '../../design/Eyebrow';
import { IconButton } from '../../design/IconButton';
import { StatusTag } from '../../design/StatusTag';
import { getAsset } from '../assets/api';
import type { WorkOrder } from './api';

export interface WorkOrderRowProps {
  workOrder: WorkOrder;
}

function workOrderReference(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function AssetTag({ assetId }: { assetId: string }) {
  const { data, isPending } = useQuery({
    queryKey: ['assets', 'detail', assetId],
    queryFn: () => getAsset(assetId),
    staleTime: 5 * 60_000,
  });

  if (isPending) {
    return (
      <span
        className="inline-block h-4 w-16 animate-pulse rounded-small bg-surface-abyss"
        aria-hidden="true"
      />
    );
  }

  return <>{data?.tag ?? '—'}</>;
}

export function WorkOrderRow({ workOrder }: WorkOrderRowProps) {
  const navigate = useNavigate();
  const reference = workOrderReference(workOrder.id);

  return (
    <div className="flex items-center gap-4 border-b border-surface-abyss py-4 last:border-b-0">
      <span className="w-24 shrink-0 font-display text-meta font-normal text-text-silver">
        {reference}
      </span>
      <span className="w-24 shrink-0 truncate font-display text-body font-normal text-text-platinum">
        <AssetTag assetId={workOrder.assetId} />
      </span>
      <span className="min-w-0 flex-1 truncate font-display text-body font-normal text-text-silver">
        {workOrder.description}
      </span>
      <Eyebrow tone="silver" size="label" className="w-20 shrink-0">
        {workOrder.priority}
      </Eyebrow>
      <div className="flex shrink-0 items-center gap-1.5">
        <StatusTag status={workOrder.status} />
        {workOrder.source === 'AUTO' && (
          <StatusTag status="AUTO" showDot={false} />
        )}
      </div>
      <IconButton
        label={`Open work order ${reference}`}
        icon="open"
        onClick={() => navigate(`/work-orders/${workOrder.id}`)}
      />
    </div>
  );
}
