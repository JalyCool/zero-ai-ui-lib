import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ActivityView from '../views/ActivityView.vue'
import AddRecordSheet from '../views/AddRecordSheet.vue'
import TrendsView from '../views/TrendsView.vue'
import ComponentsView from '../views/ComponentsView.vue'
import DeviceLabView from '../views/DeviceLabView.vue'
import ProfileView from '../views/ProfileView.vue'
import MotionDemoView from '../views/MotionDemo.vue'
import EmptyRoute from './EmptyRoute'

function cardRoutes(parent, items) {
  return items.map(item => ({
    path: item.path,
    name: `${parent}-${item.name}`,
    component: EmptyRoute,
    meta: { expandKey: item.key }
  }))
}

const routes = [
  {
    path: '/home',
    name: 'home',
    component: HomeView,
    meta: { tab: 'home', title: '早上好，Alex', sub: '今天也要好好照顾自己' },
    children: cardRoutes('home', [
      { path: 'steps', name: 'steps', key: 'steps' },
      { path: 'heart', name: 'heart', key: 'heart' },
      { path: 'sleep', name: 'sleep', key: 'sleep' },
      { path: 'oxygen', name: 'oxygen', key: 'oxygen' },
      { path: 'energy', name: 'energy', key: 'energy' },
      { path: 'stand', name: 'stand', key: 'stand' },
      { path: 'breath', name: 'breath', key: 'breath' }
    ])
  },
  {
    path: '/activity',
    name: 'activity',
    component: ActivityView,
    meta: { tab: 'activity', title: '活动记录', sub: '今天也要好好照顾自己' },
    children: [
      {
        path: 'new',
        name: 'activity-new',
        component: AddRecordSheet,
        meta: { sub: '记录一次新的运动' }
      },
      {
        path: ':recordId',
        name: 'activity-record',
        component: EmptyRoute,
        meta: { expandKey: 'record' }
      }
    ]
  },
  {
    path: '/trends',
    name: 'trends',
    component: TrendsView,
    meta: { tab: 'trends', title: '健康趋势', sub: '看看这一周的变化' },
    children: cardRoutes('trends', [
      { path: 'week-steps', name: 'week-steps', key: 'weekSteps' },
      { path: 'avg-sleep', name: 'avg-sleep', key: 'avgSleep' },
      { path: 'resting-hr', name: 'resting-hr', key: 'restingHr' }
    ])
  },
  {
    path: '/components',
    name: 'components',
    component: ComponentsView,
    meta: { tab: 'components', title: '组件库', sub: '预制组件与交互状态' }
  },
  {
    path: '/agent-device',
    name: 'agent-device',
    component: DeviceLabView,
    meta: { tab: 'components', cacheKey: 'agent-device', title: '设备位置调节', sub: '调好后复制属性发回来' }
  },
  {
    path: '/profile',
    name: 'profile',
    component: ProfileView,
    meta: { tab: 'profile', title: '我的', sub: '账户与设备设置' }
  },
  {
    path: '/motion',
    name: 'motion',
    component: MotionDemoView,
    meta: { tab: 'components', title: '动效演示', sub: 'Motion-v 与项目弹簧集成' }
  },
  { path: '/', redirect: '/home' },
  { path: '/:pathMatch(.*)*', redirect: '/home' }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
