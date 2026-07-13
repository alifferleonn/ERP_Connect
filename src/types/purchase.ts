import {
  Purchase,
  PurchaseItem,
  Payment,
} from '@prisma/client'

export type PurchaseWithDetails = Purchase & {
  items: (PurchaseItem & { product: { name: string; code: string } })[]
  payments: Payment[]
  supplier: {
    id: string
    company: string
    contact: string
    email: string
  }
}

export type PurchaseMetrics = {
  total: number
  pending: number
  inTransit: number
  received: number
  totalAmount: number
}
