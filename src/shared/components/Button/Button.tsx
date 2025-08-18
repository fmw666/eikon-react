import React from 'react';

import { cn } from '@/shared/utils/cn';

// Button variant types
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';
type ButtonRadius = 'default' | 'rounded' | 'pill' | 'full' | 'none';

// Variant styles mapping
const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm hover:shadow-md disabled:hover:bg-blue-600 disabled:hover:shadow-sm",
  secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 border border-gray-300 disabled:hover:bg-gray-100",
  outline: "bg-transparent text-blue-600 border border-blue-600 hover:bg-blue-50 focus:ring-blue-500 disabled:hover:bg-transparent",
  ghost: "bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 disabled:hover:bg-transparent",
  danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm hover:shadow-md disabled:hover:bg-red-600 disabled:hover:shadow-sm",
  success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-sm hover:shadow-md disabled:hover:bg-green-600 disabled:hover:shadow-sm",
};

// Size styles mapping
const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm min-w-[32px]",
  md: "h-10 px-4 text-sm min-w-[40px]", // Default mobile size
  lg: "h-12 px-6 text-base min-w-[48px]",
  xl: "h-14 px-8 text-lg min-w-[56px]",
};

// Icon size styles mapping (for icon mode) - 使用aspect-ratio确保圆形
const iconSizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 w-8 p-0 !rounded-full flex-shrink-0 aspect-square",
  md: "h-10 w-10 p-0 !rounded-full flex-shrink-0 aspect-square",
  lg: "h-12 w-12 p-0 !rounded-full flex-shrink-0 aspect-square",
  xl: "h-14 w-14 p-0 !rounded-full flex-shrink-0 aspect-square",
};

// Radius styles mapping
const radiusStyles: Record<ButtonRadius, string> = {
  default: "rounded-lg",
  rounded: "rounded-xl",
  pill: "rounded-[50px]", // 您想要的圆滑效果
  full: "rounded-full",
  none: "rounded-none",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  radius?: ButtonRadius;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  // Icon mode props
  icon?: React.ReactNode;
  isIcon?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      radius = 'default',
      fullWidth = false,
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      children,
      disabled,
      icon,
      isIcon = false,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    
    // Determine if we should use icon mode
    const shouldUseIconMode = isIcon || (icon && !children && !leftIcon && !rightIcon);

    const buttonClasses = cn(
      // Base styles - mobile-first approach
      "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 touch-manipulation",
      // Focus ring - only add if not explicitly removed
      !className?.includes('focus:ring-0') && "focus:ring-2 focus:ring-offset-2",
      variantStyles[variant],
      // Use icon size styles if in icon mode, otherwise use regular size styles
      shouldUseIconMode ? iconSizeStyles[size] : sizeStyles[size],
      // Use specified radius for regular mode
      !shouldUseIconMode && radiusStyles[radius],
      fullWidth && !shouldUseIconMode && "w-full",
      loading && "opacity-75 pointer-events-none",
      className
    );

    return (
      <button
        className={buttonClasses}
        ref={ref}
        disabled={isDisabled}
        onClick={isDisabled ? undefined : props.onClick}
        {...props}
      >
        {loading ? (
          shouldUseIconMode ? (
            // Icon mode loading - centered spinner
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            // Regular mode loading
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {loadingText || children}
            </>
          )
        ) : shouldUseIconMode ? (
          // Icon mode - only show icon
          icon
        ) : (
          // Regular mode - show children with optional icons
          <>
            {leftIcon && (
              <span className="mr-2 flex-shrink-0">{leftIcon}</span>
            )}
            {children}
            {rightIcon && (
              <span className="ml-2 flex-shrink-0">{rightIcon}</span>
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
