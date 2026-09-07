<script setup lang="ts">
import stany_m3 from '@/exports/stany_m3.txt?raw';
import stany_m2 from '@/exports/stany_m2.txt?raw';
import stany_szt from '@/exports/stany_szt.txt?raw';

type CodeParams = {
	size: Set<string>;
	m3_calc: Set<number>;
	m2_calc: Set<number>;
	szt_calc: Set<number>;
};

const files = [stany_m3, stany_m2, stany_szt];
const dataMap = new Map<string, CodeParams>();

files.forEach(file => {
	const fileArray = file.split('\n');
	fileArray.forEach(row => {
		const [itemId, itemDesc, itemUnit, item_qnty, item_price, item_value] = row.split(/\t+/i);
		const hasId = /\d{2,3}s\d{2}\/\d{2,3}/i.test(itemId!);
		const hasSize = /(\d{1,2}(?:[,.]\d{1,2})?)x(\d{3,4})x(\d{3,4})/i.test(itemDesc ?? '');

		if ((hasId || hasSize) && itemId && itemDesc && itemUnit && item_qnty && item_price && item_value) {
			let params = dataMap.get(itemId);

			if (!params) {
				params = {
					size: new Set(),
					m3_calc: new Set(),
					m2_calc: new Set(),
					szt_calc: new Set(),
				};

				dataMap.set(itemId, params);
			}

			// params.size.add(size);
			// params.m3_calc.add(m3_calc);
			// params.m2_calc.add(m2_calc);
			// params.szt_calc.add(szt_calc);
		}
	});
});

console.log(dataMap);
</script>

<template></template>

<style scoped></style>
