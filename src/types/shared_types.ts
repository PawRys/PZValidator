export type ProductDiff = {
	[K in keyof ProductData]?: [ProductData[K] | undefined, ProductData[K] | undefined];
};

export interface Product {
	id: string;
	PZnum?: string;
	cmrNum?: string;
	packing?: string;
	truckNum?: string;
	invoiceNum: string;
	arrivalPlace?: string;
	timestamp: number;
	PZ?: ProductData;
	INV?: ProductData;
	differs?: ProductDiff;
}

export interface ProductData {
	sourcetxt: string;
	sizeT: number;
	sizeA: number;
	sizeB: number;
	face: string;
	color: string;
	quantity: number;
	quantityUnit: string;
}

export type SortFunction = 'default' | 'bytime' | 'bysize' | 'byformat' | 'bytruckandsize' | 'bytruckandformat';
