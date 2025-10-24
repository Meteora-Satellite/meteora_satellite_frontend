<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core';
import { Motion } from 'motion-v';
import { ref, computed, watch, type HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';


const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes['class'];
    text: string;
    duration?: number;
    animateOnLoad: boolean;
  }>(),
  {
    duration: 800,
  },
);

const alphabets = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const displayText = ref(props.text.split(''));
const iterations = ref(0);

function getRandomLetter(): string {
  return alphabets[Math.floor(Math.random() * alphabets.length)] ?? 'A';
}
function triggerAnimation() {
  iterations.value = 0;
  startAnimation();
}

const { pause, resume } = useIntervalFn(
  () => {
    if (iterations.value < props.text.length) {
      displayText.value = displayText.value.map((l, i) => {
        if (l === ' ') return l;
        if (i <= iterations.value) {
          return props.text[i] ?? getRandomLetter();
        }
        return getRandomLetter();
      });
      iterations.value += 0.1;
    } else {
      pause();
    }
  },
  computed(() => props.duration / (props.text.length * 10)),
);

function startAnimation() {
  pause();
  resume();
}

watch(
  () => props.text,
  (newText) => {
    displayText.value = newText.split('');
    triggerAnimation();
  },
);

if (props.animateOnLoad) {
  triggerAnimation();
}
</script>

<template>
  <div
    :class="cn('flex scale-100 cursor-default overflow-hidden py-2', $props.class)"
    @mouseenter="triggerAnimation"
  >
    <div class="flex">
      <Motion
        v-for="(letter, i) in displayText"
        :key="i"
        as="span"
        :class="cn(letter === ' ' ? 'w-3' : '', $props.class)"
        class="inline-block font-mono"
        :initial="{ opacity: 0, y: -10 }"
        :animate="{ opacity: 1, y: 0 }"
        :delay="i * (duration / (text.length * 10))"
      >
        {{ letter.toUpperCase() }}
      </Motion>
    </div>
  </div>
</template>
