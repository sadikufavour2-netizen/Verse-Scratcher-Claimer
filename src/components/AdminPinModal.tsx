import React, { useState, useRef, useEffect } from 'react';
import { Lock, Shield, KeyRound, AlertCircle, ArrowRight, X } from 'lucide-react';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (isOpen) {
      setPin(['', '', '', '']);
      setError(null);
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, val: string) => {
    const numeric = val.replace(/[^0-9]/g, '').slice(-1);
    const newPin = [...pin];
    newPin[index] = numeric;
    setPin(newPin);
    setError(null);

    if (numeric && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // If 4 digits entered, verify immediately
    if (index === 3 && numeric) {
      const fullPin = newPin.join('');
      verifyPin(fullPin);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    } else if (e.key === 'Enter') {
      const fullPin = pin.join('');
      if (fullPin.length === 4) {
        verifyPin(fullPin);
      }
    }
  };

  const verifyPin = (enteredPin: string) => {
    setIsVerifying(true);
    setTimeout(() => {
      if (enteredPin === '2004') {
        setIsVerifying(false);
        onSuccess();
      } else {
        setIsVerifying(false);
        setError('Incorrect PIN. Access to Admin Panel denied.');
        setPin(['', '', '', '']);
        inputRefs[0].current?.focus();
      }
    }, 200);
  };

  const handleKeypadPress = (digit: string) => {
    const emptyIndex = pin.findIndex((d) => d === '');
    if (emptyIndex !== -1) {
      handleDigitChange(emptyIndex, digit);
    }
  };

  const handleKeypadBackspace = () => {
    const lastFilledIndex = [...pin].reverse().findIndex((d) => d !== '');
    if (lastFilledIndex !== -1) {
      const actualIndex = 3 - lastFilledIndex;
      const newPin = [...pin];
      newPin[actualIndex] = '';
      setPin(newPin);
      inputRefs[actualIndex].current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div
        id="admin-pin-modal"
        className="w-full max-w-sm rounded-3xl bg-[#080D1C] border border-cyan-500/40 p-6 sm:p-8 shadow-[0_0_50px_rgba(0,229,255,0.2)] relative space-y-6 animate-in fade-in zoom-in duration-200"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header Icon */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-[#00E5FF] shadow-inner">
            <Lock size={26} />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">ADMIN ACCESS PIN</h2>
          <p className="text-xs text-slate-400 max-w-[240px]">
            Enter the 4-digit security PIN to access the Verse Scratcher Admin Panel
          </p>
        </div>

        {/* 4-Box PIN Input */}
        <div className="flex justify-center gap-3">
          {pin.map((digit, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`w-12 h-14 text-center font-mono text-2xl font-black rounded-2xl bg-[#03060F] border transition-all outline-none ${
                error
                  ? 'border-red-500 text-red-400 bg-red-950/20 animate-shake'
                  : digit
                  ? 'border-[#00E5FF] text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.3)]'
                  : 'border-slate-700 text-white focus:border-cyan-400'
              }`}
            />
          ))}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 flex items-center justify-center gap-2 text-red-300 text-xs font-bold text-center">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Numeric Keypad for Mobile & Touch */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeypadPress(num)}
              className="py-3 rounded-xl bg-[#0D1629] hover:bg-[#142340] border border-slate-800 font-mono text-lg font-bold text-white transition-all active:scale-95 cursor-pointer"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setPin(['', '', '', '']);
              setError(null);
            }}
            className="py-3 rounded-xl bg-[#0D1629] hover:bg-[#142340] border border-slate-800 text-xs font-bold text-slate-400 transition-all cursor-pointer"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleKeypadPress('0')}
            className="py-3 rounded-xl bg-[#0D1629] hover:bg-[#142340] border border-slate-800 font-mono text-lg font-bold text-white transition-all active:scale-95 cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleKeypadBackspace}
            className="py-3 rounded-xl bg-[#0D1629] hover:bg-[#142340] border border-slate-800 text-xs font-bold text-slate-400 transition-all cursor-pointer"
          >
            ⌫
          </button>
        </div>

        {/* Action Button */}
        <button
          type="button"
          disabled={pin.join('').length !== 4 || isVerifying}
          onClick={() => verifyPin(pin.join(''))}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#00E5FF] to-[#0099FF] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
        >
          {isVerifying ? (
            <span>Verifying PIN...</span>
          ) : (
            <>
              <KeyRound size={16} />
              <span>Unlock Admin Panel</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
