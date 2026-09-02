<script setup lang="ts">
import type { Product, ProductData, ProductDiff } from '@/types/shared_types';
import { useProductStore } from '@/stores/products_store';
import { correctText, combineRegex } from '@/exports/shared_script';
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

	console.log(textFile.join('\n'));
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
	let itemColor = '';
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
			sourceTextOne = textrow;

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
					quantity: Number(itemQty.replace(/,/, '.')),
					quantityUnit: itemQtyUnit,
					sourcetxt: `${sourceTextOne}`.replace(/\s{2,}/g, ' ').trim(),
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
	let itemColor = '';
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
					quantity: Number(itemQty.replace(/,/, '.')),
					quantityUnit: polishUnits[itemQtyUnit.trim()]!,
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
					quantity: Number(item_cubicQty.replace(/,/, '.')),
					quantityUnit: 'm3',
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

		if (item.INV?.glue !== item.PZ?.glue) differs.glue = [item.INV?.glue, item.PZ?.glue];
		if (item.INV?.sizeT !== item.PZ?.sizeT) differs.sizeT = [item.INV?.sizeT, item.PZ?.sizeT];
		if (item.INV?.sizeA !== item.PZ?.sizeA) differs.sizeA = [item.INV?.sizeA, item.PZ?.sizeA];
		if (item.INV?.sizeB !== item.PZ?.sizeB) differs.sizeB = [item.INV?.sizeB, item.PZ?.sizeB];
		if (item.INV?.face !== item.PZ?.face) differs.face = [item.INV?.face, item.PZ?.face];
		if (item.INV?.color !== item.PZ?.color) differs.color = [item.INV?.color, item.PZ?.color];
		if (item.INV?.quantity !== item.PZ?.quantity) differs.quantity = [item.INV?.quantity, item.PZ?.quantity];
		if (item.INV?.quantityUnit !== item.PZ?.quantityUnit)
			differs.quantityUnit = [item.INV?.quantityUnit, item.PZ?.quantityUnit];

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

function getArrivalPlace(text_rows: string[]): string {
	let result = '';
	text_rows.forEach((textrow, i) => {
		const LF = textrow.includes('Terms of delivery:') ? textrow.replace('Terms of delivery:', '').trim() : '';
		const ST = /100\s*%\s*Prepayment\s*DAP/i.test(textrow) ? textrow.replace(/100\s*%\s*Prepayment/i, '').trim() : '';

		if (LF) result = LF;
		if (ST) result = ST;
	});
	return result;
}

function getPZNum(text_rows: string[]): string {
	let result = '';
	text_rows.forEach((textrow, i) => {
		const PZ = textrow.match(/\d{2}-PZ\/\d{4}\w+\b/i);
		if (PZ) result = PZ[0];
	});
	return result;
}

function getInvoiceNum(text_rows: string[]): string {
	let result = '';
	text_rows.forEach((textrow, i) => {
		const LF = textrow.match(/LF[0-9]{2} M[0-9]{6}/i);
		const ST = textrow.match(/DR[0-9]+/i);

		if (LF) result = LF[0];
		if (ST) result = ST[0];
	});
	return result;
}

function getTruckNum(text_rows: string[]): string {
	let result = '';
	text_rows.forEach((textrow, i) => {
		if (textrow.includes('Carriage by:')) {
			result = textrow.replace('Carriage by:', '').trim();
			return;
		}
	});
	return result;
}

function getCMRNum(text_rows: string[]): string {
	let result = '';
	text_rows.forEach((textrow, i) => {
		const match = textrow.match(/CMR_[A-Z]{1}[0-9]{6}/i);
		if (match) {
			result = match[0];
			return;
		}
	});
	return result;
}

function getGlueType(text: string): string {
	let result = '';
	if (/foliowana|antypo|melamin|M\?M/g.test(text)) result = 'WD';
	if (/wodo|\bWD\b|\bEXT\b|\bE\b/g.test(text)) result = 'WD';
	if (/sucho|\bMR\b|\bINT\b/g.test(text)) result = 'MR';
	return result;
}

function getFaceType(text: string): string {
	let result = '';

	const regexpGrade = /\b(S|B|BB|CP|WG|WGE|C|CC|V|[WFM]( ?[ALT])?( I{1,2})?)\b/;
	const expression = new RegExp(`${regexpGrade.source}/${regexpGrade.source}`, 'gi');
	if (expression.test(text)) {
		const grade = text.match(expression);
		result = grade ? grade[0] : '??/??';
		result = result.replace(/( ?[ALT])?( I{1,2})?/g, '');
	}
	/*!!! Keep order. Any order if equal number. !!! */

	/*1*/ if (/s01\//gi.test(text)) result = 'B/B';
	/*1*/ if (/s02\//gi.test(text)) result = 'B/BB';
	/*1*/ if (/s03\//gi.test(text)) result = 'S/BB';
	/*1*/ if (/s04\//gi.test(text)) result = 'BB/BB';
	/*1*/ if (/s05\//gi.test(text)) result = 'BB/CP';
	/*1*/ if (/s06\//gi.test(text)) result = 'BB/WG';
	/*1*/ if (/s07\//gi.test(text)) result = 'CP/CP';
	/*1*/ if (/s08\//gi.test(text)) result = 'WGE/WGE';
	/*1*/ if (/s09\//gi.test(text)) result = 'WG/WG';
	/*1*/ if (/s10\//gi.test(text)) result = 'C/C';
	/*1*/ if (/s11\//gi.test(text)) result = 'Kilo';
	/*1*/ if (/s12\/|s13\//gi.test(text)) result = 'F/F'; // II applied in *4*
	/*1*/ if (/s14\/|s15\//gi.test(text)) result = 'W/F'; // II applied in *4*
	/*1*/ if (/s16\/|s17\//gi.test(text)) result = 'W/W'; // II applied in *4*
	/*1*/ if (/s18\//gi.test(text)) result = 'CP/C';
	/*1*/ if (/s19\//gi.test(text)) result = 'M/WG';
	/*1*/ if (/s20\//gi.test(text)) result = 'F/BB';
	/*1*/ if (/s21\//gi.test(text)) result = 'F/WG';
	/*1*/ if (/s22\//gi.test(text)) result = 'BB/C';
	/*1*/ if (/s23\//gi.test(text)) result = 'W/BB';
	/*1*/ if (/s24\//gi.test(text)) result = 'W/WG';
	/*1*/ if (/s25\//gi.test(text)) result = 'B/WG';
	/*1*/ if (/s26\//gi.test(text)) result = 'F/WH';
	/*1*/ if (/s27\//gi.test(text)) result = 'W/CP';
	/*1*/ if (/s28\//gi.test(text)) result = 'S/WG';
	/*1*/ if (/s29\//gi.test(text)) result = 'S/CP';
	/*1*/ if (/s30\//gi.test(text)) result = 'V/V';
	/*1*/ if (/s31\//gi.test(text)) result = 'OSB3';
	/*1*/ if (/s32\//gi.test(text)) result = 'OSB T&G';
	/*1*/ if (/s35\//gi.test(text)) result = 'BB/CC';

	/*2.1*/ if (/\bkilo\b/gi.test(text)) result = 'Kilo';
	/*2.2*/ if (/\bPQ\b/gi.test(text)) result = 'PQ';
	/*2.3*/ if (/\bPQ\W?F\b/gi.test(text)) result = 'PQF';
	/*3*/ if (/\bF\/W\W?H\b|Heksa/gi.test(text)) result = 'Heksa';
	/*3*/ if (/\bF\/W\W?H\W?\+|Heksa\W?\+|Heksa Plus/gi.test(text)) result = 'Heksa Plus';
	/*3*/ if (/\bM\/M\b|\bopal white\b/gi.test(text)) result = 'M/M';
	// /*3*/ if (/\bhoney\b/gi.test(text)) result = 'Honey'
	// /*3*/ if (/\bM\/M\b|mel/gi.test(text)) result = 'M/M'
	// /*3*/ if (/\bopal\b/gi.test(text)) result = 'Opal'
	// /*3*/ if (/\bopal white\b/gi.test(text)) result = 'Opal White'
	/*3*/ if (/\bPF\b|poliform/gi.test(text)) result = 'Poliform';
	/*3*/ if (/\bPPL\b/gi.test(text)) result = 'PPL';
	/*3*/ if (/OSB/gi.test(text)) result = 'OSB';

	/*4*/ // !important Apply II grade at the end
	// /*4*/ if (/s13\/|s15\/|s17\/|((WT|FA|MA|W|F|M) II)/gi.test(text)) result += ' II'
	/*4*/ if (/s13\/|s15\/|s17\/|([WFM]( ?[ALT])? II)/gi.test(text)) result += ' II';

	return result;
}

function getColor(text: string, faceType: string): string {
	const results = new Set();

	if (/\bhoney\b/gi.test(text)) results.add('honey');
	if (/yell|zółt[ya]/gi.test(text)) results.add('yellow');
	if (/black|czarn[ya]/gi.test(text)) results.add('black');
	if (/green|zielon[ya]/gi.test(text)) results.add('green');
	if (/blue|niebiesk[ia]/gi.test(text)) results.add('blue');
	if (/\bred\b|czerwon[ya]/gi.test(text)) results.add('red');
	if (/(?<!(opal ?))(white)/gi.test(text)) results.add('white');
	if (/(?<=(opal ?))(white)/gi.test(text)) results.add('opal white');
	if (/c\.less|transp|bezbarwna|colorless/gi.test(text)) results.add('c.less');
	if (/(?<!(l\. ?|jasn[yoa] ?|light ?))(grey|szar[ya])/gi.test(text)) results.add('grey');
	if (/(?<=(l\. ?|jasn[yoa] ?|light ?))(grey|szar[ya])/gi.test(text)) results.add('l.grey');
	if (/(?<=(l\. ?|jasn[yoa] ?|light ?))(br|brąz|brown)/gi.test(text)) results.add('l.brown');
	if (/(?<!(l\. ?|jasn[yoa] ?|light ?))(d\.)?(br|brąz|brown)\b/gi.test(text)) results.add('d.brown');

	/* Apply defaults if no color specified */
	if (results.size === 0) {
		if (faceType?.match('F/F')) results.add('d.brown');
		if (faceType?.match('F/W')) results.add('d.brown');
		if (faceType?.match('W/F')) results.add('d.brown');
		if (faceType?.match('W/W')) results.add('d.brown');
		if (faceType?.match('Heksa')) results.add('d.brown');
		if (faceType?.match('M/M')) results.add('white');
		// if (faceType?.match('Poliform')) results.add('(nieznany)');
		// if (faceType?.match('PPL')) results.add('(nieznany)');
		// if (faceType?.match('PQF')) results.add('(nieznany)');
	}

	// if (results.size === 0 && faceType) results.add('(brak)')
	// else results.add('(laminat)')
	// if (results.size === 0) results.add('(---)')
	return Array.from(results).join(' ');
}
</script>

<template>
	<button
		class="btn-primary"
		type="button"
		@click="openFile">
		<slot>Dodaj PDF</slot
		><span
			v-if="isWorking"
			class="spinner"></span>

		<input
			ref="fileInput"
			type="file"
			multiple
			hidden
			@change="doit" />
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
