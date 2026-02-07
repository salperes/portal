import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
}

const getInitials = (name: string): string => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ name, src, size = 'md', className, ...props }, ref) => {
    const sizes = {
      sm: 'w-8 h-8 text-sm',
      md: 'w-10 h-10 text-base',
      lg: 'w-12 h-12 text-lg',
    };

    if (src) {
      return (
        <img
          src={src}
          alt={name}
          className={cn('rounded-full object-cover', sizes[size], className)}
        />
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-full bg-[#1890FF] flex items-center justify-center text-white font-medium',
          sizes[size],
          className
        )}
        {...props}
      >
        {getInitials(name)}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';
