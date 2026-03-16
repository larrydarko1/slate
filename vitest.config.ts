import { defineConfig, configDefaults } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue()],
    test: {
        globals: true,
        exclude: [...configDefaults.exclude],
        projects: [
            {
                test: {
                    name: 'renderer',
                    environment: 'jsdom',
                    include: ['tests/**/*.test.ts'],
                    exclude: ['tests/main/**'],
                },
            },
            {
                test: {
                    name: 'main',
                    environment: 'node',
                    include: ['tests/main/**/*.test.ts'],
                },
            },
        ],
    },
});
