import { createRouter, createWebHistory } from 'vue-router'

const routes = [
    {
        path: '/',
        name: 'landing',
        component: () => import('../pages/LandingPage.vue')
    },
    {
        path: '/app',
        component: () => import('../layouts/AppLayout.vue'),
        children: [
            {
                path: '',
                name: 'dashboard',
                component: () => import('../pages/DashboardPage.vue')
            },
            {
                path: 'upload',
                name: 'upload',
                component: () => import('../pages/UploadPage.vue')
            },
            {
                path: 'ocr',
                name: 'ocr',
                component: () => import('../pages/OcrPage.vue')
            },
            {
                path: 'analisa/as',
                name: 'analisa-as',
                component: () => import('../pages/AnalisaAsPage.vue')
            },
            {
                path: 'analisa/kop',
                name: 'analisa-kop',
                component: () => import('../pages/AnalisaKopPage.vue')
            },
            {
                path: 'analisa/kepala',
                name: 'analisa-kepala',
                component: () => import('../pages/AnalisaKepalaPage.vue')
            },
            {
                path: 'analisa/ekor',
                name: 'analisa-ekor',
                component: () => import('../pages/AnalisaEkorPage.vue')
            },
            {
                path: 'statistik-gabungan',
                name: 'statistik-gabungan',
                component: () => import('../pages/StatistikGabunganPage.vue')
            },
            {
                path: 'export',
                name: 'export',
                component: () => import('../pages/ExportPage.vue')
            },
            {
                path: 'pengaturan',
                name: 'pengaturan',
                component: () => import('../pages/PengaturanPage.vue')
            }
        ]
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
