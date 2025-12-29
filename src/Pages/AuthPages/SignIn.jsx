import React, { useState } from 'react';
import { Form, Formik } from 'formik';
import { useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import PrimaryButton from '../../components/PrimaryButton';
import CustomInput from '../../components/CustomInput';
import AuthLayout from '../../layout/AuthLayout';
import { Method, callApi } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { useAuthStore } from '../../store/authSlice';

export default function SignIn() {
  const [apiError, setApiError] = useState('');
  const setToken = useAuthStore((s) => s.setToken);
  const setRefreshToken = useAuthStore((s) => s.setRefreshToken);
  const setUserData = useAuthStore((s) => s.setUserData);

  const loginValidationSchema = Yup.object({
    email: Yup.string().email('Invalid email').required('email is Required'),
  password: Yup.string()
  .min(8, 'Min 8 chars with upper, lower, number & symbol')
  .matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*]).{8,}$/,
    'Min 8 chars with upper, lower, number & symbol'
  )
  .required('Password is required'),
  });
  const navigate = useNavigate(); 

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  return (
   <AuthLayout
     title="Welcome Back"
     leftTitle="Welcome back to MindCare"
     leftDescription="Sign in to create workout plans, manage videos, and track attendance."
   >
      <Formik
        initialValues={{ email: '', password: '' }}
        validationSchema={loginValidationSchema}
        onSubmit={async (values, { setSubmitting }) => {
          setApiError('');

          await callApi({
            method: Method.POST,
            endPoint: api.signIn,
            bodyParams: {
              email: values.email,
              password: values.password,
            },
            onSuccess: (response) => {
              const accessToken =
                response?.accessToken ||
                response?.data?.accessToken ||
                response?.data?.tokens?.accessToken ||
                response?.tokens?.accessToken;

              const refreshToken =
                response?.refreshToken ||
                response?.data?.refreshToken ||
                response?.data?.tokens?.refreshToken ||
                response?.tokens?.refreshToken;

              const user =
                response?.user ||
                response?.data?.user ||
                response?.data?.data?.user ||
                response?.data?.profile?.user;

              if (typeof accessToken === 'string' && accessToken.length > 0) {
                setToken(accessToken);
              }
              if (typeof refreshToken === 'string' && refreshToken.length > 0) {
                setRefreshToken(refreshToken);
              }
              if (user) {
                setUserData(user);
              }

              if (response?.screen === 'OTP' || response?.status === 'otp_sent') {
                navigate('/OTPPage', { state: { email: values.email } });
                return;
              }

              navigate('/home/dashboard');
            },
            onError: (error) => {
              setApiError(error?.message || 'Sign in failed. Please try again.');
            },
          });

          setSubmitting(false);
        }}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-4">
            <CustomInput name="email" type="email" placeholder="Email address" />
            <CustomInput name="password" type="password" placeholder="Password" />
            {apiError ? (
              <div className="text-red-500 text-sm">{apiError}</div>
            ) : null}
            <div className="flex justify-end">
              <button 
                onClick={handleForgotPassword}
              type="button" className="text-md text-[#8E8E93] hover:text-gray-700 mb-5"  >
                Forgot Password?
              </button>
            </div>
            <PrimaryButton type="submit" className={isSubmitting ? 'opacity-70 pointer-events-none' : ''}>SIGN IN</PrimaryButton>
          </Form>
        )}
      </Formik>
      
        
    </AuthLayout>
  );
}
