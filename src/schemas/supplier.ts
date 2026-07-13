import { z } from 'zod'

export const createSupplierSchema = z.object({
  company: z
    .string()
    .min(1, 'Empresa é obrigatória')
    .max(255, 'Empresa deve ter no máximo 255 caracteres'),
  contact: z
    .string()
    .min(1, 'Contato é obrigatório')
    .max(255, 'Contato deve ter no máximo 255 caracteres'),
  email: z
    .string()
    .email('E-mail inválido')
    .max(255, 'E-mail deve ter no máximo 255 caracteres'),
  phone: z
    .string()
    .min(1, 'Telefone é obrigatório')
    .max(20, 'Telefone deve ter no máximo 20 caracteres'),
  country: z
    .string()
    .min(1, 'País é obrigatório')
    .max(100, 'País deve ter no máximo 100 caracteres'),
  notes: z
    .string()
    .max(1000, 'Observações deve ter no máximo 1000 caracteres')
    .optional()
    .nullable(),
})

export const updateSupplierSchema = createSupplierSchema.partial()

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>
