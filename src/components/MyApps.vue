<script setup lang="ts">
import { ref, onMounted } from 'vue';
const myApps = ref<{ name: string; href: string }[]>([]);
onMounted(() =>
	fetch('https://raw.githubusercontent.com/PawRys/shared-assets/master/myapps.json')
		.then(r => r.json())
		.then(v => (myApps.value = v)),
);
</script>

<template>
	<template v-for="(app, i) in myApps" :key="app.name">
		<span v-if="i > 0"> / </span>
		<a :href="app.href" target="_blank">
			{{ app.name }}
		</a>
	</template>
</template>
