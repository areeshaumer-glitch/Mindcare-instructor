import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Method, callApi } from '../network/NetworkManager';
import { api } from '../network/Environment';
import { useAuthStore } from '../store/authSlice';
const ChangePassword = () => {
  const token = useAuthStore((s) => s.token);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const handleSubmit = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!token) {
      setErrorMessage('Please login again to change password');
      return;
    }

    const trimmedPassword = String(password || '').trim();
    const trimmedConfirm = String(confirmPassword || '').trim();

    if (!trimmedPassword) {
      setErrorMessage('Password is required');
      return;
    }
    if (trimmedPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters');
      return;
    }
    if (trimmedPassword !== trimmedConfirm) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setIsSaving(true);
    try {
      await callApi({
        method: Method.POST,
        endPoint: api.instructorChangePassword,
        bodyParams: {
          password: trimmedPassword,
          confirmPassword: trimmedConfirm,
        },
        onSuccess: (res) => {
          setPassword('');
          setConfirmPassword('');
          setSuccessMessage(res?.message || 'Password updated successfully');
        },
        onError: (err) => {
          const message =
            err?.message ||
            err?.data?.message ||
            err?.response?.data?.message ||
            'Failed to update password';
          setErrorMessage(message);
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full p-8">
      <div className="space-y-6 w-full max-w-2xl">
        <div className="text-left">
          <h1 className="text-3xl font-semibold mb-2" style={{ color: "#333" }}>Change Password</h1>
          <h3 className="text-gray-500 text-sm mb-4">Update your password to keep your account secure</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-left text-gray-700">New Password</label>
            <div className="relative" style={{ width: '390px', height: '40px' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your new password"
                className="w-full h-full border border-gray-200 rounded-xl px-4 py-2 pr-10 focus:outline-none transition-all"
                value={password}
                onChange={(e) => {
                  setErrorMessage('');
                  setSuccessMessage('');
                  setPassword(e.target.value);
                }}
                onFocus={(e) => e.target.style.borderColor = "#008080"}
                onBlur={(e) => e.target.style.borderColor = "#E5E7EB"}
                disabled={isSaving}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-left text-gray-700">Confirm Password</label>
            <div className="relative" style={{ width: '390px', height: '40px' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter your new password"
                className="w-full h-full border border-gray-200 rounded-xl px-4 py-2 pr-10 focus:outline-none transition-all"
                value={confirmPassword}
                onChange={(e) => {
                  setErrorMessage('');
                  setSuccessMessage('');
                  setConfirmPassword(e.target.value);
                }}
                onFocus={(e) => e.target.style.borderColor = "#008080"}
                onBlur={(e) => e.target.style.borderColor = "#E5E7EB"}
                disabled={isSaving}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>



        <div className="flex justify-end pt-4">
          <button
            className="text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50 shadow-md"
            style={{
              backgroundColor: "#008080",
              width: "332px",
              height: "50px",
              borderRadius: "12px"
            }}
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? 'Updating...' : 'Update'}
          </button>
        </div>
      </div>
    </div>
  );
};
export default ChangePassword;
