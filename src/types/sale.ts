import { Sale, SaleItem } from '@prisma/client'

export type SaleWithItems = Sale & {
  items: (SaleItem & { product: { name: string; code: string } })[]
  branchOrder?: {
    orderNumber: string
    company: string
  }
}

export type SaleMetrics = {
  total: number
  completed: number
  pending: number
  totalAmount: number
  averageValue: number
}
