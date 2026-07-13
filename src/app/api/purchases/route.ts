import { NextRequest, NextResponse } from 'next/server'
import { createPurchase, getPurchases } from '@/features/purchases/services/purchase'
import { getMockUser } from '@/lib/mock-auth'
import { createPurchaseSchema } from '@/schemas/purchase'

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
    const supplierId = searchParams.get('supplierId') || undefined

    const purchases = await getPurchases({ skip, take, status, supplierId })

    return NextResponse.json(purchases)
  } catch (error) {
    console.error('Error fetching purchases:', error)
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
    const validated = createPurchaseSchema.parse(body)

    const purchase = await createPurchase(validated)

    return NextResponse.json(purchase, { status: 201 })
  } catch (error) {
    console.error('Error creating purchase:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
