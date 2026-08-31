import { defineStore } from 'pinia'
import type { Product } from '@/types/shared_types'
import { useSettingsStore } from '@/stores/settings_store'

export const useProductStore = defineStore('products', {
  state: () => ({
    products: [] as Product[],
    searchQuery: '',
    sortOrder: useSettingsStore().sortOrderOfScreen || ('default' as keyof typeof sortFunctions),
    printMode: 'double' as 'single' | 'double' | 'checklist',
  }),

  getters: {
    filteredProducts(state) {
      const searchTerms = String(state.searchQuery ?? '')
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(Boolean)

      let products = state.products

      if (searchTerms.length > 0) {
        products = products.filter((product) => {
          const searchableText = [
            product.id,
            product.title,
            product.desc,
            product.note,
            product.glue,
            product.arrivalPlace,
            product.truckNum,
            product.cmrNum,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          return searchTerms.every((term) => searchableText.includes(term))
        })
      }

      if (sortFunctions) {
        products = sortFunctions[state.sortOrder](products)
      }

      return products
    },
  },

  actions: {
    addProduct(product: Product) {
      const exists = this.products.some((p) => p.id === product.id)

      if (exists) {
        return
      }

      this.products.push(product)
    },

    removeProduct(id: string) {
      this.products = this.products.filter((product) => product.id !== id)
    },

    removeSelected(productsToRemove: Product[]) {
      const ids = new Set(productsToRemove.map((product) => product.id))

      this.products = this.products.filter((product) => !ids.has(product.id))
    },

    removeAll() {
      this.products = []
    },

    updateProduct(id: string, updatedProduct: Partial<Product>) {
      const product = this.products.find((product) => product.id === id)

      if (!product) return

      Object.assign(product, updatedProduct)
    },
  },
})

const compare = (a: unknown, b: unknown): number => {
  const aStr = String(a ?? '').trim()
  const bStr = String(b ?? '').trim()

  const aNum = Number(aStr.replace(',', '.'))
  const bNum = Number(bStr.replace(',', '.'))

  const aIsNumber = aStr !== '' && Number.isFinite(aNum)
  const bIsNumber = bStr !== '' && Number.isFinite(bNum)

  if (aIsNumber && bIsNumber) {
    return aNum - bNum
  }

  return aStr.localeCompare(bStr, undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

const parseSize = (size: string) => {
  return size
    .replace(',', '.')
    .split('x')
    .map((s) => parseFloat(s)) as [number, number, number]
}

const parseFormat = (val: [number, number, number]) => {
  return [val[0], Math.round(val[1] / 305), Math.round(val[2] / 305)] as [number, number, number]
}

const sortFunctions = {
  default(products: Product[]) {
    return [...products].sort((a, b) => {
      return compare(a.id, b.id)
    })
  },

  bytime(products: Product[]) {
    return [...products].sort((a, b) => {
      return compare(a.timestamp, b.timestamp)
    })
  },

  bysize(products: Product[]) {
    return [...products].sort((a, b) => {
      const aSize = parseSize(a.title)
      const bSize = parseSize(b.title)

      return (
        compare(aSize[0], bSize[0]) || // Thickness
        compare(aSize[1], bSize[1]) || // Size A
        compare(aSize[2], bSize[2]) || // Size B
        compare(a.piecesCount, b.piecesCount) // Pieces in pack
      )
    })
  },

  byformat(products: Product[]) {
    return [...products].sort((a, b) => {
      const aSize = parseSize(a.title)
      const bSize = parseSize(b.title)

      const aFormat = parseFormat(aSize)
      const bFormat = parseFormat(bSize)

      const minAFormat = Math.min(aFormat[1], aFormat[2])
      const minBFormat = Math.min(bFormat[1], bFormat[2])

      const maxAFormat = Math.max(aFormat[1], aFormat[2])
      const maxBFormat = Math.max(bFormat[1], bFormat[2])

      return (
        compare(minAFormat, minBFormat) || // Format A
        compare(maxAFormat, maxBFormat) || // Format B
        compare(aSize[0], bSize[0]) || // Thickness
        compare(aSize[1], bSize[1]) || // Size A
        compare(aSize[2], bSize[2]) || // Size B
        compare(a.piecesCount, b.piecesCount) // Pieces in pack
      )
    })
  },

  bytruckandsize(products: Product[]) {
    return [...products].sort((a, b) => {
      const aSize = parseSize(a.title)
      const bSize = parseSize(b.title)

      return (
        compare(a.truckNum, b.truckNum) || // Truck number
        compare(aSize[0], bSize[0]) || // Thickness
        compare(aSize[1], bSize[1]) || // Size A
        compare(aSize[2], bSize[2]) || // Size B
        compare(a.piecesCount, b.piecesCount) // Pieces in pack
      )
    })
  },

  bytruckandformat(products: Product[]) {
    return [...products].sort((a, b) => {
      const aSize = parseSize(a.title)
      const bSize = parseSize(b.title)

      const aFormat = parseFormat(aSize)
      const bFormat = parseFormat(bSize)

      const minAFormat = Math.min(aFormat[1], aFormat[2])
      const minBFormat = Math.min(bFormat[1], bFormat[2])

      const maxAFormat = Math.max(aFormat[1], aFormat[2])
      const maxBFormat = Math.max(bFormat[1], bFormat[2])

      return (
        compare(a.truckNum, b.truckNum) || // Truck number
        compare(minAFormat, minBFormat) || // Format A
        compare(maxAFormat, maxBFormat) || // Format B
        compare(aSize[0], bSize[0]) || // Thickness
        compare(aSize[1], bSize[1]) || // Size A
        compare(aSize[2], bSize[2]) || // Size B
        compare(a.piecesCount, b.piecesCount) // Pieces in pack
      )
    })
  },
}
