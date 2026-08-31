export interface Product {
	id: string;
	invoiceId: string;
	timestamp: number;
	cmrNum?: string;
	packing?: string;
	truckNum?: string;
	arrivalPlace?: string;
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
	quantity: number;
	quantityUnit: string;
}

export type SortFunction = 'default' | 'bytime' | 'bysize' | 'byformat' | 'bytruckandsize' | 'bytruckandformat';
