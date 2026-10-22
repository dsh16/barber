<script setup lang="ts">
interface Master { id: number; name: string }
interface Service { id: number; name: string; durationMinutes: number }
const config = useRuntimeConfig();
const { data: catalog, status: catalogStatus, error: catalogError, refresh } = await useFetch<{
  masters: Master[]; services: Service[];
}>(`${config.public.apiBase}/catalog`, { server: false });
const step = ref(1);
const masterId = ref<number | null | undefined>(undefined);
const serviceId = ref<number>();
const name = ref('');
const phone = ref('');
const submitting = ref(false);
const error = ref('');
const ticket = ref<number>();
let requestId: string | undefined;
let submittedPayload = '';
const selectedMaster = computed(() => masterId.value === null
  ? 'Любой мастер' : catalog.value?.masters.find(m => m.id === masterId.value)?.name);
const selectedService = computed(() => catalog.value?.services.find(s => s.id === serviceId.value));
async function submit() {
  if (submitting.value) return;
  error.value = '';
  const payload = { masterId: masterId.value, serviceId: serviceId.value,
    name: name.value.trim(), phone: phone.value.trim() };
  const serialized = JSON.stringify(payload);
  // A retry after a network error must reuse the same ticket request.
  if (!requestId || submittedPayload !== serialized) {
    requestId = crypto.randomUUID();
    submittedPayload = serialized;
  }
  submitting.value = true;
  try {
    const result = await $fetch<{ queueNumber: number }>(`${config.public.apiBase}/bookings`, {
      method: 'POST', body: { ...payload, requestId }, retry: 0,
    });
    ticket.value = result.queueNumber;
    step.value = 4;
  } catch (cause: unknown) {
    const failure = cause as { data?: { error?: string } };
    error.value = failure.data?.error ?? 'Не удалось получить ответ. Проверьте соединение и повторите попытку.';
  } finally {
    submitting.value = false;
  }
}
function reset() {
  step.value = 1;
  masterId.value = undefined;
  serviceId.value = undefined;
  name.value = '';
  phone.value = '';
  ticket.value = undefined;
  requestId = undefined;
  error.value = '';
}
</script>

<template>
  <main>
    <header><a href="/" class="brand">BARBER<span> / </span>CLUB</a><span class="tag">Живая очередь</span></header>
    <div class="intro">
      <p class="eyebrow">ВАШ СЛЕДУЮЩИЙ ОБРАЗ</p>
      <h1>Хорошая стрижка.<br>Без лишних звонков.</h1>
      <p class="muted">Выберите мастера и услугу — мы выдадим вам номер в очереди.</p>
    </div>
    <section v-if="step === 4" class="panel success" aria-live="polite">
      <p class="eyebrow">ВЫ В ОЧЕРЕДИ</p>
      <h2>Ваша запись принята</h2>
      <div class="ticket">№ {{ ticket }}</div>
      <p>{{ name }}, сохраните этот номер и покажите его администратору.</p>
      <p class="muted">{{ selectedMaster }} · {{ selectedService?.name }}</p>
      <p class="small muted">Это номер записи, а не количество людей перед вами. Время приёма уточните в барбершопе.</p>
      <button class="primary" @click="reset">Записать ещё одного клиента</button>
    </section>
    <section v-else class="panel" :aria-busy="submitting">
      <ol class="steps" aria-label="Шаги записи">
        <li v-for="(label, index) in ['Мастер', 'Услуга', 'Контакты']" :key="label"
          :class="{ current: step === index + 1, done: step > index + 1 }"
          :aria-current="step === index + 1 ? 'step' : undefined">
          <span>{{ index + 1 }}</span>{{ label }}
        </li>
      </ol>
      <p v-if="catalogStatus === 'pending'" role="status">Загружаем мастеров и услуги…</p>
      <div v-else-if="catalogError" role="alert">
        <p>Не удалось загрузить список мастеров и услуг.</p>
        <button @click="refresh()">Попробовать снова</button>
      </div>
      <template v-else-if="catalog">
        <form v-if="step === 1" @submit.prevent="step = 2">
          <h2>К кому запишемся?</h2>
          <p class="muted">Выберите своего мастера или доверьте выбор нам.</p>
          <fieldset>
            <legend class="sr-only">Выберите мастера</legend>
            <label class="option" :class="{ selected: masterId === null }">
              <input v-model="masterId" type="radio" name="master" :value="null" required>
              <span><strong>Любой мастер</strong><small>Мне неважно, кто будет стричь</small></span>
            </label>
            <label v-for="master in catalog.masters" :key="master.id" class="option"
              :class="{ selected: masterId === master.id }">
              <input v-model="masterId" type="radio" name="master" :value="master.id" required>
              <span><strong>{{ master.name }}</strong><small>Барбер</small></span>
            </label>
          </fieldset>
          <div class="actions"><button class="primary" :disabled="masterId === undefined">Выбрать услугу →</button></div>
        </form>
        <form v-else-if="step === 2" @submit.prevent="step = 3">
          <h2>Что будем делать?</h2>
          <p class="muted">Мастер: {{ selectedMaster }}</p>
          <fieldset>
            <legend class="sr-only">Выберите услугу</legend>
            <label v-for="service in catalog.services" :key="service.id" class="option"
              :class="{ selected: serviceId === service.id }">
              <input v-model="serviceId" type="radio" name="service" :value="service.id" required>
              <span><strong>{{ service.name }}</strong><small>Примерно {{ service.durationMinutes }} мин.</small></span>
            </label>
          </fieldset>
          <p v-if="!catalog.services.length" role="status">Пока нет доступных услуг.</p>
          <div class="actions">
            <button type="button" @click="step = 1">← Назад</button>
            <button class="primary" :disabled="!serviceId">Продолжить →</button>
          </div>
        </form>
        <form v-else @submit.prevent="submit">
          <h2>Как к вам обращаться?</h2>
          <p class="muted">{{ selectedMaster }} · {{ selectedService?.name }}</p>
          <label class="field">Ваше имя
            <input v-model="name" name="name" autocomplete="given-name" placeholder="Например, Иван"
              required minlength="2" maxlength="100" :disabled="submitting">
          </label>
          <label class="field">Телефон
            <input v-model="phone" name="phone" type="tel" autocomplete="tel" placeholder="+7 (999) 123-45-67"
              required maxlength="30" :disabled="submitting" aria-describedby="phone-hint">
          </label>
          <p id="phone-hint" class="small muted">Укажите номер с кодом страны, чтобы с вами могли связаться по записи.</p>
          <p v-if="error" class="error" role="alert">{{ error }}</p>
          <div class="actions">
            <button type="button" :disabled="submitting" @click="step = 2; error = ''">← Назад</button>
            <button class="primary" :disabled="submitting">{{ submitting ? 'Записываем…' : 'Получить номер в очереди' }}</button>
          </div>
        </form>
      </template>
    </section>
    <footer>Мастера и услуги в каталоге — демонстрационные.</footer>
  </main>
</template>

<style>
* { box-sizing: border-box; }
body { margin: 0; background: #f5f2eb; color: #202c28; font-family: system-ui, sans-serif; }
main { max-width: 960px; margin: auto; padding: 28px 24px 48px; }
header { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.brand { color: inherit; text-decoration: none; font-weight: 850; letter-spacing: .08em; }
.brand span { color: #b17c42; }
.tag { font-size: 12px; border: 1px solid #d6d9ce; border-radius: 30px; padding: 8px 12px; }
.intro { margin: 64px 0 32px; }
.eyebrow { letter-spacing: .16em; font-size: 11px; font-weight: 700; color: #726046; }
h1 { font-size: clamp(32px, 6vw, 52px); line-height: 1.12; letter-spacing: -.04em; margin: 16px 0; }
h2 { font-size: 26px; letter-spacing: -.03em; margin: 24px 0 8px; }
.muted { color: #626c65; line-height: 1.6; }
.panel { max-width: 680px; background: #fff; border: 1px solid #e6e6dd; border-radius: 20px; padding: 32px; }
.steps { display: flex; list-style: none; padding: 0 0 24px; margin: 0; border-bottom: 1px solid #e9ebe5; gap: 24px; }
.steps li { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #707972; }
.steps span { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: #eef1ec; }
.steps .current { color: #24594b; font-weight: 700; }
.steps .current span, .steps .done span { color: #fff; background: #24594b; }
fieldset { border: 0; padding: 0; margin: 24px 0; display: grid; gap: 10px; }
.option { display: flex; gap: 14px; align-items: center; padding: 18px; border: 1px solid #dce1da; border-radius: 12px; cursor: pointer; }
.option.selected { border-color: #24594b; background: #f1f7f3; }
input[type=radio] { accent-color: #24594b; width: 18px; height: 18px; flex-shrink: 0; }
.option strong, .option small { display: block; }
.option small { margin-top: 5px; color: #626c65; }
.field { display: grid; gap: 8px; margin-top: 24px; font-size: 14px; font-weight: 600; }
.field input { width: 100%; font: inherit; padding: 14px; border: 1px solid #b8c2ba; border-radius: 8px; }
:focus-visible { outline: 3px solid #b17c42; outline-offset: 4px; }
.actions { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; margin-top: 28px; }
button { font: inherit; border: 1px solid #dce1da; border-radius: 8px; padding: 13px 18px; background: white; color: #24594b; cursor: pointer; }
button.primary { background: #24594b; color: white; border-color: #24594b; }
button:disabled { opacity: .5; cursor: not-allowed; }
.small { font-size: 13px; }
.error { color: #a52727; background: #fff1ef; border-radius: 8px; padding: 12px; }
.success { text-align: center; }
.ticket { font-size: 76px; font-weight: 800; color: #24594b; margin: 24px 0; }
footer { color: #626c65; font-size: 12px; margin-top: 24px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
@media (max-width: 520px) { main { padding: 20px 16px; } .panel { padding: 22px 18px; } .steps { gap: 14px; } .steps li { gap: 5px; font-size: 12px; } .intro { margin-top: 40px; } }
</style>
