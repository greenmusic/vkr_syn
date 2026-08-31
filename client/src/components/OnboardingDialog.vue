<template>
  <v-dialog
    :model-value="open"
    max-width="560"
    persistent
    scrim="rgba(31, 46, 67, 0.45)"
    @update:model-value="$emit('update:open', $event)"
  >
    <v-card class="onboarding-card" elevation="0">
      <div class="onboarding-hero" :class="`onboarding-hero-${step}`">
        <button type="button" class="onboarding-skip" @click="finish('skip')">Пропустить</button>
        <div class="onboarding-orb onboarding-orb-a"></div>
        <div class="onboarding-orb onboarding-orb-b"></div>
        <div class="onboarding-visual">
          <template v-if="step === 0">
            <div class="onboarding-badge">
              <v-icon icon="mdi-hand-wave-outline" size="40" />
            </div>
          </template>
          <template v-else-if="step === 1">
            <div class="mini-board" aria-hidden="true">
              <div v-for="column in miniColumns" :key="column.title" class="mini-column">
                <span>{{ column.title }}</span>
                <i v-for="n in column.cards" :key="n"></i>
              </div>
            </div>
          </template>
          <template v-else-if="step === 2">
            <div class="mini-task" aria-hidden="true">
              <span class="mini-task-label">Дизайн</span>
              <strong>Сверстать карточку</strong>
              <div class="mini-task-meta">
                <span>Высокий</span>
                <span>2/4</span>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="mini-people" aria-hidden="true">
              <span v-for="letter in ['А', 'М', 'К']" :key="letter">{{ letter }}</span>
            </div>
          </template>
        </div>
      </div>

      <v-card-text class="onboarding-body">
        <p class="onboarding-kicker">{{ step + 1 }} / {{ steps.length }}</p>
        <h2>{{ current.title }}</h2>
        <p class="onboarding-lead">{{ current.text }}</p>
        <ul class="onboarding-points">
          <li v-for="point in current.points" :key="point">{{ point }}</li>
        </ul>
      </v-card-text>

      <div class="onboarding-dots" aria-hidden="true">
        <button
          v-for="(_, index) in steps"
          :key="index"
          type="button"
          class="onboarding-dot"
          :class="{ 'onboarding-dot-active': index === step }"
          :aria-label="`Шаг ${index + 1}`"
          @click="step = index"
        />
      </div>

      <v-card-actions class="onboarding-actions">
        <v-btn v-if="step > 0" variant="text" @click="step -= 1">Назад</v-btn>
        <v-spacer />
        <v-btn v-if="step < steps.length - 1" color="primary" @click="step += 1">Далее</v-btn>
        <template v-else>
          <v-btn variant="text" @click="finish('done')">Понятно</v-btn>
          <v-btn color="primary" @click="finish('create')">Создать доску</v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  username: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'create', 'complete'])

const step = ref(0)

const steps = computed(() => {
  const name = props.username?.trim() || 'коллега'
  return [
    {
      title: `Добро пожаловать, ${name}`,
      text: 'Это канбан для проектов: доски, этапы и задачи в одном месте.',
      points: [
        'Свои доски — только у вас, пока не пригласите команду',
        'Публичные доски видны всем, кто вошёл в систему',
      ],
    },
    {
      title: 'Доска — это проект',
      text: 'Колонки — этапы работы. Карточки можно перетаскивать между ними.',
      points: [
        'Стартовые этапы: Сделать, В процессе, Выполнено',
        'Этапы можно переименовать, добавить и поменять местами',
      ],
    },
    {
      title: 'Задача знает всё важное',
      text: 'В карточке — описание, срок, приоритет, метки, чек-лист и ссылка на Git.',
      points: [
        'Назначьте участников — они увидят задачу в «Мои задачи»',
        'Жёлтая подсветка на доске помогает найти задачу из списка',
      ],
    },
    {
      title: 'Работайте вместе',
      text: 'В настройках доски выдайте доступ: просмотр или редактирование.',
      points: [
        'Автор меняет название, сроки, фон и состав команды',
        'Редактор ведёт этапы и задачи, зритель только смотрит',
      ],
    },
  ]
})

const current = computed(() => steps.value[step.value])

const miniColumns = [
  { title: 'Сделать', cards: 2 },
  { title: 'В работе', cards: 1 },
  { title: 'Готово', cards: 2 },
]

watch(
  () => props.open,
  (open) => {
    if (open) step.value = 0
  },
)

const finish = (action) => {
  emit('complete', action)
  emit('update:open', false)
  if (action === 'create') emit('create')
}
</script>

<style scoped>
.onboarding-card {
  overflow: hidden;
  border-radius: 16px;
  background: var(--app-surface);
}

.onboarding-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 168px;
  overflow: hidden;
  background: linear-gradient(135deg, var(--banner-bg), var(--accent1));
}

.onboarding-hero-1 {
  background: linear-gradient(135deg, #2d9bff, var(--banner-bg));
}

.onboarding-hero-2 {
  background: linear-gradient(135deg, var(--banner-bg), #5bcfb0);
}

.onboarding-hero-3 {
  background: linear-gradient(135deg, #1f2e43, var(--accent1));
}

.onboarding-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(2px);
  opacity: 0.35;
}

.onboarding-orb-a {
  top: -40px;
  left: -20px;
  width: 140px;
  height: 140px;
  background: var(--yellow-accent);
}

.onboarding-orb-b {
  right: -30px;
  bottom: -50px;
  width: 160px;
  height: 160px;
  background: var(--accent3);
}

.onboarding-skip {
  position: absolute;
  z-index: 2;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  color: var(--white-banner);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

.onboarding-visual {
  position: relative;
  z-index: 1;
}

.onboarding-badge {
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.2);
  color: var(--white-banner);
  box-shadow: 0 12px 32px rgba(3, 11, 58, 0.2);
}

.mini-board {
  display: flex;
  gap: 8px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.16);
}

.mini-column {
  display: grid;
  gap: 6px;
  width: 72px;
}

.mini-column span {
  color: var(--white-banner);
  font-size: 10px;
  font-weight: 700;
}

.mini-column i {
  display: block;
  height: 18px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.85);
}

.mini-column i:nth-child(odd) {
  width: 100%;
}

.mini-column i:nth-child(even) {
  width: 72%;
}

.mini-task {
  display: grid;
  gap: 6px;
  width: 220px;
  padding: 12px;
  border-radius: 12px;
  background: var(--app-surface);
  box-shadow: 0 14px 30px rgba(3, 11, 58, 0.2);
}

.mini-task-label {
  justify-self: start;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--accent1);
  color: var(--white-banner);
  font-size: 10px;
  font-weight: 700;
}

.mini-task strong {
  color: var(--app-heading);
  font-size: 14px;
}

.mini-task-meta {
  display: flex;
  gap: 8px;
  color: var(--app-muted);
  font-size: 11px;
  font-weight: 700;
}

.mini-people {
  display: flex;
}

.mini-people span {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-left: -8px;
  border: 3px solid rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  background: var(--accent5);
  color: var(--banner-bg);
  font-size: 16px;
  font-weight: 800;
}

.mini-people span:first-child {
  margin-left: 0;
  background: var(--yellow-accent);
  color: var(--static2);
}

.onboarding-body {
  display: grid;
  gap: 8px;
  padding: 20px 24px 8px;
}

.onboarding-kicker {
  color: var(--accent1);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.onboarding-body h2 {
  font-size: 20px;
}

.onboarding-lead {
  color: var(--app-text);
  font-size: 14px;
  line-height: 1.45;
}

.onboarding-points {
  display: grid;
  gap: 6px;
  margin: 4px 0 0;
  padding-left: 18px;
  color: var(--app-muted);
  font-size: 13px;
}

.onboarding-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: 8px 0 4px;
}

.onboarding-dot {
  width: 8px;
  height: 8px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--secondary1);
  cursor: pointer;
}

.onboarding-dot-active {
  width: 22px;
  background: var(--accent1);
}

.onboarding-actions {
  padding: 8px 16px 16px;
}
</style>
