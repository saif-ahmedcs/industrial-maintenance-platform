export interface SkeletonProps {
  lines?: number;
  height?: number | string;
  className?: string;
}

export function Skeleton({ lines = 1, height = 16, className }: SkeletonProps) {
  const lineCount = Math.max(lines, 1);
  const heightValue = typeof height === 'number' ? `${height}px` : height;

  const wrapperClasses = ['flex', 'flex-col', 'gap-2', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClasses} aria-hidden="true">
      {Array.from({ length: lineCount }).map((_, index) => {
        const isLastOfMany = lineCount > 1 && index === lineCount - 1;
        return (
          <div
            key={index}
            className="animate-pulse rounded-small bg-surface-abyss"
            style={{
              height: heightValue,
              width: isLastOfMany ? '70%' : '100%',
            }}
          />
        );
      })}
    </div>
  );
}
