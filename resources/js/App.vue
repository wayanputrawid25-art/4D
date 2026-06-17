<template>
    <router-view />
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
    // Initialize dark mode
    if (localStorage.getItem('darkMode') === 'true' || 
        (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark')
    }
})
</script>
