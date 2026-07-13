import { NextRequest, NextResponse } from 'next/server'
import { getStockItems } from '@/features/inventory/services/stock'
import { getMockUser } from '@/lib/mock-auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getMockUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '10')
    const productId = searchParams.get('productId') || undefined
    const status = searchParams.get('status') || undefined

    const stocks = await getStockItems({ skip, take, productId, status })

    return NextResponse.json(stocks)
  } catch (error) {
    console.error('Error fetching stock:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
