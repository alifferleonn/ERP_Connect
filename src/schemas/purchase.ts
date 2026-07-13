import { z } from 'zod'

export const createPurchaseSchema = z.object({
  supplierId: z.string().min(1, 'Fornecedor é obrigatório'),
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Produto é obrigatório'),
      quantity: z
        .number()
        .int()
        .positive('Quantidade deve ser maior que zero'),
      unitPrice: z
        .number()
        .positive('Preço unitário deve ser maior que zero'),
    })
  ).min(1, 'Pelo menos um item é obrigatório'),
  currency: z.string().default('USD'),
  expectedDate: z.coerce.date().optional(),
  notes: z
    .string()
    .max(1000, 'Observações deve ter no máximo 1000 caracteres')
    .optional()
    .nullable(),
})

export const updatePurchaseSchema = z.object({
  status: z
    .enum([
      'PENDING',
      'CONFIRMED',
      'PAYMENT_COMPLETED',
      'SHIPPED',
      'IN_TRANSIT',
      'RECEIVED',
      'CANCELLED',
    ])
    .optional(),
  notes: z.string().max(1000).optional().nullable(),
})

export const createPaymentSchema = z.object({
  purchaseId: z.string().min(1, 'Compra é obrigatória'),
  amount: z.number().positive('Valor deve ser maior que zero'),
  method: z.string().min(1, 'Método de pagamento é obrigatório'),
  reference: z.string().max(255).optional(),
  dueDate: z.coerce.date(),
})

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
