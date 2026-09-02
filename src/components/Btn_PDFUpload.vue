<script setup lang="ts">
import type { Product, ProductData, ProductDiff } from '@/types/shared_types';
import { useProductStore } from '@/stores/products_store';
import {
	correctText,
	combineRegex,
	getArrivalPlace,
	getCMRNum,
	getColor,
	getFaceType,
	getGlueType,
	getInvoiceNum,
	getPZNum,
	getTruckNum,
} from '@/exports/shared_functions';
import { ref } from 'vue';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.min.mjs';

const fileInput = ref<HTMLInputElement | null>(null);
const isWorking = ref(false);

const PZ_regex = new RegExp(/Przyjęcie do magazynu - \d\d-PZ \d{4}\w{2,}\.pdf/i);
const LF_regex = new RegExp(/LF\d\d M\d{6}/i);
const ST_regex = new RegExp(/DR[ _]\d+[ _]PO/i);

function openFile() {
	fileInput.value?.click();
}

async function doit(event: Event): Promise<void> {
	isWorking.value = true;
	const target = event.target as HTMLInputElement;
	const pdfFiles = target.files as FileList;
	const validFiles = await validateFiles(pdfFiles);
	const processedFiles = await processFiles(validFiles);

	saveToProductStore(processedFiles);
	findDiffers(useProductStore().products);
	isWorking.value = false;
}

async function validateFiles(fileList: FileList): Promise<File[]> {
	const skippedFiles: string[] = [];
	const validFiles: File[] = [];

	for (const file of fileList) {
		const isPdf = file.type === 'application/pdf';

		const validPatterns = [PZ_regex, LF_regex, ST_regex];
		const hasValidName = validPatterns.some(pattern => pattern.test(file.name));

		if (isPdf && hasValidName) {
			validFiles.push(file);
			continue;
		}

		skippedFiles.push(file.name);
	}

	if (skippedFiles.length > 0) {
		console.log(`Pominięte pliki (${skippedFiles.length}):\n\n` + skippedFiles.join('\n'));
	}

	return validFiles;
}

async function processFiles(fileList: File[]): Promise<Product[]> {
	let result: Product[] = [];

	for (const file of fileList) {
		const TEXTrows = await PDFtoTEXT(file);

		if (PZ_regex.test(file.name)) {
			result.push(...getPZProducts(TEXTrows));
			continue;
		}

		if (LF_regex.test(file.name)) {
			result.push(...getLatvijasProducts(TEXTrows));
			continue;
		}

		if (ST_regex.test(file.name)) {
			result.push(...getStigaProducts(TEXTrows));
		}
	}

	return result;
}

async function PDFtoTEXT(file: File): Promise<string[]> {
	let textFile: string[] = [];

	const pdf = await pdfjsLib.getDocument({
		data: await file.arrayBuffer(),
	}).promise;

	for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
		const TOLERANCE = 3;
		const page = await pdf.getPage(pageNum);
		const { items } = await page.getTextContent();
		const rows: {
			y: number;
			items: { text: string; x: number }[];
		}[] = [];

		for (const item of items) {
			if (!('str' in item)) continue;

			const [, , , , x, y] = item.transform;

			let row = rows.find(r => Math.abs(r.y - y) <= TOLERANCE);

			if (!row) {
				row = { y, items: [] };
				rows.push(row);
			}

			row.items.push({ text: item.str, x });
		}

		rows.sort((a, b) => b.y - a.y);

		for (const row of rows) {
			// const textrow = row.items
			//   .sort((a, b) => a.x - b.x)
			//   .map((item) => correctText(item.text))
			//   .join('')

			const CHAR_WIDTH = 5;
			let currentColumn = 0;
			const textrow = row.items
				.sort((a, b) => a.x - b.x)
				.map(item => {
					const text = correctText(item.text);
					const column = Math.round(item.x / CHAR_WIDTH);
					const spaces = Math.max(0, column - currentColumn);

					currentColumn = column + text.length;
					return ' '.repeat(spaces) + text;
				})
				.join('');

			textFile.push(textrow);
		} // END row
	} // END page

	// console.log(textFile.join('\n'));
	return textFile;
}

function getPZProducts(textFile: string[]): Product[] {
	const results: Product[] = [];

	const sizeT_re = /(\d{1,2}(?:[,.]\d)?)x/;
	const sizeA_re = /(\d{3,4})x/;
	const sizeB_re = /(\d{3,4})/;
	const description_re = /(.+)\s{2,}/;
	const quantity_re = /(\d{1,4}(?:[,.]\d{1,3})?)\s+/;
	const quantityUnit_re = /(m3|m2|szt)/;
	const full_regexp = new RegExp(
		combineRegex(sizeT_re, sizeA_re, sizeB_re, description_re, quantity_re, quantityUnit_re),
		'i',
	);

	let idNum = '';
	let idCounter = 0;
	let itemGlue = '';
	let itemFace = '';
	let itemColor: string | null = '';
	let sourceTextOne = '';
	let sourceTextTwo = '';
	const PZnum = getPZNum(textFile);
	const invoiceNum = getInvoiceNum(textFile);

	textFile.forEach((textrow, rowIndex) => {
		const [, itemSizeT, itemSizeA, itemSizeB, itemDescription, itemQty, itemQtyUnit] = textrow.match(full_regexp) ?? [];

		if (itemSizeT && itemSizeA && itemSizeB && itemDescription && itemQty && itemQtyUnit) {
			idNum = `${invoiceNum || '_id'}_${(++idCounter).toString().padStart(3, '0')}`;
			itemGlue = getGlueType(textrow);
			itemFace = getFaceType(textrow);
			itemColor = getColor(textrow, itemFace);
			sourceTextOne = textrow.replace(/\s{2,}/g, ' ').trim();

			results.push({
				id: idNum,
				PZnum: PZnum,
				invoiceNum: invoiceNum,
				timestamp: Date.now(),
				PZ: {
					glue: itemGlue,
					sizeT: Number(itemSizeT.replace(/,/, '.')),
					sizeA: Number(itemSizeA),
					sizeB: Number(itemSizeB),
					face: itemFace,
					color: itemColor,
					qtyValue: Number(itemQty.replace(/,/, '.')),
					qtyUnit: itemQtyUnit,
					sourcetxt: `${sourceTextOne}`,
				},
			});
		}
	});

	// console.log(results);
	return results;
}

function getLatvijasProducts(textFile: string[]): Product[] {
	const results: Product[] = [];
	const polishUnits: Record<string, string> = { cbm: 'm3', sqr: 'm2', pcs: 'szt' };

	const sizeT_re = /(\d{1,2}(?:[,.]\d)?)x/;
	const sizeA_re = /(\d{3,4})x/;
	const sizeB_re = /(\d{3,4}) mm\s+/;
	const packing_re = /(\d{1,2}x\d{1,3})\s+/;
	const quantity_re = /(\d{1,4}(?:[,.]\d{1,3})?)\s+/;
	const quantityUnit_re = /(cbm|sqr|pcs)/;
	const full_regexp = new RegExp(
		combineRegex(sizeT_re, sizeA_re, sizeB_re, packing_re, quantity_re, quantityUnit_re),
		'i',
	);

	let idNum = '';
	let idCounter = 0;
	let itemGlue = '';
	let itemFace = '';
	let itemColor: string | null = '';
	let sourceTextOne = '';
	let sourceTextTwo = '';
	const arrivalPlace = getArrivalPlace(textFile);
	const invoiceNum = getInvoiceNum(textFile);
	const truckNum = getTruckNum(textFile);
	const CMRNum = getCMRNum(textFile);

	textFile.forEach(textrow => {
		if (/Birch plywood|KILO\/KILO|PQ\/PQ/.test(textrow)) {
			const declutered_text = textrow
				.replace(/Birch plywood RIGA |PLY|TEX|FORM|MEL|/gi, '')
				.replace(/, edges sealed .*|,[^,]*441233[0-9]{2}.*/gi, '')
				.replace(/ \(without \*\)/gi, '') // Peri without *
				.replace(/ Bouleau/gi, '') // Ultibat Bouleau
				// .replace(/(\w) (I)/g, '$1 $2')
				.replace(/,/i, ' ')
				.trim();
			itemGlue = getGlueType(textrow);
			itemFace = getFaceType(declutered_text);
			itemColor = getColor(declutered_text, itemFace);
			sourceTextOne = textrow.replace(/\s{2,}/g, ' ').trim();
		}

		const [, itemSizeT, itemSizeA, itemSizeB, itemPacking, itemQty, itemQtyUnit] = textrow.match(full_regexp) ?? [];
		if (itemSizeT && itemSizeA && itemSizeB && itemPacking && itemQty && itemQtyUnit) {
			idNum = `${invoiceNum || '_id'}_${(++idCounter).toString().padStart(3, '0')}`;
			sourceTextTwo = textrow.replace(/\s{2,}/g, ' ').trim();

			results.push({
				id: idNum,
				cmrNum: CMRNum,
				packing: itemPacking,
				truckNum: truckNum,
				invoiceNum: invoiceNum,
				arrivalPlace: arrivalPlace,
				timestamp: Date.now(),
				INV: {
					glue: itemGlue,
					sizeT: Number(itemSizeT.replace(/,/, '.')),
					sizeA: Number(itemSizeA),
					sizeB: Number(itemSizeB),
					face: itemFace,
					color: itemColor,
					qtyValue: Number(itemQty.replace(/,/, '.')),
					qtyUnit: polishUnits[itemQtyUnit.trim()]!,
					sourcetxt: `${sourceTextOne}\n${sourceTextTwo}`,
				},
			});
		}
	});

	// console.log(results);
	return results;
}

function getStigaProducts(textFile: string[]): Product[] {
	const results: Product[] = [];
	const polishUnits: Record<string, string> = { cbm: 'm3', sqr: 'm2', pcs: 'szt' };

	//  POS      Width     Length  Thickness   Quality per   Packs                                 Price
	//                                                                         (pcs)     (m3)    (EUR/m3)
	//                                                          pack
	//            1        1250       2500       9      CP/C     80     1       80      2.250     522.00   1174.50

	const itemId_re = /\d?\s{2,}/;
	const sizeA_re = /(\d{3,4})\s{2,}/;
	const sizeB_re = /(\d{3,4})\s{2,}/;
	const sizeT_re = /(\d{1,2}(?:[,.]\d)?)\s{2,}/;
	const face_re = /(.+)\s{2,}/;
	const pcsTotal_re = /\d{1,4}\s{2,}/;
	const packQty_re = /\d{1,2}\s{2,}/;
	const pcsQty_re = /\d{1,3}\s{2,}/;
	const cubicQty_re = /(\d{1,2}(?:\.\d*)?)\s{2,}/;

	const full_regexp = new RegExp(
		combineRegex(itemId_re, sizeA_re, sizeB_re, sizeT_re, face_re, pcsTotal_re, packQty_re, pcsQty_re, cubicQty_re),
		'i',
	);

	let idNum = '';
	let idCounter = 0;
	let itemGlue = '';
	let sourceTextOne = '';
	let sourceTextTwo = '';
	const invoiceNum = getInvoiceNum(textFile);

	textFile.forEach((textrow, i) => {
		const sanded = textrow.match(/^C\/C$/i);
		let fixedrow = '';
		if (sanded) {
			const words = textFile[i + 1]!.split(' ');
			words.splice(4, 0, `${textFile[i]?.trim()} ${textFile[i + 2]?.trim()}`);
			fixedrow = words.join(' ');
		}
		const [, item_sizeA, item_sizeB, item_sizeT, item_face, item_cubicQty] =
			(fixedrow || textrow).match(full_regexp) ?? [];

		console.log((fixedrow || textrow).match(full_regexp));

		if (item_sizeA && item_sizeB && item_sizeT && item_face && item_cubicQty) {
			idNum = `${invoiceNum || '_STG'}_${(++idCounter).toString().padStart(3, '0')}`;
			itemGlue = 'WD';
			sourceTextOne = fixedrow || textrow;

			results.push({
				id: idNum,
				invoiceNum: invoiceNum,
				timestamp: Date.now(),
				INV: {
					glue: itemGlue,
					sizeT: Number(item_sizeT.replace(/,/, '.')),
					sizeA: Number(item_sizeA),
					sizeB: Number(item_sizeB),
					face: getFaceType(item_face),
					color: getColor(item_face, item_face),
					qtyValue: Number(item_cubicQty.replace(/,/, '.')),
					qtyUnit: 'm3',
					sourcetxt: `${sourceTextOne}\n${sourceTextTwo}`,
				},
			});
		}
	});

	console.log(results);
	return results;
}

function findDiffers(products: Product[]): void {
	products.forEach(item => {
		const differs: ProductDiff = {};

		if (item.INV?.sizeT !== item.PZ?.sizeT) differs.sizeT = [item.INV?.sizeT, item.PZ?.sizeT];
		if (item.INV?.sizeA !== item.PZ?.sizeA) differs.sizeA = [item.INV?.sizeA, item.PZ?.sizeA];
		if (item.INV?.sizeB !== item.PZ?.sizeB) differs.sizeB = [item.INV?.sizeB, item.PZ?.sizeB];
		if (item.INV?.face !== item.PZ?.face) differs.face = [item.INV?.face, item.PZ?.face];
		if (item.INV?.glue !== item.PZ?.glue) differs.glue = [item.INV?.glue, item.PZ?.glue];
		if (item.INV?.color !== item.PZ?.color) differs.color = [item.INV?.color, item.PZ?.color];
		if (item.INV?.qtyUnit !== item.PZ?.qtyUnit) differs.qtyUnit = [item.INV?.qtyUnit, item.PZ?.qtyUnit];
		if (item.INV?.qtyValue !== item.PZ?.qtyValue) differs.qtyValue = [item.INV?.qtyValue, item.PZ?.qtyValue];

		Object.assign(item, {
			differs: differs,
		});

		useProductStore().updateProduct(item.id, item);
	});
}

function saveToProductStore(products: Product[]): void {
	products.forEach(product => {
		useProductStore().products.find(p => p.id === product.id)
			? useProductStore().updateProduct(product.id, product)
			: useProductStore().addProduct(product);
	});
}
</script>

<template>
	<button class="btn-primary" type="button" @click="openFile">
		<slot>Dodaj PDF</slot><span v-if="isWorking" class="spinner"></span>

		<input ref="fileInput" type="file" multiple hidden @change="doit" />
	</button>
</template>

<style scoped>
input[type='file'] {
	display: none;
}

label[for='PDFupload-button'] {
	cursor: pointer;
}

.spinner {
	width: 24px;
	height: 24px;
	border: 3px solid #ddd;
	border-top-color: var(--action-color-normal, #3498db);
	border-radius: 50%;
	animation: spin 0.8s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}
</style>
