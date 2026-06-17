<template>
    <div class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">OCR Gambar</h1>
            <p class="text-gray-500 dark:text-gray-400">Ambil angka 4D dari gambar menggunakan OCR</p>
        </div>

        <div class="grid lg:grid-cols-2 gap-6">
            <!-- Upload Section -->
            <div class="card">
                <h3 class="text-lg font-semibold mb-4">Upload Gambar</h3>
                
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
                        ref="imageInput"
                        @change="handleImageSelect"
                        accept="image/*"
                        class="hidden"
                    />
                    <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p class="text-gray-600 dark:text-gray-400 mb-2">Drag & drop gambar atau klik untuk pilih</p>
                    <p class="text-sm text-gray-500">Format: JPG, PNG, WEBP</p>
                </div>

                <div v-if="selectedImage" class="mt-4">
                    <div class="relative">
                        <img :src="imagePreview" class="w-full rounded-lg shadow-lg" />
                        <button 
                            @click="clearImage"
                            class="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <button 
                    @click="processOCR"
                    :disabled="!selectedImage || processing"
                    class="btn-primary w-full mt-4 disabled:opacity-50"
                >
                    {{ processing ? 'Memproses OCR...' : 'Proses OCR' }}
                </button>
            </div>

            <!-- Results Section -->
            <div class="card">
                <h3 class="text-lg font-semibold mb-4">Hasil OCR</h3>
                
                <div v-if="!ocrResults.length && !processing" class="text-center py-12 text-gray-500">
                    <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>Upload gambar untuk memulai OCR</p>
                </div>

                <div v-if="processing" class="text-center py-12">
                    <div class="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p class="text-gray-500">Menganalisis gambar...</p>
                </div>

                <div v-if="ocrResults.length" class="space-y-4">
                    <div v-for="(result, index) in ocrResults" :key="index" class="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-sm text-gray-500">#{{ index + 1 }}</span>
                            <button 
                                @click="saveResult(result)"
                                class="text-primary-600 hover:text-primary-700 text-sm"
                            >
                                Simpan
                            </button>
                        </div>
                        <div class="grid grid-cols-4 gap-2 text-center">
                            <div class="p-2 bg-white dark:bg-gray-800 rounded">
                                <div class="text-xs text-gray-500">AS</div>
                                <div class="text-xl font-bold">{{ result.as }}</div>
                            </div>
                            <div class="p-2 bg-white dark:bg-gray-800 rounded">
                                <div class="text-xs text-gray-500">KOP</div>
                                <div class="text-xl font-bold">{{ result.kop }}</div>
                            </div>
                            <div class="p-2 bg-white dark:bg-gray-800 rounded">
                                <div class="text-xs text-gray-500">KEPALA</div>
                                <div class="text-xl font-bold">{{ result.kepala }}</div>
                            </div>
                            <div class="p-2 bg-white dark:bg-gray-800 rounded">
                                <div class="text-xs text-gray-500">EKOR</div>
                                <div class="text-xl font-bold">{{ result.ekor }}</div>
                            </div>
                        </div>
                        <div class="mt-2 text-center text-sm text-gray-500">
                            Nomor: <span class="font-mono font-bold">{{ result.number }}</span>
                        </div>
                    </div>

                    <button 
                        @click="saveAllResults"
                        :disabled="saving"
                        class="btn-primary w-full"
                    >
                        {{ saving ? 'Menyimpan...' : 'Simpan Semua' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const imageInput = ref(null)
const selectedImage = ref(null)
const imagePreview = ref(null)
const dragOver = ref(false)
const processing = ref(false)
const saving = ref(false)
const ocrResults = ref([])

const handleImageSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
        selectedImage.value = file
        imagePreview.value = URL.createObjectURL(file)
    }
}

const handleDrop = (event) => {
    dragOver.value = false
    const file = event.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
        selectedImage.value = file
        imagePreview.value = URL.createObjectURL(file)
    }
}

const clearImage = () => {
    selectedImage.value = null
    imagePreview.value = null
    ocrResults.value = []
}

const processOCR = async () => {
    if (!selectedImage.value) return
    
    processing.value = true
    const formData = new FormData()
    formData.append('image', selectedImage.value)
    
    try {
        const response = await axios.post('/api/ocr', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        ocrResults.value = response.data.results || []
    } catch (error) {
        alert('Gagal memproses OCR: ' + (error.response?.data?.message || error.message))
    } finally {
        processing.value = false
    }
}

const saveResult = async (result) => {
    try {
        await axios.post('/api/results', {
            result_4d: result.number,
            draw_date: new Date().toISOString().split('T')[0]
        })
        alert('Data berhasil disimpan!')
    } catch (error) {
        alert('Gagal menyimpan: ' + (error.response?.data?.message || error.message))
    }
}

const saveAllResults = async () => {
    saving.value = true
    try {
        await axios.post('/api/results/bulk', {
            results: ocrResults.value.map(r => ({
                result_4d: r.number,
                draw_date: new Date().toISOString().split('T')[0]
            }))
        })
        alert('Semua data berhasil disimpan!')
        ocrResults.value = []
        clearImage()
    } catch (error) {
        alert('Gagal menyimpan: ' + (error.response?.data?.message || error.message))
    } finally {
        saving.value = false
    }
}
</script>
