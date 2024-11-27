<script lang="ts" setup>
import { computed } from 'vue';
import { broadcasted } from '../composables/broadcasted';

const { ref: count, channel, closed } = broadcasted('HelloWorld', 0);
const { ref: count1, channel: channel1, closed: closed1 } = broadcasted('HelloWorld1', 0);
const { ref: count2, channel: channel2, closed: closed2 } = broadcasted('HelloWorld2', 0);
</script>

<template>
  <div class="radio">
    <div class="value">{{ count }}</div>
    <button class="button" @click="count += 1">+1</button>
    <button class="button close-channel" :disabled="closed" @click="channel.close(); closed = true">{{ closed ? 'Closed' : 'Close' }}</button>
  </div>
  <div class="radio">
    <div class="value">{{ count1 }}</div>
    <button class="button" @click="count1 += 2">+2</button>
    <button class="button close-channel" :disabled="closed1" @click="channel1.close(); closed1 = true">{{ closed1 ? 'Closed' : 'Close' }}</button>
  </div>
  <div class="radio">
    <div class="value">{{ count2 }}</div>
    <button class="button" @click="count2 += 4">+4</button>
    <button class="button close-channel" :disabled="closed2" @click="channel2.close(); closed2 = true">{{ closed2 ? 'Closed' : 'Close' }}</button>
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
.button.close-channel {
  background: red;
  color: white;
}
.button:disabled {
  opacity: 0.65;
  background: #ccc !important;
  color: #aaa;
  cursor: not-allowed;
}
.button:disabled:hover {
  border-color: #ccc;
}
</style>
