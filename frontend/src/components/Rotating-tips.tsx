import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const tips = [
  "Tip: Press ESC to open the command palette",
  "Tip: Use Ctrl+S (Cmd+S on Mac) to save your work",
  "Tip: Double-click a file to open it in a new tab",
  "Tip: Right-click for more options",
  "Tip: Use Ctrl+F (Cmd+F on Mac) to search within a file"
]

export function RotatingTips() {
  const [currentTipIndex, setCurrentTipIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prevIndex) => (prevIndex + 1) % tips.length)
    }, 3000) // Change tip every 3 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-6 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTipIndex}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="text-sm text-gray-400 text-center"
        >
          {tips[currentTipIndex]}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

