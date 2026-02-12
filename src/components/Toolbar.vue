<template>
  <div class="toolbar">
    <div class="toolbar-group">
      <button class="tb" @click="$emit('newFile')" title="New (⌘N)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 1.5h6l3 3v8a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M9.5 1.5v3h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="tb" @click="$emit('openFile')" title="Open (⌘O)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 12.5V4a1 1 0 0 1 1-1h3.5l1.5 1.5H13a1 1 0 0 1 1 1V7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M1.5 12.5l1.5-5h10l1.5 5H1.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
      </button>
      <button class="tb" @click="$emit('saveFile')" title="Save (⌘S)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12.5 14.5h-9a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1h7l3 3v9a1 1 0 0 1-1 1Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M5.5 14.5v-4h5v4" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M5.5 1.5v3h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>

    <div class="toolbar-sep" aria-hidden="true"></div>

    <div class="toolbar-group">
      <button class="tb has-label" @click="$emit('addTable')" title="Add Table">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M2 5.5h12M2 9.5h12M6 5.5v6.5" stroke="currentColor" stroke-width="1.3"/></svg>
        <span>Table</span>
      </button>
    </div>

    <div class="toolbar-sep" aria-hidden="true"></div>

    <div class="toolbar-group">
      <button class="tb" @click="$emit('mergeCells')" title="Merge cells">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M2 8h12" stroke="currentColor" stroke-width="1.3"/><path d="M6 3v5M10 3v5" stroke="currentColor" stroke-width="1.3" stroke-dasharray="1.8 1.2"/></svg>
      </button>
      <button class="tb" @click="$emit('unmergeCells')" title="Unmerge cells">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M2 8h12M6 3v10M10 3v10" stroke="currentColor" stroke-width="1.3"/></svg>
      </button>
    </div>

    <div class="toolbar-spacer"></div>

    <div class="toolbar-group">
      <button class="tb theme-toggle" @click="toggleTheme" :title="isDark ? 'Light mode' : 'Dark mode'">
        <!-- Sun icon (shown in dark mode) -->
        <svg v-if="isDark" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.3"/>
          <path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.75 3.75l1.06 1.06M11.19 11.19l1.06 1.06M12.25 3.75l-1.06 1.06M4.81 11.19l-1.06 1.06" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        <!-- Moon icon (shown in light mode) -->
        <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M13.5 9.5a5.5 5.5 0 0 1-7-7 5.5 5.5 0 1 0 7 7Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

defineEmits<{ 
  addTable: []
  newFile: []
  openFile: []
  saveFile: []
  mergeCells: []
  unmergeCells: []
}>()

const isDark = ref(false)

onMounted(() => {
  const saved = localStorage.getItem('slate-theme')
  if (saved) {
    isDark.value = saved === 'dark'
  } else {
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  applyTheme()
})

function toggleTheme() {
  isDark.value = !isDark.value
  applyTheme()
  localStorage.setItem('slate-theme', isDark.value ? 'dark' : 'light')
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
}
</script>

<style scoped lang="scss">
.toolbar {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 10px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  user-select: none;
  flex-shrink: 0;
  gap: 2px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 1px;
}

.toolbar-sep {
  width: 1px;
  height: 16px;
  background: var(--border-color);
  margin: 0 6px;
  flex-shrink: 0;
}

.toolbar-spacer {
  flex: 1;
}

/* ── Toolbar button ── */

.tb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 30px;
  min-width: 30px;
  padding: 0 7px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  -webkit-app-region: no-drag;

  svg {
    flex-shrink: 0;
  }

  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  &:active {
    background: var(--bg-selected);
  }

  &.has-label {
    padding: 0 10px 0 7px;

    span {
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.01em;
    }
  }

  &.theme-toggle {
    margin-left: 2px;
  }
}
</style>
