// Mock de autenticação local para desenvolvimento
// Será substituído por Supabase Auth em produção

export interface MockUser {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'PURCHASES' | 'FINANCIAL' | 'LOGISTICS' | 'OPERATOR'
}

// Usuário mock para desenvolvimento
const MOCK_USER: MockUser = {
  id: 'local-user-1',
  email: 'admin@pharmix.local',
  name: 'Administrador',
  role: 'ADMIN',
}

export async function getMockUser(): Promise<MockUser> {
  return MOCK_USER
}

export async function setMockUser(user: Partial<MockUser>): Promise<void> {
  Object.assign(MOCK_USER, user)
}
