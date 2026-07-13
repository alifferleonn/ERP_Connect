import { NextRequest, NextResponse } from 'next/server'
import { getProducts, getProductCount } from '@/features/products/services/product'
import { getMockUser } from '@/lib/mock-auth'

export async function GET(request: NextRequest) {
  try {
    // Verificar usuário mock (em desenvolvimento)
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
    const search = searchParams.get('search') || undefined
    const categoryId = searchParams.get('categoryId') || undefined
    const status = searchParams.get('status') || undefined

    const [products, total] = await Promise.all([
      getProducts({ skip, take, search, categoryId, status }),
      getProductCount({ search, categoryId, status }),
    ])

    return NextResponse.json({
      products,
      total,
      skip,
      take,
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
