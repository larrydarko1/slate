// useTableNotes — cell note popup (hover) and note editor dialog.
// Owns: popup visibility/position, editor form state, save/delete/cancel actions.
// Does NOT own: note storage (useSpreadsheet), context menu integration.

import { nextTick, ref, type Ref } from 'vue';
import type { SpreadsheetTable } from '../../types/spreadsheet';
import type { SpreadsheetState } from '../useSpreadsheet';

export function useTableNotes(table: Ref<SpreadsheetTable>, ss: SpreadsheetState) {
    // ── Note popup (hover) ───────────────────────────────────────────────────

    const notePopup = ref({ visible: false, x: 0, y: 0, text: '' });
    const notePopupHovered = ref(false);
    let notePopupTimeout: ReturnType<typeof setTimeout> | null = null;

    function showNotePopup(ci: number, ri: number, e: MouseEvent): void {
        const text = ss.getCellNote(table.value.id, ci, ri);
        if (!text) return;
        if (notePopupTimeout) clearTimeout(notePopupTimeout);
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        notePopup.value = {
            visible: true,
            x: rect.right + 4,
            y: rect.top - 4,
            text,
        };
    }

    function hideNotePopup(): void {
        notePopupTimeout = setTimeout(() => {
            if (!notePopupHovered.value) notePopup.value.visible = false;
        }, 150);
    }

    function onNotePopupEnter(): void {
        notePopupHovered.value = true;
    }

    function onNotePopupLeave(): void {
        notePopupHovered.value = false;
        hideNotePopup();
    }

    // ── Note editor dialog ───────────────────────────────────────────────────

    const noteEditor = ref({ visible: false, x: 0, y: 0, text: '', col: 0, row: 0, hasExisting: false });
    const noteTextareaRef = ref<HTMLTextAreaElement | null>(null);

    function openNoteEditor(ci: number, ri: number, e?: MouseEvent): void {
        const existing = ss.getCellNote(table.value.id, ci, ri);
        let x = e ? e.clientX : window.innerWidth / 2 - 120;
        let y = e ? e.clientY + 8 : window.innerHeight / 2 - 60;
        // Keep within viewport
        x = Math.min(x, window.innerWidth - 280);
        y = Math.min(y, window.innerHeight - 180);
        noteEditor.value = {
            visible: true,
            x,
            y,
            text: existing,
            col: ci,
            row: ri,
            hasExisting: !!existing,
        };
        nextTick(() => noteTextareaRef.value?.focus());
    }

    function saveNoteFromEditor(): void {
        const { col, row, text } = noteEditor.value;
        if (text.trim()) {
            ss.setCellNote(table.value.id, col, row, text.trim());
        } else {
            ss.removeCellNote(table.value.id, col, row);
        }
        noteEditor.value.visible = false;
    }

    function deleteNoteFromEditor(): void {
        const { col, row } = noteEditor.value;
        ss.removeCellNote(table.value.id, col, row);
        noteEditor.value.visible = false;
    }

    function cancelNoteEdit(): void {
        noteEditor.value.visible = false;
    }

    return {
        notePopup,
        noteEditor,
        noteTextareaRef,
        showNotePopup,
        hideNotePopup,
        onNotePopupEnter,
        onNotePopupLeave,
        openNoteEditor,
        saveNoteFromEditor,
        deleteNoteFromEditor,
        cancelNoteEdit,
    };
}
