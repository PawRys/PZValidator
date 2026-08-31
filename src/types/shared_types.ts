import { z } from 'zod'

const productSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  title: z.string(),
  desc: z.string(),
  note: z.string(),
  glue: z.string(),
  weight: z.number(),
  packsCount: z.number(),
  piecesCount: z.number(),
  arrivalPlace: z.string(),
  truckNum: z.string(),
  cmrNum: z.string(),
})

export const productsSchema = z.array(productSchema)
export type Product = z.infer<typeof productSchema>
export type SortFunction = 'default' | 'bytime' | 'bysize' | 'byformat' | 'bytruckandsize' | 'bytruckandformat'

// export interface Product {
//   id: string
//   timestamp: number
//   title: string
//   desc: string
//   note: string
//   glue: string
//   weight: number
//   packsCount: number
//   piecesCount: number
//   arrivalPlace: string
//   truckNum: string
//   cmrNum: string
// }
