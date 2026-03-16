// useFillHandle — drag-to-fill (autofill) logic for SpreadsheetTable.
// Owns: fill drag state, fill range computation, fill preview highlighting.
// Does NOT own: cell value writes (delegated to ss.fillCells).

import { ref, type Ref } from 'vue';
import type { SpreadsheetTable } from '../../types/spreadsheet';
import type { SpreadsheetState } from '../useSpreadsheet';

interface FillDragState {
    active: boolean;
    sourceRange: { startCol: number; startRow: number; endCol: number; endRow: number };
    currentCol: number;
    currentRow: number;
}

export function useFillHandle(table: Ref<SpreadsheetTable>, ss: SpreadsheetState, tableEl: Ref<HTMLElement | null>) {
    const fillDragState = ref<FillDragState | null>(null);

    // ── Queries ──────────────────────────────────────────────────────────────

    function isSelectionCorner(ci: number, ri: number): boolean {
        if (ss.activeCell.value?.tableId !== table.value.id) return false;
        const sr = ss.getNormalizedSelection();
        if (!sr || sr.tableId !== table.value.id) return false;
        return ci === sr.endCol && ri === sr.endRow;
    }

    function isCellInFillPreview(ci: number, ri: number): boolean {
        const st = fillDragState.value;
        if (!st || !st.active) return false;
        const fr = getFillRange();
        if (!fr) return false;
        const inSource =
            ci >= st.sourceRange.startCol &&
            ci <= st.sourceRange.endCol &&
            ri >= st.sourceRange.startRow &&
            ri <= st.sourceRange.endRow;
        if (inSource) return false;
        return ci >= fr.startCol && ci <= fr.endCol && ri >= fr.startRow && ri <= fr.endRow;
    }

    // ── Fill range computation ───────────────────────────────────────────────

    function getFillRange(): { startCol: number; startRow: number; endCol: number; endRow: number } | null {
        const st = fillDragState.value;
        if (!st || !st.active) return null;
        const src = st.sourceRange;
        const dCol = st.currentCol - src.endCol;
        const dRow = st.currentRow - src.endRow;
        const dColNeg = src.startCol - st.currentCol;
        const dRowNeg = src.startRow - st.currentRow;

        // Fill down
        if (dRow > 0 && dRow >= Math.abs(dCol)) {
            return { startCol: src.startCol, startRow: src.startRow, endCol: src.endCol, endRow: st.currentRow };
        }
        // Fill right
        if (dCol > 0 && dCol >= Math.abs(dRow)) {
            return { startCol: src.startCol, startRow: src.startRow, endCol: st.currentCol, endRow: src.endRow };
        }
        // Fill up
        if (dRowNeg > 0 && dRowNeg >= dColNeg) {
            return { startCol: src.startCol, startRow: st.currentRow, endCol: src.endCol, endRow: src.endRow };
        }
        // Fill left
        if (dColNeg > 0) {
            return { startCol: st.currentCol, startRow: src.startRow, endCol: src.endCol, endRow: src.endRow };
        }
        return null;
    }

    // ── Drag handlers ────────────────────────────────────────────────────────

    function startFillDrag(_ci: number, _ri: number, _e: MouseEvent): void {
        const sr = ss.getNormalizedSelection();
        if (!sr || sr.tableId !== table.value.id) return;
        fillDragState.value = {
            active: true,
            sourceRange: { startCol: sr.startCol, startRow: sr.startRow, endCol: sr.endCol, endRow: sr.endRow },
            currentCol: sr.endCol,
            currentRow: sr.endRow,
        };
        document.addEventListener('mousemove', onFillDragMove);
        document.addEventListener('mouseup', onFillDragEnd);
    }

    function onFillDragMove(e: MouseEvent): void {
        const st = fillDragState.value;
        if (!st || !st.active) return;
        const gridWrapper = tableEl.value?.querySelector('.table-grid-wrapper');
        if (!gridWrapper) return;

        // Determine target row
        const rows = gridWrapper.querySelectorAll('tbody tr');
        let targetRow = st.currentRow;
        for (let ri = 0; ri < table.value.rows.length; ri++) {
            const tr = rows[ri];
            if (!tr) continue;
            const rect = tr.getBoundingClientRect();
            if (e.clientY >= rect.top && e.clientY < rect.bottom) {
                targetRow = ri;
                break;
            }
            if (e.clientY >= rect.bottom) targetRow = ri;
        }

        // Determine target column
        const headerCells = gridWrapper.querySelectorAll('thead th.col-header');
        let targetCol = st.currentCol;
        for (let ci = 0; ci < headerCells.length; ci++) {
            const rect = headerCells[ci].getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX < rect.right) {
                targetCol = ci;
                break;
            }
            if (e.clientX >= rect.right) targetCol = ci;
        }

        st.currentCol = targetCol;
        st.currentRow = targetRow;
    }

    function onFillDragEnd(): void {
        const st = fillDragState.value;
        if (st && st.active) {
            const fr = getFillRange();
            if (fr) {
                const tableId = table.value.id;
                ss.fillCells(
                    tableId,
                    {
                        tableId,
                        startCol: st.sourceRange.startCol,
                        startRow: st.sourceRange.startRow,
                        endCol: st.sourceRange.endCol,
                        endRow: st.sourceRange.endRow,
                    },
                    {
                        tableId,
                        startCol: fr.startCol,
                        startRow: fr.startRow,
                        endCol: fr.endCol,
                        endRow: fr.endRow,
                    },
                );
                ss.selectionRange.value = {
                    tableId,
                    startCol: fr.startCol,
                    startRow: fr.startRow,
                    endCol: fr.endCol,
                    endRow: fr.endRow,
                };
            }
        }
        fillDragState.value = null;
        document.removeEventListener('mousemove', onFillDragMove);
        document.removeEventListener('mouseup', onFillDragEnd);
    }

    return {
        fillDragState,
        isSelectionCorner,
        isCellInFillPreview,
        startFillDrag,
    };
}
