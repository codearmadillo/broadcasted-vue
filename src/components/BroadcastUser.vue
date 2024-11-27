<script lang="ts" setup>
import { computed } from 'vue';
import { broadcasted } from '../composables/broadcasted';

const count = broadcasted('HelloWorld', 0);
const double = computed(() => count.value * 2);
</script>

<template>
  <div class="radio">
    <div class="value">{{ count }}</div>
    <div>* 2 = {{ double }}</div>
    <button class="button" @click="count += 1">+1</button>
  </div>
</template>

<style scoped>
.radio {
  padding: 1rem 1.5rem;
  background: #f3f3f3;
  margin-bottom: 0.5rem;
  border-radius: 0.75rem;
  display: flex;
  flex-flow: row nowrap;
  column-gap: 1.5rem;
  align-items: center;
}
.value {
  font-weight: bold;
}
.button {
  background: #ff99ff;
}
</style>
