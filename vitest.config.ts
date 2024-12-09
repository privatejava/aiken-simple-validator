/// <reference types="vitest" />
import { loadEnv } from 'vite'
import { defineConfig } from 'vite'


export default defineConfig(({ mode }) => ({
    test: {
      testTimeout: 120000,
      hookTimeout: 15000,
      dir: "__tests__/",
      // mode defines what ".env.{mode}" file to choose if exists
      env: loadEnv(mode, process.cwd(), ''),
    },
}))