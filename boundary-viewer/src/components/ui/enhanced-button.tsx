import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EnhancedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  className?: string;
  style?: React.CSSProperties;
  fullWidth?: boolean;
}

export const EnhancedButton: React.FC<EnhancedButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  style = {},
  fullWidth = false,
}) => {
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    borderRadius: '8px',
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s ease-in-out',
    position: 'relative',
    overflow: 'hidden',
    ...(fullWidth && { width: '100%' }),
    ...style,
  };

  const sizeStyles = {
    sm: {
      padding: '6px 12px',
      fontSize: '12px',
      minHeight: '28px',
    },
    md: {
      padding: '8px 16px',
      fontSize: '14px',
      minHeight: '36px',
    },
    lg: {
      padding: '12px 20px',
      fontSize: '16px',
      minHeight: '44px',
    },
  };

  const variantStyles = {
    primary: {
      backgroundColor: '#3b82f6',
      color: 'white',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      '&:hover': {
        backgroundColor: '#2563eb',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        transform: 'translateY(-1px)',
      },
    },
    secondary: {
      backgroundColor: '#6b7280',
      color: 'white',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      '&:hover': {
        backgroundColor: '#4b5563',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        transform: 'translateY(-1px)',
      },
    },
    success: {
      backgroundColor: '#10b981',
      color: 'white',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      '&:hover': {
        backgroundColor: '#059669',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        transform: 'translateY(-1px)',
      },
    },
    danger: {
      backgroundColor: '#ef4444',
      color: 'white',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      '&:hover': {
        backgroundColor: '#dc2626',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        transform: 'translateY(-1px)',
      },
    },
    warning: {
      backgroundColor: '#f59e0b',
      color: 'white',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      '&:hover': {
        backgroundColor: '#d97706',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        transform: 'translateY(-1px)',
      },
    },
    info: {
      backgroundColor: '#3b82f6',
      color: 'white',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      '&:hover': {
        backgroundColor: '#2563eb',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        transform: 'translateY(-1px)',
      },
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#6b7280',
      border: '1px solid #e5e7eb',
      '&:hover': {
        backgroundColor: '#f9fafb',
        color: '#374151',
        borderColor: '#d1d5db',
      },
    },
  };

  const handleMouseOver = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    const hoverStyle = variantStyles[variant]['&:hover'];
    if (hoverStyle) {
      Object.assign(e.currentTarget.style, hoverStyle);
    }
  };

  const handleMouseOut = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    const baseStyle = variantStyles[variant];
    Object.assign(e.currentTarget.style, {
      backgroundColor: baseStyle.backgroundColor,
      color: baseStyle.color,
      transform: 'translateY(0)',
    });
    if ('boxShadow' in baseStyle) {
      e.currentTarget.style.boxShadow = baseStyle.boxShadow;
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      className={className}
      style={{
        ...baseStyles,
        ...sizeStyles[size],
        backgroundColor: variantStyles[variant].backgroundColor,
        color: variantStyles[variant].color,
        opacity: disabled || loading ? 0.6 : 1,
        ...(variantStyles[variant].boxShadow && { boxShadow: variantStyles[variant].boxShadow }),
        ...(variantStyles[variant].border && { border: variantStyles[variant].border }),
      } as React.CSSProperties}
    >
      {loading && (
        <div
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid transparent',
            borderTop: '2px solid currentColor',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      )}
      {Icon && iconPosition === 'left' && !loading && (
        <Icon size={16} />
      )}
      {children}
      {Icon && iconPosition === 'right' && !loading && (
        <Icon size={16} />
      )}
    </button>
  );
};
