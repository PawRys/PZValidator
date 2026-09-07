<script setup lang="ts">
import stany_m3 from '@/exports/stany_m3.txt?raw';
import stany_m2 from '@/exports/stany_m2.txt?raw';
import stany_szt from '@/exports/stany_szt.txt?raw';
import { ref, onMounted } from 'vue';

type CodeParams = {
	size: Set<string>;
	m3_calc: Set<number>;
	m2_calc: Set<number>;
	szt_calc: Set<number>;
};

const files = [stany_m3, stany_m2, stany_szt];

const data = processData();
findConflicts(data);

async function processData() {
	const dataMap = new Map<string, CodeParams>();
	const sizeMap = await fetch('https://raw.githubusercontent.com/PawRys/shared-assets/master/smetek-kody.json').then(
		r => r.json(),
	);

	files.forEach(file => {
		file.split('\n').forEach(row => {
			const [col_id, col_desc, col_unit, col_quantity, col_price, col_value] = row.split(/\t+/i);
			const quantity = Number(col_quantity?.replace(',', '.'));
			const unit = col_unit as 'm3' | 'm2' | 'szt';

			if (quantity && col_id && col_desc && col_unit && col_quantity && col_price && col_value) {
				const hasCode = /(\d{2,3})s(\d{2})\/(\d{2,3})/i.test(col_id);
				const hasSize = /\d{1,2}(?:[,.]\d{1,2})?x\d{3,4}x\d{3,4}/i.test(col_desc);
				const getCode = col_id.match(/(\d{2,3})s(\d{2})\/(\d{2,3})/i) ?? [];
				const getSize = col_desc.match(/\d{1,2}(?:[,.]\d{1,2})?x\d{3,4}x\d{3,4}/i)!;
				const [t, a, b] = getSize[0].replace(',', '.').split('x').map(Number) as [number, number, number];
				const sizeFromCode = `${Number(getCode[1])}x${sizeMap[getCode[3]!]}`;
				const sizeFromDesc = `${t}x${a}x${b}`;
				let params = dataMap.get(col_id);

				if (!params) {
					params = {
						size: new Set(),
						m3_calc: new Set(),
						m2_calc: new Set(),
						szt_calc: new Set(),
					};

					dataMap.set(col_id, params);
				}

				params.size.add(sizeFromCode);
				params.size.add(sizeFromDesc);
				params.m3_calc.add(calcQuant(sizeFromCode || sizeFromDesc, quantity, unit, 'm3'));
				params.m2_calc.add(calcQuant(sizeFromCode || sizeFromDesc, quantity, unit, 'm2'));
				params.szt_calc.add(calcQuant(sizeFromCode || sizeFromDesc, quantity, unit, 'szt'));
			}
		});
	});

	// console.log(dataMap);
	return dataMap;
}

function findConflicts(data) {
	return data.map(item => {
		console.log(item);
	});
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
