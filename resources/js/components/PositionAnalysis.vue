<template>
    <div class="space-y-6">
        <!-- Stats Cards -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div class="stat-card">
                <div class="stat-value">{{ stats.total }}</div>
                <div class="stat-label">Total Data</div>
            </div>
            <div class="stat-card">
                <div class="stat-value text-orange-500">{{ stats.hottest }}</div>
                <div class="stat-label">Digit Terpanas</div>
            </div>
            <div class="stat-card">
                <div class="stat-value text-cyan-500">{{ stats.coldest }}</div>
                <div class="stat-label">Digit Terdingin</div>
            </div>
            <div class="stat-card">
                <div class="stat-value text-green-500">{{ stats.avgChange }}</div>
                <div class="stat-label">Rata-rata Perubahan</div>
            </div>
            <div class="stat-card">
                <div class="stat-value text-purple-500">{{ stats.digitRange }}</div>
                <div class="stat-label">Range Perubahan</div>
            </div>
        </div>

        <!-- Charts -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Frequency Chart -->
            <div class="card">
                <h3 class="text-lg font-semibold mb-4">Frekuensi Digit 0-9</h3>
                <div class="chart-container">
                    <Bar v-if="frequencyData" :data="frequencyData" :options="barOptions" />
                    <div v-else class="w-full h-full skeleton"></div>
                </div>
            </div>

            <!-- Changes Distribution -->
            <div class="card">
                <h3 class="text-lg font-semibold mb-4">Distribusi Perubahan (+/-)</h3>
                <div class="chart-container">
                    <Bar v-if="changesData" :data="changesData" :options="changesOptions" />
                    <div v-else class="w-full h-full skeleton"></div>
                </div>
            </div>
        </div>

        <!-- Heatmap -->
        <div class="card">
            <h3 class="text-lg font-semibold mb-4">Heatmap Digit</h3>
            <div class="overflow-x-auto">
                <div class="grid gap-1" style="grid-template-columns: repeat(10, minmax(40px, 1fr));">
                    <div 
                        v-for="digit in 10" 
                        :key="digit - 1"
                        class="aspect-square rounded flex items-center justify-center font-bold"
                        :style="{ 
                            backgroundColor: getHeatmapColor(frequencies[digit - 1] || 0),
                            color: getHeatmapColor(frequencies[digit - 1] || 0) === '#1f2937' ? 'white' : 'black'
                        }"
                    >
                        <div>
                            <div>{{ digit - 1 }}</div>
                            <div class="text-xs">{{ frequencies[digit - 1] || 0 }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Digit Rankings Table -->
        <div class="card">
            <h3 class="text-lg font-semibold mb-4">Ranking Digit</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b border-gray-200 dark:border-gray-700">
                            <th class="text-left py-3 px-4">Rank</th>
                            <th class="text-center py-3 px-2">Digit</th>
                            <th class="text-center py-3 px-2">Frekuensi</th>
                            <th class="text-center py-3 px-2">Persentase</th>
                            <th class="text-center py-3 px-2">Tipe</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr 
                            v-for="(item, index) in rankings" 
                            :key="item.digit"
                            class="border-b border-gray-100 dark:border-gray-700/50"
                        >
                            <td class="py-3 px-4">{{ index + 1 }}</td>
                            <td class="text-center py-3 px-2 font-bold">{{ item.digit }}</td>
                            <td class="text-center py-3 px-2">{{ item.frequency }}</td>
                            <td class="text-center py-3 px-2">{{ item.percentage }}%</td>
                            <td class="text-center py-3 px-2">
                                <span :class="[
                                    'px-2 py-1 rounded-full text-xs',
                                    item.type === 'hot' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 
                                    item.type === 'cold' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' : 
                                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                ]">
                                    {{ item.type === 'hot' ? 'Hot' : item.type === 'cold' ? 'Cold' : 'Normal' }}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Change Statistics -->
        <div class="card">
            <h3 class="text-lg font-semibold mb-4">Statistik Tambah Kurang</h3>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div v-for="change in changeStats" :key="change.label" class="text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <div class="text-2xl font-bold" :class="change.color">{{ change.count }}</div>
                    <div class="text-sm text-gray-500">{{ change.label }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps({
    position: {
        type: String,
        required: true,
        validator: (value) => ['as', 'kop', 'kepala', 'ekor'].includes(value)
    }
})

const stats = ref({
    total: 0,
    hottest: '-',
    coldest: '-',
    avgChange: 0,
    digitRange: '0'
})

const frequencies = ref(Array(10).fill(0))
const rankings = ref([])
const changeStats = ref([
    { label: '+1', count: 0, color: 'text-green-500' },
    { label: '+2', count: 0, color: 'text-green-600' },
    { label: '-1', count: 0, color: 'text-red-500' },
    { label: '-2', count: 0, color: 'text-red-600' },
    { label: '0 (Sama)', count: 0, color: 'text-gray-500' },
])

const frequencyData = ref(null)
const changesData = ref(null)

const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } }
}

const changesOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } }
}

const fetchData = async () => {
    try {
        const response = await axios.get(`/api/frequency/${props.position}`)
        const data = response.data
        
        stats.value = {
            total: data.total || 0,
            hottest: data.hottest_digit || '-',
            coldest: data.coldest_digit || '-',
            avgChange: data.avg_change || 0,
            digitRange: data.digit_range || '0'
        }
        
        frequencies.value = data.frequencies || Array(10).fill(0)
        
        // Frequency chart
        frequencyData.value = {
            labels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
            datasets: [{
                label: 'Frekuensi',
                data: frequencies.value,
                backgroundColor: frequencies.value.map((_, i) => {
                    const max = Math.max(...frequencies.value)
                    const value = frequencies.value[i]
                    const intensity = max > 0 ? value / max : 0
                    return `rgba(249, 115, 22, ${0.3 + intensity * 0.7})`
                }),
                borderWidth: 0
            }]
        }
        
        // Rankings
        rankings.value = data.rankings || []
        
        // Change stats
        if (data.change_stats) {
            changeStats.value = [
                { label: '+1', count: data.change_stats.plus_1 || 0, color: 'text-green-500' },
                { label: '+2', count: data.change_stats.plus_2 || 0, color: 'text-green-600' },
                { label: '-1', count: data.change_stats.minus_1 || 0, color: 'text-red-500' },
                { label: '-2', count: data.change_stats.minus_2 || 0, color: 'text-red-600' },
                { label: '0 (Sama)', count: data.change_stats.zero || 0, color: 'text-gray-500' },
            ]
        }
        
        // Changes distribution chart
        changesData.value = {
            labels: ['-2', '-1', '0', '+1', '+2'],
            datasets: [{
                label: 'Jumlah',
                data: [
                    data.change_stats?.minus_2 || 0,
                    data.change_stats?.minus_1 || 0,
                    data.change_stats?.zero || 0,
                    data.change_stats?.plus_1 || 0,
                    data.change_stats?.plus_2 || 0
                ],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.7)',
                    'rgba(249, 115, 22, 0.7)',
                    'rgba(107, 114, 128, 0.7)',
                    'rgba(34, 197, 94, 0.7)',
                    'rgba(22, 163, 74, 0.7)'
                ],
                borderWidth: 0
            }]
        }
    } catch (error) {
        console.error('Error fetching frequency data:', error)
    }
}

const getHeatmapColor = (value) => {
    const max = Math.max(...frequencies.value)
    if (max === 0) return '#6b7280'
    const intensity = value / max
    if (intensity > 0.8) return '#f97316'
    if (intensity > 0.6) return '#fb923c'
    if (intensity > 0.4) return '#fdba74'
    if (intensity > 0.2) return '#fed7aa'
    return '#1f2937'
}

watch(() => props.position, () => {
    fetchData()
})

onMounted(() => {
    fetchData()
})
</script>
