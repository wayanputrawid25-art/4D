<template>
    <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <!-- Hero Section -->
        <div class="relative overflow-hidden">
            <!-- Background Effects -->
            <div class="absolute inset-0">
                <div class="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl"></div>
                <div class="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
            </div>

            <!-- Navigation -->
            <nav class="relative z-10 px-6 py-4">
                <div class="max-w-7xl mx-auto flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        <svg class="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span class="text-xl font-bold">4D Analyzer</span>
                    </div>
                    <button 
                        @click="toggleDarkMode"
                        class="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                    >
                        <svg v-if="isDark" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
                        </svg>
                        <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                        </svg>
                    </button>
                </div>
            </nav>

            <!-- Hero Content -->
            <div class="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
                <div class="text-center">
                    <h1 class="text-5xl md:text-7xl font-bold mb-6">
                        <span class="bg-gradient-to-r from-primary-400 via-primary-300 to-purple-400 bg-clip-text text-transparent">
                            Analisa Pola Historis 4D
                        </span>
                    </h1>
                    <p class="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
                        Analisa statistik AS, KOP, KEPALA, dan EKOR berdasarkan data historis.
                        Visualisasi interaktif dan prediksi pola untuk keputusan yang lebih baik.
                    </p>

                    <!-- Action Buttons -->
                    <div class="flex flex-col sm:flex-row gap-4 justify-center mb-20">
                        <button 
                            @click="$router.push('/app')"
                            class="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Mulai Analisa
                        </button>
                        <button 
                            @click="$router.push('/app/ocr')"
                            class="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 flex items-center justify-center gap-2"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Upload Gambar
                        </button>
                    </div>

                    <!-- Stats Cards -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                        <div class="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 hover:border-primary-500/50 transition-colors">
                            <div class="text-4xl font-bold text-primary-400 mb-2">{{ stats.totalData }}</div>
                            <div class="text-gray-400">Total Data</div>
                        </div>
                        <div class="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 hover:border-orange-500/50 transition-colors">
                            <div class="text-4xl font-bold text-orange-400 mb-2">{{ stats.hottestDigit }}</div>
                            <div class="text-gray-400">Digit Terbanyak</div>
                        </div>
                        <div class="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 hover:border-cyan-500/50 transition-colors">
                            <div class="text-4xl font-bold text-cyan-400 mb-2">{{ stats.coldestDigit }}</div>
                            <div class="text-gray-400">Digit Terjarang</div>
                        </div>
                        <div class="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 hover:border-green-500/50 transition-colors">
                            <div class="text-4xl font-bold text-green-400 mb-2">{{ stats.avgChange }}%</div>
                            <div class="text-gray-400">Rata-rata Perubahan</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Features Section -->
        <div class="relative z-10 bg-gray-900/50 backdrop-blur-sm py-20">
            <div class="max-w-7xl mx-auto px-6">
                <h2 class="text-3xl md:text-4xl font-bold text-center mb-16">
                    Fitur <span class="text-primary-400">Unggulan</span>
                </h2>
                
                <div class="grid md:grid-cols-3 gap-8">
                    <!-- Feature 1 -->
                    <div class="bg-gray-800/30 rounded-2xl p-8 border border-gray-700 hover:border-primary-500/50 transition-all duration-300 hover:-translate-y-2">
                        <div class="w-14 h-14 bg-primary-600/20 rounded-xl flex items-center justify-center mb-6">
                            <svg class="w-7 h-7 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <h3 class="text-xl font-semibold mb-4">Upload Data</h3>
                        <p class="text-gray-400">Upload data dalam format CSV, Excel, atau gambar dengan dukungan OCR.</p>
                    </div>

                    <!-- Feature 2 -->
                    <div class="bg-gray-800/30 rounded-2xl p-8 border border-gray-700 hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-2">
                        <div class="w-14 h-14 bg-purple-600/20 rounded-xl flex items-center justify-center mb-6">
                            <svg class="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h3 class="text-xl font-semibold mb-4">Analisa Statistik</h3>
                        <p class="text-gray-400">Hitung frekuensi, hot/cold digits, dan pola perubahan antar periode.</p>
                    </div>

                    <!-- Feature 3 -->
                    <div class="bg-gray-800/30 rounded-2xl p-8 border border-gray-700 hover:border-green-500/50 transition-all duration-300 hover:-translate-y-2">
                        <div class="w-14 h-14 bg-green-600/20 rounded-xl flex items-center justify-center mb-6">
                            <svg class="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 class="text-xl font-semibold mb-4">Export Data</h3>
                        <p class="text-gray-400">Ekspor hasil analisa ke Excel, CSV, atau PDF untuk laporan lebih lanjut.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <footer class="relative z-10 py-8 border-t border-gray-800">
            <div class="max-w-7xl mx-auto px-6 text-center text-gray-500">
                <p>© 2024 4D Historical Pattern Analyzer. Built with Laravel & Vue.js</p>
            </div>
        </footer>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const isDark = ref(true)

const stats = ref({
    totalData: 0,
    hottestDigit: '-',
    coldestDigit: '-',
    avgChange: 0
})

const toggleDarkMode = () => {
    isDark.value = !isDark.value
    document.documentElement.classList.toggle('dark')
    localStorage.setItem('darkMode', isDark.value)
}

const fetchStats = async () => {
    try {
        const response = await axios.get('/api/dashboard')
        if (response.data) {
            stats.value = {
                totalData: response.data.total_results || 0,
                hottestDigit: response.data.hottest_digit || '-',
                coldestDigit: response.data.coldest_digit || '-',
                avgChange: response.data.avg_change || 0
            }
        }
    } catch (error) {
        console.log('API not available yet, using default stats')
    }
}

onMounted(() => {
    fetchStats()
})
</script>
