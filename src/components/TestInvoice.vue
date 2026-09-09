<script setup lang="ts">
import UploadPDF from '@/components/Btn_PDFUpload.vue';
import { useProductStore } from '@/stores/products_store';
import type { Product } from '@/types/shared_types';

function hasDiffers(product: Product): boolean {
	return Object.keys(product.differs ?? {}).length > 0;
}
</script>

<template>
	<main>
		<h1>Tester Przyjęć</h1>

		<h6>
			<UploadPDF class="action" />
		</h6>

		<h3>
			Błędów: {{ useProductStore().products.filter(p => hasDiffers(p)).length }}/{{ useProductStore().products.length }}
		</h3>

		<h3 v-if="useProductStore().products.length && useProductStore().products.filter(p => hasDiffers(p)).length === 0">
			Wszystko git 👍
		</h3>

		<ul
			v-for="p in useProductStore().products"
			:key="p.id"
			:class="{ correctItems: !hasDiffers(p) }">
			<li>
				<strong>{{ p.id.split('_')[1] }}.</strong> {{ p.invoiceNum }} <strong>/</strong> {{ p.PZnum }}
				<strong>/</strong>
				{{ p.arrivalPlace }}
			</li>

			<li v-if="!p.INV">
				<u class="invalid">Brak faktury</u>
			</li>
			<li v-else>
				<i
					class="more-info"
					:title="p.INV.sourcetxt"
					>?</i
				>
				<u :class="{ valid: p.PZ && p.differs?.glue }">{{ p.INV?.glue }}</u>
				<span> </span>
				<u :class="{ valid: p.PZ && p.differs?.sizeT }">{{ p.INV?.sizeT }}</u>
				<span>x</span>
				<u :class="{ valid: p.PZ && p.differs?.sizeA }">{{ p.INV?.sizeA }}</u>
				<span>x</span>
				<u :class="{ valid: p.PZ && p.differs?.sizeB }">{{ p.INV?.sizeB }}</u>
				<span>mm </span>
				<u :class="{ valid: p.PZ && p.differs?.face }">{{ p.INV?.face }}</u>
				<span> </span>
				<u :class="{ valid: p.PZ && p.differs?.color }">{{ p.INV?.color }}</u>
				<span> </span>
				<u :class="{ valid: p.PZ && p.differs?.qtyValue }">{{ p.INV?.qtyValue }}</u>
				<span> </span>
				<u :class="{ valid: p.PZ && p.differs?.qtyUnit }">{{ p.INV?.qtyUnit }}</u>
			</li>

			<li v-if="!p.PZ">
				<u class="invalid">Brak Przyjęcia</u>
			</li>
			<li v-else>
				<i
					class="more-info"
					:title="p.PZ.sourcetxt"
					>?</i
				>
				<u :class="{ invalid: p.INV && p.differs?.glue }">{{ p.PZ?.glue }}</u>
				<span> </span>
				<u :class="{ invalid: p.INV && p.differs?.sizeT }">{{ p.PZ?.sizeT }}</u>
				<span>x</span>
				<u :class="{ invalid: p.INV && p.differs?.sizeA }">{{ p.PZ?.sizeA }}</u>
				<span>x</span>
				<u :class="{ invalid: p.INV && p.differs?.sizeB }">{{ p.PZ?.sizeB }}</u>
				<span>mm </span>
				<u :class="{ invalid: p.INV && p.differs?.face }">{{ p.PZ?.face }}</u>
				<span> </span>
				<u :class="{ invalid: p.INV && p.differs?.color }">{{ p.PZ?.color }}</u>
				<span> </span>
				<u :class="{ invalid: p.INV && p.differs?.qtyValue }">{{ p.PZ?.qtyValue }}</u>
				<span> </span>
				<u :class="{ invalid: p.INV && p.differs?.qtyUnit }">{{ p.PZ?.qtyUnit }}</u>
			</li>
		</ul>
	</main>
</template>

<style scoped>
strong {
	font-weight: 700;
}

ul {
	padding: 0;
}

li {
	list-style: none;
	font-size: 1rem;
	padding-block: 0.2em;
}

.correctItems {
	display: none;
}

u {
	text-decoration: none;
}

.more-info {
	display: inline-flex;
	justify-content: center;
	align-items: center;
	cursor: help;

	margin-right: 0.5em;
	padding-top: 0.1em;
	/* background-color: var(--background-color-interactive);
	border: solid 1px var(--border-color-normal);
	border-radius: 100%; */
	aspect-ratio: 1;
	height: 1em;
	font-family: 'Teko';
}

.full-desc {
	font-size: 0.9rem;
	font-style: italic;
	white-space: pre-line;
	color: grey;
}
</style>
