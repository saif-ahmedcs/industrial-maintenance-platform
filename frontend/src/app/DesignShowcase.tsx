import { useState, type ReactNode } from 'react';
import { Button } from '../design/Button';
import { IconButton } from '../design/IconButton';
import { NavLink } from '../design/NavLink';
import { Eyebrow } from '../design/Eyebrow';
import { Heading } from '../design/Heading';
import { Stat } from '../design/Stat';
import { StatusTag, type StatusTagValue } from '../design/StatusTag';
import { Field } from '../design/Field';
import { Table, type TableColumn } from '../design/Table';
import { Pagination, type PaginationMeta } from '../design/Pagination';
import { Surface } from '../design/Surface';
import { Panel } from '../design/Panel';
import { EmptyState } from '../design/EmptyState';
import { ErrorState } from '../design/ErrorState';
import { Skeleton } from '../design/Skeleton';
import { Sphere } from '../design/Sphere';

const ALL_STATUSES: StatusTagValue[] = [
  'OPERATIONAL',
  'UNDER_MAINTENANCE',
  'CRITICAL',
  'DECOMMISSIONED',
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'BLOCKED',
  'COMPLETED',
  'CANCELLED',
  'AUTO',
  'CRITICAL_ASSET',
  'OVERDUE_MAINTENANCE',
  'LOW_STOCK',
  'UNREAD',
  'ACKNOWLEDGED',
  'RESOLVED',
  'ADMIN',
  'SUPERVISOR',
  'TECHNICIAN',
  'VIEWER',
];

interface AssetRow {
  tag: string;
  type: string;
  status: StatusTagValue;
}

const ASSET_ROWS: AssetRow[] = [
  { tag: 'PUMP-01', type: 'Centrifugal pump', status: 'OPERATIONAL' },
  { tag: 'MOTOR-01', type: 'Induction motor', status: 'CRITICAL' },
  { tag: 'CONV-04', type: 'Conveyor', status: 'UNDER_MAINTENANCE' },
];

const ASSET_COLUMNS: TableColumn<AssetRow>[] = [
  { key: 'tag', header: 'Tag' },
  { key: 'type', header: 'Type' },
  {
    key: 'status',
    header: 'Status',
    align: 'right',
    render: (row) => <StatusTag status={row.status} />,
  },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <Heading level={2} scale="heading">
        {title}
      </Heading>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-4">{children}</div>;
}

function PaginationDemo() {
  const [page, setPage] = useState(1);
  const meta: PaginationMeta = { page, limit: 10, total: 42, totalPages: 5 };
  return <Pagination meta={meta} onPageChange={setPage} />;
}

function FieldDemo() {
  const [value, setValue] = useState('');
  return (
    <div className="grid max-w-md grid-cols-1 gap-6">
      <Field label="Asset tag">
        <input value={value} onChange={(e) => setValue(e.target.value)} />
      </Field>
      <Field label="Asset tag" hint="The tag printed on the nameplate.">
        <input />
      </Field>
      <Field label="Asset tag" error="This field is required.">
        <input />
      </Field>
    </div>
  );
}

export default function DesignShowcase() {
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-16 p-9">
      <Heading level={1} scale="display">
        Design system showcase
      </Heading>

      <Section title="Surface">
        <Row>
          <Surface tone="kelp" padding="card">
            <p className="text-text-platinum">tone=&quot;kelp&quot;</p>
          </Surface>
          <Surface tone="deep" padding="card">
            <p className="text-text-platinum">tone=&quot;deep&quot;</p>
          </Surface>
          <Surface tone="kelp" padding="card-lg">
            <p className="text-text-platinum">padding=&quot;card-lg&quot;</p>
          </Surface>
          <Surface tone="kelp" padding="none">
            <p className="text-text-platinum">padding=&quot;none&quot;</p>
          </Surface>
        </Row>
      </Section>

      <Section title="Panel">
        <Row>
          <Panel padding="dense">
            <p className="text-text-platinum">padding=&quot;dense&quot;</p>
          </Panel>
          <Panel padding="recessed">
            <p className="text-text-platinum">padding=&quot;recessed&quot;</p>
          </Panel>
          <Panel padding="none">
            <p className="text-text-platinum">padding=&quot;none&quot;</p>
          </Panel>
        </Row>
      </Section>

      <Section title="Button">
        <Row>
          <Button variant="primary">Sign in</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="primary" loading>
            Sign in
          </Button>
          <Button variant="primary" disabled>
            Sign in
          </Button>
          <Button variant="primary">Create work order</Button>
        </Row>
      </Section>

      <Section title="IconButton">
        <Row>
          <IconButton label="Open asset" icon="open" />
          <IconButton label="Close" icon="close" />
          <IconButton label="Open asset" icon="open" disabled />
        </Row>
      </Section>

      <Section title="NavLink">
        <Row>
          <NavLink to="/dev/design" active>
            Overview
          </NavLink>
          <NavLink to="/dev/design">Assets</NavLink>
        </Row>
      </Section>

      <Section title="Eyebrow">
        <Row>
          <Eyebrow tone="silver" size="label">
            Industrial maintenance
          </Eyebrow>
          <Eyebrow tone="mist" size="eyebrow">
            Industrial maintenance
          </Eyebrow>
        </Row>
      </Section>

      <Section title="Heading">
        <div className="flex flex-col gap-2">
          <Heading level={1} scale="display">
            Display
          </Heading>
          <Heading level={1} scale="heading-lg">
            Heading large
          </Heading>
          <Heading level={2} scale="heading">
            Heading
          </Heading>
          <Heading level={3} scale="heading">
            Heading level 3
          </Heading>
        </div>
      </Section>

      <Section title="Stat">
        <Row>
          <Stat value="12" label="Open work orders" tone="mist" />
          <Stat value="3" label="Critical assets" tone="silver" />
          <Stat value="—" label="Readings last hour" loading />
        </Row>
      </Section>

      <Section title="StatusTag">
        <Row>
          {ALL_STATUSES.map((status) => (
            <StatusTag key={status} status={status} />
          ))}
        </Row>
        <Row>
          {ALL_STATUSES.slice(0, 4).map((status) => (
            <StatusTag key={status} status={status} showDot={false} />
          ))}
        </Row>
      </Section>

      <Section title="Field">
        <FieldDemo />
      </Section>

      <Section title="Table">
        <Table
          columns={ASSET_COLUMNS}
          rows={ASSET_ROWS}
          rowKey={(r) => r.tag}
        />
        <Table columns={ASSET_COLUMNS} rows={[]} loading />
        <Table
          columns={ASSET_COLUMNS}
          rows={[]}
          empty="No assets match these filters."
        />
      </Section>

      <Section title="Pagination">
        <PaginationDemo />
      </Section>

      <Section title="EmptyState">
        <EmptyState
          title="No open work orders"
          body="Create one from an asset page."
        />
        <EmptyState
          title="No spare parts yet"
          body="Add the first part to start tracking stock."
          action={<Button variant="primary">Add part</Button>}
        />
      </Section>

      <Section title="ErrorState">
        <ErrorState error="Something went wrong loading this asset." />
        <ErrorState
          error={{
            message: 'Something went wrong on our side.',
            requestId: 'req_9f8c2e',
          }}
          onRetry={() => {}}
        />
      </Section>

      <Section title="Skeleton">
        <Skeleton lines={1} />
        <Skeleton lines={3} />
        <Skeleton lines={2} height={36} />
      </Section>

      <Section title="Sphere">
        <Row>
          <Sphere size={120} />
          <Sphere size={120} animated={false} />
        </Row>
      </Section>
    </div>
  );
}
