<script setup lang="ts">
import { ref } from 'vue';

import MyApps from '@/components/MyApps.vue';
import TestFactors from '@/components/TestFactors.vue';
import TestInvoice from '@/components/TestInvoice.vue';

const displayComponent = ref(TestInvoice);
</script>

<template>
	<header class="noprint">
		<p><MyApps /></p>
		<div class="button-bar">
			<button
				class="large"
				@click="displayComponent = TestInvoice">
				Tester Przyjęć
			</button>
			<button
				class="large"
				@click="displayComponent = TestFactors">
				Tester Przeliczników
			</button>
		</div>
	</header>

	<KeepAlive>
		<component :is="displayComponent" />
	</KeepAlive>

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

<style>
#app {
	min-height: 100svh;
	display: grid;
	grid-template-rows: auto 1fr auto;
}
</style>

<style scoped>
header {
	margin-bottom: var(--s-21);
}

.button-bar {
	display: flex;
	align-items: center;
	gap: var(--s-13);
}
</style>
