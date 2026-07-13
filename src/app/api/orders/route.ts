import { NextRequest, NextResponse } from 'next/server'
import { createBranchOrder, getBranchOrders } from '@/features/orders/services/order'
import { getMockUser } from '@/lib/mock-auth'
import { createBranchOrderSchema } from '@/schemas/order'

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
    const status = searchParams.get('status') || undefined
    const company = searchParams.get('company') || undefined

    const orders = await getBranchOrders({ skip, take, status, company })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getMockUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validated = createBranchOrderSchema.parse(body)

    const order = await createBranchOrder(validated)

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
