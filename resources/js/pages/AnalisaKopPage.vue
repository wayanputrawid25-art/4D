<template>
    <div class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Analisa KOP</h1>
            <p class="text-gray-500 dark:text-gray-400">Analisis statistik digit KOP (digit kedua)</p>
        </div>

        <PositionAnalysis position="kop" />
    </div>
</template>

<script setup>
import PositionAnalysis from '@/components/PositionAnalysis.vue'
</script>
