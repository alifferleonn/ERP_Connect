export interface MonthlySale {
  month: string
  vendas: number
  compras: number
}

export interface TopProduct {
  name: string
  sales: number
  revenue: number
  stock: number
}

export interface MockProduct {
  id: string
  code: string
  name: string
  category: { id: string; name: string }
  purchasePrice: number
  salePrice: number
  status: 'Ativo' | 'Inativo'
}

export interface MockStockItem {
  id: string
  product: { code: string; name: string }
  quantity: number
  batchNumber: string
  expiryDate: string
  status: 'Disponível' | 'Crítico' | 'Vencido'
}

export interface MockMovement {
  id: string
  type: 'Entrada' | 'Saída' | 'Reserva' | 'Transferência'
  productName: string
  quantity: number
  date: string
  reference: string
}

export const MOCK_DASHBOARD_METRICS = {
  totalSales: 156,
  totalPurchases: 24,
  totalOrders: 38,
  totalStockQuantity: 4850,
  billing: 184520.45,
  billingIncrease: '+14.2%',
  stockIncrease: '+8.4%',
  ordersIncrease: '+12.5%',
  purchasesIncrease: '-5.1%'
}

export const MOCK_SALES_HISTORY: MonthlySale[] = [
  { month: 'Jan', vendas: 45000, compras: 30000 },
  { month: 'Fev', vendas: 52000, compras: 35000 },
  { month: 'Mar', vendas: 49000, compras: 28000 },
  { month: 'Abr', vendas: 63000, compras: 40000 },
  { month: 'Mai', vendas: 58000, compras: 42000 },
  { month: 'Jun', vendas: 71000, compras: 38000 },
  { month: 'Jul', vendas: 85000, compras: 45000 },
  { month: 'Ago', vendas: 79000, compras: 50000 },
  { month: 'Set', vendas: 92000, compras: 55000 },
  { month: 'Out', vendas: 110000, compras: 60000 },
  { month: 'Nov', vendas: 135000, compras: 70000 },
  { month: 'Dez', vendas: 184520, compras: 95000 },
]

export const MOCK_TOP_PRODUCTS: TopProduct[] = [
  { name: 'Paracetamol 500mg', sales: 1240, revenue: 18600, stock: 450 },
  { name: 'Ibuprofeno 400mg', sales: 980, revenue: 14700, stock: 320 },
  { name: 'Amoxicilina 500mg', sales: 850, revenue: 21250, stock: 120 },
  { name: 'Omeprazol 20mg', sales: 740, revenue: 11100, stock: 600 },
  { name: 'Losartana Potássica 50mg', sales: 690, revenue: 6900, stock: 850 },
]

export const MOCK_PRODUCTS: MockProduct[] = [
  { id: '1', code: 'PRD-001', name: 'Paracetamol 500mg', category: { id: 'c1', name: 'Analgésicos' }, purchasePrice: 5.50, salePrice: 15.00, status: 'Ativo' },
  { id: '2', code: 'PRD-002', name: 'Ibuprofeno 400mg', category: { id: 'c1', name: 'Analgésicos' }, purchasePrice: 6.20, salePrice: 15.00, status: 'Ativo' },
  { id: '3', code: 'PRD-003', name: 'Amoxicilina 500mg', category: { id: 'c2', name: 'Antibióticos' }, purchasePrice: 12.00, salePrice: 25.00, status: 'Ativo' },
  { id: '4', code: 'PRD-004', name: 'Omeprazol 20mg', category: { id: 'c3', name: 'Gástricos' }, purchasePrice: 4.50, salePrice: 15.00, status: 'Ativo' },
  { id: '5', code: 'PRD-005', name: 'Losartana Potássica 50mg', category: { id: 'c4', name: 'Cardiológicos' }, purchasePrice: 3.20, salePrice: 10.00, status: 'Ativo' },
  { id: '6', code: 'PRD-006', name: 'Atenolol 50mg', category: { id: 'c4', name: 'Cardiológicos' }, purchasePrice: 4.10, salePrice: 12.00, status: 'Ativo' },
  { id: '7', code: 'PRD-007', name: 'Dipirona Sódica 500mg', category: { id: 'c1', name: 'Analgésicos' }, purchasePrice: 2.50, salePrice: 8.00, status: 'Ativo' },
  { id: '8', code: 'PRD-008', name: 'Clonazepam 2mg', category: { id: 'c5', name: 'Psicotrópicos' }, purchasePrice: 8.50, salePrice: 24.00, status: 'Inativo' },
]

export const MOCK_STOCK_ITEMS: MockStockItem[] = [
  { id: 's1', product: { code: 'PRD-001', name: 'Paracetamol 500mg' }, quantity: 450, batchNumber: 'LOTE-A24', expiryDate: '2027-12-31', status: 'Disponível' },
  { id: 's2', product: { code: 'PRD-002', name: 'Ibuprofeno 400mg' }, quantity: 320, batchNumber: 'LOTE-B24', expiryDate: '2027-10-15', status: 'Disponível' },
  { id: 's3', product: { code: 'PRD-003', name: 'Amoxicilina 500mg' }, quantity: 120, batchNumber: 'LOTE-C24', expiryDate: '2026-08-30', status: 'Crítico' },
  { id: 's4', product: { code: 'PRD-004', name: 'Omeprazol 20mg' }, quantity: 600, batchNumber: 'LOTE-D24', expiryDate: '2028-01-20', status: 'Disponível' },
  { id: 's5', product: { code: 'PRD-005', name: 'Losartana Potássica 50mg' }, quantity: 850, batchNumber: 'LOTE-E24', expiryDate: '2027-05-18', status: 'Disponível' },
  { id: 's6', product: { code: 'PRD-008', name: 'Clonazepam 2mg' }, quantity: 0, batchNumber: 'LOTE-F23', expiryDate: '2026-01-10', status: 'Vencido' },
]

export const MOCK_MOVEMENTS: MockMovement[] = [
  { id: 'm1', type: 'Entrada', productName: 'Paracetamol 500mg', quantity: 500, date: '2026-07-10T14:30:00Z', reference: 'NF-98421' },
  { id: 'm2', type: 'Saída', productName: 'Ibuprofeno 400mg', quantity: 50, date: '2026-07-11T09:15:00Z', reference: 'PED-4829' },
  { id: 'm3', type: 'Reserva', productName: 'Amoxicilina 500mg', quantity: 20, date: '2026-07-12T11:45:00Z', reference: 'RES-0102' },
  { id: 'm4', type: 'Transferência', productName: 'Omeprazol 20mg', quantity: 100, date: '2026-07-12T16:00:00Z', reference: 'TRA-993' },
  { id: 'm5', type: 'Entrada', productName: 'Losartana Potássica 50mg', quantity: 300, date: '2026-07-13T08:00:00Z', reference: 'NF-98450' },
]
