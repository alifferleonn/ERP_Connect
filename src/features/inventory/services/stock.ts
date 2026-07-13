import { prisma } from '@/lib/prisma'
import { CreateStockInput, CreateStockMovementInput } from '@/schemas/stock'

export async function getStockItems(
  options: {
    skip?: number
    take?: number
    productId?: string
    status?: string
  } = {}
) {
  const { skip = 0, take = 10, productId, status } = options

  return prisma.stock.findMany({
    where: {
      ...(productId && { productId }),
      ...(status && { status }),
    },
    include: { product: true },
    skip,
    take,
    orderBy: { createdAt: 'desc' },
  })
}

export async function getStockById(id: string) {
  return prisma.stock.findUnique({
    where: { id },
    include: { product: true, movements: true },
  })
}

export async function createStock(data: CreateStockInput) {
  return prisma.stock.create({
    data,
    include: { product: true },
  })
}

export async function createStockMovement(data: CreateStockMovementInput) {
  const stock = await prisma.stock.findUnique({
    where: { id: data.stockId },
  })

  if (!stock) {
    throw new Error('Stock not found')
  }

  const currentQuantity =
    data.type === 'ENTRY'
      ? stock.quantity + data.quantity
      : stock.quantity - data.quantity

  if (currentQuantity < 0) {
    throw new Error('Insufficient stock')
  }

  const [movement] = await Promise.all([
    prisma.stockMovement.create({
      data: {
        stockId: data.stockId,
        type: data.type,
        quantity: data.quantity,
        previousQuantity: stock.quantity,
        currentQuantity,
        reference: data.reference,
        notes: data.notes,
      },
    }),
    prisma.stock.update({
      where: { id: data.stockId },
      data: { quantity: currentQuantity },
    }),
  ])

  return movement
}

export async function getStockMovements(
  stockId: string,
  options: { skip?: number; take?: number } = {}
) {
  const { skip = 0, take = 10 } = options

  return prisma.stockMovement.findMany({
    where: { stockId },
    skip,
    take,
    orderBy: { createdAt: 'desc' },
  })
}
