import { NextRequest, NextResponse } from 'next/server'
import { getCategories } from '@/features/products/services/product'
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

    const categories = await getCategories()

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
