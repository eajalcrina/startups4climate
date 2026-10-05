'use client'

import React, { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

type CardVariant = 'default' | 'elevated' | 'outlined' | 'flat'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  /** Colored left accent border */
  accent?: string
  /** Adds hover lift + shadow on hover */
  hoverable?: boolean
  /** Padding preset */
  padding?: 'none' | 'sm' | 'md' | 'lg'
  /** Optional header area */
  header?: ReactNode
  /** Optional footer area */
  footer?: ReactNode
}

const variantBase: Record<CardVariant, React.CSSProperties> = {
  default: {
    backgroundColor: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-card)',
  },
  elevated: {
    backgroundColor: 'var(--color-bg-card)',
    border: 'none',
    boxShadow: 'var(--shadow-float)',
  },
  outlined: {
    backgroundColor: 'transparent',
    border: '1.5px solid var(--color-border)',
    boxShadow: 'none',
  },
  flat: {
    backgroundColor: 'var(--color-cream)',
    border: 'none',
    boxShadow: 'none',
  },
}

const paddingMap: Record<NonNullable<CardProps['padding']>, string> = {
  none: '0',
  sm: 'var(--space-3) var(--space-4)',
  md: 'var(--space-5) var(--space-6)',
  lg: 'var(--space-8) var(--space-8)',
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      // Pulled out so it is not forwarded to the DOM through ...rest
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      accent,
      hoverable = false,
      padding = 'md',
      header,
      footer,
      children,
      style,
      onMouseEnter,
      onMouseLeave,
      ...rest
    },
    ref
  ) => {
    const [hovered, setHovered] = React.useState(false)

    const composedStyle: React.CSSProperties = {
      borderRadius: 'var(--radius-card)',
      overflow: 'hidden',
      transition: 'box-shadow 0.15s var(--ease-smooth), transform 0.15s var(--ease-smooth), border-color 0.15s ease',
      ...variantBase[variant],
      ...(hoverable && hovered
        ? {
            boxShadow: 'var(--shadow-card-hover)',
            transform: 'translateY(-2px)',
          }
        : {}),
      ...style,
    }

    const bodyPadding = paddingMap[padding]

    return (
      <div
        ref={ref}
        style={composedStyle}
        onMouseEnter={(e) => {
          setHovered(true)
          onMouseEnter?.(e)
        }}
        onMouseLeave={(e) => {
          setHovered(false)
          onMouseLeave?.(e)
        }}
        {...rest}
      >
        {header && (
          <div
            style={{
              padding: `var(--space-4) var(--space-5)`,
              borderBottom: '1px solid var(--color-border)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--fw-semibold)' as unknown as number,
              color: 'var(--color-text-primary)',
            }}
          >
            {header}
          </div>
        )}
        <div style={{ padding: bodyPadding }}>{children}</div>
        {footer && (
          <div
            style={{
              padding: `var(--space-3) var(--space-5)`,
              borderTop: '1px solid var(--color-border)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    )
  }
)

Card.displayName = 'Card'

export default Card
