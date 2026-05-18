import { getCurrentWindow } from "@tauri-apps/api/window"

const win = getCurrentWindow()

export function TitleBar() {
  return (
    <div
      data-tauri-drag-region
      className="h-8 flex items-center justify-between shrink-0 bg-black/20 select-none"
    >
      <span
        data-tauri-drag-region
        className="pl-3 text-xs font-semibold text-white/50 tracking-wide"
      >
        LockerZ
      </span>

      <div className="flex h-full">
        <button
          onClick={() => win.minimize()}
          className="h-full w-10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white"
          aria-label="Minimise"
        >
          <img src="/mdi_window-minimize.svg" alt="" className="w-4 h-4 opacity-50 group-hover:opacity-100" style={{ filter: "invert(1)" }} />
        </button>
        <button
          onClick={() => win.toggleMaximize()}
          className="h-full w-10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white"
          aria-label="Maximise"
        >
          <img src="/mdi_window-maximize.svg" alt="" className="w-4 h-4 opacity-50 group-hover:opacity-100" style={{ filter: "invert(1)" }} />
        </button>
        <button
          onClick={() => win.close()}
          className="h-full w-10 flex items-center justify-center text-white/50 hover:bg-red-500 hover:text-white"
          aria-label="Close"
        >
          <img src="/mdi_close.svg" alt="" className="w-4 h-4 opacity-50 group-hover:opacity-100" style={{ filter: "invert(1)" }} />
        </button>
      </div>
    </div>
  )
}
