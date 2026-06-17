<template>
    <div class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Export Data</h1>
            <p class="text-gray-500 dark:text-gray-400">Ekspor data hasil analisis ke berbagai format</p>
        </div>

        <!-- Export Options -->
        <div class="grid md:grid-cols-3 gap-6">
            <!-- Excel Export -->
            <div class="card hover:shadow-xl transition-shadow">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                        <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <span class="text-2xl font-bold text-green-600">.xlsx</span>
                </div>
                <h3 class="text-lg font-semibold mb-2">Export Excel</h3>
                <p class="text-sm text-gray-500 mb-4">Format Excel dengan formatting dan rumus.</p>
                <button @click="exportExcel" :disabled="exporting" class="btn-primary w-full">
                    {{ exporting === 'excel' ? 'Mengekspor...' : 'Download Excel' }}
                </button>
            </div>

            <!-- CSV Export -->
            <div class="card hover:shadow-xl transition-shadow">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                        <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <span class="text-2xl font-bold text-blue-600">.csv</span>
                </div>
                <h3 class="text-lg font-semibold mb-2">Export CSV</h3>
                <p class="text-sm text-gray-500 mb-4">File CSV untuk spreadsheet biasa.</p>
                <button @click="exportCsv" :disabled="exporting" class="btn-primary w-full">
                    {{ exporting === 'csv' ? 'Mengekspor...' : 'Download CSV' }}
                </button>
            </div>

            <!-- PDF Export -->
            <div class="card hover:shadow-xl transition-shadow">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                        <svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <span class="text-2xl font-bold text-red-600">.pdf</span>
                </div>
                <h3 class="text-lg font-semibold mb-2">Export PDF</h3>
                <p class="text-sm text-gray-500 mb-4">Laporan PDF siap cetak.</p>
                <button @click="exportPdf" :disabled="exporting" class="btn-primary w-full">
                    {{ exporting === 'pdf' ? 'Mengekspor...' : 'Download PDF' }}
                </button>
            </div>
        </div>

        <!-- Export Options -->
        <div class="card">
            <h3 class="text-lg font-semibold mb-4">Opsi Export</h3>
            <div class="grid md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Format Tanggal</label>
                    <select v-model="exportOptions.dateFormat" class="input-field">
                        <option value="Y-m-d">2024-01-15</option>
                        <option value="d/m/Y">15/01/2024</option>
                        <option value="m/d/Y">01/15/2024</option>
                        <option value="d-m-Y">15-01-2024</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Periode Data</label>
                    <select v-model="exportOptions.period" class="input-field">
                        <option value="all">Semua Data</option>
                        <option value="day">Hari Ini</option>
                        <option value="week">Minggu Ini</option>
                        <option value="month">Bulan Ini</option>
                        <option value="year">Tahun Ini</option>
                    </select>
                </div>
            </div>
            <div class="mt-4">
                <label class="block text-sm font-medium mb-2">Kolom yang Diinclude</label>
                <div class="flex flex-wrap gap-4">
                    <label v-for="col in columns" :key="col.key" class="flex items-center space-x-2">
                        <input type="checkbox" v-model="exportOptions.columns" :value="col.key" class="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                        <span class="text-sm">{{ col.label }}</span>
                    </label>
                </div>
            </div>
        </div>

        <!-- Preview -->
        <div class="card">
            <h3 class="text-lg font-semibold mb-4">Preview Data ({{ previewData.length }} record)</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b border-gray-200 dark:border-gray-700">
                            <th v-for="col in previewColumns" :key="col" class="text-left py-3 px-4">{{ col }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(row, index) in previewData.slice(0, 10)" :key="index" class="border-b border-gray-100 dark:border-gray-700/50">
                            <td v-for="col in previewColumns" :key="col" class="py-3 px-4">{{ row[col.toLowerCase()] || '-' }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p v-if="previewData.length > 10" class="text-sm text-gray-500 mt-2">... dan {{ previewData.length - 10 }} data lainnya</p>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import axios from 'axios'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

const exporting = ref(null)
const previewData = ref([])

const columns = [
    { key: 'result_4d', label: '4D Number' },
    { key: 'as_digit', label: 'AS' },
    { key: 'kop_digit', label: 'KOP' },
    { key: 'kepala_digit', label: 'KEPALA' },
    { key: 'ekor_digit', label: 'EKOR' },
    { key: 'draw_date', label: 'Tanggal' },
]

const exportOptions = reactive({
    dateFormat: 'Y-m-d',
    period: 'all',
    columns: ['result_4d', 'as_digit', 'kop_digit', 'kepala_digit', 'ekor_digit', 'draw_date']
})

const previewColumns = computed(() => {
    return columns.filter(c => exportOptions.columns.includes(c.key)).map(c => c.label)
})

const fetchPreview = async () => {
    try {
        const response = await axios.get(`/api/export/preview?period=${exportOptions.period}`)
        previewData.value = response.data.data || []
    } catch (error) {
        console.error('Error fetching preview:', error)
    }
}

const formatDate = (date, format) => {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    
    return format
        .replace('Y', year)
        .replace('m', month)
        .replace('d', day)
}

const exportExcel = async () => {
    exporting.value = 'excel'
    try {
        const data = previewData.value.map(row => {
            const newRow = {}
            columns.forEach(col => {
                if (exportOptions.columns.includes(col.key)) {
                    if (col.key === 'draw_date' && row[col.key]) {
                        newRow[col.label] = formatDate(row[col.key], exportOptions.dateFormat)
                    } else {
                        newRow[col.label] = row[col.key] || '-'
                    }
                }
            })
            return newRow
        })
        
        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Data 4D')
        
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `4d-analysis-${Date.now()}.xlsx`)
        
        alert('Export Excel berhasil!')
    } catch (error) {
        alert('Export gagal: ' + error.message)
    } finally {
        exporting.value = null
    }
}

const exportCsv = async () => {
    exporting.value = 'csv'
    try {
        const data = previewData.value.map(row => {
            const newRow = {}
            columns.forEach(col => {
                if (exportOptions.columns.includes(col.key)) {
                    if (col.key === 'draw_date' && row[col.key]) {
                        newRow[col.label] = formatDate(row[col.key], exportOptions.dateFormat)
                    } else {
                        newRow[col.label] = row[col.key] || '-'
                    }
                }
            })
            return newRow
        })
        
        const ws = XLSX.utils.json_to_sheet(data)
        const csv = XLSX.utils.sheet_to_csv(ws)
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
        saveAs(blob, `4d-analysis-${Date.now()}.csv`)
        
        alert('Export CSV berhasil!')
    } catch (error) {
        alert('Export gagal: ' + error.message)
    } finally {
        exporting.value = null
    }
}

const exportPdf = async () => {
    exporting.value = 'pdf'
    try {
        const response = await axios.get('/api/export/pdf', {
            params: {
                period: exportOptions.period,
                dateFormat: exportOptions.dateFormat
            },
            responseType: 'blob'
        })
        
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `4d-analysis-${Date.now()}.pdf`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        
        alert('Export PDF berhasil!')
    } catch (error) {
        alert('Export gagal. Pastikan data tersedia.')
    } finally {
        exporting.value = null
    }
}

onMounted(() => {
    fetchPreview()
})
</script>
