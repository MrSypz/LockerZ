import { getCurrentWindow } from "@tauri-apps/api/window"
import { Minus, X } from "lucide-react"

const win = getCurrentWindow()

// Maximise icon as a plain SVG — lucide's Square has rounded corners which looks wrong here
function MaximiseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
      <rect x="1" y="1" width="8" height="8" />
    </svg>
  )
}

export function TitleBar() {
  return (
    /*
     * The entire bar is the drag region. Window-control buttons sit inside it —
     * Tauri v2 lets interactive children capture clicks even within drag regions.
     */
    <div
      data-tauri-drag-region
      className="h-8 flex items-center justify-between shrink-0 bg-black/20 select-none"
    >
      {/* App name — drags the window */}
      <span
        data-tauri-drag-region
        className="pl-3 text-xs font-semibold text-white/50 tracking-wide"
      >
        LockerZ
      </span>

      {/* Window controls — NOT part of the drag region so clicks register */}
      <div className="flex h-full">
        <button
          onClick={() => win.minimize()}
          className="h-full w-10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white"
          aria-label="Minimise"
        >
          <Minus size={12} strokeWidth={1.5} />
        </button>
        <button
          onClick={() => win.toggleMaximize()}
          className="h-full w-10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white"
          aria-label="Maximise"
        >
          <MaximiseIcon />
        </button>
        <button
          onClick={() => win.close()}
          className="h-full w-10 flex items-center justify-center text-white/50 hover:bg-red-500 hover:text-white"
          aria-label="Close"
        >
          <X size={12} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}
