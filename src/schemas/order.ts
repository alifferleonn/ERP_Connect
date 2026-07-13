import { z } from 'zod'

export const createBranchOrderSchema = z.object({
  company: z
    .string()
    .min(1, 'Empresa é obrigatória')
    .max(255, 'Empresa deve ter no máximo 255 caracteres'),
  patient: z
    .string()
    .max(255, 'Paciente deve ter no máximo 255 caracteres')
    .optional()
    .nullable(),
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Produto é obrigatório'),
      quantity: z
        .number()
        .int()
        .positive('Quantidade deve ser maior que zero'),
    })
  ).min(1, 'Pelo menos um item é obrigatório'),
  notes: z
    .string()
    .max(1000, 'Observações deve ter no máximo 1000 caracteres')
    .optional()
    .nullable(),
})

export const updateBranchOrderSchema = z.object({
  status: z
    .enum([
      'PENDING',
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
    ])
    .optional(),
})

export type CreateBranchOrderInput = z.infer<typeof createBranchOrderSchema>
export type UpdateBranchOrderInput = z.infer<typeof updateBranchOrderSchema>
