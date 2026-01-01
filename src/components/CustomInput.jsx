import React, { useMemo, useState } from 'react'
import { ErrorMessage, useField } from 'formik';
import { Eye, EyeOff } from 'lucide-react';


function CustomInput({ label, withToggle = false, ...props }) {
  const [field, meta] = useField(props);
  const [showPassword, setShowPassword] = useState(false);
  const shouldShowToggle = withToggle && props?.type === 'password';
  const inputType = useMemo(() => {
    if (!shouldShowToggle) return props?.type;
    return showPassword ? 'text' : 'password';
  }, [props?.type, shouldShowToggle, showPassword]);
  return (
    <div className="mt-4 w-full mb-2">
      <div className={shouldShowToggle ? 'relative' : ''}>
        <input
          {...field}
          {...props}
          type={inputType}
          className={`w-full md:w-[390px] h-[48px] px-4 py-2 border ${meta.touched && meta.error ? 'border-red-500' : 'border-[#A1B0CC]'
            } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder-gray-400 opacity-100 rotate-0 ${shouldShowToggle ? 'pr-10' : ''
            }`}
        />
        {shouldShowToggle ? (
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-3 flex items-center text-[#8E8E93]"
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : null}
      </div>
      {meta.touched && meta.error && (
        <p className="text-red-500 text-sm mt-1">{meta.error}</p>
      )}
    </div>
  )
}

export default CustomInput
