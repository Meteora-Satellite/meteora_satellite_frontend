<script setup lang="ts">
import { PATTERN_BACKGROUND_DIRECTION, PATTERN_BACKGROUND_SPEED, PATTERN_BACKGROUND_VARIANT } from './components/ui/pattern-background';
import PatternBackground from './components/ui/pattern-background/PatternBackground.vue';

import { Toaster } from '@/components/ui/sonner';

import 'vue-sonner/style.css';
</script>

<template>
  <PatternBackground
    :direction="PATTERN_BACKGROUND_DIRECTION.Bottom"
    :variant="PATTERN_BACKGROUND_VARIANT.Grid"
    class="h-full w-full"
    :speed="PATTERN_BACKGROUND_SPEED.Slow"
    animate
  >
    <RouterView />
    <Toaster />
  </PatternBackground>
</template>
