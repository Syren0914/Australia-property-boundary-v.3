import React from "react"
import { Switch } from "./switch"
import { Moon, Sun } from "lucide-react"

interface ThemeToggleProps {
  isDark: boolean
  onToggle: (isDark: boolean) => void
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDark, onToggle }) => {
  return (
    <div className="flex items-center space-x-3">
      <div className={`flex items-center justify-center w-5 h-5 transition-all duration-300 ${
        isDark ? 'opacity-40 scale-90' : 'opacity-100 scale-100'
      }`}>
        <Sun className="h-4 w-4 text-yellow-500" />
      </div>
      
      <Switch
        checked={isDark}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-slate-700 data-[state=unchecked]:bg-slate-200 transition-all duration-300"
      />
      
      <div className={`flex items-center justify-center w-5 h-5 transition-all duration-300 ${
        isDark ? 'opacity-100 scale-100' : 'opacity-40 scale-90'
      }`}>
        <Moon className="h-4 w-4 text-blue-400" />
      </div>
    </div>
  )
} 