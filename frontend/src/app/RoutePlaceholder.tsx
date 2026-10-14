import { Eyebrow } from '../design/Eyebrow';
import { Heading } from '../design/Heading';

export interface RoutePlaceholderProps {
  title: string;
  phase: string;
}

export function RoutePlaceholder({ title, phase }: RoutePlaceholderProps) {
  return (
    <div className="flex flex-col gap-2">
      <Eyebrow tone="silver" size="label">
        Coming in {phase}
      </Eyebrow>
      <Heading level={1} scale="heading-lg">
        {title}
      </Heading>
    </div>
  );
}
