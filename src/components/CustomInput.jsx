import React from 'react'
import { ErrorMessage, useField } from 'formik';


function CustomInput({ label, ...props }) {
     const [field, meta] = useField(props);
  return (
     <div className="mt-4 w-full mb-2">
      <input
        {...field}
        {...props}
        className={`w-full px-4 py-2 border ${
          meta.touched && meta.error ? 'border-red-500' : 'border-[#A1B0CC]'
        } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder-gray-400`}
      />
      {meta.touched && meta.error && (
        <p className="text-red-500 text-sm mt-1">{meta.error}</p>
      )}
    </div>
  )
}

export default CustomInput