import React from "react"
import { Switch } from "./switch"
import { Moon, Sun } from "lucide-react"

interface ThemeToggleProps {
  isDark: boolean
  onToggle: (isDark: boolean) => void
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDark, onToggle }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      justifyContent: 'center',
      width: '100%'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '16px',
        height: '16px',
        transition: 'all 0.3s ease',
        opacity: isDark ? 0.4 : 1,
        transform: isDark ? 'scale(0.9)' : 'scale(1)'
      }}>
        <Sun style={{ width: '14px', height: '14px', color: '#f59e0b' , fontWeight: 'bold' }} />
      </div>
      
      <Switch
        checked={isDark}
        onCheckedChange={onToggle}
        style={{
          transition: 'all 0.3s ease'
        }}
      />
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '16px',
        height: '16px',
        transition: 'all 0.3s ease',
        opacity: isDark ? 1 : 0.4,
        transform: isDark ? 'scale(1)' : 'scale(0.9)'
      }}>
        <Moon style={{ width: '14px', height: '14px', color: '#60a5fa' }} />
      </div>
    </div>
  )
} 