<script setup lang="ts">
import stany_m3 from '@/exports/stany_m3.txt?raw';
import stany_m2 from '@/exports/stany_m2.txt?raw';
import stany_szt from '@/exports/stany_szt.txt?raw';

type CodeParams = {
	code_format: string | null;
	desc_format: string | null;
	calc_m3: Set<number>;
	calc_m2: Set<number>;
	calc_szt: Set<number>;
	onePiece_m3: number;
	onePiece_m2: number;
	error_m3?: boolean;
	error_m2?: boolean;
	error_szt?: boolean;
	error_format?: boolean;
};

const files = [stany_m3, stany_m2, stany_szt];
const processed = processData(files);
findErrors(processed);

async function processData(files: any) {
	const result = new Map<string, CodeParams>();
	const smetek_kody = await fetch(
		'https://raw.githubusercontent.com/PawRys/shared-assets/master/smetek-kody.json',
	).then(r => r.json());

	for (const file of files) {
		for (const row of file.split(/\r?\n/)) {
			const [col_id, col_desc, col_unit, col_quantity, col_price, col_value] = row.split(/\t+/);

			if (col_id && col_desc && col_unit && col_quantity && col_price && col_value) {
				const hasCode = /(\d{2,3})s(\d{2})\/(\d{2,3})/i.test(col_id);
				const hasSize = /\d{1,2}(?:[,.]\d{1,2})?x\d{3,4}x\d{3,4}/i.test(col_desc);
				const quantity = Number(col_quantity?.replace(',', '.'));
				const unit = col_unit as 'm3' | 'm2' | 'szt';

				if (hasCode || hasSize) {
					const formatFromCode = hasCode ? await getFormatFromCode(col_id, smetek_kody) : null;
					const formatFromDesc = hasSize ? getFormatFromDesc(col_desc) : null;
					const calcFormat = formatFromCode! || formatFromDesc!;

					let params = result.get(col_id);

					if (!params) {
						params = {
							code_format: null,
							desc_format: null,
							calc_m3: new Set(),
							calc_m2: new Set(),
							calc_szt: new Set(),
							onePiece_m3: 0,
							onePiece_m2: 0,
						};
					}

					const m3 = calcQuant(calcFormat, quantity, unit, 'm3');
					const m2 = calcQuant(calcFormat, quantity, unit, 'm2');
					const szt = calcQuant(calcFormat, quantity, unit, 'szt');

					params.code_format = formatFromCode;
					params.desc_format = formatFromDesc;
					params.calc_m3.add(Math.round(m3 * 10000) / 10000);
					params.calc_m2.add(Math.round(m2 * 10000) / 10000);
					params.calc_szt.add(Math.round(szt * 10000) / 10000);
					params.onePiece_m3 = calcQuant(calcFormat, 1, 'szt', 'm3');
					params.onePiece_m2 = calcQuant(calcFormat, 1, 'szt', 'm2');

					result.set(col_id, params);
				}
			}
		}
	}

	// console.log(result);
	return result;
}

async function findErrors(data: Promise<Map<string, CodeParams>>) {
	const map = await data;

	const result = new Map<string, CodeParams>();

	for (const [key, p] of map) {
		const diff_m3 = p.calc_m3.size > 0 ? Math.max(...p.calc_m3) - Math.min(...p.calc_m3) : 0;
		const diff_m2 = p.calc_m2.size > 0 ? Math.max(...p.calc_m2) - Math.min(...p.calc_m2) : 0;
		const diff_szt = p.calc_szt.size > 0 ? Math.max(...p.calc_szt) - Math.min(...p.calc_szt) : 0;

		const precision = 0.1;
		const wrongFactor_m3 = diff_m3 > p.onePiece_m3 * precision;
		const wrongFactor_m2 = diff_m2 > p.onePiece_m2 * precision;
		const wrongFactor_szt = diff_szt > 1 * precision;
		const wrongSizeDesc = p.code_format != null && p.desc_format != null && p.code_format !== p.desc_format;

		p.error_m3 = wrongFactor_m3;
		p.error_m2 = wrongFactor_m2;
		p.error_szt = wrongFactor_szt;
		p.error_format = wrongSizeDesc;

		const hasError = wrongFactor_m3 || wrongFactor_m2 || wrongFactor_szt || wrongSizeDesc;

		if (hasError) {
			console.log(key, p);
			result.set(key, p);
		}
	}
	// console.log(result);
	return result;
}

async function getFormatFromCode(text: string, codes: any): Promise<string> {
	let result = '';

	const matching = text.match(/(\d{2,3})s(\d{2})\/(\d{2,3})/i) ?? [];
	if (matching.length === 4) {
		const thickFromCode = matching[1]!.length > 2 ? Number(matching[1]) / 10 : Number(matching[1]);
		result = `${thickFromCode}x${codes[matching[3]!]}`;
	}

	return result;
}

function getFormatFromDesc(text: string): string {
	let result = '';
	const matching = text.match(/(\d{1,2}(?:[,.]\d{1,2})?)x(\d{3,4})x(\d{3,4})/i) ?? [];

	if (matching.length === 4) {
		const [t, a, b] = matching[0].replace(',', '.').split('x').map(Number) as [string, number, number];
		result = `${t}x${a}x${b}`;
	}

	return result;
}

function calcQuant(size: string, value: number, from: 'm3' | 'm2' | 'szt', to: 'm3' | 'm2' | 'szt'): number {
	const [t, a, b] = size.replace(',', '.').split('x').map(Number) as [number, number, number];

	const m3PerPiece = (t * a * b) / 1000 ** 3;
	const m2PerPiece = (a * b) / 1000 ** 2;

	if (from === to) return value;

	if (from === 'szt') {
		if (to === 'm3') return value * m3PerPiece;
		if (to === 'm2') return value * m2PerPiece;
	}

	if (from === 'm3') {
		if (to === 'm2') return value / (t / 1000);
		if (to === 'szt') return value / m3PerPiece;
	}

	if (from === 'm2') {
		if (to === 'm3') return value * (t / 1000);
		if (to === 'szt') return value / m2PerPiece;
	}

	return value;
}
</script>

<template></template>

<style scoped></style>
