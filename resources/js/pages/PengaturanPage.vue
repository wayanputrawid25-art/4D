<template>
    <div class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Pengaturan</h1>
            <p class="text-gray-500 dark:text-gray-400">Kelola pengaturan aplikasi</p>
        </div>

        <!-- Theme Settings -->
        <div class="card">
            <h3 class="text-lg font-semibold mb-4">Tampilan</h3>
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="font-medium">Dark Mode</p>
                        <p class="text-sm text-gray-500">Aktifkan tema gelap</p>
                    </div>
                    <button 
                        @click="toggleDarkMode"
                        :class="[
                            'relative w-14 h-7 rounded-full transition-colors',
                            settings.darkMode ? 'bg-primary-600' : 'bg-gray-300'
                        ]"
                    >
                        <span 
                            :class="[
                                'absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow',
                                settings.darkMode ? 'left-8' : 'left-1'
                            ]"
                        ></span>
                    </button>
                </div>
                
                <div class="flex items-center justify-between">
                    <div>
                        <p class="font-medium">Auto Refresh</p>
                        <p class="text-sm text-gray-500">Refresh data otomatis setiap interval</p>
                    </div>
                    <select v-model="settings.autoRefresh" class="input-field w-40">
                        <option :value="false">Nonaktif</option>
                        <option :value="30">30 detik</option>
                        <option :value="60">1 menit</option>
                        <option :value="300">5 menit</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- Analysis Settings -->
        <div class="card">
            <h3 class="text-lg font-semibold mb-4">Analisa</h3>
            <div class="space-y-4">
                <div>
                    <label class="block font-medium mb-2">Jumlah Top Digits (Hot/Cold)</label>
                    <input 
                        v-model.number="settings.topDigits" 
                        type="number" 
                        min="1" 
                        max="10"
                        class="input-field w-32"
                    />
                </div>
                
                <div>
                    <label class="block font-medium mb-2">Threshold Hot Digit (%)</label>
                    <input 
                        v-model.number="settings.hotThreshold" 
                        type="number" 
                        min="0" 
                        max="100"
                        class="input-field w-32"
                    />
                    <p class="text-sm text-gray-500 mt-1">Digit dengan frekuensi di atas threshold akan dianggap "hot"</p>
                </div>
                
                <div>
                    <label class="block font-medium mb-2">Threshold Cold Digit (%)</label>
                    <input 
                        v-model.number="settings.coldThreshold" 
                        type="number" 
                        min="0" 
                        max="100"
                        class="input-field w-32"
                    />
                    <p class="text-sm text-gray-500 mt-1">Digit dengan frekuensi di bawah threshold akan dianggap "cold"</p>
                </div>
            </div>
        </div>

        <!-- Export Settings -->
        <div class="card">
            <h3 class="text-lg font-semibold mb-4">Export Default</h3>
            <div class="space-y-4">
                <div>
                    <label class="block font-medium mb-2">Format Tanggal Default</label>
                    <select v-model="settings.defaultDateFormat" class="input-field">
                        <option value="Y-m-d">2024-01-15</option>
                        <option value="d/m/Y">15/01/2024</option>
                        <option value="m/d/Y">01/15/2024</option>
                        <option value="d-m-Y">15-01-2024</option>
                    </select>
                </div>
                
                <div>
                    <label class="block font-medium mb-2">Format Export Default</label>
                    <select v-model="settings.defaultExportFormat" class="input-field">
                        <option value="xlsx">Excel (.xlsx)</option>
                        <option value="csv">CSV (.csv)</option>
                        <option value="pdf">PDF (.pdf)</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- OCR Settings -->
        <div class="card">
            <h3 class="text-lg font-semibold mb-4">OCR</h3>
            <div class="space-y-4">
                <div>
                    <label class="block font-medium mb-2">Bahasa OCR</label>
                    <select v-model="settings.ocrLanguage" class="input-field">
                        <option value="eng">English</option>
                        <option value="ind">Indonesia</option>
                        <option value="eng+ind">English + Indonesia</option>
                        <option value="chi_sim">Chinese (Simplified)</option>
                        <option value="chi_tra">Chinese (Traditional)</option>
                    </select>
                </div>
                
                <div>
                    <label class="block font-medium mb-2">Presisi OCR</label>
                    <select v-model="settings.ocrPrecision" class="input-field">
                        <option value="high">Tinggi</option>
                        <option value="medium">Sedang</option>
                        <option value="low">Rendah</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- Data Management -->
        <div class="card">
            <h3 class="text-lg font-semibold mb-4">Manajemen Data</h3>
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="font-medium">Total Data</p>
                        <p class="text-sm text-gray-500">{{ totalData }} record</p>
                    </div>
                </div>
                
                <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button 
                        @click="clearOldData"
                        :disabled="clearing"
                        class="btn-secondary text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        {{ clearing ? 'Menghapus...' : 'Hapus Data Lama' }}
                    </button>
                    <p class="text-sm text-gray-500 mt-2">Hapus data yang lebih dari 1 tahun</p>
                </div>
                
                <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button 
                        @click="resetDatabase"
                        :disabled="resetting"
                        class="btn-secondary text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        {{ resetting ? 'Mereset...' : 'Reset Database' }}
                    </button>
                    <p class="text-sm text-gray-500 mt-2">Hapus semua data dan mulai dari awal</p>
                </div>
            </div>
        </div>

        <!-- Save Button -->
        <div class="flex justify-end">
            <button @click="saveSettings" :disabled="saving" class="btn-primary">
                {{ saving ? 'Menyimpan...' : 'Simpan Pengaturan' }}
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'

const settings = reactive({
    darkMode: false,
    autoRefresh: false,
    topDigits: 3,
    hotThreshold: 60,
    coldThreshold: 40,
    defaultDateFormat: 'Y-m-d',
    defaultExportFormat: 'xlsx',
    ocrLanguage: 'eng+ind',
    ocrPrecision: 'medium'
})

const totalData = ref(0)
const saving = ref(false)
const clearing = ref(false)
const resetting = ref(false)

const loadSettings = () => {
    const saved = localStorage.getItem('app-settings')
    if (saved) {
        Object.assign(settings, JSON.parse(saved))
    }
    
    settings.darkMode = document.documentElement.classList.contains('dark')
}

const loadStats = async () => {
    try {
        const response = await axios.get('/api/dashboard')
        totalData.value = response.data.total_results || 0
    } catch (error) {
        totalData.value = 0
    }
}

const saveSettings = () => {
    saving.value = true
    try {
        localStorage.setItem('app-settings', JSON.stringify(settings))
        alert('Pengaturan berhasil disimpan!')
    } catch (error) {
        alert('Gagal menyimpan pengaturan')
    } finally {
        saving.value = false
    }
}

const toggleDarkMode = () => {
    settings.darkMode = !settings.darkMode
    document.documentElement.classList.toggle('dark')
    localStorage.setItem('darkMode', settings.darkMode)
}

const clearOldData = async () => {
    if (!confirm('Yakin ingin menghapus data lama? Data lebih dari 1 tahun akan dihapus.')) return
    
    clearing.value = true
    try {
        await axios.delete('/api/results/old')
        alert('Data lama berhasil dihapus!')
        loadStats()
    } catch (error) {
        alert('Gagal menghapus data: ' + error.message)
    } finally {
        clearing.value = false
    }
}

const resetDatabase = async () => {
    if (!confirm('PERHATIAN: Semua data akan dihapus permanen! Lanjutkan?')) return
    if (!confirm('Ini adalah konfirmasi terakhir. Klik OK untuk reset.')) return
    
    resetting.value = true
    try {
        await axios.delete('/api/results/all')
        alert('Database berhasil direset!')
        totalData.value = 0
    } catch (error) {
        alert('Gagal reset database: ' + error.message)
    } finally {
        resetting.value = false
    }
}

onMounted(() => {
    loadSettings()
    loadStats()
})
</script>
