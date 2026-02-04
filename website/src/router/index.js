import { createRouter, createWebHistory } from 'vue-router'
import InputView from '../views/InputView.vue'
import PreviewView from '../views/PreviewView.vue'
import PaymentView from '../views/PaymentView.vue'
import SuccessView from '../views/SuccessView.vue'
import LanderView from '../views/LanderView.vue'
import ImageGeneratorView from '../views/ImageGeneratorView.vue'
import TemplateGeneratorView from '../views/TemplateGeneratorView.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/image-generator',
            name: 'image-generator',
            component: ImageGeneratorView
        },
        {
            path: '/template-generator',
            name: 'template-generator',
            component: TemplateGeneratorView
        },
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
