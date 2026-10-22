<script setup lang="ts">
const config = useRuntimeConfig();
const { data, status, refresh } = await useFetch<{ status: string; database: string }>(
  `${config.public.apiBase}/ready`,
  { server: false },
);
</script>

<template>
  <main>
    <p class="eyebrow">BARBER · DEVELOPMENT</p>
    <h1>Основа для вашего проекта</h1>
    <p>Nuxt 4 · Express · PostgreSQL · Sequelize</p>
    <section aria-live="polite">
      <h2>Подключение к API</h2>
      <p v-if="status === 'pending'">Проверяем подключение…</p>
      <p v-else-if="data?.database === 'connected'">API и база данных доступны.</p>
      <p v-else>API недоступен. Проверьте запуск бэкенда и PostgreSQL.</p>
      <button :disabled="status === 'pending'" @click="refresh()">Проверить снова</button>
    </section>
  </main>
</template>

<style>
body { margin: 0; background: #f4f2ec; color: #202b28; font-family: system-ui, sans-serif; }
main { max-width: 780px; margin: 12vh auto; padding: 24px; }
.eyebrow { letter-spacing: .18em; font-size: 12px; }
h1 { font-size: clamp(36px, 7vw, 64px); line-height: 1.05; }
section { margin-top: 48px; padding: 24px; background: white; border-radius: 16px; }
button { border: 0; border-radius: 8px; padding: 12px 18px; background: #24594b; color: white; cursor: pointer; }
button:disabled { opacity: .6; cursor: wait; }
</style>
