import { NextRequest, NextResponse } from 'next/server'
import { getSuppliers } from '@/features/suppliers/services/supplier'
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
    const search = searchParams.get('search') || undefined
    const country = searchParams.get('country') || undefined

    const suppliers = await getSuppliers({ skip, take, search, country })

    return NextResponse.json(suppliers)
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
