import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ['./tsconfig.json'] }),
    tanstackStart({
      // Entrada do servidor em src/server.ts (wrapper de erros do SSR)
      server: { entry: 'server' },
      // Impede que código de servidor vaze para o bundle do navegador
      importProtection: {
        behavior: 'error',
        client: { files: ['**/server/**'], specifiers: ['server-only'] },
      },
    }),
    // Nitro só no build: gera um servidor Node autocontido em .output/
    ...(command === 'build' ? [nitro({ preset: 'node-server' })] : []),
    viteReact(),
  ],
  resolve: {
    // Uma única cópia de React e TanStack no monorepo
    dedupe: ['react', 'react-dom', '@tanstack/react-query', '@tanstack/react-router'],
  },
}));
