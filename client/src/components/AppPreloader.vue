<template>
  <v-overlay
    :model-value="open"
    class="align-center justify-center"
    persistent
    scrim="white"
    opacity="0.72"
    z-index="2400"
  >
    <div class="app-preloader-box">
      <v-progress-circular indeterminate color="primary" size="40" width="3" />
      <p v-if="label" class="app-preloader-label">{{ label }}</p>
    </div>
  </v-overlay>
</template>

<script setup>
defineProps({
  open: { type: Boolean, default: false },
  label: { type: String, default: 'Загрузка...' },
})
</script>

<style scoped>
.app-preloader-box {
  display: grid;
  justify-items: center;
  gap: 10px;
}

.app-preloader-label {
  margin: 0;
  color: var(--app-heading);
  font-size: 13px;
  font-weight: 600;
}
</style>
