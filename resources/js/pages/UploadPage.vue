<template>
    <div class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Upload Data</h1>
            <p class="text-gray-500 dark:text-gray-400">Upload data 4D dalam format CSV, Excel, atau manual</p>
        </div>

        <!-- Upload Options -->
        <div class="grid md:grid-cols-2 gap-6">
            <!-- File Upload -->
            <div class="card">
                <h3 class="text-lg font-semibold mb-4">Upload File</h3>
                <div 
                    @dragover.prevent="dragOver = true"
                    @dragleave="dragOver = false"
                    @drop.prevent="handleDrop"
                    :class="[
                        'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
                        dragOver ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
                    ]"
                >
                    <input 
                        type="file" 
                        ref="fileInput"
                        @change="handleFileSelect"
                        accept=".csv,.xlsx,.xls"
                        class="hidden"
                    />
                    <svg class="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p class="text-gray-600 dark:text-gray-400 mb-2">Drag & drop file atau klik untuk pilih</p>
                    <p class="text-sm text-gray-500">Format: CSV, Excel (.xlsx, .xls)</p>
                </div>

                <div v-if="selectedFile" class="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="font-medium">{{ selectedFile.name }}</p>
                            <p class="text-sm text-gray-500">{{ formatFileSize(selectedFile.size) }}</p>
                        </div>
                        <button @click="selectedFile = null" class="text-red-500 hover:text-red-600">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <button 
                    @click="uploadFile"
                    :disabled="!selectedFile || uploading"
                    class="btn-primary w-full mt-4 disabled:opacity-50"
                >
                    {{ uploading ? 'Mengupload...' : 'Upload File' }}
                </button>
            </div>

            <!-- Manual Input -->
            <div class="card">
                <h3 class="text-lg font-semibold mb-4">Input Manual</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Angka 4D</label>
                        <input 
                            v-model="manualInput.number" 
                            type="text" 
                            maxlength="4"
                            pattern="[0-9]*"
                            inputmode="numeric"
                            class="input-field font-mono text-center text-xl"
                            placeholder="1234"
                        />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Tanggal Result</label>
                        <input 
                            v-model="manualInput.date" 
                            type="date" 
                            class="input-field"
                        />
                    </div>
                    <button 
                        @click="submitManual"
                        :disabled="manualInput.number.length !== 4 || submitting"
                        class="btn-primary w-full disabled:opacity-50"
                    >
                        {{ submitting ? 'Menyimpan...' : 'Simpan Data' }}
                    </button>
                </div>

                <!-- Preview -->
                <div v-if="manualInput.number.length === 4" class="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <h4 class="text-sm font-medium mb-3">Preview:</h4>
                    <div class="grid grid-cols-4 gap-2 text-center">
                        <div class="p-2 bg-white dark:bg-gray-800 rounded">
                            <div class="text-xs text-gray-500">AS</div>
                            <div class="text-xl font-bold">{{ manualInput.number[0] }}</div>
                        </div>
                        <div class="p-2 bg-white dark:bg-gray-800 rounded">
                            <div class="text-xs text-gray-500">KOP</div>
                            <div class="text-xl font-bold">{{ manualInput.number[1] }}</div>
                        </div>
                        <div class="p-2 bg-white dark:bg-gray-800 rounded">
                            <div class="text-xs text-gray-500">KEPALA</div>
                            <div class="text-xl font-bold">{{ manualInput.number[2] }}</div>
                        </div>
                        <div class="p-2 bg-white dark:bg-gray-800 rounded">
                            <div class="text-xs text-gray-500">EKOR</div>
                            <div class="text-xl font-bold">{{ manualInput.number[3] }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Upload History -->
        <div class="card">
            <h3 class="text-lg font-semibold mb-4">Riwayat Upload</h3>
            <div v-if="uploadHistory.length === 0" class="text-center py-8 text-gray-500">
                Belum ada data yang diupload
            </div>
            <div v-else class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b border-gray-200 dark:border-gray-700">
                            <th class="text-left py-3 px-4">File</th>
                            <th class="text-center py-3 px-2">Jumlah Data</th>
                            <th class="text-left py-3 px-4">Tanggal</th>
                            <th class="text-center py-3 px-2">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(item, index) in uploadHistory" :key="index" class="border-b border-gray-100 dark:border-gray-700/50">
                            <td class="py-3 px-4">{{ item.filename }}</td>
                            <td class="text-center py-3 px-2">{{ item.count }}</td>
                            <td class="py-3 px-4">{{ formatDate(item.date) }}</td>
                            <td class="text-center py-3 px-2">
                                <span :class="[
                                    'px-2 py-1 rounded-full text-xs',
                                    item.status === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                ]">
                                    {{ item.status === 'success' ? 'Berhasil' : 'Gagal' }}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import axios from 'axios'

const fileInput = ref(null)
const selectedFile = ref(null)
const dragOver = ref(false)
const uploading = ref(false)
const submitting = ref(false)

const manualInput = reactive({
    number: '',
    date: new Date().toISOString().split('T')[0]
})

const uploadHistory = ref([])

const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
        selectedFile.value = file
    }
}

const handleDrop = (event) => {
    dragOver.value = false
    const file = event.dataTransfer.files[0]
    if (file && (file.type === 'text/csv' || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
        selectedFile.value = file
    }
}

const uploadFile = async () => {
    if (!selectedFile.value) return
    
    uploading.value = true
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    
    try {
        const response = await axios.post('/api/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        
        uploadHistory.value.unshift({
            filename: selectedFile.value.name,
            count: response.data.count || 0,
            date: new Date().toISOString(),
            status: 'success'
        })
        
        selectedFile.value = null
        alert('Data berhasil diupload!')
    } catch (error) {
        uploadHistory.value.unshift({
            filename: selectedFile.value.name,
            count: 0,
            date: new Date().toISOString(),
            status: 'failed'
        })
        alert('Gagal mengupload file: ' + (error.response?.data?.message || error.message))
    } finally {
        uploading.value = false
    }
}

const submitManual = async () => {
    if (manualInput.number.length !== 4) return
    
    submitting.value = true
    try {
        await axios.post('/api/results', {
            result_4d: manualInput.number,
            draw_date: manualInput.date
        })
        
        manualInput.number = ''
        alert('Data berhasil disimpan!')
    } catch (error) {
        alert('Gagal menyimpan data: ' + (error.response?.data?.message || error.message))
    } finally {
        submitting.value = false
    }
}

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (date) => {
    return new Date(date).toLocaleDateString('id-ID')
}
</script>
