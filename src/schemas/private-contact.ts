import { z } from 'zod'

export const createPrivateContactSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .max(255, 'Nome deve ter no máximo 255 caracteres'),
  company: z
    .string()
    .max(255, 'Empresa deve ter no máximo 255 caracteres')
    .optional()
    .nullable(),
  position: z
    .string()
    .max(255, 'Cargo deve ter no máximo 255 caracteres')
    .optional()
    .nullable(),
  phone: z
    .string()
    .max(20, 'Telefone deve ter no máximo 20 caracteres')
    .optional()
    .nullable(),
  whatsapp: z
    .string()
    .max(20, 'WhatsApp deve ter no máximo 20 caracteres')
    .optional()
    .nullable(),
  email: z
    .string()
    .email('E-mail inválido')
    .max(255, 'E-mail deve ter no máximo 255 caracteres')
    .optional()
    .nullable(),
  category: z
    .string()
    .max(100, 'Categoria deve ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(1000, 'Observações deve ter no máximo 1000 caracteres')
    .optional()
    .nullable(),
})

export const updatePrivateContactSchema = createPrivateContactSchema.partial()

export type CreatePrivateContactInput = z.infer<
  typeof createPrivateContactSchema
>
export type UpdatePrivateContactInput = z.infer<
  typeof updatePrivateContactSchema
>
