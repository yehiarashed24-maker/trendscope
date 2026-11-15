import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { spawn, type ChildProcess } from 'child_process'
import fs from 'fs'
import http from 'http'

function autoStartFastApiBackend(): Plugin {
  let backendProc: ChildProcess | null = null
  let bootPromise: Promise<void> | null = null
  let lastHealthyAt = 0
  let monitorTimer: ReturnType<typeof setInterval> | null = null

  const checkBackendAlive = (): Promise<boolean> =>
    new Promise((resolve) => {
      const req = http.get('http://127.0.0.1:8000/api/health', { timeout: 1000 }, (res) => {
        res.resume()
        const ok = res.statusCode === 200
        if (ok) lastHealthyAt = Date.now()
        resolve(ok)
      })
      req.on('error', () => resolve(false))
      req.on('timeout', () => {
        req.destroy()
        resolve(false)
      })
    })

  const waitUntilHealthy = async (timeoutMs = 15000): Promise<boolean> => {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if (await checkBackendAlive()) return true
      await new Promise((r) => setTimeout(r, 250))
    }
    return false
  }

  const ensureBackendRunning = async (forceCheck = false): Promise<void> => {
    if (!forceCheck && Date.now() - lastHealthyAt < 500) {
      return
    }
    if (bootPromise) {
      return bootPromise
    }

    bootPromise = (async () => {
      if (await checkBackendAlive()) {
        return
      }

      if (!backendProc || backendProc.killed || backendProc.exitCode !== null) {
        const venvUvicorn = path.resolve(__dirname, '.venv/bin/uvicorn')
        const cmd = fs.existsSync(venvUvicorn) ? venvUvicorn : 'uvicorn'
        console.log('🚀 [TrendScope] Starting FastAPI scientific backend on http://127.0.0.1:8000 ...')
        const proc = spawn(
          cmd,
          ['backend.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload', '--reload-dir', 'backend'],
          {
            cwd: __dirname,
            stdio: 'inherit',
          }
        )
        backendProc = proc
        proc.on('exit', () => {
          if (backendProc === proc) {
            backendProc = null
            lastHealthyAt = 0
          }
        })
        proc.on('error', (err) => {
          console.error('✖ [TrendScope] Failed to start FastAPI backend:', err.message)
          if (backendProc === proc) {
            backendProc = null
            lastHealthyAt = 0
          }
        })
      }

      const ready = await waitUntilHealthy(15000)
      if (ready) {
        console.log('✓ [TrendScope] FastAPI scientific backend ready on http://127.0.0.1:8000')
      }
    })().finally(() => {
      bootPromise = null
    })

    return bootPromise
  }

  const stopBackend = () => {
    if (monitorTimer) {
      clearInterval(monitorTimer)
      monitorTimer = null
    }
    if (backendProc && !backendProc.killed) {
      backendProc.kill('SIGTERM')
      backendProc = null
    }
  }

  return {
    name: 'trendscope-auto-fastapi',
    configureServer(server) {
      // 1. Start backend immediately on Vite boot
      void ensureBackendRunning(true)

      // 2. Keep backend alive if an external uvicorn exits while Vite is open
      monitorTimer = setInterval(() => {
        if (Date.now() - lastHealthyAt > 10000) {
          void ensureBackendRunning(true)
        }
      }, 5000)
      monitorTimer.unref?.()

      // 3. Ensure backend is ready before proxying any /api request
      server.middlewares.use('/api', async (_req, _res, next) => {
        try {
          await ensureBackendRunning(false)
        } catch {
          // Let proxy handle if recovery failed
        }
        next()
      })

      const apiProxy = server.config.server.proxy?.['/api']
      if (apiProxy && typeof apiProxy === 'object') {
        const prevConfigure = apiProxy.configure
        apiProxy.configure = (proxy, options) => {
          prevConfigure?.(proxy, options)
          proxy.on('error', () => {
            lastHealthyAt = 0
            void ensureBackendRunning(true)
          })
        }
      }

      server.httpServer?.once('close', stopBackend)
      process.once('SIGINT', stopBackend)
      process.once('SIGTERM', stopBackend)
      process.once('exit', stopBackend)
    },
  }
}

export default defineConfig({
  plugins: [react(), autoStartFastApiBackend()],
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', 'zustand'],
          'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          'vendor-maplibre': ['maplibre-gl'],
          'vendor-plotly': ['plotly.js-dist-min'],
        },
      },
    },
  },
})
