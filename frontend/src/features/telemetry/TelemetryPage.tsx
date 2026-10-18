import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '../../design/EmptyState';
import { Eyebrow } from '../../design/Eyebrow';
import { Field } from '../../design/Field';
import { Heading } from '../../design/Heading';
import { Select, type SelectOption } from '../../design/Select';
import { listAssets } from '../assets/api';
import { TelemetryPanel } from './TelemetryPanel';

const REFERENCE_STALE_TIME = 5 * 60_000;

const RANGE_OPTIONS: SelectOption[] = [
  { value: '20', label: 'Last 20 readings' },
  { value: '60', label: 'Last 60 readings' },
  { value: '120', label: 'Last 120 readings' },
  { value: '300', label: 'Last 300 readings' },
];
const DEFAULT_RANGE = '120';

export default function TelemetryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const assetId = searchParams.get('assetId') ?? '';
  const range = searchParams.get('range') ?? DEFAULT_RANGE;

  const assetsQuery = useQuery({
    queryKey: [
      'assets',
      'list',
      { limit: 100, sortBy: 'asset.tag', sortDir: 'ASC' },
    ],
    queryFn: () =>
      listAssets({ limit: 100, sortBy: 'asset.tag', sortDir: 'ASC' }),
    staleTime: REFERENCE_STALE_TIME,
  });

  const assetOptions: SelectOption[] = (assetsQuery.data?.data ?? []).map(
    (asset) => ({ value: asset.id, label: asset.tag }),
  );

  function updateParams(patch: Record<string, string | undefined>) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        for (const [key, value] of Object.entries(patch)) {
          if (value) {
            next.set(key, value);
          } else {
            next.delete(key);
          }
        }
        return next;
      },
      { replace: true },
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Eyebrow tone="silver" size="label">
          Live sensor data
        </Eyebrow>
        <Heading level={1} scale="heading">
          Telemetry
        </Heading>
      </div>

      <div className="flex flex-wrap gap-4">
        <Field label="Asset" className="w-64">
          <Select
            options={[{ value: '', label: 'Select an asset' }, ...assetOptions]}
            value={assetId}
            searchable
            onChange={(value) => updateParams({ assetId: value || undefined })}
          />
        </Field>
        <Field label="Range" className="w-56">
          <Select
            options={RANGE_OPTIONS}
            value={range}
            onChange={(value) => updateParams({ range: value })}
          />
        </Field>
      </div>

      {assetId ? (
        <TelemetryPanel assetId={assetId} limit={Number(range)} />
      ) : (
        <EmptyState
          title="Select an asset"
          body="Choose an asset above to see its live readings and trend chart."
        />
      )}
    </div>
  );
}
