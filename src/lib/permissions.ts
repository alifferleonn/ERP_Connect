import { UserRole } from '@/types/user'

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  PURCHASES: 'Compras',
  FINANCIAL: 'Financeiro',
  LOGISTICS: 'Logística',
  OPERATOR: 'Operador',
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ADMIN: 'Acesso total ao sistema',
  PURCHASES: 'Gerencia compras e fornecedores',
  FINANCIAL: 'Gerencia pagamentos e faturamento',
  LOGISTICS: 'Gerencia estoque e envios',
  OPERATOR: 'Acesso básico ao sistema',
}

export const PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: ['*'],
  PURCHASES: [
    'purchases.view',
    'purchases.create',
    'purchases.edit',
    'suppliers.view',
    'suppliers.create',
    'suppliers.edit',
  ],
  FINANCIAL: [
    'payments.view',
    'payments.create',
    'sales.view',
    'reports.view',
  ],
  LOGISTICS: [
    'stock.view',
    'stock.edit',
    'orders.view',
    'orders.edit',
  ],
  OPERATOR: [
    'products.view',
    'orders.view',
    'stock.view',
  ],
}

export function hasPermission(
  role: UserRole,
  permission: string
): boolean {
  const rolePermissions = PERMISSIONS[role]
  return rolePermissions.includes('*') || rolePermissions.includes(permission)
}

export function canAccessRoute(role: UserRole, route: string): boolean {
  const routePermissions: Record<string, string[]> = {
    '/dashboard': ['ADMIN', 'PURCHASES', 'FINANCIAL', 'LOGISTICS', 'OPERATOR'],
    '/produtos': ['ADMIN', 'PURCHASES', 'LOGISTICS', 'OPERATOR'],
    '/compras': ['ADMIN', 'PURCHASES'],
    '/fornecedores': ['ADMIN', 'PURCHASES'],
    '/estoque': ['ADMIN', 'LOGISTICS', 'OPERATOR'],
    '/pedidos': ['ADMIN', 'LOGISTICS', 'FINANCIAL'],
    '/vendas': ['ADMIN', 'FINANCIAL', 'OPERATOR'],
    '/relatorios': ['ADMIN', 'FINANCIAL'],
    '/contatos': ['ADMIN', 'PURCHASES', 'FINANCIAL'],
    '/usuarios': ['ADMIN'],
  }

  const allowedRoles = routePermissions[route] || []
  return allowedRoles.includes(role)
}
