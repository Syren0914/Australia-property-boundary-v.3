import React from 'react';
import { LucideIcon } from 'lucide-react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  hoverable?: boolean;
}

export const EnhancedCard: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  icon: Icon,
  variant = 'default',
  className = '',
  style = {},
  onClick,
  hoverable = false,
}) => {
  const baseStyles = {
    borderRadius: '12px',
    transition: 'all 0.2s ease-in-out',
    position: 'relative',
    overflow: 'hidden',
    ...style,
  };

  const variantStyles = {
    default: {
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    elevated: {
      backgroundColor: 'white',
      border: 'none',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
    },
    outlined: {
      backgroundColor: 'transparent',
      border: '2px solid #e5e7eb',
      boxShadow: 'none',
    },
    filled: {
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
      boxShadow: 'none',
    },
  };

  const handleMouseOver = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hoverable && !onClick) return;
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = '0 8px 15px rgba(0, 0, 0, 0.15)';
  };

  const handleMouseOut = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hoverable && !onClick) return;
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = variantStyles[variant].boxShadow || '0 1px 3px rgba(0, 0, 0, 0.1)';
  };

  const CardComponent = onClick ? 'button' : 'div';

  return (
    <CardComponent
      onClick={onClick}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      className={className}
      style={{
        ...baseStyles,
        ...variantStyles[variant],
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left' as const,
        width: '100%',
      }}
    >
      {(title || subtitle || Icon) && (
        <div style={{
          padding: '16px 16px 0 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}>
          {Icon && (
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
              flexShrink: 0,
            }}>
              <Icon size={20} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {title && (
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 4px 0',
                lineHeight: '1.4',
              }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: 0,
                lineHeight: '1.4',
              }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
      )}
      <div style={{
        padding: title || subtitle || Icon ? '16px' : '16px',
      }}>
        {children}
      </div>
    </CardComponent>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
}) => {
  const colorStyles = {
    blue: {
      bg: '#eff6ff',
      text: '#2563eb',
      accent: '#1e40af',
    },
    green: {
      bg: '#f0fdf4',
      text: '#16a34a',
      accent: '#15803d',
    },
    yellow: {
      bg: '#fefce8',
      text: '#ca8a04',
      accent: '#a16207',
    },
    red: {
      bg: '#fef2f2',
      text: '#dc2626',
      accent: '#b91c1c',
    },
    purple: {
      bg: '#faf5ff',
      text: '#9333ea',
      accent: '#7c3aed',
    },
    gray: {
      bg: '#f9fafb',
      text: '#6b7280',
      accent: '#374151',
    },
  };

  const currentColor = colorStyles[color];

  return (
    <EnhancedCard
      variant="filled"
      style={{
        backgroundColor: currentColor.bg,
        border: `1px solid ${currentColor.text}20`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            fontSize: '12px',
            fontWeight: '500',
            color: currentColor.text,
            marginBottom: '4px',
          }}>
            {title}
          </div>
          <div style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: currentColor.accent,
            marginBottom: '4px',
          }}>
            {value}
          </div>
          {subtitle && (
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
            }}>
              {subtitle}
            </div>
          )}
        </div>
        {Icon && (
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: `${currentColor.text}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: currentColor.text,
          }}>
            <Icon size={20} />
          </div>
        )}
      </div>
      {trend && (
        <div style={{
          marginTop: '8px',
          fontSize: '12px',
          color: trend.isPositive ? '#16a34a' : '#dc2626',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <span>{trend.isPositive ? '↗' : '↘'}</span>
          <span>{Math.abs(trend.value)}%</span>
        </div>
      )}
    </EnhancedCard>
  );
};

