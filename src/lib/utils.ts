import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
  }).format(value)
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function getBranchPrice(product: any, branchName?: string | null): number {
  if (!product) return 0
  const b = (branchName || '').toLowerCase()

  if (b.includes('trade') && product.price_trade !== null && product.price_trade !== undefined && parseFloat(product.price_trade) > 0) {
    return parseFloat(product.price_trade)
  }
  if ((b.includes('connect') || b.includes('connecthealth')) && product.price_connect !== null && product.price_connect !== undefined && parseFloat(product.price_connect) > 0) {
    return parseFloat(product.price_connect)
  }
  if (b.includes('bioss') && product.price_bioss !== null && product.price_bioss !== undefined && parseFloat(product.price_bioss) > 0) {
    return parseFloat(product.price_bioss)
  }

  return parseFloat(product.sale_price || product.purchase_price || 0)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-')
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
