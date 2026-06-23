import type { HTMLAttributes } from 'react'
import styles from './Card.module.css'

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div className={[styles.card, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  )
}
