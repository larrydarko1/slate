// useTableContextMenus — context menu builders for column, row, and cell right-click.
// Owns: menu item assembly, merge/unmerge options, note integration.
// Does NOT own: context menu rendering (ContextMenu.vue), note UI (useTableNotes).

import type { Ref } from 'vue';
import type { SpreadsheetTable } from '../../types/spreadsheet';
import type { SpreadsheetState } from '../useSpreadsheet';
import type { MenuItem } from '../../components/ContextMenu.vue';
import type ContextMenu from '../../components/ContextMenu.vue';

export function useTableContextMenus(
    table: Ref<SpreadsheetTable>,
    ss: SpreadsheetState,
    ctxMenu: Ref<InstanceType<typeof ContextMenu> | null>,
    openNoteEditor: (ci: number, ri: number, e?: MouseEvent) => void,
) {
    function onColumnContextMenu(ci: number, e: MouseEvent): void {
        const sr = ss.getNormalizedSelection();
        const t = table.value;
        const isMultiCol =
            sr &&
            sr.tableId === t.id &&
            sr.startRow === 0 &&
            sr.endRow === t.rows.length - 1 &&
            sr.endCol > sr.startCol &&
            ci >= sr.startCol &&
            ci <= sr.endCol;
        const colCount = isMultiCol ? sr!.endCol - sr!.startCol + 1 : 1;

        const items: MenuItem[] = [
            { label: 'Sort Ascending ↑', action: () => ss.sortColumn(table.value.id, ci, 'asc') },
            { label: 'Sort Descending ↓', action: () => ss.sortColumn(table.value.id, ci, 'desc') },
            { label: '', separator: true },
            { label: 'Insert Column Before', action: () => ss.insertColumnAt(table.value.id, ci) },
            { label: 'Insert Column After', action: () => ss.insertColumnAt(table.value.id, ci + 1) },
            { label: '', separator: true },
            isMultiCol
                ? { label: `Delete ${colCount} Columns`, danger: true, action: () => ss.deleteSelectedColumns() }
                : { label: 'Delete Column', danger: true, action: () => ss.deleteColumn(table.value.id, ci) },
        ];
        ctxMenu.value?.open(e.clientX, e.clientY, items);
    }

    function onRowContextMenu(ri: number, e: MouseEvent): void {
        const sr = ss.getNormalizedSelection();
        const t = table.value;
        const isMultiRow =
            sr &&
            sr.tableId === t.id &&
            sr.startCol === 0 &&
            sr.endCol === t.columns.length - 1 &&
            sr.endRow > sr.startRow &&
            ri >= sr.startRow &&
            ri <= sr.endRow;
        const rowCount = isMultiRow ? sr!.endRow - sr!.startRow + 1 : 1;

        const items: MenuItem[] = [
            { label: 'Insert Row Above', action: () => ss.insertRowAt(table.value.id, ri) },
            { label: 'Insert Row Below', action: () => ss.insertRowAt(table.value.id, ri + 1) },
            { label: '', separator: true },
            isMultiRow
                ? { label: `Delete ${rowCount} Rows`, danger: true, action: () => ss.deleteSelectedRows() }
                : { label: 'Delete Row', danger: true, action: () => ss.deleteRow(table.value.id, ri) },
        ];
        ctxMenu.value?.open(e.clientX, e.clientY, items);
    }

    function onCellContextMenu(ci: number, ri: number, e: MouseEvent): void {
        ss.selectCell(table.value.id, ci, ri);
        const mergeAtCell = ss.getMergedRegionAt(table.value.id, ci, ri);
        const hasSelection = ss.hasMultiCellSelection();
        const cellHasNote = ss.cellHasNote(table.value.id, ci, ri);

        const items: MenuItem[] = [
            { label: 'Copy', action: () => ss.copyCells() },
            { label: 'Cut', action: () => ss.cutCells() },
            { label: 'Paste', action: () => ss.pasteCells() },
            { label: '', separator: true },
            { label: cellHasNote ? 'Edit Note' : 'Add Note', action: () => openNoteEditor(ci, ri, e) },
            ...(cellHasNote
                ? [{ label: 'Delete Note', danger: true, action: () => ss.removeCellNote(table.value.id, ci, ri) }]
                : []),
            { label: '', separator: true },
            { label: 'Clear Cell', action: () => ss.clearActiveCell() },
            { label: '', separator: true },
        ];

        // Merge options
        if (hasSelection && !ss.selectionHasMerge()) {
            items.push({ label: 'Merge Cells', action: () => ss.mergeSelection() });
        }
        if (mergeAtCell || ss.selectionHasMerge()) {
            items.push({
                label: 'Unmerge Cells',
                action: () => {
                    if (mergeAtCell) ss.unmergeCells(table.value.id, ci, ri);
                    else ss.unmergeSelection();
                },
            });
        }
        if (hasSelection || mergeAtCell) {
            items.push({ label: '', separator: true });
        }

        items.push(
            { label: 'Insert Row Above', action: () => ss.insertRowAt(table.value.id, ri) },
            { label: 'Insert Row Below', action: () => ss.insertRowAt(table.value.id, ri + 1) },
            { label: 'Insert Column Before', action: () => ss.insertColumnAt(table.value.id, ci) },
            { label: 'Insert Column After', action: () => ss.insertColumnAt(table.value.id, ci + 1) },
            { label: '', separator: true },
            {
                label: 'Delete Row',
                danger: true,
                action: () => {
                    if (ss.isRowInSelection(table.value.id, ri)) ss.deleteSelectedRows();
                    else ss.deleteRow(table.value.id, ri);
                },
            },
            {
                label: 'Delete Column',
                danger: true,
                action: () => {
                    if (ss.isColInSelection(table.value.id, ci)) ss.deleteSelectedColumns();
                    else ss.deleteColumn(table.value.id, ci);
                },
            },
        );
        ctxMenu.value?.open(e.clientX, e.clientY, items);
    }

    return {
        onColumnContextMenu,
        onRowContextMenu,
        onCellContextMenu,
    };
}
