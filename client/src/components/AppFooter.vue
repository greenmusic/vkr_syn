<template>
  <v-footer class="app-footer" color="surface" border>
    <div class="app-footer__content">
      <span>Менеджер проектов и задач</span>
      <span>{{ new Date().getFullYear() }}</span>
    </div>
  </v-footer>
</template>

<style scoped>
.app-footer {
  min-height: 56px;
  padding: 0 24px;
  color: var(--app-muted);
  font-size: var(--text-muted);
}

.app-footer__content {
  display: flex;
  justify-content: space-between;
  width: min(100%, 1280px);
  margin: 0 auto;
}
</style>