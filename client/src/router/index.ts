import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import api, { attachRouter } from '../api/index.js'
import { ensureSession, getCachedUser } from '../auth/session.js'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/',
      name: 'home',
      component: () => import('../views/BoardsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/about',
      redirect: '/',
    },
    {
      path: '/boards/:boardId',
      name: 'board-view',
      component: () => import('../views/BoardsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/tasks',
      name: 'my-tasks',
      component: () => import('../views/MyTasksView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

attachRouter(router)

router.beforeEach(async (to) => {
  if (to.name === 'login') {
    if (getCachedUser()) return { name: 'home' }
    return true
  }

  const user = (await ensureSession(api)) || getCachedUser()
  if (to.meta.requiresAuth && !user) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
