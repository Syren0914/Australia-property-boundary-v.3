import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

function Switch({
  className,
  style,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      style={{
        display: 'inline-flex',
        height: '18px',
        width: '32px',
        flexShrink: 0,
        alignItems: 'center',
        borderRadius: '9999px',
        border: '1px solid transparent',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.2s ease',
        outline: 'none',
        cursor: 'pointer',
        backgroundColor: props.checked ? '#374151' : '#e5e7eb',
        ...style
      }}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        style={{
          backgroundColor: 'white',
          pointerEvents: 'none',
          display: 'block',
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          transition: 'transform 0.2s ease',
          transform: props.checked ? 'translateX(14px)' : 'translateX(2px)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
