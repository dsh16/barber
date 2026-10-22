export default defineNuxtConfig({
  compatibilityDate: '2026-10-22',
  devtools: { enabled: false },
  runtimeConfig: {
    public: { apiBase: 'http://localhost:4000/api' },
  },
  app: { head: { title: 'Barber', htmlAttrs: { lang: 'ru' } } },
});
