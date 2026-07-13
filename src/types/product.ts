import {
  Product,
  Category,
  Stock,
  Supplier,
} from '@prisma/client'

export type ProductWithCategory = Product & {
  category: Category
}

export type StockWithProduct = Stock & {
  product: Product
}

export type SupplierDetails = Supplier & {
  _count?: {
    purchases: number
  }
}
