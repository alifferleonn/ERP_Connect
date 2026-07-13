import { prisma } from '@/lib/prisma'
import { CreateBranchOrderInput } from '@/schemas/order'

export async function getBranchOrders(
  options: {
    skip?: number
    take?: number
    status?: string
    company?: string
  } = {}
) {
  const { skip = 0, take = 10, status, company } = options

  return prisma.branchOrder.findMany({
    where: {
      ...(status && { status }),
      ...(company && { company: { contains: company } }),
    },
    include: {
      items: { include: { product: true } },
      documents: true,
    },
    skip,
    take,
    orderBy: { createdAt: 'desc' },
  })
}

export async function getBranchOrderById(id: string) {
  return prisma.branchOrder.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      documents: true,
      sale: true,
    },
  })
}

export async function createBranchOrder(data: CreateBranchOrderInput) {
  const totalAmount = data.items.reduce((sum, _item) => sum + 0, 0)

  return prisma.branchOrder.create({
    data: {
      orderNumber: `ORD-${Date.now()}`,
      company: data.company,
      patient: data.patient,
      totalAmount,
      notes: data.notes,
      items: {
        create: data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: 0,
          totalPrice: 0,
        })),
      },
    },
    include: {
      items: { include: { product: true } },
    },
  })
}

export async function updateBranchOrderStatus(
  id: string,
  status: string
) {
  return prisma.branchOrder.update({
    where: { id },
    data: { status },
  })
}
