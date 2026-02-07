import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, Check, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../utils/cn';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  icon?: ReactNode;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'info', title, icon, children, className, ...props }, ref) => {
    const variants = {
      info: {
        container: 'bg-blue-50 border-l-[#0078d4]',
        icon: <Info className="w-5 h-5 text-[#0078d4]" />,
        title: 'text-[#0078d4]',
        text: 'text-blue-600',
      },
      success: {
        container: 'bg-emerald-50 border-l-emerald-500',
        icon: <Check className="w-5 h-5 text-emerald-600" />,
        title: 'text-emerald-700',
        text: 'text-emerald-600',
      },
      warning: {
        container: 'bg-amber-50 border-l-amber-500',
        icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
        title: 'text-amber-700',
        text: 'text-amber-600',
      },
      error: {
        container: 'bg-[#fde7e9] border-l-[#a80000]',
        icon: <AlertCircle className="w-5 h-5 text-[#a80000]" />,
        title: 'text-[#a80000]',
        text: 'text-[#a80000]/80',
      },
    };

    const config = variants[variant];

    return (
      <div
        ref={ref}
        className={cn('p-4 border-l-4 rounded-r-lg', config.container, className)}
        {...props}
      >
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 mt-0.5">{icon || config.icon}</span>
          <div>
            {title && <p className={cn('font-semibold', config.title)}>{title}</p>}
            <div className={cn('text-sm', config.text)}>{children}</div>
          </div>
        </div>
      </div>
    );
  }
);

Alert.displayName = 'Alert';
