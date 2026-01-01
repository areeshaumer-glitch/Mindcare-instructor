

import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import AuthLayout from '../../layout/AuthLayout';
import PrimaryButton from '../../components/PrimaryButton';
import CustomInput from '../../components/CustomInput';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Method, callApi } from '../../network/NetworkManager';
import { api } from '../../network/Environment';

const ForgotPasswordSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email').required('Email is required'),
});
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');
  return (
    <AuthLayout
      title="Forgot Password"
      leftTitle="Reset your password"
      leftDescription="Enter your email to receive a verification code."
    >
      <p className="text-center text-gray-500 mb-6">
        Enter your email and we’ll send a 6-digit code to reset your password.
      </p>
      <Formik
        initialValues={{ email: '' }}
        validationSchema={ForgotPasswordSchema}
        onSubmit={async (values, { setSubmitting }) => {
          setApiError('');

          await callApi({
            method: Method.POST,
            endPoint: api.forgotPassword,
            bodyParams: { email: values.email },
            onSuccess: (response) => {
              if (response?.screen === 'OTP' || response?.status === 'otp_sent') {
                navigate('/OTPPage', {
                  state: {
                    email: values.email,
                    otpCooldown: response?.otpCooldown,
                    flow: 'forgot_password',
                  },
                });
                return;
              }

              navigate('/OTPPage', { state: { email: values.email } });
            },
            onError: () => { },
          });

          setSubmitting(false);
        }}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-3">
            <CustomInput name="email" type="email" placeholder="Email address" />
            <PrimaryButton type="submit" className={`${isSubmitting ? 'opacity-70 pointer-events-none' : ''} mt-2`}>
              SEND OTP
            </PrimaryButton>
          </Form>
        )}
      </Formik>
    </AuthLayout >
  );
};
