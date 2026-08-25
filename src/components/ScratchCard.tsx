import React, { useRef, useEffect, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, CheckCircle2, Eye, Gift } from 'lucide-react';
import { ScratcherTicket } from '../types';

interface ScratchCardProps {
  ticket: ScratcherTicket;
  onScratchedComplete: (ticketId: string) => void;
  onClaimClick: (ticket: ScratcherTicket) => void;
}

export const ScratchCard: React.FC<ScratchCardProps> = ({
  ticket,
  onScratchedComplete,
  onClaimClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [percentScratched, setPercentScratched] = useState(ticket.scratchPercentage || (ticket.status !== 'unscratched' ? 100 : 0));
  const isCompleted = ticket.status !== 'unscratched' || percentScratched >= 60;

  // Initialize canvas coating with scratch-off holographic texture
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isCompleted) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Fill with metallic gradient coating
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    if (ticket.imageTheme === 'gold') {
      gradient.addColorStop(0, '#D4AF37');
      gradient.addColorStop(0.3, '#FFF2A7');
      gradient.addColorStop(0.7, '#AA7C11');
      gradient.addColorStop(1, '#E6CA65');
    } else if (ticket.imageTheme === 'neon') {
      gradient.addColorStop(0, '#00E5FF');
      gradient.addColorStop(0.5, '#7B2CBF');
      gradient.addColorStop(1, '#00FF88');
    } else if (ticket.imageTheme === 'purple') {
      gradient.addColorStop(0, '#8247E5');
      gradient.addColorStop(0.5, '#C77DFF');
      gradient.addColorStop(1, '#3A0CA3');
    } else {
      gradient.addColorStop(0, '#334155');
      gradient.addColorStop(0.5, '#64748B');
      gradient.addColorStop(1, '#1E293B');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add scratcher pattern texture
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    for (let i = 0; i < width; i += 16) {
      for (let j = 0; j < height; j += 16) {
        if ((i + j) % 32 === 0) {
          ctx.beginPath();
          ctx.arc(i + 8, j + 8, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Text on scratch surface
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ SCRATCH TO REVEAL ⚡', width / 2, height / 2 - 8);

    ctx.fillStyle = '#1e293b';
    ctx.font = '11px sans-serif';
    ctx.fillText('Match 3 Verse symbols to win', width / 2, height / 2 + 14);
  }, [ticket.imageTheme, isCompleted]);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  const scratch = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || isCompleted) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    checkScratchProgress();
  };

  const checkScratchProgress = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sample pixels to measure scratch area
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    let transparentCount = 0;
    const totalPixels = data.length / 4;

    for (let i = 3; i < data.length; i += 32) {
      if (data[i] === 0) {
        transparentCount += 8;
      }
    }

    const percentage = Math.min(100, Math.round((transparentCount / totalPixels) * 100));
    setPercentScratched(percentage);

    if (percentage >= 50 && ticket.status === 'unscratched') {
      completeScratch();
    }
  };

  const completeScratch = () => {
    setPercentScratched(100);
    onScratchedComplete(ticket.id);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#00E5FF', '#8247E5', '#00FF88', '#FFD700'],
      });
    } catch (e) {
      // safe fallback
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsScratching(true);
    scratch(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isScratching) return;
    scratch(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setIsScratching(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsScratching(true);
    if (e.touches.length > 0) {
      scratch(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isScratching) return;
    if (e.touches.length > 0) {
      scratch(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  // Theme border styling
  const getCardBorder = () => {
    switch (ticket.imageTheme) {
      case 'gold':
        return 'border-amber-500/50 shadow-amber-500/10';
      case 'neon':
        return 'border-cyan-500/50 shadow-cyan-500/10';
      case 'purple':
        return 'border-purple-500/50 shadow-purple-500/10';
      default:
        return 'border-slate-700/80';
    }
  };

  return (
    <div
      id={`scratcher-ticket-${ticket.id}`}
      className={`relative bg-[#0D1426] border ${getCardBorder()} rounded-2xl p-5 shadow-xl flex flex-col justify-between overflow-hidden group`}
    >
      {/* Top Banner */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-400">#{ticket.tokenId}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {ticket.series}
          </span>
        </div>
        {ticket.status === 'claimed' ? (
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            <CheckCircle2 size={12} />
            CLAIMED
          </span>
        ) : ticket.status === 'scratched' ? (
          <span className="flex items-center gap-1 text-[11px] font-bold text-[#00E5FF] bg-cyan-950/60 border border-[#00E5FF]/40 px-2 py-0.5 rounded-full animate-pulse">
            <Trophy size={12} />
            READY TO CLAIM
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-full">
            <Sparkles size={12} />
            UNSCRATCHED
          </span>
        )}
      </div>

      <div className="mb-3">
        <h4 className="text-base font-bold text-white leading-tight">{ticket.title}</h4>
        <p className="text-xs text-slate-400">{ticket.edition} &bull; Polygon NFT</p>
      </div>

      {/* Scratch Box Area */}
      <div className="relative w-full aspect-[16/9] min-h-[160px] bg-gradient-to-br from-[#080D1A] to-[#111A2E] rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden select-none">
        {/* Underlying Prize Grid */}
        <div className="w-full h-full p-3 grid grid-cols-3 gap-2 items-center justify-items-center">
          {ticket.winningPrizes.map((prize, idx) => (
            <div
              key={idx}
              className={`w-full h-full flex flex-col items-center justify-center p-1.5 rounded-lg border text-center transition-all ${
                prize.matched
                  ? 'bg-[#00E5FF]/10 border-[#00E5FF]/50 text-white shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <span className="text-xl mb-0.5">{prize.symbol}</span>
              <span className="text-[11px] font-extrabold text-white leading-none">
                {prize.amount.toLocaleString()}
              </span>
              <span className="text-[9px] font-mono text-[#00E5FF]">{prize.token}</span>
            </div>
          ))}
        </div>

        {/* Scratchable Canvas Overlay */}
        {!isCompleted && (
          <canvas
            ref={canvasRef}
            width={340}
            height={190}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
            className="absolute inset-0 w-full h-full cursor-crosshair touch-none rounded-xl"
          />
        )}
      </div>

      {/* Progress or Outcome Details */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            Total Prize Value
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-extrabold text-white">
              {ticket.totalVerseValue.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-[#00E5FF]">VERSE</span>
            {ticket.totalMaticValue > 0 && (
              <span className="text-xs text-purple-300 font-medium">
                + {ticket.totalMaticValue} MATIC
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        {ticket.status === 'unscratched' ? (
          <button
            onClick={completeScratch}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Eye size={14} />
            Quick Scratch
          </button>
        ) : ticket.status === 'scratched' ? (
          <button
            onClick={() => onClaimClick(ticket)}
            className="px-4 py-2 bg-gradient-to-r from-[#00E5FF] to-[#00FF88] hover:from-[#00cce6] hover:to-[#00e67a] text-black font-extrabold text-xs rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition-all active:scale-95 animate-bounce"
          >
            <Gift size={14} />
            CLAIM PRIZE
          </button>
        ) : (
          <div className="text-right">
            <span className="text-[11px] font-mono text-slate-400 block">
              {ticket.claimTxHash ? `${ticket.claimTxHash.slice(0, 8)}...` : 'Transferred'}
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">Claimed on Polygon</span>
          </div>
        )}
      </div>
    </div>
  );
};
