import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-[--color-primary] text-white hover:opacity-90 focus-visible:ring-[--color-primary]',
        secondary:
          'bg-[--color-secondary] text-white hover:opacity-90 focus-visible:ring-[--color-secondary]',
        outline:
          'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
        ghost:
          'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        destructive:
          'bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4',
        lg: 'h-10 px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size }), className)}
        style={{ borderRadius: 'var(--radius-md)' }}
        {...props}
      >
        {isLoading ? (
          <span className="animate-spin mr-2 h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
        ) : null}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
