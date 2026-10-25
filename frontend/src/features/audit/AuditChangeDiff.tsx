import { useState } from 'react';
import { Button } from '../../design/Button';
import { Eyebrow } from '../../design/Eyebrow';

const TRUNCATE_LENGTH = 400;

function formatJson(value: Record<string, unknown> | null): string {
  if (value === null) return '—';
  return JSON.stringify(value, null, 2);
}

function JsonBlock({
  label,
  value,
}: {
  label: string;
  value: Record<string, unknown> | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const formatted = formatJson(value);
  const canTruncate = formatted.length > TRUNCATE_LENGTH;
  const display =
    canTruncate && !expanded
      ? `${formatted.slice(0, TRUNCATE_LENGTH)}…`
      : formatted;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <Eyebrow tone="silver" size="label">
        {label}
      </Eyebrow>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-small bg-surface-kelp p-4 font-ui text-meta text-text-silver">
        {display}
      </pre>
      {canTruncate && (
        <Button
          variant="ghost"
          className="self-start"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? 'Show less' : 'Show full value'}
        </Button>
      )}
    </div>
  );
}

export interface AuditChangeDiffProps {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export function AuditChangeDiff({ before, after }: AuditChangeDiffProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <JsonBlock label="Before" value={before} />
      <JsonBlock label="After" value={after} />
    </div>
  );
}
