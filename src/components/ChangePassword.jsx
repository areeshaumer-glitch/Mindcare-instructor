import React, { useState } from 'react';
import { Method, callApi } from '../network/NetworkManager';
import { api } from '../network/Environment';
import { useAuthStore } from '../store/authSlice';
const ChangePassword = () => {
const token = useAuthStore((s) => s.token);
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
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
    <div className="flex items-center justify-center ">
      <div className="space-y-4 items-center justify-center text-center w-full max-w-md">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Change Password</h1>
          <h3 className="text-sm mb-4">Password change here</h3>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-left">Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:border-teal-600"
            value={password}
            onChange={(e) => {
              setErrorMessage('');
              setSuccessMessage('');
              setPassword(e.target.value);
            }}
            disabled={isSaving}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-left">Confirm Password</label>
          <input
            type="password"
            placeholder="Re-enter password"
            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:border-teal-600"
            value={confirmPassword}
            onChange={(e) => {
              setErrorMessage('');
              setSuccessMessage('');
              setConfirmPassword(e.target.value);
            }}
            disabled={isSaving}
          />
        </div>
        {!!errorMessage && <div className="text-sm text-red-600 text-left">{errorMessage}</div>}
        {!!successMessage && (
          <div className="text-sm text-green-700 text-left">{successMessage}</div>
        )}
        <button
          className="bg-teal-700 text-white px-6 py-2 rounded-md hover:bg-teal-800 w-full disabled:opacity-60"
          onClick={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? 'Updating...' : 'Update'}
        </button>
      </div>
    </div>
  );
};
export default ChangePassword;
