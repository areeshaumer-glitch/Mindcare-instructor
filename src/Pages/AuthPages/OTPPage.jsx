
import AuthLayout from '../../layout/AuthLayout';
import PrimaryButton from '../../components/PrimaryButton';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Method, callApi } from '../../network/NetworkManager';
import { api } from '../../network/Environment';



const OTPPage = () => {
     const [otp, setOtp] = useState(['', '', '', '','','']);
     const location = useLocation();
     const email = location?.state?.email;
     const otpCooldown = location?.state?.otpCooldown;
     const flow = location?.state?.flow;
     const [seconds, setSeconds] = useState(
      typeof otpCooldown === 'number' ? otpCooldown : 60
     );
     const otpHelpText = email
       ? `Enter the 6-digit code sent to ${email}.`
       : 'Enter the 6-digit code sent to your email.';
     const [apiError, setApiError] = useState('');
     const [isSubmitting, setIsSubmitting] = useState(false);
     const navigate =useNavigate();
      useEffect(() => {
   
    if (seconds > 0) {
      const timer = setTimeout(() => {
        setSeconds(seconds - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [seconds]);
//   useFocusEffect(
//   useCallback(() => {
//     setOtp(""); // Clea return () => {}; // No cleanup needed
//   setSeconds(60); 
//   }, [])
//);
  const formatTime = (sec) => {
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return `${minutes < 10 ? `0${minutes}` : minutes}:${
      seconds < 10 ? `0${seconds}` : seconds
    }`;
  };
  const handleChange = (value , index) => {
    if (!/^\d?$/.test(value)) return
    const updated = [...otp]
    updated[index] = value
    setOtp(updated)
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleVerify = async () => {
    setApiError('');
    const otpValue = otp.join('');

    if (!email) {
      setApiError('Email is missing. Please restart the reset flow.');
      return;
    }

    if (otpValue.length !== 6) {
      setApiError('Please enter the 6-digit OTP.');
      return;
    }

    if (flow === 'forgot_password') {
      setIsSubmitting(true);
      await callApi({
        method: Method.POST,
        endPoint: api.verifyOtpForgotPassword,
        bodyParams: { email, otp: otpValue },
        onSuccess: () => {
          navigate('/create-password', { state: { email, flow } });
        },
        onError: (error) => {
          setApiError(error?.message || 'Invalid or expired OTP.');
        },
      });
      setIsSubmitting(false);
      return;
    }

    navigate('/create-password', { state: { email, flow } });
  };

  return (
    <AuthLayout
      title="Verify Code"
      leftTitle="Verify your email"
      leftDescription="Enter the code to continue and secure your account."
    >
     <p className="text-center text-gray-500 mb-6">
     {otpHelpText}
      </p>
     <div className="flex justify-between mb-3">
        {otp.map((digit, index) => (
          <input
            key={index}
            id={`otp-${index}`}
            type="text"
            maxLength={1}
           value={digit}
           onChange={(e) => handleChange(e.target.value, index)}
            className=" mb-2 w-14 h-14 text-center text-2xl font-medium border border-[#A1B0CC] border-[1px] rounded-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ))}
      </div>
      {apiError ? <div className="text-red-500 text-sm mb-2">{apiError}</div> : null}
<div className=" mb-6 mt-6">
 <p className="text-center text-lg text-teal-700 mb-2 mt=12">
            {formatTime(seconds)}
      </p>
    <button
  onClick={() => setSeconds(60)}
  disabled={seconds > 0}
  className={`
     w-full flex justify-center mb-6
    ${seconds > 0 ? 'text-gray-400 font-normal cursor-not-allowed' : 'text-black font-semibold'}
  `}
>
  <p className="text-center text-sm ">
    Send Again
  </p>
</button>
</div>
            <PrimaryButton onClick={handleVerify} className={isSubmitting ? 'opacity-70 pointer-events-none' : ''}>
              VERIFY
            </PrimaryButton>
      
    </AuthLayout>
  );
};

export default OTPPage;
















