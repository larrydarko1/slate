import { describe, it, expect } from 'vitest';
import path from 'path';
import { assertInsideBoundary, assertSafeFileName } from '../../../src/main/lib/validation';

// ── assertInsideBoundary ─────────────────────────────────────────────────────

describe('assertInsideBoundary', () => {
    const root = '/app/data';

    it('allows a path inside the root', () => {
        const result = assertInsideBoundary('/app/data/file.slate', root);
        expect(result).toBe(path.resolve('/app/data/file.slate'));
    });

    it('allows a nested path inside the root', () => {
        const result = assertInsideBoundary('/app/data/sub/deep/file.txt', root);
        expect(result).toBe(path.resolve('/app/data/sub/deep/file.txt'));
    });

    it('allows the root itself', () => {
        const result = assertInsideBoundary('/app/data', root);
        expect(result).toBe(path.resolve('/app/data'));
    });

    it('rejects a path that escapes via ..', () => {
        expect(() => assertInsideBoundary('/app/data/../secrets', root)).toThrow('outside the allowed directory');
    });

    it('rejects a completely unrelated path', () => {
        expect(() => assertInsideBoundary('/etc/passwd', root)).toThrow('outside the allowed directory');
    });

    it('rejects a sibling directory with a prefix collision', () => {
        // /app/data-evil starts with /app/data but is NOT inside /app/data/
        expect(() => assertInsideBoundary('/app/data-evil/file.txt', root)).toThrow('outside the allowed directory');
    });

    it('handles relative path tricks', () => {
        expect(() => assertInsideBoundary('/app/data/../../etc/passwd', root)).toThrow('outside the allowed directory');
    });
});

// ── assertSafeFileName ───────────────────────────────────────────────────────

describe('assertSafeFileName', () => {
    it('accepts a plain filename', () => {
        expect(() => assertSafeFileName('document.slate')).not.toThrow();
    });

    it('accepts a filename with spaces', () => {
        expect(() => assertSafeFileName('my document.slate')).not.toThrow();
    });

    it('accepts a filename with dots', () => {
        expect(() => assertSafeFileName('v1.2.3.slate')).not.toThrow();
    });

    it('rejects an empty string', () => {
        expect(() => assertSafeFileName('')).toThrow('Invalid name');
    });

    it('rejects a path with forward slashes', () => {
        expect(() => assertSafeFileName('sub/file.slate')).toThrow('Invalid name');
    });

    it('rejects a path with backslashes', () => {
        expect(() => assertSafeFileName('sub\\file.slate')).toThrow('Invalid name');
    });

    it('rejects directory traversal', () => {
        expect(() => assertSafeFileName('../secret.txt')).toThrow('Invalid name');
    });

    it('rejects a bare dot-dot', () => {
        expect(() => assertSafeFileName('..')).toThrow('Invalid name');
    });
});
