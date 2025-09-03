"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

interface ThemeSwitcherProps {
  className?: string;
}

export function ThemeSwitcher({ className = "" }: ThemeSwitcherProps) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="inline-flex h-6 w-11 items-center justify-center">
        <Sun className="h-4 w-4" />
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      <Sun className="h-4 w-4 text-amber-600 dark:text-amber-400 transition-colors" />
      <label className={`relative inline-flex items-center cursor-pointer ${className}`}>
        <input 
          type="checkbox" 
          className="sr-only peer"
          defaultChecked={document.documentElement.classList.contains('dark')}
          onChange={(e) => {
            if (e.target.checked) {
              document.documentElement.classList.add('dark')
              localStorage.theme = 'dark'
            } else {
              document.documentElement.classList.remove('dark')
              localStorage.theme = 'light'
            }
          }}
        />
        <div className={[
          "w-14 h-7 bg-amber-100 dark:bg-emerald-900",
          "rounded-full peer",
          "peer-focus:outline-none",
          "transition-colors duration-300 ease-in-out",
          "after:content-[''] after:absolute after:top-0.5 after:left-0.5",
          "after:bg-white after:border-amber-300 dark:after:border-emerald-700",
          "after:border after:rounded-full after:h-6 after:w-6",
          "after:transition-all after:duration-300 after:ease-in-out",
          "peer-checked:after:translate-x-7 peer-checked:after:border-amber-100",
          "peer-checked:bg-amber-500 dark:peer-checked:bg-amber-600"
        ].join(' ')}>
          <div className="absolute inset-0 flex items-center justify-between px-1.5">
            <span className="text-amber-600 dark:text-amber-400 opacity-0 peer-checked:opacity-100 transition-opacity duration-300">
              <Sun className="h-3.5 w-3.5" />
            </span>
            <span className="text-emerald-100 opacity-0 peer-checked:opacity-100 transition-opacity duration-300">
              <Moon className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </label>
      <Moon className="h-4 w-4 text-emerald-200 dark:text-emerald-300 transition-colors" />
    </div>
  )
}