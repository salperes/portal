import { forwardRef, type InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  variant?: 'default' | 'underline';
  leftIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, variant = 'default', leftIcon, className, ...props }, ref) => {
    const variants = {
      default:
        'border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#0078d4] focus:border-transparent',
      underline:
        'border-b-2 border-gray-300 dark:border-gray-600 rounded-none focus:border-[#0078d4] focus:bg-white dark:focus:bg-gray-600',
    };

    return (
      <div className="space-y-1">
        {label && (
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none transition-colors',
              variants[variant],
              leftIcon && 'pl-10',
              error && 'border-red-500 focus:ring-red-500',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Search Input Variant
export interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'variant'> {}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>((props, ref) => (
  <Input ref={ref} leftIcon={<Search className="w-4 h-4" />} placeholder="Ara..." {...props} />
));

SearchInput.displayName = 'SearchInput';
