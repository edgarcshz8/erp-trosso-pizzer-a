import React from 'react'

const variants = {
  success: 'bg-emerald-100 text-emerald-800',
  error: 'bg-red-100 text-red-800',
  warning: 'bg-amber-100 text-amber-800',
  info: 'bg-blue-100 text-blue-800',
  gray: 'bg-gray-100 text-gray-600',
  red: 'bg-red-100 text-brand-red',
}

export default function Badge({ variant = 'gray', children, className = '' }) {
  return (
    <span className={`badge ${variants[variant] || variants.gray} ${className}`}>
      {children}
    </span>
  )
}
