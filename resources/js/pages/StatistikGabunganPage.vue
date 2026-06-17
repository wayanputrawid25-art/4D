<template>
    <div class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Statistik Gabungan</h1>
            <p class="text-gray-500 dark:text-gray-400">Analisis statistik semua posisi digit secara bersamaan</p>
        </div>

        <!-- Combined Stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="stat-card">
                <div class="stat-value">{{ combinedStats.total }}</div>
                <div class="stat-label">Total Data</div>
            </div>
            <div class="stat-card">
                <div class="stat-value text-orange-500">{{ combinedStats.hottestOverall }}</div>
                <div class="stat-label">Digit Terpopuler</div>
            </div>
            <div class="stat-card">
                <div class="stat-value text-cyan-500">{{ combinedStats.mostStable }}</div>
                <div class="stat-label">Posisi Paling Stabil</div>
            </div>
            <div class="stat-card">
                <div class="stat-value text-purple-500">{{ combinedStats.mostVolatile }}</div>
                <div class="stat-label">Posisi Paling Berubah</div>
            </div>
        </div>

        <!-- Charts Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Comparison Bar Chart -->
            <div class="card">
                <h3 class="text-lg font-semibold mb-4">Perbandingan Frekuensi per Posisi</h3>
                <div class="chart-container">
                    <Bar v-if="comparisonData" :data="comparisonData" :options="comparisonOptions" />
                    <div v-else class="w-full h-full skeleton"></div>
                </div>
            </div>

            <!-- Radar Chart -->
            <div class="card">
                <h3 class="text-lg font-semibold mb-4">Profil Posisi</h3>
                <div class="chart-container">
                    <Radar v-if="radarData" :data="radarData" :options="radarOptions" />
                    <div v-else class="w-full h-full skeleton"></div>
                </div>
            </div>
        </div>

        <!-- Heatmap Grid -->
        <div class="card">
            <h3 class="text-lg font-semibold mb-4">Heatmap Gabungan</h3>
            <div class="overflow-x-auto">
                <div class="min-w-[600px]">
                    <table class="w-full">
                        <thead>
                            <tr>
                                <th class="p-2 text-center text-sm font-medium">Digit</th>
                                <th v-for="pos in positions" :key="pos" class="p-2 text-center text-sm font-medium">{{ pos.toUpperCase() }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="digit in 10" :key="digit - 1">
                                <td class="p-2 text-center font-bold">{{ digit - 1 }}</td>
                                <td 
                                    v-for="pos in positions" 
                                    :key="pos"
                                    class="p-2 text-center"
                                >
                                    <div 
                                        class="inline-block w-10 h-10 rounded flex items-center justify-center text-sm font-bold"
                                        :style="{
                                            backgroundColor: getHeatmapColor(heatmapData[pos]?.[digit - 1] || 0, heatmapData[pos]?.max || 1),
                                            color: getHeatmapColor(heatmapData[pos]?.[digit - 1] || 0, heatmapData[pos]?.max || 1) === '#1f2937' ? 'white' : 'black'
                                        }"
                                    >
                                        {{ heatmapData[pos]?.[digit - 1] || 0 }}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Combined Change Analysis -->
        <div class="card">
            <h3 class="text-lg font-semibold mb-4">Analisis Perubahan Kombinasi</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b border-gray-200 dark:border-gray-700">
                            <th class="text-left py-3 px-4">Posisi</th>
                            <th class="text-center py-3 px-2">AS</th>
                            <th class="text-center py-3 px-2">KOP</th>
                            <th class="text-center py-3 px-2">KEPALA</th>
                            <th class="text-center py-3 px-2">EKOR</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="border-b border-gray-100 dark:border-gray-700/50">
                            <td class="py-3 px-4 font-medium">Hot Digit</td>
                            <td class="text-center py-3 px-2 text-orange-500 font-bold">{{ positionStats.as?.hottest || '-' }}</td>
                            <td class="text-center py-3 px-2 text-orange-500 font-bold">{{ positionStats.kop?.hottest || '-' }}</td>
                            <td class="text-center py-3 px-2 text-orange-500 font-bold">{{ positionStats.kepala?.hottest || '-' }}</td>
                            <td class="text-center py-3 px-2 text-orange-500 font-bold">{{ positionStats.ekor?.hottest || '-' }}</td>
                        </tr>
                        <tr class="border-b border-gray-100 dark:border-gray-700/50">
                            <td class="py-3 px-4 font-medium">Cold Digit</td>
                            <td class="text-center py-3 px-2 text-cyan-500 font-bold">{{ positionStats.as?.coldest || '-' }}</td>
                            <td class="text-center py-3 px-2 text-cyan-500 font-bold">{{ positionStats.kop?.coldest || '-' }}</td>
                            <td class="text-center py-3 px-2 text-cyan-500 font-bold">{{ positionStats.kepala?.coldest || '-' }}</td>
                            <td class="text-center py-3 px-2 text-cyan-500 font-bold">{{ positionStats.ekor?.coldest || '-' }}</td>
                        </tr>
                        <tr class="border-b border-gray-100 dark:border-gray-700/50">
                            <td class="py-3 px-4 font-medium">Rata-rata Perubahan</td>
                            <td class="text-center py-3 px-2">{{ positionStats.as?.avgChange || 0 }}</td>
                            <td class="text-center py-3 px-2">{{ positionStats.kop?.avgChange || 0 }}</td>
                            <td class="text-center py-3 px-2">{{ positionStats.kepala?.avgChange || 0 }}</td>
                            <td class="text-center py-3 px-2">{{ positionStats.ekor?.avgChange || 0 }}</td>
                        </tr>
                        <tr>
                            <td class="py-3 px-4 font-medium">Total + (Naik)</td>
                            <td class="text-center py-3 px-2 text-green-500">{{ positionStats.as?.totalPlus || 0 }}</td>
                            <td class="text-center py-3 px-2 text-green-500">{{ positionStats.kop?.totalPlus || 0 }}</td>
                            <td class="text-center py-3 px-2 text-green-500">{{ positionStats.kepala?.totalPlus || 0 }}</td>
                            <td class="text-center py-3 px-2 text-green-500">{{ positionStats.ekor?.totalPlus || 0 }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { Bar, Radar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, RadialLinearScale, PointElement, LineElement, Filler, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, RadialLinearScale, PointElement, LineElement, Filler, Title, Tooltip, Legend)

const positions = ['as', 'kop', 'kepala', 'ekor']

const combinedStats = ref({
    total: 0,
    hottestOverall: '-',
    mostStable: '-',
    mostVolatile: '-'
})

const heatmapData = ref({})
const positionStats = ref({})

const comparisonData = ref(null)
const radarData = ref(null)

const comparisonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
        y: { beginAtZero: true }
    }
}

const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } }
}

const fetchData = async () => {
    try {
        const response = await axios.get('/api/heatmap')
        const data = response.data
        
        combinedStats.value = {
            total: data.total || 0,
            hottestOverall: data.hottest_overall || '-',
            mostStable: data.most_stable || '-',
            mostVolatile: data.most_volatile || '-'
        }
        
        heatmapData.value = data.heatmap || {}
        positionStats.value = data.position_stats || {}
        
        // Build comparison chart
        const datasets = positions.map((pos, idx) => {
            const frequencies = heatmapData.value[pos] || Array(10).fill(0)
            return {
                label: pos.toUpperCase(),
                data: frequencies,
                backgroundColor: ['rgba(249, 115, 22, 0.5)', 'rgba(6, 182, 212, 0.5)', 'rgba(34, 197, 94, 0.5)', 'rgba(168, 85, 247, 0.5)'][idx],
                borderWidth: 0
            }
        })
        
        comparisonData.value = {
            labels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
            datasets
        }
        
        // Build radar chart
        const avgFreqs = positions.map(pos => {
            const freqs = heatmapData.value[pos] || Array(10).fill(0)
            return freqs.reduce((a, b) => a + b, 0) / 10
        })
        
        radarData.value = {
            labels: positions.map(p => p.toUpperCase()),
            datasets: [{
                label: 'Rata-rata Frekuensi',
                data: avgFreqs,
                borderColor: 'rgb(14, 165, 233)',
                backgroundColor: 'rgba(14, 165, 233, 0.2)',
                pointBackgroundColor: 'rgb(14, 165, 233)'
            }]
        }
    } catch (error) {
        console.error('Error fetching combined stats:', error)
    }
}

const getHeatmapColor = (value, max) => {
    if (max === 0) return '#6b7280'
    const intensity = value / max
    if (intensity > 0.8) return '#f97316'
    if (intensity > 0.6) return '#fb923c'
    if (intensity > 0.4) return '#fdba74'
    if (intensity > 0.2) return '#fed7aa'
    return '#1f2937'
}

onMounted(() => {
    fetchData()
})
</script>
