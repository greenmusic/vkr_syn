<template>
  <v-dialog :model-value="open" max-width="420" @update:model-value="$emit('update:open', $event)">
    <v-card>
      <v-card-title class="app-dialog-title">
        {{ title }}
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          aria-label="Закрыть"
          @click="$emit('update:open', false)"
        />
      </v-card-title>
      <v-card-text>{{ text }}</v-card-text>
      <v-card-actions class="app-dialog-actions">
        <v-btn color="error" variant="text" :loading="loading" @click="$emit('confirm')">
          {{ confirmLabel }}
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:open', false)">Отмена</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  text: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Удалить' },
  loading: { type: Boolean, default: false },
})

defineEmits(['update:open', 'confirm'])
</script>
