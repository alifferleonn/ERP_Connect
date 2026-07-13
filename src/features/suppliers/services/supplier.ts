import { prisma } from '@/lib/prisma'
import { CreateSupplierInput, UpdateSupplierInput } from '@/schemas/supplier'

export async function getSuppliers(
  options: {
    skip?: number
    take?: number
    search?: string
    country?: string
  } = {}
) {
  const { skip = 0, take = 10, search, country } = options

  return prisma.supplier.findMany({
    where: {
      ...(search && {
        OR: [
          { company: { contains: search } },
          { contact: { contains: search } },
          { email: { contains: search } },
        ],
      }),
      ...(country && { country }),
    },
    skip,
    take,
    orderBy: { company: 'asc' },
  })
}

export async function getSupplierCount(options: {
  search?: string
  country?: string
} = {}) {
  const { search, country } = options

  return prisma.supplier.count({
    where: {
      ...(search && {
        OR: [
          { company: { contains: search } },
          { contact: { contains: search } },
          { email: { contains: search } },
        ],
      }),
      ...(country && { country }),
    },
  })
}

export async function getSupplierById(id: string) {
  return prisma.supplier.findUnique({
    where: { id },
    include: {
      _count: { select: { purchases: true } },
    },
  })
}

export async function createSupplier(data: CreateSupplierInput) {
  return prisma.supplier.create({ data })
}

export async function updateSupplier(id: string, data: UpdateSupplierInput) {
  return prisma.supplier.update({
    where: { id },
    data,
  })
}

export async function deleteSupplier(id: string) {
  return prisma.supplier.delete({
    where: { id },
  })
}
