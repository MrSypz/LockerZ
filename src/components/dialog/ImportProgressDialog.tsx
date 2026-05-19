import { useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { motion, AnimatePresence } from 'framer-motion'
import { PackageOpen, Check, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface ImportResult {
  category_name: string
  image_count: number
  owner: string
  original_name: string
  was_renamed: boolean
}

interface Props {
  packPath: string
  onClose: () => void
  onDone: (result: ImportResult) => void
}

type Status = 'running' | 'done' | 'error'

interface ProgressPayload {
  import_id: string
  current: number
  total: number
  filename: string
}

interface DonePayload {
  import_id: string
}

export default function ImportProgressDialog({ packPath, onClose, onDone }: Props) {
  const [status, setStatus] = useState<Status>('running')
  const [current, setCurrent] = useState(0)
  const [total, setTotal] = useState(0)
  const [currentFile, setCurrentFile] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const importId = useRef(crypto.randomUUID())

  useEffect(() => {
    const id = importId.current
    const unlisteners: (() => void)[] = []

    listen<ProgressPayload>('pack://import/progress', (e) => {
      if (e.payload.import_id !== id) return
      setCurrent(e.payload.current)
      setTotal(e.payload.total)
      setCurrentFile(e.payload.filename)
    }).then(u => unlisteners.push(u))

    listen<DonePayload>('pack://import/done', (e) => {
      if (e.payload.import_id !== id) return
      setStatus('done')
    }).then(u => unlisteners.push(u))

    invoke<ImportResult>('import_category_pack', {
      packPath,
      importId: id,
    })
      .then((r) => {
        setResult(r)
        onDone(r)
      })
      .catch((err: string) => {
        setError(err)
        setStatus('error')
      })

    return () => { unlisteners.forEach(fn => fn()) }
  }, [])

  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  const packName = packPath.split(/[\\/]/).pop() ?? packPath

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
            <p className="text-sm font-semibold truncate">Importing Pack</p>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{packName}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <AnimatePresence mode="wait">
            {status === 'running' && (
              <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    animate={{ width: total > 0 ? `${pct}%` : '100%' }}
                    transition={total > 0 ? { ease: 'linear', duration: 0.15 } : { repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                    style={total === 0 ? { opacity: 0.5 } : {}}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground truncate">
                    {total === 0 ? 'Reading pack…' : currentFile ? `Extracting ${currentFile}` : 'Preparing…'}
                  </p>
                  {total > 0 && (
                    <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                      {current} / {total}
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            {status === 'done' && result && (
              <motion.div key="done" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 shrink-0">
                    <Check className="h-4 w-4 text-emerald-400" strokeWidth={2.5} />
                  </span>
                  <span className="text-foreground font-medium">
                    Done — {result.image_count} file{result.image_count !== 1 ? 's' : ''} imported
                  </span>
                </div>
                <div className="pl-9 space-y-0.5">
                  <p className="text-xs text-muted-foreground">
                    Category: <span className="text-foreground font-medium">{result.category_name}</span>
                  </p>
                  {result.owner && (
                    <p className="text-xs text-muted-foreground">by {result.owner}</p>
                  )}
                  {result.was_renamed && (
                    <p className="text-xs text-amber-400">Renamed to avoid collision</p>
                  )}
                </div>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div key="error" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/15 shrink-0">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </span>
                  <span className="text-foreground font-medium">Import failed</span>
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
          {status !== 'running' && (
            <Button size="sm" onClick={onClose}>Close</Button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
