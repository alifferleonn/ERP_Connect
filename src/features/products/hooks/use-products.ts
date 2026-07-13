'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase-client'

export function useProducts(
  options: {
    skip?: number
    take?: number
    search?: string
  } = {}
) {
  return useQuery({
    queryKey: ['products', options],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase.from('products').select('*', { count: 'exact' })

      if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,code.ilike.%${options.search}%`)
      }

      const from = options.skip || 0
      const to = from + (options.take || 10) - 1

      const { data, count, error } = await query
        .range(from, to)
        .order('created_at', { ascending: false })

      if (error) throw error

      return {
        products: data || [],
        total: count || 0,
        skip: options.skip || 0,
        take: options.take || 10
      }
    },
    staleTime: 1000 * 5,
  })
}

export function useProductById(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (newProduct: {
      code: string
      name: string
      purchase_price: number
      sale_price: number
      status: string
      manufacturer?: string
      description?: string
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('products')
        .insert([{
          ...newProduct,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    }
  })
}
