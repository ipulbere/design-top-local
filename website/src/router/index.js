import { createRouter, createWebHistory } from 'vue-router'
import InputView from '../views/InputView.vue'
import PreviewView from '../views/PreviewView.vue'
import PaymentView from '../views/PaymentView.vue'
import SuccessView from '../views/SuccessView.vue'
import LanderView from '../views/LanderView.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: InputView
        },
        {
            path: '/preview',
            name: 'preview',
            component: PreviewView
        },
        {
            path: '/site/:id',
            name: 'site-view',
            component: PreviewView
        },
        {
            path: '/lander',
            name: 'lander',
            component: LanderView
        },
        {
            path: '/pay',
            name: 'pay',
            component: PaymentView
        },
        {
            path: '/success',
            name: 'success',
            component: SuccessView
        }
    ]
})

export default router
