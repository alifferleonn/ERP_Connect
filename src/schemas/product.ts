import { z } from 'zod'


export const createProductSchema = z.object({
  code: z
    .string()
    .min(1, 'Código é obrigatório')
    .max(50, 'Código deve ter no máximo 50 caracteres'),
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .max(255, 'Nome deve ter no máximo 255 caracteres'),
  description: z
    .string()
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .optional()
    .nullable(),
  manufacturer: z
    .string()
    .max(255, 'Fabricante deve ter no máximo 255 caracteres')
    .optional()
    .nullable(),
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  purchasePrice: z
    .number()
    .positive('Preço de compra deve ser maior que zero'),
  salePrice: z
    .number()
    .positive('Preço de venda deve ser maior que zero'),
})

export const updateProductSchema = createProductSchema.partial()

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional()
    .nullable(),
})

export const updateCategorySchema = createCategorySchema.partial()

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
