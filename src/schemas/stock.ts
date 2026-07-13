import { z } from 'zod'

export const createStockSchema = z.object({
  productId: z.string().min(1, 'Produto é obrigatório'),
  quantity: z
    .number()
    .int()
    .positive('Quantidade deve ser maior que zero'),
  batchNumber: z
    .string()
    .min(1, 'Número do lote é obrigatório')
    .max(100, 'Número do lote deve ter no máximo 100 caracteres'),
  trackCode: z
    .string()
    .min(1, 'Track code é obrigatório')
    .max(100, 'Track code deve ter no máximo 100 caracteres'),
  expiryDate: z.coerce.date().min(new Date(), 'Data de validade inválida'),
  manufacturingDate: z.coerce.date(),
  location: z
    .string()
    .min(1, 'Localização é obrigatória')
    .max(100, 'Localização deve ter no máximo 100 caracteres'),
  supplierId: z.string().optional().nullable(),
})

export const createStockMovementSchema = z.object({
  stockId: z.string().min(1, 'Estoque é obrigatório'),
  type: z.enum(['ENTRY', 'EXIT', 'RESERVE', 'TRANSFER']),
  quantity: z.number().int().min(1, 'Quantidade deve ser maior que zero'),
  reference: z.string().max(255).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

export type CreateStockInput = z.infer<typeof createStockSchema>
export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>
