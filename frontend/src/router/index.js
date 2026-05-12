import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '首页', icon: 'HomeFilled' }
      },
      {
        path: 'seals',
        name: 'Seals',
        component: () => import('../views/seals/SealList.vue'),
        meta: { title: '印章管理', icon: 'Stamp' }
      },
      {
        path: 'licenses',
        name: 'Licenses',
        component: () => import('../views/licenses/LicenseList.vue'),
        meta: { title: '证照管理', icon: 'Document' }
      },
      {
        path: 'applications',
        name: 'Applications',
        component: () => import('../views/applications/ApplicationList.vue'),
        meta: { title: '用印申请', icon: 'EditPen' }
      },
      {
        path: 'approvals',
        name: 'Approvals',
        component: () => import('../views/applications/ApprovalList.vue'),
        meta: { title: '审批管理', icon: 'Finished' }
      },
      {
        path: 'seal-borrows',
        name: 'SealBorrows',
        component: () => import('../views/borrows/SealBorrowList.vue'),
        meta: { title: '印章借还', icon: 'TakeawayBox' }
      },
      {
        path: 'license-borrows',
        name: 'LicenseBorrows',
        component: () => import('../views/borrows/LicenseBorrowList.vue'),
        meta: { title: '证照借还', icon: 'FolderOpened' }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('../views/users/UserList.vue'),
        meta: { title: '用户管理', icon: 'User' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  if (to.meta.requiresAuth !== false && !userStore.token) {
    next('/login')
  } else if (to.path === '/login' && userStore.token) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
