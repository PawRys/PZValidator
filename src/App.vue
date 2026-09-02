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
		<h1>You did it!</h1>
		<UploadPDF />

		<h4>Błędów: {{ useProductStore().products.filter(p => hasDiffers(p)).length }}/{{ useProductStore().products.length }}</h4>
		<ul
			v-for="product in useProductStore().products"
			:key="product.id"
			:class="{ correctItems: !hasDiffers(product) }">
			<li>{{ product.id.split('_')[1] }}. {{ product.invoiceNum }} / {{ product.PZnum }} / {{ product.arrivalPlace }}</li>

			<li v-if="!product.INV">Brak faktury</li>
			<li v-else>
				<u :class="{ valid: product.differs?.glue }">{{ product.INV?.glue }}</u>
				<span> </span>
				<u :class="{ valid: product.differs?.sizeT }">{{ product.INV?.sizeT }}</u>
				<span>x</span>
				<u :class="{ valid: product.differs?.sizeA }">{{ product.INV?.sizeA }}</u>
				<span>x</span>
				<u :class="{ valid: product.differs?.sizeB }">{{ product.INV?.sizeB }}</u>
				<span>mm </span>

				<u :class="{ valid: product.differs?.face }">{{ product.INV?.face }}</u>
				<span> </span>
				<u :class="{ valid: product.differs?.color }">{{ product.INV?.color }}</u>
				<span> </span>
				<u :class="{ valid: product.differs?.quantity }">{{ product.INV?.quantity }}</u>
				<span> </span>
				<u :class="{ valid: product.differs?.quantityUnit }">{{ product.INV?.quantityUnit }}</u>
			</li>

			<li v-if="!product.PZ">Brak Przyjęcia</li>
			<li v-else>
				<u :class="{ invalid: product.differs?.glue }">{{ product.PZ?.glue }}</u>
				<span> </span>
				<u :class="{ invalid: product.differs?.sizeT }">{{ product.PZ?.sizeT }}</u>
				<span>x</span>
				<u :class="{ invalid: product.differs?.sizeA }">{{ product.PZ?.sizeA }}</u>
				<span>x</span>
				<u :class="{ invalid: product.differs?.sizeB }">{{ product.PZ?.sizeB }}</u>
				<span>mm </span>

				<u :class="{ invalid: product.differs?.face }">{{ product.PZ?.face }}</u>
				<span> </span>
				<u :class="{ invalid: product.differs?.color }">{{ product.PZ?.color }}</u>
				<span> </span>
				<u :class="{ invalid: product.differs?.quantity }">{{ product.PZ?.quantity }}</u>
				<span> </span>
				<u :class="{ invalid: product.differs?.quantityUnit }">{{ product.PZ?.quantityUnit }}</u>
			</li>

			<li class="full-desc">{{ product.INV?.sourcetxt }}</li>
			<li class="full-desc">{{ product.PZ?.sourcetxt }}</li>
		</ul>
	</main>

	<footer class="noprint">
		<p>Wszelkie prawa zastrzeżone - Paweł Ryszkowski</p>
		<p>
			Uwagi i pomoc techniczna:
			<a
				href="mailto:pawrys.kontakt@gmail.com?subject=Pomoc%20Stock%20Browser%205"
				target="_blank"
				>pawrys.kontakt@gmail.com</a
			>
			<span> - </span>
			<a href="https://github.com/PawRys/">Github/PawRys</a>
		</p>
		<p></p>
	</footer>
</template>

<style scoped>
li {
	font-size: 1.1rem;
	padding-block: 0.2em;
}

.correctItems {
	display: none;
}

u {
	text-decoration: none;
}

.valid,
.invalid {
	margin-inline: 0.2em;
	padding-inline: 0.1em;
	outline-style: auto;
	outline-width: 1px;
	outline-offset: 1px;
	/* text-decoration-color: green;
	text-decoration-thickness: 3px;
	text-decoration-line: underline;
	text-decoration-style: solid; */
}
.valid {
	background-color: greenyellow;
	outline-color: green;
	/* text-decoration-style: solid; */
}

.invalid {
	background-color: pink;
	outline-color: crimson;
	/* text-decoration-color: crimson; */
}

.full-desc {
	white-space: pre-line;
}
</style>
