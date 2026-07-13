import { prisma } from '@/lib/prisma'
import { CreatePurchaseInput } from '@/schemas/purchase'

export async function getPurchases(
  options: {
    skip?: number
    take?: number
    status?: string
    supplierId?: string
  } = {}
) {
  const { skip = 0, take = 10, status, supplierId } = options

  return prisma.purchase.findMany({
    where: {
      ...(status && { status }),
      ...(supplierId && { supplierId }),
    },
    include: {
      supplier: true,
      items: true,
      payments: true,
    },
    skip,
    take,
    orderBy: { orderDate: 'desc' },
  })
}

export async function getPurchaseById(id: string) {
  return prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: true,
      payments: true,
    },
  })
}

export async function createPurchase(data: CreatePurchaseInput) {
  const totalAmount = data.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  )

  return prisma.purchase.create({
    data: {
      purchaseNumber: `PUR-${Date.now()}`,
      supplierId: data.supplierId,
      totalAmount,
      currency: data.currency,
      expectedDate: data.expectedDate,
      notes: data.notes,
      items: {
        create: data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity,
        })),
      },
    },
    include: {
      supplier: true,
      items: true,
      payments: true,
    },
  })
}

export async function updatePurchaseStatus(
  id: string,
  status: string
) {
  return prisma.purchase.update({
    where: { id },
    data: { status },
  })
}
