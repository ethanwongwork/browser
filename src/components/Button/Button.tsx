import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import styles from './Button.module.css';

export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonVariant = 'neutral' | 'subtle' | 'outline';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button size: sm (28px), md (40px), lg (48px) */
  size?: ButtonSize;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Icon element to display */
  icon?: ReactNode;
  /** Text label */
  children?: ReactNode;
  /** If true, renders as icon-only button (square) */
  iconOnly?: boolean;
}

/**
 * Button component with Figma 1:1 parity
 * 
 * Sizes:
 * - sm: 28px height, 8px radius
 * - md: 40px height, 12px radius (default)
 * - lg: 48px height, 20px radius
 * 
 * Variants:
 * - neutral: Semi-transparent white with shadow (default)
 * - subtle: Transparent, hover reveals background
 * - outline: Transparent with border
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      size = 'md',
      variant = 'subtle',
      icon,
      children,
      iconOnly = false,
      className,
      ...props
    },
    ref
  ) => {
    const sizeClass = {
      sm: styles.sizeSm,
      md: styles.sizeMd,
      lg: styles.sizeLg,
    }[size];

    const variantClass = {
      neutral: styles.variantNeutral,
      subtle: styles.variantSubtle,
      outline: styles.variantOutline,
    }[variant];

    const isIconOnly = iconOnly || (icon && !children);

    const classNames = [
      styles.button,
      sizeClass,
      variantClass,
      isIconOnly && styles.iconOnly,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button ref={ref} className={classNames} {...props}>
        {icon && (
          <span className={`${styles.iconWrapper} ${styles.icon}`}>
            {icon}
          </span>
        )}
        {children && !isIconOnly && (
          <span className={styles.textWrapper}>
            <span className={styles.label}>{children}</span>
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
