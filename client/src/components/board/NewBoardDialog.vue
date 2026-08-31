<template>
  <v-dialog :model-value="open" max-width="460" @update:model-value="$emit('update:open', $event)">
    <v-card>
      <v-card-title class="app-dialog-title">
        Новая доска
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          aria-label="Закрыть"
          @click="$emit('update:open', false)"
        />
      </v-card-title>
      <v-card-text class="app-dialog-content">
        <v-text-field
          :model-value="name"
          placeholder="Название доски"
          label="Название доски"
          hide-details
          @update:model-value="$emit('update:name', $event)"
          @keyup.enter="$emit('create')"
        />
        <v-select
          :model-value="visibility"
          :items="visibilityOptions"
          item-title="title"
          item-value="value"
          label="Видимость"
          hide-details
          @update:model-value="$emit('update:visibility', $event)"
        />
      </v-card-text>
      <v-card-actions class="app-dialog-actions">
        <v-spacer />
        <v-btn color="primary" :loading="creating" @click="$emit('create')">Создать</v-btn>
        <v-btn variant="text" @click="$emit('update:open', false)">Закрыть</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
defineProps({
  open: { type: Boolean, default: false },
  name: { type: String, default: '' },
  visibility: { type: String, default: 'private' },
  visibilityOptions: { type: Array, default: () => [] },
  creating: { type: Boolean, default: false },
})

defineEmits(['update:open', 'update:name', 'update:visibility', 'create'])
</script>
