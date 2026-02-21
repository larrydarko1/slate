<template>
  <div
    class="canvas-chart"
    :class="{ active: isActive }"
    :style="boxStyle"
    @mousedown.stop="onMouseDown"
  >
    <!-- Chart title (editable when active) -->
    <div class="chart-title-bar" v-if="chart.title || isActive">
      <input
        v-if="isActive"
        class="chart-title-input"
        :value="chart.title"
        @input="onTitleInput"
        @mousedown.stop
        placeholder="Chart title"
      />
      <span v-else class="chart-title-text">{{ chart.title }}</span>
    </div>

    <!-- Chart body -->
    <div class="chart-body" ref="chartBodyRef">
      <component
        v-if="chartComponent && chartData"
        :is="chartComponent"
        :data="chartData"
        :options="chartOptions"
        :style="{ width: '100%', height: '100%' }"
      />
      <div v-else class="chart-empty">
        <p class="chart-empty-icon">📊</p>
        <p class="chart-empty-text">Select a data source</p>
        <p class="chart-empty-sub">Click a reference field, then select cells on any table</p>
      </div>
    </div>

    <!-- Data source config (only when active) -->
    <div v-if="isActive" class="chart-config" @mousedown.stop>
      <div class="config-row">
        <label>Type</label>
        <select :value="chart.chartType" @change="onTypeChange">
          <option value="bar">Bar</option>
          <option value="line">Line</option>
          <option value="pie">Pie</option>
          <option value="doughnut">Doughnut</option>
          <option value="scatter">Scatter</option>
          <option value="area">Area</option>
        </select>
      </div>

      <!-- Labels reference -->
      <div class="config-section">
        <div class="config-section-header">Labels</div>
        <div
          class="ref-field"
          :class="{ picking: ss.chartSelectionMode.value === 'labels' }"
          :style="refFieldStyle('labels')"
          @click="onRefFieldClick('labels')"
        >
          <span class="ref-color-dot" :style="{ background: '#94a3b8' }"></span>
          <input
            class="ref-input"
            :value="chart.dataSource?.labelRef?.refString ?? ''"
            @input="onRefInput('labels', $event)"
            @focus="onRefFieldClick('labels')"
            @mousedown.stop
            placeholder="Click here, then select cells…"
          />
          <button
            v-if="chart.dataSource?.labelRef"
            class="ref-clear"
            @click.stop="clearRef('labels')"
            title="Clear"
          >×</button>
        </div>
      </div>

      <!-- Series references -->
      <div class="config-section">
        <div class="config-section-header">
          <span>Series</span>
          <button class="add-series-btn" @click="ss.addChartSeries()" title="Add series">+</button>
        </div>
        <div
          v-for="(sref, i) in (chart.dataSource?.seriesRefs ?? [])"
          :key="i"
          class="ref-field"
          :class="{ picking: ss.chartSelectionMode.value === 'series:' + i }"
          :style="refFieldStyle('series:' + i)"
          @click="onRefFieldClick('series:' + i)"
        >
          <span class="ref-color-dot" :style="{ background: seriesColor(i) }"></span>
          <input
            class="ref-input"
            :value="sref.refString"
            @input="onRefInput('series:' + i, $event)"
            @focus="onRefFieldClick('series:' + i)"
            @mousedown.stop
            placeholder="Click here, then select cells…"
          />
          <button
            class="ref-clear"
            @click.stop="ss.removeChartSeries(i)"
            title="Remove series"
          >×</button>
        </div>
        <div v-if="!chart.dataSource?.seriesRefs?.length" class="ref-empty-hint">
          Click <strong>+</strong> to add a data series
        </div>
      </div>

      <!-- Options -->
      <div class="config-row">
        <label>Header</label>
        <input type="checkbox" :checked="chart.dataSource?.useHeader ?? true" @change="onHeaderToggle" />
        <span class="config-hint">First row is header</span>
      </div>
      <div class="config-row">
        <label>Legend</label>
        <select :value="chart.showLegend ? chart.legendPosition : 'off'" @change="onLegendChange">
          <option value="off">Hidden</option>
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
      </div>
      <div class="config-row">
        <label>Grid</label>
        <input type="checkbox" :checked="chart.showGrid" @change="onGridToggle" />
      </div>
    </div>

    <!-- Resize handles (only when active) -->
    <template v-if="isActive">
      <div class="resize-handle rh-e" @mousedown.stop.prevent="startResize('e', $event)"></div>
      <div class="resize-handle rh-s" @mousedown.stop.prevent="startResize('s', $event)"></div>
      <div class="resize-handle rh-se" @mousedown.stop.prevent="startResize('se', $event)"></div>
      <div class="resize-handle rh-w" @mousedown.stop.prevent="startResize('w', $event)"></div>
      <div class="resize-handle rh-n" @mousedown.stop.prevent="startResize('n', $event)"></div>
      <div class="resize-handle rh-nw" @mousedown.stop.prevent="startResize('nw', $event)"></div>
      <div class="resize-handle rh-ne" @mousedown.stop.prevent="startResize('ne', $event)"></div>
      <div class="resize-handle rh-sw" @mousedown.stop.prevent="startResize('sw', $event)"></div>
    </template>

    <!-- Delete button -->
    <button
      v-if="isActive"
      class="chart-delete"
      title="Delete chart"
      @click.stop="ss.removeChart(chart.id)"
      @mousedown.stop
    >×</button>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, type PropType } from 'vue'
import type { ChartObject } from '../types/spreadsheet'
import { SPREADSHEET_KEY } from '../composables/useSpreadsheet'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Filler,
} from 'chart.js'
import { Bar, Line, Pie, Doughnut, Scatter } from 'vue-chartjs'

ChartJS.register(
  Title, Tooltip, Legend,
  BarElement, LineElement, PointElement, ArcElement,
  CategoryScale, LinearScale, Filler,
)

const props = defineProps({
  chart: { type: Object as PropType<ChartObject>, required: true },
})

const ss = inject(SPREADSHEET_KEY)!

const isActive = computed(() => ss.activeChartId.value === props.chart.id)

const boxStyle = computed(() => ({
  left: props.chart.x + 'px',
  top: props.chart.y + 'px',
  width: props.chart.width + 'px',
  height: props.chart.height + 'px',
  zIndex: props.chart.zIndex,
}))

// ── Chart ref color palette (must match composable CHART_REF_COLORS) ──

const CHART_REF_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
]

function seriesColor(i: number) {
  return CHART_REF_COLORS[i % CHART_REF_COLORS.length]
}

function refFieldStyle(mode: string) {
  const isPicking = ss.chartSelectionMode.value === mode
  if (!isPicking) return {}
  const color = mode === 'labels' ? '#94a3b8' : seriesColor(parseInt(mode.split(':')[1] ?? '0'))
  return {
    borderColor: color,
    boxShadow: '0 0 0 1px ' + color,
  }
}

// ── Chart.js reactive data ──

const chartComponent = computed(() => {
  switch (props.chart.chartType) {
    case 'bar': return Bar
    case 'line': return Line
    case 'area': return Line
    case 'pie': return Pie
    case 'doughnut': return Doughnut
    case 'scatter': return Scatter
    default: return Bar
  }
})

const chartData = computed(() => {
  const ds = props.chart.dataSource
  if (!ds || ds.seriesRefs.length === 0) return null

  const useHeader = ds.useHeader

  // Resolve labels
  let labels: string[] = []
  if (ds.labelRef && ds.labelRef.refString) {
    const vals = ss.getChartRefValues(ds.labelRef.refString)
    if (useHeader && vals.length > 0) {
      labels = vals.slice(1).map(v => v != null ? String(v) : '')
    } else {
      labels = vals.map(v => v != null ? String(v) : '')
    }
  }

  // Resolve series
  const datasets = ds.seriesRefs
    .filter(sref => sref.refString)
    .map((sref, seriesIdx) => {
      const vals = ss.getChartRefValues(sref.refString)
      let name = 'Series ' + (seriesIdx + 1)
      let data: number[]

      if (useHeader && vals.length > 0) {
        name = vals[0] != null ? String(vals[0]) : name
        data = vals.slice(1).map(v => {
          if (v == null) return 0
          if (typeof v === 'number') return v
          return Number(v) || 0
        })
      } else {
        data = vals.map(v => {
          if (v == null) return 0
          if (typeof v === 'number') return v
          return Number(v) || 0
        })
      }

      // Auto-generate labels if none provided
      if (labels.length === 0) {
        labels = data.map((_, i) => String(i + 1))
      }

      const color = props.chart.colorScheme[seriesIdx % props.chart.colorScheme.length]

      if (props.chart.chartType === 'pie' || props.chart.chartType === 'doughnut') {
        return {
          label: name,
          data,
          backgroundColor: data.map((_, i) => props.chart.colorScheme[i % props.chart.colorScheme.length]),
          borderWidth: 1,
        }
      }

      return {
        label: name,
        data,
        backgroundColor: color + '99',
        borderColor: color,
        borderWidth: 2,
        fill: props.chart.chartType === 'area',
        tension: props.chart.chartType === 'line' || props.chart.chartType === 'area' ? 0.3 : 0,
      }
    })

  if (datasets.length === 0) return null

  if (props.chart.chartType === 'scatter') {
    const scatterDatasets = ds.seriesRefs
      .filter(sref => sref.refString)
      .map((sref, seriesIdx) => {
        const vals = ss.getChartRefValues(sref.refString)
        let name = 'Series ' + (seriesIdx + 1)
        let numVals: number[]

        if (useHeader && vals.length > 0) {
          name = vals[0] != null ? String(vals[0]) : name
          numVals = vals.slice(1).map(v => typeof v === 'number' ? v : (Number(v) || 0))
        } else {
          numVals = vals.map(v => typeof v === 'number' ? v : (Number(v) || 0))
        }

        const data = numVals.map((v, i) => ({
          x: labels.length > i ? (Number(labels[i]) || i) : i,
          y: v,
        }))
        const color = props.chart.colorScheme[seriesIdx % props.chart.colorScheme.length]
        return {
          label: name,
          data,
          backgroundColor: color,
          borderColor: color,
          borderWidth: 1,
        }
      })
    return { datasets: scatterDatasets }
  }

  return { labels, datasets }
})

const chartOptions = computed(() => {
  const isPie = props.chart.chartType === 'pie' || props.chart.chartType === 'doughnut'
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: {
        display: props.chart.showLegend,
        position: props.chart.legendPosition,
        labels: {
          color: 'var(--text-primary)',
          font: { size: 11 },
        },
      },
      title: { display: false },
    },
    scales: isPie ? {} : {
      x: {
        display: props.chart.showGrid,
        grid: { color: 'var(--border-color)' },
        ticks: { color: 'var(--text-muted)', font: { size: 10 } },
      },
      y: {
        display: props.chart.showGrid,
        grid: { color: 'var(--border-color)' },
        ticks: { color: 'var(--text-muted)', font: { size: 10 } },
      },
    },
  }
})

// ── Config handlers ──

function onTitleInput(e: Event) {
  ss.updateChart(props.chart.id, { title: (e.target as HTMLInputElement).value })
}

function onTypeChange(e: Event) {
  ss.updateChart(props.chart.id, { chartType: (e.target as HTMLSelectElement).value as ChartObject['chartType'] })
}

function onRefFieldClick(mode: string) {
  ss.startChartDataSelection(mode)
}

function onRefInput(mode: string, e: Event) {
  const value = (e.target as HTMLInputElement).value
  ss.setChartDataRef(mode, value)
}

function clearRef(mode: string) {
  ss.setChartDataRef(mode, '')
  if (ss.chartSelectionMode.value === mode) {
    ss.stopChartDataSelection()
  }
}

function onHeaderToggle(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  const ds = props.chart.dataSource
  if (ds) {
    ss.updateChart(props.chart.id, {
      dataSource: { ...ds, useHeader: checked },
    })
  }
}

function onLegendChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  if (val === 'off') {
    ss.updateChart(props.chart.id, { showLegend: false })
  } else {
    ss.updateChart(props.chart.id, { showLegend: true, legendPosition: val as ChartObject['legendPosition'] })
  }
}

function onGridToggle(e: Event) {
  ss.updateChart(props.chart.id, { showGrid: (e.target as HTMLInputElement).checked })
}

// ── Click / Select ──

function onMouseDown(e: MouseEvent) {
  ss.selectChart(props.chart.id)
  startDrag(e)
}

// ── Drag to move ──

let dragState: { startX: number; startY: number; origX: number; origY: number } | null = null

function startDrag(e: MouseEvent) {
  dragState = {
    startX: e.clientX,
    startY: e.clientY,
    origX: props.chart.x,
    origY: props.chart.y,
  }
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
}

function onDragMove(e: MouseEvent) {
  if (!dragState) return
  const zoom = ss.canvasZoom.value
  const dx = (e.clientX - dragState.startX) / zoom
  const dy = (e.clientY - dragState.startY) / zoom
  ss.moveChart(props.chart.id, dragState.origX + dx, dragState.origY + dy)
}

function onDragEnd() {
  dragState = null
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
}

// ── Resize ──

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

let resizeState: {
  dir: ResizeDir
  startX: number
  startY: number
  origX: number
  origY: number
  origW: number
  origH: number
} | null = null

function startResize(dir: ResizeDir, e: MouseEvent) {
  resizeState = {
    dir,
    startX: e.clientX,
    startY: e.clientY,
    origX: props.chart.x,
    origY: props.chart.y,
    origW: props.chart.width,
    origH: props.chart.height,
  }
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
}

function onResizeMove(e: MouseEvent) {
  if (!resizeState) return
  const zoom = ss.canvasZoom.value
  const dx = (e.clientX - resizeState.startX) / zoom
  const dy = (e.clientY - resizeState.startY) / zoom
  const d = resizeState.dir

  let newX = resizeState.origX
  let newY = resizeState.origY
  let newW = resizeState.origW
  let newH = resizeState.origH

  if (d.includes('e')) newW = Math.max(200, resizeState.origW + dx)
  if (d.includes('w')) {
    newW = Math.max(200, resizeState.origW - dx)
    newX = resizeState.origX + resizeState.origW - newW
  }
  if (d.includes('s')) newH = Math.max(150, resizeState.origH + dy)
  if (d.includes('n')) {
    newH = Math.max(150, resizeState.origH - dy)
    newY = resizeState.origY + resizeState.origH - newH
  }

  ss.moveChart(props.chart.id, newX, newY)
  ss.resizeChart(props.chart.id, newW, newH)
}

function onResizeEnd() {
  resizeState = null
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
}
</script>

<style scoped lang="scss">
.canvas-chart {
  position: absolute;
  cursor: default;
  user-select: none;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: visible;
  box-shadow: var(--shadow-sm);
  transition: border-color 0.15s, box-shadow 0.15s;

  &:hover:not(.active) {
    border-color: var(--text-muted);
  }

  &.active {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 1px var(--accent-color);
  }
}

.chart-title-bar {
  flex: 0 0 auto;
  padding: 6px 10px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  min-height: 28px;
}

.chart-title-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  color: inherit;
  padding: 0;

  &::placeholder {
    color: var(--text-muted);
  }
}

.chart-title-text {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.chart-body {
  flex: 1;
  min-height: 0;
  padding: 4px 8px 8px;
  position: relative;
}

.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: var(--text-muted);
}

.chart-empty-icon {
  font-size: 32px;
  margin: 0 0 4px;
}

.chart-empty-text {
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 2px;
}

.chart-empty-sub {
  font-size: 11px;
  margin: 0;
  opacity: 0.7;
}

/* Config panel */
.chart-config {
  position: absolute;
  top: 0;
  right: -240px;
  width: 230px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px;
  box-shadow: var(--shadow-md);
  z-index: 20;
  max-height: 480px;
  overflow-y: auto;
  font-size: 11px;
}

.config-section {
  margin-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 6px;
}

.config-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  color: var(--text-muted);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.add-series-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: var(--accent-color);
    color: white;
    border-color: var(--accent-color);
  }
}

.ref-field {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  background: var(--bg-secondary);
  margin-bottom: 4px;
  cursor: text;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:hover {
    border-color: var(--text-muted);
  }

  &.picking {
    background: var(--bg-primary);
  }
}

.ref-color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ref-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 11px;
  font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
  color: var(--text-primary);
  padding: 0;
  min-width: 0;

  &::placeholder {
    color: var(--text-muted);
    font-family: inherit;
    font-size: 10px;
  }
}

.ref-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  line-height: 1;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: var(--danger-color-alpha);
    color: var(--danger-color);
  }
}

.ref-empty-hint {
  font-size: 10px;
  color: var(--text-muted);
  text-align: center;
  padding: 4px;
}

.config-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 6px;

  > label:first-child {
    flex: 0 0 50px;
    font-weight: 600;
    color: var(--text-muted);
    padding-top: 2px;
    font-size: 11px;
  }

  select {
    flex: 1;
    font-size: 11px;
    padding: 2px 4px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  input[type="checkbox"] {
    margin-top: 3px;
  }
}

.config-hint {
  font-size: 10px;
  color: var(--text-muted);
  padding-top: 3px;
}

/* Resize handles */
.resize-handle {
  position: absolute;
  z-index: 10;
}

.rh-e {
  right: -3px; top: 0; bottom: 0; width: 6px;
  cursor: e-resize;
}
.rh-w {
  left: -3px; top: 0; bottom: 0; width: 6px;
  cursor: w-resize;
}
.rh-s {
  bottom: -3px; left: 0; right: 0; height: 6px;
  cursor: s-resize;
}
.rh-n {
  top: -3px; left: 0; right: 0; height: 6px;
  cursor: n-resize;
}
.rh-se {
  right: -4px; bottom: -4px; width: 8px; height: 8px;
  cursor: se-resize;
  border-radius: 50%;
  background: var(--accent-color);
}
.rh-ne {
  right: -4px; top: -4px; width: 8px; height: 8px;
  cursor: ne-resize;
  border-radius: 50%;
  background: var(--accent-color);
}
.rh-nw {
  left: -4px; top: -4px; width: 8px; height: 8px;
  cursor: nw-resize;
  border-radius: 50%;
  background: var(--accent-color);
}
.rh-sw {
  left: -4px; bottom: -4px; width: 8px; height: 8px;
  cursor: sw-resize;
  border-radius: 50%;
  background: var(--accent-color);
}

.chart-delete {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 11;
  box-shadow: var(--shadow-sm);

  &:hover {
    background: var(--danger-color-alpha);
    color: var(--danger-color);
    border-color: var(--danger-color);
  }
}
</style>
