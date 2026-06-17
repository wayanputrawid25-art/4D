<template>
    <div class="space-y-6">
        <!-- Header -->
        <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">OCR Gambar</h1>
            <p class="text-gray-500 dark:text-gray-400">Ambil angka 4D dari gambar menggunakan OCR (Tesseract.js)</p>
        </div>

        <!-- Mobile Instructions -->
        <div class="md:hidden bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p class="text-sm text-blue-700 dark:text-blue-300 text-center">
                💡 <strong>Tips:</strong> Gunakan tombol kamera di bawah untuk mengambil foto langsung dari HP
            </p>
        </div>

        <div class="grid lg:grid-cols-2 gap-6">
            <!-- Upload Section -->
            <div class="card">
                <h3 class="text-lg font-semibold mb-4">Upload Gambar</h3>
                
                <!-- Drag & Drop Area -->
                <div 
                    @dragover.prevent="onDragOver"
                    @dragleave="onDragLeave"
                    @drop.prevent="onDrop"
                    @click="triggerFileInput"
                    :class="[
                        'border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer select-none',
                        dragOver 
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-[1.02]' 
                            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    ]"
                >
                    <input 
                        type="file" 
                        ref="imageInput"
                        @change="onFileSelect"
                        accept="image/*"
                        class="hidden"
                        id="image-input"
                    />
                    
                    <!-- Upload Icon -->
                    <svg class="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    
                    <p class="text-gray-600 dark:text-gray-400 mb-1 font-medium">
                        {{ dragOver ? 'Lepaskan file di sini!' : 'Drag & drop gambar di sini' }}
                    </p>
                    <p class="text-sm text-gray-500 dark:text-gray-500">atau pilih dari perangkat</p>
                    <p class="text-xs text-gray-400 mt-2">Format: JPG, PNG, WEBP (maks. 10MB)</p>
                </div>

                <!-- Action Buttons -->
                <div class="flex flex-wrap gap-3 mt-4">
                    <!-- Select Image Button -->
                    <button 
                        @click="triggerFileInput"
                        class="flex-1 min-w-[120px] btn-primary flex items-center justify-center gap-2"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Pilih Gambar
                    </button>
                    
                    <!-- Camera Button for Mobile -->
                    <button 
                        @click="openCamera"
                        class="flex-1 min-w-[120px] btn-secondary flex items-center justify-center gap-2"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Kamera
                    </button>
                </div>

                <!-- Hidden Camera Input -->
                <input 
                    type="file" 
                    ref="cameraInput"
                    @change="onCameraCapture"
                    accept="image/*"
                    capture="environment"
                    class="hidden"
                    id="camera-input"
                />

                <!-- Image Preview -->
                <div v-if="selectedImage && imagePreview" class="mt-4">
                    <div class="relative">
                        <div class="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                            <img 
                                :src="imagePreview" 
                                alt="Preview" 
                                class="w-full h-full object-contain"
                            />
                        </div>
                        
                        <!-- Remove Button -->
                        <button 
                            @click="clearImage"
                            class="absolute top-2 right-2 p-2 bg-red-500/90 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                            title="Hapus gambar"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        
                        <!-- File Info -->
                        <div class="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                            {{ selectedImage.name }} ({{ formatFileSize(selectedImage.size) }})
                        </div>
                    </div>
                </div>

                <!-- Error Message -->
                <div v-if="errorMessage" class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p class="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {{ errorMessage }}
                    </p>
                </div>

                <!-- Process Button -->
                <button 
                    @click="processOCR"
                    :disabled="!selectedImage || processing || ocrLoading"
                    class="btn-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <svg v-if="processing || ocrLoading" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {{ processing || ocrLoading ? `Memproses OCR... ${ocrProgress}%` : 'Proses OCR' }}
                </button>
                
                <!-- OCR Engine Status -->
                <div v-if="ocrEngineReady" class="mt-3 text-center">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        ✅ Tesseract.js Ready
                    </span>
                </div>
            </div>

            <!-- Results Section -->
            <div class="card">
                <h3 class="text-lg font-semibold mb-4">Hasil OCR</h3>
                
                <!-- Empty State -->
                <div v-if="!ocrResults.length && !processing && !ocrLoading && !errorMessage" class="text-center py-12 text-gray-500 dark:text-gray-400">
                    <svg class="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p class="mb-2">Upload gambar untuk memulai OCR</p>
                    <p class="text-sm text-gray-400">Angka 4D akan otomatis terdeteksi</p>
                </div>

                <!-- OCR Engine Loading State -->
                <div v-if="ocrLoading && !ocrEngineReady" class="text-center py-8">
                    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                        <div class="flex items-center justify-center gap-3 mb-3">
                            <svg class="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span class="text-lg font-medium text-blue-700 dark:text-blue-300">Memuat OCR Engine...</span>
                        </div>
                        <div class="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2.5">
                            <div class="bg-blue-600 h-2.5 rounded-full transition-all duration-300" :style="{ width: ocrProgress + '%' }"></div>
                        </div>
                        <p class="text-sm text-blue-600 dark:text-blue-400 mt-2">{{ ocrProgress }}%</p>
                        <p class="text-xs text-blue-500 mt-1">Mohon tunggu, pertama kali perlu download data OCR</p>
                    </div>
                </div>

                <!-- Processing State -->
                <div v-if="processing" class="text-center py-8">
                    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                        <div class="flex items-center justify-center gap-3 mb-3">
                            <svg class="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span class="text-lg font-medium text-blue-700 dark:text-blue-300">Menganalisis gambar...</span>
                        </div>
                        <div class="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2.5">
                            <div class="bg-blue-600 h-2.5 rounded-full transition-all duration-300" :style="{ width: ocrProgress + '%' }"></div>
                        </div>
                        <p class="text-sm text-blue-600 dark:text-blue-400 mt-2">{{ ocrProgress }}%</p>
                    </div>
                    
                    <!-- OCR Text Preview -->
                    <div v-if="rawOcrText" class="mt-4 text-left bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                        <p class="text-xs text-gray-500 mb-2">Teks terdeteksi:</p>
                        <p class="font-mono text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ rawOcrText }}</p>
                    </div>
                </div>

                <!-- Error State -->
                <div v-if="errorMessage && !processing" class="text-center py-8">
                    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                        <svg class="w-12 h-12 mx-auto mb-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p class="text-red-600 dark:text-red-400 font-medium">{{ errorMessage }}</p>
                        <button @click="processOCR" class="mt-3 text-sm text-primary-600 hover:text-primary-700">
                            🔄 Coba Lagi
                        </button>
                    </div>
                </div>

                <!-- Results Table -->
                <div v-if="ocrResults.length" class="space-y-4">
                    <div class="flex items-center justify-between">
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                            Ditemukan <strong>{{ ocrResults.length }}</strong> angka 4D
                        </p>
                        <button 
                            @click="selectAll"
                            class="text-sm text-primary-600 hover:text-primary-700"
                        >
                            {{ allSelected ? 'Batal Pilih Semua' : 'Pilih Semua' }}
                        </button>
                    </div>
                    
                    <!-- Results Table -->
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-100 dark:bg-gray-800">
                                <tr>
                                    <th class="px-2 py-2 text-left">
                                        <input type="checkbox" :checked="allSelected" @change="selectAll" class="rounded" />
                                    </th>
                                    <th class="px-2 py-2 text-center">#</th>
                                    <th class="px-2 py-2 text-center">AS</th>
                                    <th class="px-2 py-2 text-center">KOP</th>
                                    <th class="px-2 py-2 text-center">KEPALA</th>
                                    <th class="px-2 py-2 text-center">EKOR</th>
                                    <th class="px-2 py-2 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                                <tr v-for="(result, index) in ocrResults" :key="index" 
                                    :class="[
                                        'transition-colors',
                                        result.selected ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                    ]">
                                    <td class="px-2 py-2">
                                        <input 
                                            type="checkbox" 
                                            :checked="result.selected"
                                            @change="toggleSelect(index)"
                                            class="rounded"
                                        />
                                    </td>
                                    <td class="px-2 py-2 text-center text-gray-500">{{ index + 1 }}</td>
                                    <td class="px-2 py-2 text-center font-bold text-primary-600">{{ result.as }}</td>
                                    <td class="px-2 py-2 text-center font-bold text-primary-600">{{ result.kop }}</td>
                                    <td class="px-2 py-2 text-center font-bold text-primary-600">{{ result.kepala }}</td>
                                    <td class="px-2 py-2 text-center font-bold text-primary-600">{{ result.ekor }}</td>
                                    <td class="px-2 py-2 text-center">
                                        <button 
                                            @click="saveResult(result)"
                                            :disabled="saving"
                                            class="text-primary-600 hover:text-primary-700 disabled:opacity-50"
                                            title="Simpan"
                                        >
                                            💾
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Raw OCR Text -->
                    <details class="mt-4">
                        <summary class="cursor-pointer text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                            📄 Lihat teks asli hasil OCR
                        </summary>
                        <div class="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            <pre class="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{{ rawOcrText }}</pre>
                        </div>
                    </details>

                    <!-- Save Selected Button -->
                    <button 
                        @click="saveSelectedResults"
                        :disabled="!hasSelectedResults || saving"
                        class="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        💾 Simpan {{ selectedCount }} Data Terpilih
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { create, OCREngine } from 'tesseract.js'
import axios from 'axios'

// Refs
const imageInput = ref(null)
const cameraInput = ref(null)
const selectedImage = ref(null)
const imagePreview = ref(null)
const dragOver = ref(false)
const processing = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const ocrResults = ref([])
const ocrProgress = ref(0)
const ocrLoading = ref(false)
const ocrEngineReady = ref(false)
const rawOcrText = ref('')
const ocrEngine = ref(null)

// Computed
const hasSelectedResults = computed(() => ocrResults.value.some(r => r.selected))
const selectedCount = computed(() => ocrResults.value.filter(r => r.selected).length)
const allSelected = computed(() => ocrResults.value.length > 0 && ocrResults.value.every(r => r.selected))

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Initialize Tesseract engine on mount
onMounted(async () => {
    await initializeOCR()
})

// Initialize OCR Engine
const initializeOCR = async () => {
    try {
        ocrLoading.value = true
        ocrProgress.value = 0
        
        console.log('🚀 Initializing Tesseract.js OCR engine...')
        
        // Create OCR engine
        const engine = await create('eng', undefined, {
            logger: (m) => {
                if (m.status === 'loading tesseract core') {
                    ocrProgress.value = Math.round(m.progress * 100)
                }
            }
        })
        
        ocrEngine.value = engine
        ocrEngineReady.value = true
        ocrLoading.value = false
        
        console.log('✅ Tesseract.js OCR engine ready!')
    } catch (error) {
        console.error('❌ Failed to initialize OCR engine:', error)
        errorMessage.value = 'Gagal memuat OCR engine. Silakan refresh halaman.'
        ocrLoading.value = false
    }
}

// Validate file
const validateFile = (file) => {
    errorMessage.value = ''
    
    if (!file) {
        errorMessage.value = 'Tidak ada file yang dipilih'
        return false
    }
    
    if (!file.type.startsWith('image/')) {
        errorMessage.value = 'File harus berupa gambar'
        return false
    }
    
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if (!validTypes.includes(file.type)) {
        errorMessage.value = 'Format tidak didukung. Gunakan JPG, PNG, atau WEBP'
        return false
    }
    
    if (file.size > MAX_FILE_SIZE) {
        errorMessage.value = 'Ukuran file terlalu besar (maks. 10MB)'
        return false
    }
    
    return true
}

// Format file size
const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Trigger file input
const triggerFileInput = () => {
    imageInput.value?.click()
}

// Open camera
const openCamera = () => {
    cameraInput.value?.click()
}

// Drag events
const onDragOver = (e) => {
    e.preventDefault()
    dragOver.value = true
}

const onDragLeave = (e) => {
    e.preventDefault()
    if (!e.currentTarget.contains(e.relatedTarget)) {
        dragOver.value = false
    }
}

const onDrop = (e) => {
    e.preventDefault()
    dragOver.value = false
    
    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
        handleFile(files[0])
    }
}

// Handle file selection
const onFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
        handleFile(file)
    }
}

// Handle camera capture
const onCameraCapture = (e) => {
    const file = e.target.files[0]
    if (file) {
        handleFile(file)
    }
}

// Process file
const handleFile = (file) => {
    if (!validateFile(file)) return
    
    selectedImage.value = file
    imagePreview.value = URL.createObjectURL(file)
    ocrResults.value = []
    errorMessage.value = ''
    rawOcrText.value = ''
    
    // Reset file inputs
    if (imageInput.value) imageInput.value.value = ''
    if (cameraInput.value) cameraInput.value.value = ''
}

// Clear image
const clearImage = () => {
    selectedImage.value = null
    imagePreview.value = null
    ocrResults.value = []
    errorMessage.value = ''
    rawOcrText.value = ''
}

// Toggle result selection
const toggleSelect = (index) => {
    if (ocrResults.value[index]) {
        ocrResults.value[index].selected = !ocrResults.value[index].selected
    }
}

// Select all results
const selectAll = () => {
    const newValue = !allSelected.value
    ocrResults.value.forEach(r => r.selected = newValue)
}

// Extract 4-digit numbers from text
const extract4DDigits = (text) => {
    // Match 4-digit sequences that stand alone
    const fourDigitPattern = /\b(\d{4})\b/g
    const matches = text.match(fourDigitPattern) || []
    
    // Also try to find numbers in various formats
    // Match patterns like: 1234, 1 2 3 4, 1234ABCD1234, etc.
    const loosePattern = /(\d{4})/g
    const looseMatches = text.match(loosePattern) || []
    
    // Combine and dedupe
    const allMatches = [...new Set([...matches, ...looseMatches])]
    
    return allMatches
}

// Parse 4D number into components
const parse4DNumber = (number) => {
    const numStr = String(number).padStart(4, '0').slice(-4)
    return {
        number: numStr,
        as: numStr[0],
        kop: numStr[1],
        kepala: numStr[2],
        ekor: numStr[3]
    }
}

// Process OCR using Tesseract.js
const processOCR = async () => {
    if (!selectedImage.value) return
    
    // Wait for OCR engine to be ready
    if (!ocrEngineReady.value) {
        errorMessage.value = 'OCR engine masih memuat. Mohon tunggu...'
        return
    }
    
    processing.value = true
    errorMessage.value = ''
    ocrResults.value = []
    ocrProgress.value = 0
    
    try {
        console.log('📤 Processing image with Tesseract.js...')
        
        // Recognize text from image
        const result = await ocrEngine.value.recognize(selectedImage.value, {}, {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    ocrProgress.value = Math.round(m.progress * 100)
                }
            }
        })
        
        console.log('✅ OCR Result:', result)
        
        rawOcrText.value = result.data.text
        
        // Extract 4-digit numbers
        const digits4D = extract4DDigits(result.data.text)
        
        console.log('🔢 Found 4D digits:', digits4D)
        
        if (digits4D.length === 0) {
            errorMessage.value = 'Tidak ada angka 4 digit yang terdeteksi. Coba gunakan gambar yang lebih jelas.'
        } else {
            // Parse and add selected property
            ocrResults.value = digits4D.map(num => ({
                ...parse4DNumber(num),
                selected: true
            }))
            
            showToast(`Ditemukan ${ocrResults.value.length} angka 4D!`)
        }
    } catch (error) {
        console.error('❌ OCR Error:', error)
        errorMessage.value = 'Gagal memproses gambar. Silakan coba lagi.'
    } finally {
        processing.value = false
        ocrProgress.value = 100
    }
}

// Save single result
const saveResult = async (result) => {
    try {
        await axios.post('/api/results', {
            result_4d: result.number,
            draw_date: new Date().toISOString().split('T')[0]
        })
        
        // Remove from list
        const index = ocrResults.value.indexOf(result)
        if (index > -1) {
            ocrResults.value.splice(index, 1)
        }
        
        showToast('Data berhasil disimpan!')
    } catch (error) {
        console.error('Save error:', error)
        showToast('Gagal menyimpan: ' + (error.response?.data?.message || error.message), 'error')
    }
}

// Save selected results
const saveSelectedResults = async () => {
    const selected = ocrResults.value.filter(r => r.selected)
    if (selected.length === 0) return
    
    saving.value = true
    
    try {
        await axios.post('/api/results/bulk', {
            results: selected.map(r => ({
                result_4d: r.number,
                draw_date: new Date().toISOString().split('T')[0]
            }))
        })
        
        // Remove saved items
        ocrResults.value = ocrResults.value.filter(r => !r.selected)
        
        showToast(`${selected.length} data berhasil disimpan!`)
    } catch (error) {
        console.error('Bulk save error:', error)
        showToast('Gagal menyimpan: ' + (error.response?.data?.message || error.message), 'error')
    } finally {
        saving.value = false
    }
}

// Simple toast notification
const showToast = (message, type = 'success') => {
    const toast = document.createElement('div')
    toast.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 transition-all transform translate-y-0 opacity-100 ${
        type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`
    toast.textContent = message
    document.body.appendChild(toast)
    
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2')
        setTimeout(() => toast.remove(), 300)
    }, 3000)
}
</script>
