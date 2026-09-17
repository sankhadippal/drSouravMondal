import { cn, statusColors } from '../../utils';

interface Props {
  status: string;
  label?: string;
  className?: string;
}

export default function Badge({ status, label, className }: Props) {
  const color = statusColors[status] || 'bg-gray-100 text-gray-700';
  return (
    <span className={cn('badge', color, className)}>
      {label || status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
    </span>
  );
}
