import { forwardRef, type HTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

export interface LoadingProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const Loading = forwardRef<HTMLDivElement, LoadingProps>(
  ({ size = 'md', text, className, ...props }, ref) => {
    const sizes = {
      sm: 'w-4 h-4',
      md: 'w-8 h-8',
      lg: 'w-12 h-12',
    };

    return (
      <div ref={ref} className={cn('flex items-center justify-center gap-2', className)} {...props}>
        <Loader2 className={cn('text-[#0078d4] animate-spin', sizes[size])} />
        {text && <span className="text-sm text-gray-500">{text}</span>}
      </div>
    );
  }
);

Loading.displayName = 'Loading';

// Full page loading
export interface PageLoadingProps {
  text?: string;
}

export const PageLoading = ({ text = 'Yükleniyor...' }: PageLoadingProps) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loading size="lg" text={text} />
  </div>
);
