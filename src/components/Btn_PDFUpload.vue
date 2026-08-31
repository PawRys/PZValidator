<script setup lang="ts">
import type { Product } from '@/types/shared_types';
import { useProductStore } from '@/stores/products_store';
import { correctText, combineRegex } from '@/exports/shared_script';
import { ref } from 'vue';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.min.mjs';

const productStore = useProductStore();
const fileInput = ref<HTMLInputElement | null>(null);

const PZ_regex = new RegExp(/Przyjęcie do magazynu - \d\d-PZ \d{4}\w{2,}\.pdf/i);
const LF_regex = new RegExp(/LF\d\d M\d{6}/i);
const ST_regex = new RegExp(/DR[ _]\d+[ _]PO/i);

function openFile() {
	fileInput.value?.click();
}

async function doit(event: Event): Promise<void> {
	const target = event.target as HTMLInputElement;
	const pdfFilesList = target.files as FileList;
	const validFilesList = await validateFiles(pdfFilesList);
	const products = await processFiles(validFilesList);

	productStore.searchQuery = '';
	products.forEach(item => {
		if (productStore.products.find(storedItem => storedItem.invoiceId === item.invoiceId)) {
			productStore.updateProduct(item.invoiceId, item);
		} else {
			productStore.addProduct(item);
		}
	});
}

async function validateFiles(fileList: FileList): Promise<File[]> {
	const skippedFiles: string[] = [];
	const validFiles: File[] = [];

	for (const file of fileList) {
		const isPdf = file.type === 'application/pdf';

		const validPatterns = [PZ_regex, LF_regex];
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

async function processFiles(fileList: File[]) {
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

		// if (ST_regex.test(file.name)) {
		//   result.push(...getStigaProducts(TEXTrows))
		// }
	}

	console.log(result);

	return result;
}

async function PDFtoTEXT(file: File): Promise<string[]> {
	let TEXTrows: string[] = [];

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

			const CHAR_WIDTH = 6;
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

			TEXTrows.push(textrow);
		} // END row
	} // END page

	console.log(TEXTrows.join('\n'));
	return TEXTrows;
}

function getPZProducts(TEXTrows: string[]): Product[] {
	const results: Product[] = [];

	const sizeT_re = /(\d{1,2}(?:[,.]\d)?)x/;
	const sizeA_re = /(\d{3,4})x/;
	const sizeB_re = /(\d{3,4}),?\s+/;
	const description_re = /(.+)\s{2,}/;
	const quantity_re = /(\d{1,4}(?:[,.]\d{1,3})?)\s+/;
	const quantityUnit_re = /(m3|m2|szt)/;
	const full_regexp = new RegExp(combineRegex(sizeT_re, sizeA_re, sizeB_re, description_re, quantity_re, quantityUnit_re), 'i');

	let idNum = '';
	let idCounter = 0;
	let itemFace = '';
	let itemColor = '';
	let sourceTextOne = '';
	let sourceTextTwo = '';
	const invoiceNum = getInvoiceNum(TEXTrows);

	TEXTrows.forEach(textrow => {
		const [, itemSizeT, itemSizeA, itemSizeB, itemDescritiopn, itemQty, itemQtyUnit] = textrow.match(full_regexp) ?? [];
		if (itemSizeT && itemSizeA && itemSizeB && itemDescritiopn && itemQty && itemQtyUnit) {
			idNum = `${invoiceNum || '_id'}_${(++idCounter).toString().padStart(3, '0')}`;
			itemFace = getFaceType(textrow);
			itemColor = getColor(textrow, itemDescritiopn);
			sourceTextOne = textrow;

			results.push({
				id: crypto.randomUUID(),
				invoiceId: idNum,
				timestamp: Date.now(),
				PZ: {
					sourcetxt: `${sourceTextOne}`.replace(/\s{2,}/g, ' ').trim(),
					sizeT: Number(itemSizeT.replace(/,/, '.')),
					sizeA: Number(itemSizeA),
					sizeB: Number(itemSizeB),
					face: itemFace,
					color: itemColor,
					quantity: Number(itemQty.replace(/,/, '.')),
					quantityUnit: itemQtyUnit,
				},
			});
		}
	});

	console.log(results);
	return results;
}

function getLatvijasProducts(TEXTrows: string[]): Product[] {
	const results: Product[] = [];
	const polishUnits: Record<string, string> = { cbm: 'm3', sqr: 'm2', pcs: 'szt' };

	const sizeT_re = /(\d{1,2}(?:[,.]\d)?)x/;
	const sizeA_re = /(\d{3,4})x/;
	const sizeB_re = /(\d{3,4}) mm\s+/;
	const packing_re = /(\d{1,2}x\d{1,3})\s+/;
	const quantity_re = /(\d{1,4}(?:[,.]\d{1,3})?)\s+/;
	const quantityUnit_re = /(cbm|sqr|pcs)/;
	const full_regexp = new RegExp(combineRegex(sizeT_re, sizeA_re, sizeB_re, packing_re, quantity_re, quantityUnit_re), 'i');

	let idNum = '';
	let idCounter = 0;
	let itemFace = '';
	let itemColor = '';
	let sourceTextOne = '';
	let sourceTextTwo = '';
	const arrivalPlace = getArrivalPlace(TEXTrows);
	const invoiceNum = getInvoiceNum(TEXTrows);
	const truckNum = getTruckNum(TEXTrows);
	const CMRNum = getCMRNum(TEXTrows);

	TEXTrows.forEach(textrow => {
		if (/441233[0-9]{2}/.test(textrow)) {
			sourceTextOne = textrow;
			// itemGlue = textrow.match(/MR|WD|INT|EXT/i)?.[0] ?? ''
			itemFace = getFaceType(textrow);
			itemColor = getColor(textrow, itemFace);
		}

		const [, itemSizeT, itemSizeA, itemSizeB, itemPacking, itemQty, itemQtyUnit] = textrow.match(full_regexp) ?? [];
		if (itemSizeT && itemSizeA && itemSizeB && itemPacking && itemQty && itemQtyUnit) {
			idNum = `${invoiceNum || '_id'}_${(++idCounter).toString().padStart(3, '0')}`;
			sourceTextTwo = textrow;

			results.push({
				id: crypto.randomUUID(),
				invoiceId: idNum,
				timestamp: Date.now(),
				cmrNum: CMRNum,
				packing: itemPacking,
				truckNum: truckNum,
				arrivalPlace: arrivalPlace,
				INVOICE: {
					sourcetxt: `${sourceTextOne} ${sourceTextTwo}`.replace(/\s{2,}/g, ' ').trim(),
					sizeT: Number(itemSizeT.replace(/,/, '.')),
					sizeA: Number(itemSizeA),
					sizeB: Number(itemSizeB),
					face: itemFace,
					color: itemColor,
					quantity: Number(itemQty.replace(/,/, '.')),
					quantityUnit: polishUnits[itemQtyUnit.trim()]!,
				},
			});
		}
	});

	console.log(results);
	return results;
}

// function getStigaProducts(TEXTrows: string[]): Product[] {
//   const results: Product[] = []

//   const id_re = String.raw`\d{1,2}`
//   const sizeA_re = String.raw`(\d{3,4})` // Capture group
//   const sizeB_re = String.raw`(\d{3,4})` // Capture group
//   const sizeT_re = String.raw`(\d{1,2}(?:[,.]\d)?)` // Capture group
//   const face_re = String.raw`((?:BB|B|CP|C|F|W) ?(?:1|2|II|I)?\/(?:BB|B|CP|C|F|W) ?(?:1|2|II|I)?(?: Sanded)?)` // Capture group
//   const pcsQty_re = String.raw`(\d{1,3})` // Capture group
//   const packsQty_re = String.raw`(\d{1,2})` // Capture group
//   const full_regexp = new RegExp(
//     String.raw`${id_re}\s+${sizeA_re}\s+${sizeB_re}\s+${sizeT_re}\s+${face_re}\s+${pcsQty_re}\s+${packsQty_re}`,
//     'i',
//   )

//   let idNum = ''
//   let idCounter = 0
//   let itemSize = ''
//   let itemFace = ''
//   let itemGlue = ''
//   let itemWeight = 0
//   let itemPiecesCount = 0
//   let itemPacksCount = 1
//   const arrivalPlace = getArrivalPlace(TEXTrows)
//   const invoiceNum = getInvoiceNum(TEXTrows)
//   const truckNum = invoiceNum
//   const CMRNum = invoiceNum

//   TEXTrows.forEach((textrow, i) => {
//     const sanded = textrow.match(/^C\/C$/i)
//     let fixedrow = ''

//     if (sanded) {
//       const words = TEXTrows[i + 1]!.split(' ')
//       words.splice(4, 0, `${TEXTrows[i]?.trim()} ${TEXTrows[i + 2]?.trim()}`)
//       fixedrow = words.join(' ')
//     }

//     const [id, sizeA, sizeB, sizeT, face, pcsQty, packsQty] = (fixedrow || textrow).match(full_regexp) ?? []

//     if (id && sizeA && sizeB && sizeT && face && pcsQty && packsQty) {
//       idNum = `${invoiceNum || '_STG'}_${(++idCounter).toString().padStart(3, '0')}`
//       itemSize = `${sizeT}x${sizeA}x${sizeB}`
//       itemFace = face ?? ''
//       itemGlue = 'WD'
//       itemWeight = calcWeight(`${itemSize} ${itemFace}`, +pcsQty || 0)
//       itemPacksCount = Number(packsQty) ?? 0
//       itemPiecesCount = Number(pcsQty) ?? 0

//       // results.push({
//         // id: idNum,
//         // timestamp: Date.now(),
//         // title: itemSize,
//         // desc: itemFace,
//         // note: invoiceNum,
//         // glue: itemGlue || `${itemWeight.toFixed(0)} kg`,
//         // weight: itemWeight,
//         // packsCount: itemPacksCount,
//         // piecesCount: itemPiecesCount,
//         // arrivalPlace: arrivalPlace,
//         // truckNum: truckNum,
//         // cmrNum: CMRNum,
//       // })
//     }
//   })

//   // console.log(results)
//   return results
// }

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
		// if (faceType?.match('Poliform')) results.add('(nieznany)')
		// if (faceType?.match('PPL')) results.add('(nieznany)')
		// if (faceType?.match('PQF')) results.add('(nieznany)')
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
		<slot>Dodaj PDF</slot>
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
</style>
