import { useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { motion, AnimatePresence } from 'framer-motion'
import { PackageOpen, Check, X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  categoryName: string
  outputPath: string
  onClose: () => void
}

type Status = 'running' | 'done' | 'cancelled' | 'error'

interface ProgressPayload {
  export_id: string
  current: number
  total: number
  filename: string
}

interface DonePayload {
  export_id: string
}

export default function ExportProgressDialog({ categoryName, outputPath, onClose }: Props) {
  const [status, setStatus] = useState<Status>('running')
  const [current, setCurrent] = useState(0)
  const [total, setTotal] = useState(0)
  const [currentFile, setCurrentFile] = useState('')
  const [error, setError] = useState<string | null>(null)
  const exportId = useRef(crypto.randomUUID())
  const cancelledRef = useRef(false)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const id = exportId.current
    const unlisteners: (() => void)[] = []

    listen<ProgressPayload>('pack://export/progress', (e) => {
      if (e.payload.export_id !== id) return
      setCurrent(e.payload.current)
      setTotal(e.payload.total)
      setCurrentFile(e.payload.filename)
    }).then(u => unlisteners.push(u))

    listen<DonePayload>('pack://export/done', (e) => {
      if (e.payload.export_id !== id) return
      setStatus('done')
    }).then(u => unlisteners.push(u))

    invoke('export_category_pack', {
      categoryName,
      outputPath,
      exportId: id,
    }).catch((err: string) => {
      if (cancelledRef.current || err === 'cancelled') {
        setStatus('cancelled')
      } else {
        setError(err)
        setStatus('error')
      }
    })

    return () => { unlisteners.forEach(fn => fn()) }
  }, [])

  const handleCancel = async () => {
    cancelledRef.current = true
    await invoke('cancel_export_pack', { exportId: exportId.current })
  }

  const pct = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 8 }}
        transition={{ duration: 0.2 }}
        className="bg-card border rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
      >
        {/* Title bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <PackageOpen className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">Exporting "{categoryName}"</p>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{outputPath}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <AnimatePresence mode="wait">
            {status === 'running' && (
              <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {/* Progress bar */}
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    animate={{ width: `${pct}%` }}
                    transition={{ ease: 'linear', duration: 0.15 }}
                  />
                </div>
                {/* File label + counter */}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground truncate">
                    {currentFile ? `Packing ${currentFile}` : 'Preparing…'}
                  </p>
                  <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                    {current} / {total}
                  </span>
                </div>
              </motion.div>
            )}

            {status === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2.5 text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 shrink-0">
                  <Check className="h-4 w-4 text-emerald-400" strokeWidth={2.5} />
                </span>
                <span className="text-foreground font-medium">
                  Done — {total} file{total !== 1 ? 's' : ''} packed
                </span>
              </motion.div>
            )}

            {status === 'cancelled' && (
              <motion.div key="cancelled" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2.5 text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted shrink-0">
                  <X className="h-4 w-4 text-muted-foreground" />
                </span>
                <span className="text-muted-foreground">
                  Cancelled — partial file removed
                </span>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div key="error" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/15 shrink-0">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </span>
                  <span className="text-foreground font-medium">Export failed</span>
                </div>
                {error && (
                  <p className="text-xs text-muted-foreground pl-9 break-all">{error}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="flex justify-end px-5 pb-4">
          {status === 'running' ? (
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <X className="h-3.5 w-3.5 mr-1.5" />
              Cancel
            </Button>
          ) : (
            <Button size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
