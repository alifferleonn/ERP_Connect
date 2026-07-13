import { z } from 'zod'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']

export const uploadDocumentSchema = z.object({
  branchOrderId: z.string().optional(),
  patientName: z.string().max(255).optional().nullable(),
  type: z.string().min(1, 'Tipo de documento é obrigatório'),
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= MAX_FILE_SIZE,
      'Arquivo deve ter no máximo 50MB'
    )
    .refine(
      (file) => ALLOWED_TYPES.includes(file.type),
      'Apenas PDF, PNG, JPEG são permitidos'
    ),
})

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>
