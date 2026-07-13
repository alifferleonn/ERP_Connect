import { BranchOrder, OrderItem } from '@prisma/client'

export type BranchOrderWithItems = BranchOrder & {
  items: (OrderItem & { product: { name: string; code: string } })[]
  documents: { id: string; fileName: string; fileUrl: string }[]
}

export type OrderMetrics = {
  total: number
  pending: number
  processing: number
  delivered: number
  totalAmount: number
}
