import { prisma } from '@/lib/prisma'
import { CreateProductInput, UpdateProductInput } from '@/schemas/product'

export async function getProducts(
  options: {
    skip?: number
    take?: number
    search?: string
    categoryId?: string
    status?: string
  } = {}
) {
  const {
    skip = 0,
    take = 10,
    search,
    categoryId,
    status,
  } = options

  return prisma.product.findMany({
    where: {
      ...(search && {
        OR: [
          { name: { contains: search } },
          { code: { contains: search } },
          { description: { contains: search } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(status && { status }),
    },
    include: { category: true },
    skip,
    take,
    orderBy: { createdAt: 'desc' },
  })
}

export async function getProductCount(options: {
  search?: string
  categoryId?: string
  status?: string
} = {}) {
  const { search, categoryId, status } = options

  return prisma.product.count({
    where: {
      ...(search && {
        OR: [
          { name: { contains: search } },
          { code: { contains: search } },
          { description: { contains: search } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(status && { status }),
    },
  })
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: { category: true },
  })
}

export async function createProduct(data: CreateProductInput) {
  return prisma.product.create({
    data: data,
    include: { category: true },
  })
}

export async function updateProduct(id: string, data: UpdateProductInput) {
  return prisma.product.update({
    where: { id },
    data: data,
    include: { category: true },
  })
}

export async function deleteProduct(id: string) {
  return prisma.product.delete({
    where: { id },
  })
}

export async function getCategories() {
  return prisma.category.findMany({
    orderBy: { name: 'asc' },
  })
}

export async function createCategory(data: {
  name: string
  description?: string
}) {
  return prisma.category.create({ data })
}
