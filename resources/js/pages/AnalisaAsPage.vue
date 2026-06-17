<template>
    <div class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Analisa AS</h1>
            <p class="text-gray-500 dark:text-gray-400">Analisis statistik digit AS (digit pertama)</p>
        </div>

        <PositionAnalysis position="as" />
    </div>
</template>

<script setup>
import PositionAnalysis from '@/components/PositionAnalysis.vue'
</script>
