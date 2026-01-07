'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface ChangePasswordButtonProps {
  email: string;
}

export default function ChangePasswordButton({ email }: ChangePasswordButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const supabase = createClientComponentClient();

  const handleChangePassword = async () => {
    setIsLoading(true);
    setMessage(null);
    setIsError(false);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      setMessage('Password reset email sent! Check your inbox (and spam folder).');
      setIsError(false);
    } catch (err: any) {
      setMessage(err.message || 'Failed to send reset email');
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleChangePassword}
        disabled={isLoading}
        className="border border-[#333] rounded px-4 py-2 text-white hover:border-[#E51B23] transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Sending...' : 'Change Password'}
      </button>
      <p className="text-xs text-[#666] mt-1">
        You will receive an email to reset your password.
      </p>
      {message && (
        <p className={`text-xs mt-2 ${isError ? 'text-[#E51B23]' : 'text-[#FFDE59]'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
