import React from 'react'

export default function PinPad({ value = '', onChange, onConfirm, maxLength = 6 }) {
  const handleKey = (key) => {
    if (key === 'back') {
      onChange(value.slice(0, -1))
    } else if (key === 'confirm') {
      onConfirm?.(value)
    } else if (value.length < maxLength) {
      const newVal = value + key
      onChange(newVal)
      if (newVal.length === maxLength) {
        setTimeout(() => onConfirm?.(newVal), 100)
      }
    }
  }

  const dots = Array.from({ length: maxLength }, (_, i) => (
    <div
      key={i}
      className={`w-3 h-3 rounded-full transition-all duration-150 ${i < value.length ? 'bg-brand-red scale-110' : 'bg-gray-300'}`}
    />
  ))

  const keys = ['1','2','3','4','5','6','7','8','9','back','0','confirm']

  return (
    <div>
      <div className="flex justify-center gap-3 py-4 mb-2">
        {dots}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => handleKey(k)}
            className={`h-14 rounded-2xl border text-lg font-bold transition-all duration-100 active:scale-95
              ${k === 'confirm'
                ? 'bg-brand-red text-white border-brand-red hover:bg-brand-red-dark text-sm'
                : k === 'back'
                  ? 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 text-sm'
                  : 'bg-white text-gray-800 border-gray-200 hover:border-brand-red hover:text-brand-red'
              }`}
          >
            {k === 'back' ? '⌫' : k === 'confirm' ? 'Ingresar' : k}
          </button>
        ))}
      </div>
    </div>
  )
}
