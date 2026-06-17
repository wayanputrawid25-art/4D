<template>
    <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                <p class="text-gray-500 dark:text-gray-400">Ringkasan analisa pola historis 4D</p>
            </div>
            <div class="mt-4 md:mt-0 flex gap-2">
                <select v-model="filterPeriod" class="input-field w-auto">
                    <option value="day">Hari Ini</option>
                    <option value="week">Minggu Ini</option>
                    <option value="month">Bulan Ini</option>
                    <option value="year">Tahun Ini</option>
                    <option value="all">Semua</option>
                </select>
                <button @click="refreshData" class="btn-secondary">
                    Refresh
                </button>
            </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div class="stat-card">
                <div class="stat-value">{{ dashboardData.total_results || 0 }}</div>
                <div class="stat-label">Total Data</div>
            </div>
            <div class="stat-card">
                <div class="stat-value text-orange-500">{{ dashboardData.hottest_digit || '-' }}</div>
                <div class="stat-label">Digit Terpanas</div>
            </div>
            <div class="stat-card">
                <div class="stat-value text-cyan-500">{{ dashboardData.coldest_digit || '-' }}</div>
                <div class="stat-label">Digit Terdingin</div>
            </div>
            <div class="stat-card">
                <div class="stat-value text-green-500">{{ dashboardData.biggest_change || '-' }}</div>
                <div class="stat-label">Perubahan Terbanyak</div>
            </div>
            <div class="stat-card">
                <div class="stat-value text-purple-500">{{ dashboardData.smallest_change || '-' }}</div>
                <div class="stat-label">Perubahan Terkecil</div>
            </div>
        </div>

        <!-- Charts Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Frequency Chart -->
            <div class="card">
                <h3 class="text-lg font-semibold mb-4">Frekuensi Digit 0-9</h3>
                <div class="chart-container">
                    <Bar v-if="!loading && frequencyChartData" :data="frequencyChartData" :options="barOptions" />
                    <div v-else class="w-full h-full skeleton"></div>
                </div>
            </div>

            <!-- Hot vs Cold -->
            <div class="card">
                <h3 class="text-lg font-semibold mb-4">Hot vs Cold Digits</h3>
                <div class="chart-container">
                    <Doughnut v-if="!loading && hotColdChartData" :data="hotColdChartData" :options="doughnutOptions" />
                    <div v-else class="w-full h-full skeleton"></div>
                </div>
            </div>

            <!-- Trend Line Chart -->
            <div class="card lg:col-span-2">
                <h3 class="text-lg font-semibold mb-4">Tren Perubahan Digit</h3>
                <div class="chart-container">
                    <Line v-if="!loading && trendChartData" :data="trendChartData" :options="lineOptions" />
                    <div v-else class="w-full h-full skeleton"></div>
                </div>
            </div>
        </div>

        <!-- Recent Data -->
        <div class="card">
            <h3 class="text-lg font-semibold mb-4">Data Terbaru</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b border-gray-200 dark:border-gray-700">
                            <th class="text-left py-3 px-4">4D Number</th>
                            <th class="text-center py-3 px-2">AS</th>
                            <th class="text-center py-3 px-2">KOP</th>
                            <th class="text-center py-3 px-2">KEPALA</th>
                            <th class="text-center py-3 px-2">EKOR</th>
                            <th class="text-left py-3 px-4">Tanggal</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="result in recentData" :key="result.id" class="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td class="py-3 px-4 font-mono font-bold">{{ result.result_4d }}</td>
                            <td class="text-center py-3 px-2">{{ result.as_digit }}</td>
                            <td class="text-center py-3 px-2">{{ result.kop_digit }}</td>
                            <td class="text-center py-3 px-2">{{ result.kepala_digit }}</td>
                            <td class="text-center py-3 px-2">{{ result.ekor_digit }}</td>
                            <td class="py-3 px-4 text-gray-500">{{ formatDate(result.draw_date) }}</td>
                        </tr>
                        <tr v-if="recentData.length === 0">
                            <td colspan="6" class="py-8 text-center text-gray-500">Tidak ada data</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import axios from 'axios'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler)

const filterPeriod = ref('all')
const dashboardData = ref({})
const recentData = ref([])

const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false }
    },
    scales: {
        y: { beginAtZero: true }
    }
}

const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { position: 'right' }
    }
}

const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false }
    },
    scales: {
        y: { beginAtZero: true }
    }
}

const frequencyChartData = ref(null)
const hotColdChartData = ref(null)
const trendChartData = ref(null)
const loading = ref(true)

const fetchDashboard = async () => {
    loading.value = true
    try {
        const response = await axios.get(`/api/dashboard?period=${filterPeriod.value}`)
        dashboardData.value = response.data
        
        // Fetch recent data
        const recentResponse = await axios.get('/api/results?limit=10&sort=desc')
        recentData.value = recentResponse.data.data || []
        
        // Fetch frequency data
        const freqResponse = await axios.get('/api/frequency')
        if (freqResponse.data.frequencies) {
            frequencyChartData.value = {
                labels: Object.keys(freqResponse.data.frequencies),
                datasets: [{
                    label: 'Frekuensi',
                    data: Object.values(freqResponse.data.frequencies),
                    backgroundColor: 'rgba(14, 165, 233, 0.5)',
                    borderColor: 'rgb(14, 165, 233)',
                    borderWidth: 1
                }]
            }
        }
        
        // Fetch hot cold data
        const hotColdResponse = await axios.get('/api/hot-cold')
        if (hotColdResponse.data.hot_digits && hotColdResponse.data.cold_digits) {
            hotColdChartData.value = {
                labels: ['Hot Digits', 'Cold Digits'],
                datasets: [{
                    data: [hotColdResponse.data.hot_digits.length, hotColdResponse.data.cold_digits.length],
                    backgroundColor: ['rgba(249, 115, 22, 0.8)', 'rgba(6, 182, 212, 0.8)'],
                    borderWidth: 0
                }]
            }
        }
        
        // Fetch trend data
        const trendResponse = await axios.get('/api/changes')
        if (trendResponse.data.position_changes) {
            const positions = ['AS', 'KOP', 'KEPALA', 'EKOR']
            const datasets = positions.map((pos, idx) => ({
                label: pos,
                data: trendResponse.data.position_changes[pos] || [],
                borderColor: ['rgb(249, 115, 22)', 'rgb(6, 182, 212)', 'rgb(34, 197, 94)', 'rgb(168, 85, 247)'][idx],
                tension: 0.3,
                fill: false
            }))
            trendChartData.value = {
                labels: Array.from({ length: 20 }, (_, i) => `#${i + 1}`),
                datasets
            }
        }
    } catch (error) {
        console.error('Error fetching dashboard:', error)
    } finally {
        loading.value = false
    }
}

const refreshData = () => {
    fetchDashboard()
}

const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('id-ID')
}

watch(filterPeriod, () => {
    fetchDashboard()
})

onMounted(() => {
    fetchDashboard()
})
</script>
