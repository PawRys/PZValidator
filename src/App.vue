<script setup lang="ts">
import MyApps from '@/components/MyApps.vue';
import UploadPDF from '@/components/Btn_PDFUpload.vue';
import { useProductStore } from '@/stores/products_store';
import type { Product, ProductDiff } from '@/types/shared_types';

function hasDiffers(differs: ProductDiff): boolean {
	return Object.keys(differs ?? {}).length > 0;
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

		<ul v-for="product in useProductStore().products" :key="product.id">
			<template v-if="hasDiffers(product.differs as ProductDiff)">
				<li>{{ product.invoiceNum }} / {{ product.PZnum }} / {{ product.id }}</li>
				<li>
					<span>{{ `${product.INV?.sizeT}x${product.INV?.sizeA}x${product.INV?.sizeB}mm ` }}</span>
					<span>{{
						`${product.INV?.face} ${product.INV?.color} ${product.INV?.quantity}${product.INV?.quantityUnit}`
					}}</span>
				</li>
				<li>
					<span>{{ `${product.PZ?.sizeT}x${product.PZ?.sizeA}x${product.PZ?.sizeB}mm ` }}</span>
					<span>{{
						`${product.PZ?.face} ${product.PZ?.color} ${product.PZ?.quantity}${product.PZ?.quantityUnit}`
					}}</span>
				</li>
				<li>
					<span>{{ product.differs }}</span>
				</li>
				<!-- <li>{{ product.INV?.sourcetxt }}</li>
			<li>{{ product.PZ?.sourcetxt }}</li> -->
			</template>
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

<style scoped></style>
