import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMockUser } from '@/lib/mock-auth'

export async function GET(_request: NextRequest) {
  try {
    const user = await getMockUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const [sales, purchases, orders, stock] = await Promise.all([
      prisma.sale.count(),
      prisma.purchase.count(),
      prisma.branchOrder.count(),
      prisma.stock.aggregate({
        _sum: { quantity: true }
      })
    ])

    const metrics = {
      totalSales: sales,
      totalPurchases: purchases,
      totalOrders: orders,
      totalStockQuantity: stock._sum.quantity || 0,
      timestamp: new Date()
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
