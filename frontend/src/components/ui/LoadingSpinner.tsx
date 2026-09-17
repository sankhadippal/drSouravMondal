import { cn } from '../../utils';

interface Props {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export default function LoadingSpinner({ fullScreen, size = 'md', text, className }: Props) {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };

  const spinner = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className={cn('border-3 border-teal-200 border-t-teal-700 rounded-full animate-spin', sizes[size])}
        style={{ borderWidth: size === 'lg' ? 4 : 3 }} />
      {text && <p className="text-sm text-gray-500 animate-pulse">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
        {spinner}
      </div>
    );
  }
  return spinner;
}
