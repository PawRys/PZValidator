export interface Product {
  id: string;
  cmrNum: string;
  truckNum: string;
  timestamp: number;
  arrivalPlace: string;
  PZ?: ProductData;
  INV?: ProductData;
}


export interface ProductData {
  sourcetxt: string;
	sizeT: number;
	sizeA: number;
	sizeB: number;
	face: string;
	color: string;
	packing: string;
	weight: string;
	weightUnit: string;
}


  export type SortFunction = 'default' | 'bytime' | 'bysize' | 'byformat' | 'bytruckandsize' | 'bytruckandformat'