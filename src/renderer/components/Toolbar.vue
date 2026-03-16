<script setup lang="ts">
// Toolbar — main formatting toolbar for cells and text boxes.
// Owns: font/color/type pickers, cell formatting actions, text box style controls.
// Does NOT own: cell state (useCells), text box state (useTextBoxes), undo/redo (useUndoRedo).

import { ref, computed, onMounted, onBeforeUnmount, inject } from 'vue';
import { SPREADSHEET_KEY } from '../composables/useSpreadsheet';
import type { TextBox } from '../types/spreadsheet';
import ColorPicker from './toolbar/ColorPicker.vue';
import ToolbarTypeSelector from './toolbar/ToolbarTypeSelector.vue';
import ToolbarFontPicker from './toolbar/ToolbarFontPicker.vue';
import { colorPalette } from './toolbar/colorPalette';

defineEmits<{
    addTable: [];
    addTextBox: [];
    addChart: [];
    newFile: [];
    openFile: [];
    saveFile: [];
    mergeCells: [];
    unmergeCells: [];
}>();

const ss = inject(SPREADSHEET_KEY)!;

// ── TextBox formatting ──

const hasActiveTextBox = computed(() => !!ss.activeTextBoxId.value);

const activeTextBoxData = computed(() => {
    if (!ss.activeTextBoxId.value) return null;
    return ss.findTextBox(ss.activeTextBoxId.value) ?? null;
});

const tbColorMenuType = ref<'tbText' | 'tbFill' | 'tbBorder' | null>(null);
const tbLastTextColor = ref('#000000');
const tbLastFillColor = ref('#FFFFFF');
const tbLastBorderColor = ref('#CCCCCC');

function tbUpdateProp<K extends keyof TextBox>(prop: K, value: TextBox[K]) {
    const id = ss.activeTextBoxId.value;
    if (!id) return;
    ss.updateTextBox(id, { [prop]: value } as Partial<TextBox>);
}

function tbToggleBold() {
    const current = activeTextBoxData.value?.fontWeight ?? 'normal';
    tbUpdateProp('fontWeight', current === 'bold' ? 'normal' : 'bold');
}

function tbToggleItalic() {
    const current = activeTextBoxData.value?.fontStyle ?? 'normal';
    tbUpdateProp('fontStyle', current === 'italic' ? 'normal' : 'italic');
}

function tbSetAlign(a: 'left' | 'center' | 'right') {
    tbUpdateProp('align', a);
}

function tbIncreaseFontSize() {
    const size = activeTextBoxData.value?.fontSize ?? 14;
    tbUpdateProp('fontSize', Math.min(size + 2, 120));
}

function tbDecreaseFontSize() {
    const size = activeTextBoxData.value?.fontSize ?? 14;
    tbUpdateProp('fontSize', Math.max(size - 2, 8));
}

function tbApplyTextColor(color: string) {
    tbUpdateProp('textColor', color);
    if (color) tbLastTextColor.value = color;
    tbColorMenuType.value = null;
}

function tbApplyFillColor(color: string) {
    tbUpdateProp('bgColor', color);
    if (color) tbLastFillColor.value = color;
    tbColorMenuType.value = null;
}

function tbApplyBorderColor(color: string) {
    tbUpdateProp('borderColor', color);
    if (color) {
        tbLastBorderColor.value = color;
        // auto-set borderWidth to 1 if not set
        if (!activeTextBoxData.value?.borderWidth) tbUpdateProp('borderWidth', 1);
    }
    tbColorMenuType.value = null;
}

// ── Unified formatting (works for both cells and text boxes) ──

const fmtIsBold = computed(() => {
    if (hasActiveTextBox.value) return activeTextBoxData.value?.fontWeight === 'bold';
    const fmt = ss.getActiveCellFormat();
    return fmt?.bold ?? false;
});

const fmtIsItalic = computed(() => {
    if (hasActiveTextBox.value) return activeTextBoxData.value?.fontStyle === 'italic';
    const fmt = ss.getActiveCellFormat();
    return fmt?.italic ?? false;
});

const fmtAlign = computed<'left' | 'center' | 'right'>(() => {
    if (hasActiveTextBox.value) return activeTextBoxData.value?.align ?? 'left';
    const fmt = ss.getActiveCellFormat();
    return fmt?.align ?? 'left';
});

function fmtToggleBold() {
    if (hasActiveTextBox.value) {
        tbToggleBold();
    } else if (hasActiveCell.value) {
        const current = ss.getActiveCellFormat()?.bold ?? false;
        ss.setSelectionFormat({ bold: !current });
    }
}

function fmtToggleItalic() {
    if (hasActiveTextBox.value) {
        tbToggleItalic();
    } else if (hasActiveCell.value) {
        const current = ss.getActiveCellFormat()?.italic ?? false;
        ss.setSelectionFormat({ italic: !current });
    }
}

function fmtSetAlign(a: 'left' | 'center' | 'right') {
    if (hasActiveTextBox.value) {
        tbSetAlign(a);
    } else if (hasActiveCell.value) {
        ss.setSelectionFormat({ align: a });
    }
}

// ── Type selector ──

const hasActiveCell = computed(() => !!ss.activeCell.value);

// ── Cell coloring ──

const colorMenuType = ref<'text' | 'fill' | null>(null);
const lastTextColor = ref('#000000');
const lastFillColor = ref('#FFEB3B');

const currentTextColor = computed(() => {
    const fmt = ss.getActiveCellFormat();
    return fmt?.textColor ?? null;
});

const currentFillColor = computed(() => {
    const fmt = ss.getActiveCellFormat();
    return fmt?.bgColor ?? null;
});

function applyTextColor(color: string) {
    ss.setSelectionFormat({ textColor: color });
    lastTextColor.value = color;
    colorMenuType.value = null;
}

function applyFillColor(color: string) {
    ss.setSelectionFormat({ bgColor: color });
    lastFillColor.value = color;
    colorMenuType.value = null;
}

function clearTextColor() {
    ss.setSelectionFormat({ textColor: undefined });
    colorMenuType.value = null;
}

function clearFillColor() {
    ss.setSelectionFormat({ bgColor: undefined });
    colorMenuType.value = null;
}

function onClickOutside() {
    // ColorPicker uses @click.stop internally, so any click reaching here is outside
    colorMenuType.value = null;
    tbColorMenuType.value = null;
}

// ── Theme ──

const isDark = ref(false);

onMounted(() => {
    const saved = localStorage.getItem('slate-theme');
    if (saved) {
        isDark.value = saved === 'dark';
    } else {
        isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    applyTheme();
    document.addEventListener('click', onClickOutside);
});

onBeforeUnmount(() => {
    document.removeEventListener('click', onClickOutside);
});

function toggleTheme() {
    isDark.value = !isDark.value;
    applyTheme();
    localStorage.setItem('slate-theme', isDark.value ? 'dark' : 'light');
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light');
}
</script>

<template>
    <div class="toolbar">
        <div class="toolbar-group">
            <button class="tb has-label" title="New (⌘N)" @click="$emit('newFile')">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                        d="M3.5 1.5h6l3 3v8a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z"
                        stroke="currentColor"
                        stroke-width="1.3"
                        stroke-linejoin="round"
                    />
                    <path
                        d="M9.5 1.5v3h3"
                        stroke="currentColor"
                        stroke-width="1.3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
                <span>New</span>
            </button>
            <button class="tb has-label" title="Open (⌘O)" @click="$emit('openFile')">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                        d="M2 12.5V4a1 1 0 0 1 1-1h3.5l1.5 1.5H13a1 1 0 0 1 1 1V7"
                        stroke="currentColor"
                        stroke-width="1.3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                    <path
                        d="M1.5 12.5l1.5-5h10l1.5 5H1.5Z"
                        stroke="currentColor"
                        stroke-width="1.3"
                        stroke-linejoin="round"
                    />
                </svg>
                <span>Open</span>
            </button>
            <button class="tb has-label" title="Save (⌘S)" @click="$emit('saveFile')">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                        d="M12.5 14.5h-9a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1h7l3 3v9a1 1 0 0 1-1 1Z"
                        stroke="currentColor"
                        stroke-width="1.3"
                        stroke-linejoin="round"
                    />
                    <path d="M5.5 14.5v-4h5v4" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
                    <path
                        d="M5.5 1.5v3h4"
                        stroke="currentColor"
                        stroke-width="1.3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
                <span>Save</span>
            </button>
        </div>

        <div class="toolbar-sep" aria-hidden="true"></div>

        <div class="toolbar-group">
            <button class="tb has-label" title="Add Table" @click="$emit('addTable')">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" stroke-width="1.3" />
                    <path d="M2 5.5h12M2 9.5h12M6 5.5v6.5" stroke="currentColor" stroke-width="1.3" />
                </svg>
                <span>Table</span>
            </button>
            <button class="tb has-label" title="Add Text Box" @click="$emit('addTextBox')">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3" />
                    <path d="M5.5 6v4M5.5 6h5M8 6v4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
                </svg>
                <span>Text</span>
            </button>
            <button class="tb has-label" title="Add Chart" @click="$emit('addChart')">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" stroke-width="1.3" />
                    <rect x="4" y="8" width="2" height="4" rx="0.5" fill="currentColor" />
                    <rect x="7" y="5" width="2" height="7" rx="0.5" fill="currentColor" />
                    <rect x="10" y="6.5" width="2" height="5.5" rx="0.5" fill="currentColor" />
                </svg>
                <span>Chart</span>
            </button>
        </div>

        <div class="toolbar-sep" aria-hidden="true"></div>

        <div class="toolbar-group">
            <button class="tb has-label" title="Merge cells" @click="$emit('mergeCells')">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3" />
                    <path d="M2 8h12" stroke="currentColor" stroke-width="1.3" />
                    <path d="M6 3v5M10 3v5" stroke="currentColor" stroke-width="1.3" stroke-dasharray="1.8 1.2" />
                </svg>
                <span>Merge</span>
            </button>
            <button class="tb has-label" title="Unmerge cells" @click="$emit('unmergeCells')">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3" />
                    <path d="M2 8h12M6 3v10M10 3v10" stroke="currentColor" stroke-width="1.3" />
                </svg>
                <span>Unmerge</span>
            </button>
        </div>

        <div class="toolbar-sep" aria-hidden="true"></div>
        \n\n
        <!-- Cell type selector -->\n <ToolbarTypeSelector />\n\n
        <div class="toolbar-sep" aria-hidden="true"></div>
        \n\n
        <!-- Cell coloring -->
        <div class="toolbar-group">
            <!-- Text color -->
            <ColorPicker
                label="Text Color"
                clear-label="No color"
                :current-color="currentTextColor"
                :last-color="lastTextColor"
                :palette="colorPalette"
                :disabled="!hasActiveCell"
                :open="colorMenuType === 'text'"
                @apply="applyTextColor"
                @clear="clearTextColor"
                @update:open="(v: boolean) => (colorMenuType = v ? 'text' : null)"
            >
                <template #icon>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                            d="M4.5 12L8 3l3.5 9"
                            stroke="currentColor"
                            stroke-width="1.3"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                        <path d="M5.75 9h4.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
                    </svg>
                </template>
            </ColorPicker>

            <!-- Fill color -->
            <ColorPicker
                label="Fill Color"
                clear-label="No fill"
                :current-color="currentFillColor"
                :last-color="lastFillColor"
                :palette="colorPalette"
                :disabled="!hasActiveCell"
                :open="colorMenuType === 'fill'"
                @apply="applyFillColor"
                @clear="clearFillColor"
                @update:open="(v: boolean) => (colorMenuType = v ? 'fill' : null)"
            >
                <template #icon>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="2.5" y="2.5" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.3" />
                        <rect x="4" y="4" width="8" height="8" rx="1" :fill="lastFillColor" opacity="0.5" />
                    </svg>
                </template>
            </ColorPicker>
        </div>

        <!-- ═══ Formatting controls (shown for active cell OR text box) ═══ -->
        <template v-if="hasActiveCell || hasActiveTextBox">
            <div class="toolbar-sep" aria-hidden="true"></div>

            <!-- Font family picker -->
            <ToolbarFontPicker />

            <!-- Font size (text box only) -->
            <template v-if="hasActiveTextBox">
                <div class="toolbar-sep" aria-hidden="true"></div>
                <div class="toolbar-group">
                    <button class="tb" title="Decrease font size" @click="tbDecreaseFontSize">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3 7h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
                        </svg>
                    </button>
                    <span class="tb-font-size">{{ activeTextBoxData?.fontSize ?? 14 }}</span>
                    <button class="tb" title="Increase font size" @click="tbIncreaseFontSize">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M7 3v8M3 7h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
                        </svg>
                    </button>
                </div>
            </template>

            <div class="toolbar-sep" aria-hidden="true"></div>
            <div class="toolbar-group">
                <button class="tb" :class="{ 'tb-active': fmtIsBold }" title="Bold" @click="fmtToggleBold">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path
                            d="M4 2.5h4a2.5 2.5 0 0 1 0 5H4V2.5ZM4 7.5h4.5a2.5 2.5 0 0 1 0 5H4V7.5Z"
                            stroke="currentColor"
                            stroke-width="1.6"
                            stroke-linejoin="round"
                        />
                    </svg>
                </button>
                <button class="tb" :class="{ 'tb-active': fmtIsItalic }" title="Italic" @click="fmtToggleItalic">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path
                            d="M9 2.5H6M8 11.5H5M8 2.5L6 11.5"
                            stroke="currentColor"
                            stroke-width="1.4"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                </button>
            </div>

            <div class="toolbar-sep" aria-hidden="true"></div>

            <!-- Alignment -->
            <div class="toolbar-group">
                <button
                    class="tb"
                    :class="{ 'tb-active': fmtAlign === 'left' }"
                    title="Align Left"
                    @click="fmtSetAlign('left')"
                >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path
                            d="M2 3h10M2 6h6M2 9h8M2 12h5"
                            stroke="currentColor"
                            stroke-width="1.3"
                            stroke-linecap="round"
                        />
                    </svg>
                </button>
                <button
                    class="tb"
                    :class="{ 'tb-active': fmtAlign === 'center' }"
                    title="Align Center"
                    @click="fmtSetAlign('center')"
                >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path
                            d="M2 3h10M4 6h6M3 9h8M4.5 12h5"
                            stroke="currentColor"
                            stroke-width="1.3"
                            stroke-linecap="round"
                        />
                    </svg>
                </button>
                <button
                    class="tb"
                    :class="{ 'tb-active': fmtAlign === 'right' }"
                    title="Align Right"
                    @click="fmtSetAlign('right')"
                >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path
                            d="M2 3h10M8 6h4M6 9h6M9 12h3"
                            stroke="currentColor"
                            stroke-width="1.3"
                            stroke-linecap="round"
                        />
                    </svg>
                </button>
            </div>

            <!-- TextBox-specific: colors & border -->
            <template v-if="hasActiveTextBox">
                <div class="toolbar-sep" aria-hidden="true"></div>

                <!-- TextBox text color -->
                <div class="toolbar-group">
                    <ColorPicker
                        label="Text Color"
                        clear-label="No color"
                        :current-color="activeTextBoxData?.textColor"
                        :last-color="tbLastTextColor"
                        :palette="colorPalette"
                        :open="tbColorMenuType === 'tbText'"
                        @apply="tbApplyTextColor"
                        @clear="tbApplyTextColor('')"
                        @update:open="(v: boolean) => (tbColorMenuType = v ? 'tbText' : null)"
                    >
                        <template #icon>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path
                                    d="M4.5 12L8 3l3.5 9"
                                    stroke="currentColor"
                                    stroke-width="1.3"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                                <path d="M5.75 9h4.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
                            </svg>
                        </template>
                    </ColorPicker>

                    <!-- TextBox fill color -->
                    <ColorPicker
                        label="Fill Color"
                        clear-label="No fill"
                        :current-color="activeTextBoxData?.bgColor"
                        :last-color="tbLastFillColor"
                        :palette="colorPalette"
                        :open="tbColorMenuType === 'tbFill'"
                        @apply="tbApplyFillColor"
                        @clear="tbApplyFillColor('')"
                        @update:open="(v: boolean) => (tbColorMenuType = v ? 'tbFill' : null)"
                    >
                        <template #icon>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <rect
                                    x="2.5"
                                    y="2.5"
                                    width="11"
                                    height="11"
                                    rx="2"
                                    stroke="currentColor"
                                    stroke-width="1.3"
                                />
                                <rect x="4" y="4" width="8" height="8" rx="1" :fill="tbLastFillColor" opacity="0.5" />
                            </svg>
                        </template>
                    </ColorPicker>
                </div>

                <div class="toolbar-sep" aria-hidden="true"></div>

                <!-- TextBox border -->
                <div class="toolbar-group">
                    <ColorPicker
                        label="Border"
                        clear-label="No border"
                        :current-color="activeTextBoxData?.borderColor"
                        :last-color="tbLastBorderColor"
                        :palette="colorPalette"
                        :show-custom-input="false"
                        :open="tbColorMenuType === 'tbBorder'"
                        @apply="tbApplyBorderColor"
                        @clear="
                            tbApplyBorderColor('');
                            tbUpdateProp('borderWidth', 0);
                        "
                        @update:open="(v: boolean) => (tbColorMenuType = v ? 'tbBorder' : null)"
                    >
                        <template #icon>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <rect
                                    x="2.5"
                                    y="2.5"
                                    width="11"
                                    height="11"
                                    rx="2"
                                    stroke="currentColor"
                                    stroke-width="1.3"
                                    stroke-dasharray="2.5 1.5"
                                />
                            </svg>
                        </template>
                        <template #extra>
                            <div class="color-custom-row">
                                <label class="color-custom-label">Width:</label>
                                <select
                                    class="tb-border-select"
                                    :value="activeTextBoxData?.borderWidth ?? 0"
                                    @change="
                                        tbUpdateProp('borderWidth', Number(($event.target as HTMLSelectElement).value))
                                    "
                                >
                                    <option value="0">None</option>
                                    <option value="1">1px</option>
                                    <option value="2">2px</option>
                                    <option value="3">3px</option>
                                    <option value="4">4px</option>
                                </select>
                            </div>
                            <div class="color-custom-row">
                                <label class="color-custom-label">Radius:</label>
                                <select
                                    class="tb-border-select"
                                    :value="activeTextBoxData?.borderRadius ?? 0"
                                    @change="
                                        tbUpdateProp('borderRadius', Number(($event.target as HTMLSelectElement).value))
                                    "
                                >
                                    <option value="0">0</option>
                                    <option value="4">4px</option>
                                    <option value="8">8px</option>
                                    <option value="12">12px</option>
                                    <option value="16">16px</option>
                                    <option value="24">24px</option>
                                </select>
                            </div>
                        </template>
                    </ColorPicker>
                </div>
            </template>
        </template>

        <div class="toolbar-spacer"></div>

        <div class="toolbar-group">
            <button class="tb theme-toggle" :title="isDark ? 'Light mode' : 'Dark mode'" @click="toggleTheme">
                <!-- Sun icon (shown in dark mode) -->
                <svg v-if="isDark" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.3" />
                    <path
                        d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.75 3.75l1.06 1.06M11.19 11.19l1.06 1.06M12.25 3.75l-1.06 1.06M4.81 11.19l-1.06 1.06"
                        stroke="currentColor"
                        stroke-width="1.3"
                        stroke-linecap="round"
                    />
                </svg>
                <!-- Moon icon (shown in light mode) -->
                <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                        d="M13.5 9.5a5.5 5.5 0 0 1-7-7 5.5 5.5 0 1 0 7 7Z"
                        stroke="currentColor"
                        stroke-width="1.3"
                        stroke-linejoin="round"
                    />
                </svg>
            </button>
        </div>
    </div>
</template>

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
    overflow: visible;
    position: relative;
    z-index: 50;
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
    transition:
        background 0.12s,
        color 0.12s;
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

/* ── TextBox toolbar extras ── */

.tb-active {
    background: var(--accent-color-alpha, rgba(66, 133, 244, 0.12)) !important;
    color: var(--accent-color) !important;
}

.tb-font-size {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 26px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
    background: var(--bg-tertiary);
    border-radius: 4px;
    padding: 0 4px;
    user-select: none;
}

// Slot content inside ColorPicker inherits parent scope
.color-custom-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--border-color);
}

.color-custom-label {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 500;
}

.tb-border-select {
    flex: 1;
    height: 22px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 11px;
    padding: 0 4px;
    cursor: pointer;
    outline: none;

    &:focus {
        border-color: var(--accent-color);
    }
}
</style>
