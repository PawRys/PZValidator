<script setup lang="ts">
import MyApps from '@/components/MyApps.vue';
import UploadPDF from '@/components/Btn_PDFUpload.vue';
import { useProductStore } from '@/stores/products_store';
import type { Product, ProductDiff } from '@/types/shared_types';

function hasDiffers(product: Product): boolean {
	return Object.keys(product.differs ?? {}).length > 0;
}
</script>

<template>
	<header class="noprint">
		<p><MyApps /></p>
		<h1>Tester Przyjęć</h1>
	</header>

	<main>
		<h6>
			<UploadPDF />
		</h6>

		<h3>
			Błędów: {{ useProductStore().products.filter(p => hasDiffers(p)).length }}/{{ useProductStore().products.length }}
		</h3>

		<ul v-for="p in useProductStore().products" :key="p.id" :class="{ correctItems: !hasDiffers(p) }">
			<li>
				<strong>{{ p.id.split('_')[1] }}.</strong> {{ p.invoiceNum }} <strong>/</strong> {{ p.PZnum }}
				<strong>/</strong>
				{{ p.arrivalPlace }}
			</li>

			<li v-if="!p.INV">
				<u class="invalid">Brak faktury</u>
			</li>
			<li v-else>
				<i class="more-info" :title="p.INV.sourcetxt">?</i>
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
				<i class="more-info" :title="p.PZ.sourcetxt">?</i>
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

	<footer class="noprint">
		<p>Wszelkie prawa zastrzeżone - Paweł Ryszkowski</p>
		<p>
			Uwagi i pomoc techniczna:
			<a href="mailto:pawrys.kontakt@gmail.com?subject=Pomoc%20Stock%20Browser%205" target="_blank"
				>pawrys.kontakt@gmail.com</a
			>
			<span> - </span>
			<a href="https://github.com/PawRys/">Github/PawRys</a>
		</p>
		<p></p>
	</footer>
</template>

<style>
#app {
	min-height: 100svh;
	display: grid;
	grid-template-rows: auto 1fr auto;
}
</style>

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
	background-color: var(--background-color-interactive);
	border: solid 1px var(--border-color-normal);
	border-radius: 100%;
	aspect-ratio: 1;
	height: 1em;
	font-family: 'Teko';
}

.valid,
.invalid {
	margin-inline: 0.2em;
	padding-inline: 0.2em;
	outline-style: auto;
	outline-width: 1px;
	outline-offset: 1px;
	/* text-decoration-color: green;
	text-decoration-thickness: 3px;
	text-decoration-line: underline;
	text-decoration-style: solid; */
}

.valid {
	background-color: palegreen;
	outline-color: green;
	/* text-decoration-style: solid; */
}

.invalid {
	background-color: pink;
	outline-color: crimson;
	/* text-decoration-color: crimson; */
}

.full-desc {
	font-size: 0.9rem;
	font-style: italic;
	white-space: pre-line;
	color: grey;
}
</style>
