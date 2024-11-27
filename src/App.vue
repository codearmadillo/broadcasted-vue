<script setup lang="ts">
import { ref } from 'vue';
import BroadcastUser from './components/BroadcastUser.vue';

const visible = ref(true);
</script>

<template>
  <button @click="visible = !visible" style="margin-bottom: 8px; width: 140px">
    {{ visible ? 'Hide' : 'Show' }}
  </button>
  <template v-if="visible">
    <BroadcastUser />
  </template>
</template>
