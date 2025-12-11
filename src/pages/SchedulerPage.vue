<template>
  <JqxScheduler
    v-if="dataAdapter"
    ref="schedulerRef"
    :width="'100%'"
    :height="600"
    :source="dataAdapter"
    :date="date"
    :showLegend="true"
    :view="'weekView'"
    :appointmentDataFields="appointmentDataFields"
    :views="views"
  />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import JqxScheduler from 'jqwidgets-scripts/jqwidgets-vue3/vue_jqxscheduler.vue'

// const date = ref(new Date(2023, 11, 10))
//const date = ref<any>(new jqx.date(2016, 10, 23)) // как в оф. примере
const date = new jqx.date(2016, 10, 23)

const appointmentDataFields = {
  from: 'start',
  to: 'end',
  id: 'id',
  description: 'description',
  location: 'location',
  subject: 'subject',
  status: 'status',
}

const views = ['dayView', 'weekView', 'monthView']

const localEvents = [
  {
    id: 'id1',
    description: 'George brings projector for presentations.',
    location: 'Синий зал',
    subject: 'Quarterly Project Review Meeting',
    calendar: 'Room 1',
    start: new Date(2016, 10, 23, 9, 0),
    end: new Date(2016, 10, 23, 16, 0),
    status: 'Busy',
  },
  {
    id: 'id2',
    description: 'Не курить в помещении',
    location: 'Белый зал ',
    subject: 'IT Group Mtg.',
    calendar: 'Room 2',
    start: new Date(2016, 10, 24, 10, 0),
    end: new Date(2016, 10, 24, 15, 0),
    status: 'Free',
  },
  {
    id: 'id3',
    description: 'не бухать',
    location: 'VIP зал',
    subject: 'Course Social Media',
    calendar: 'Room 3',
    start: new Date(2016, 10, 27, 11, 0),
    end: new Date(2016, 10, 27, 13, 0),
    status: 'Tentative',
  },
  {
    id: 'id4',
    description: 'злая собака',
    location: 'Офис 204',
    subject: 'New Projects Planning',
    calendar: 'Room 2',
    start: new Date(2016, 10, 23, 16, 0),
    end: new Date(2016, 10, 23, 18, 0),
    status: 'Free',
  },
  {
    id: 'id5',
    description: 'Осторожно цветы',
    location: 'Конференц-зал',
    subject: 'Interview with James',
    calendar: 'Room 1',
    start: new Date(2016, 10, 25, 15, 0),
    end: new Date(2016, 10, 25, 17, 0),
    status: 'Out of Office',
  },
  {
    id: 'id6',
    description: 'Не будить кота',
    location: 'Кладовка',
    subject: 'Interview with Nancy',
    calendar: 'Room 4',
    start: new Date(2016, 10, 26, 14, 0),
    end: new Date(2016, 10, 26, 16, 0),
    status: 'Free',
  },
]

const source = {
  datatype: 'array',
  datafields: [
    { name: 'id', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'location', type: 'string' },
    { name: 'subject', type: 'string' },
    { name: 'calendar', type: 'string' },
    { name: 'start', type: 'date' },
    { name: 'end', type: 'date' },
  ],
  id: 'id',
  localdata: localEvents,
}

type JqxDataAdapter = { dataBind?: () => void } & Record<string, unknown>
const dataAdapter = ref<JqxDataAdapter | null>(null)

onMounted(() => {
  if (typeof jqx === 'undefined' || typeof jqx.dataAdapter !== 'function') {
    console.error('jqx is not available. Make sure jqx-all.js is loaded before SchedulerPage.')
    return
  }
  const adapter = new jqx.dataAdapter(source) as JqxDataAdapter
  if (typeof adapter.dataBind === 'function') {
    adapter.dataBind()
  }
  dataAdapter.value = adapter
})
</script>

<style>
/* Стили при необходимости */
</style>
