export type UserRole = 'ADMIN' | 'PURCHASES' | 'FINANCIAL' | 'LOGISTICS' | 'OPERATOR'

export type User = {
  id: string
  email: string
  name: string
  role: UserRole
  isActive: boolean
  lastLogin: Date | null
  createdAt: Date
  updatedAt: Date
}

export type AuthUser = Omit<User, 'createdAt' | 'updatedAt'>
