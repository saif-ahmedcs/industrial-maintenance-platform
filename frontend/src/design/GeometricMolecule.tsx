export interface GeometricMoleculeProps {
  className?: string;
}

interface Node {
  cx: number;
  cy: number;
}

const NODES: Node[] = [
  { cx: 40, cy: 54 },
  { cx: 124, cy: 26 },
  { cx: 192, cy: 78 },
  { cx: 108, cy: 118 },
  { cx: 176, cy: 176 },
  { cx: 70, cy: 196 },
  { cx: 18, cy: 142 },
];

const CONNECTIONS: [number, number][] = [
  [0, 1],
  [1, 2],
  [1, 3],
  [2, 3],
  [3, 4],
  [3, 5],
  [5, 6],
  [6, 0],
];

export function GeometricMolecule({ className }: GeometricMoleculeProps) {
  const classes = ['text-text-silver', className].filter(Boolean).join(' ');

  return (
    <svg
      viewBox="0 0 220 220"
      aria-hidden="true"
      fill="none"
      className={classes}
    >
      <g stroke="currentColor" strokeWidth="1" opacity="0.5">
        {CONNECTIONS.map(([from, to]) => {
          const a = NODES[from];
          const b = NODES[to];
          return (
            <line
              key={`${from}-${to}`}
              x1={a.cx}
              y1={a.cy}
              x2={b.cx}
              y2={b.cy}
            />
          );
        })}
      </g>
      <g fill="currentColor">
        {NODES.map((node, index) => (
          <circle
            key={`${node.cx}-${node.cy}`}
            cx={node.cx}
            cy={node.cy}
            r={index % 2 === 0 ? 5 : 3}
          />
        ))}
      </g>
    </svg>
  );
}
