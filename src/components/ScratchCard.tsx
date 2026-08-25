import React, { useRef, useEffect, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, CheckCircle2, Wand2, Gift, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { ScratcherTicket } from '../types';
import { VerseCoinLogo } from './VerseBrand';

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
  const [imageError, setImageError] = useState(false);
  const [percentScratched, setPercentScratched] = useState(
    ticket.scratchPercentage || (ticket.status !== 'unscratched' ? 100 : 0)
  );
  const isCompleted = ticket.status !== 'unscratched' || percentScratched >= 50;

  // Initialize canvas coating with scratch-off holographic texture
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isCompleted) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Metallic holographic gradient coating matching Verse brand
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    if (ticket.imageTheme === 'gold') {
      gradient.addColorStop(0, '#F59E0B');
      gradient.addColorStop(0.3, '#FDE68A');
      gradient.addColorStop(0.7, '#D97706');
      gradient.addColorStop(1, '#FBBF24');
    } else if (ticket.imageTheme === 'neon') {
      gradient.addColorStop(0, '#00E5FF');
      gradient.addColorStop(0.35, '#3B82F6');
      gradient.addColorStop(0.7, '#9333EA');
      gradient.addColorStop(1, '#FF00A0');
    } else {
      gradient.addColorStop(0, '#00E5FF');
      gradient.addColorStop(0.5, '#8247E5');
      gradient.addColorStop(1, '#FF00A0');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Subtle texture grid
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let i = 0; i < width; i += 20) {
      for (let j = 0; j < height; j += 20) {
        if ((i + j) % 40 === 0) {
          ctx.beginPath();
          ctx.arc(i + 10, j + 10, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Text on scratch surface
    ctx.fillStyle = '#060A14';
    ctx.font = '900 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ SCRATCH OR AUTO-SCRATCH ✨', width / 2, height / 2 - 8);

    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 11px sans-serif';
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
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();

    checkScratchProgress();
  };

  const checkScratchProgress = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

    if (percentage >= 45 && ticket.status === 'unscratched') {
      completeScratch();
    }
  };

  const completeScratch = () => {
    setPercentScratched(100);
    onScratchedComplete(ticket.id);

    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#00E5FF', '#3B82F6', '#9333EA', '#FF00A0', '#00FF88'],
      });
    } catch (e) {}
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

  return (
    <div
      id={`scratcher-ticket-${ticket.id}`}
      className="relative bg-[#080C1A] border border-cyan-500/30 hover:border-cyan-400/60 rounded-3xl p-5 shadow-xl flex flex-col justify-between overflow-hidden transition-all group"
    >
      {/* Top Banner Ribbon */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <VerseCoinLogo size={22} glow={false} />
          <span className="text-xs font-mono font-bold text-white">#{ticket.tokenId}</span>
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-cyan-500/30">
            {ticket.series || 'Verse Scratcher'}
          </span>
        </div>

        {ticket.status === 'claimed' ? (
          <span className="flex items-center gap-1 text-[11px] font-black text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-full">
            <CheckCircle2 size={13} />
            CLAIMED
          </span>
        ) : ticket.status === 'scratched' ? (
          <span className="flex items-center gap-1 text-[11px] font-black text-[#00E5FF] bg-cyan-950/70 border border-[#00E5FF]/50 px-2.5 py-1 rounded-full animate-pulse">
            <Trophy size={13} />
            READY TO CLAIM
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950/50 border border-amber-500/40 px-2.5 py-1 rounded-full">
            <Sparkles size={13} />
            UNSCRATCHED
          </span>
        )}
      </div>

      {/* NFT Title & Edition Info */}
      <div className="mb-3">
        <h4 className="text-base font-extrabold text-white leading-tight">{ticket.title}</h4>
        <p className="text-xs text-slate-400 font-medium">{ticket.edition || `Polygon Token #${ticket.tokenId}`}</p>
      </div>

      {/* Real NFT Artwork & Scratch Box Area */}
      <div className="relative w-full aspect-[16/9] min-h-[170px] bg-gradient-to-br from-[#060A14] to-[#0F1A33] rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden select-none">
        {/* Real NFT Image Background if available from metadata */}
        {ticket.imageUrl && !imageError ? (
          <img
            src={ticket.imageUrl}
            alt={ticket.title}
            onError={() => setImageError(true)}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-85"
          />
        ) : (
          /* Fallback underlying prize grid */
          <div className="w-full h-full p-3 grid grid-cols-3 gap-2 items-center justify-items-center">
            {ticket.winningPrizes.map((prize, idx) => (
              <div
                key={idx}
                className={`w-full h-full flex flex-col items-center justify-center p-1.5 rounded-xl border text-center transition-all ${
                  prize.matched
                    ? 'bg-[#00E5FF]/20 border-[#00E5FF]/60 text-white shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400'
                }`}
              >
                <span className="text-xl mb-0.5">{prize.symbol}</span>
                <span className="text-[11px] font-black text-white leading-none">
                  {prize.amount.toLocaleString()}
                </span>
                <span className="text-[9px] font-mono font-bold text-[#00E5FF]">{prize.token}</span>
              </div>
            ))}
          </div>
        )}

        {/* Scratchable Holographic Surface */}
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
            className="absolute inset-0 w-full h-full cursor-crosshair touch-none rounded-2xl z-10"
          />
        )}
      </div>

      {/* Prize Summary & Actions */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            {ticket.status === 'claimed' ? 'Claimed Prize' : 'Scratcher Reward'}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-black text-white">
              {ticket.totalVerseValue.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-[#00E5FF]">VERSE</span>
            {ticket.totalMaticValue > 0 && (
              <span className="text-xs text-purple-300 font-semibold">
                + {ticket.totalMaticValue} POL
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Status Action */}
        {ticket.status === 'unscratched' ? (
          <button
            onClick={completeScratch}
            className="px-3.5 py-2 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-cyan-300 text-xs font-extrabold rounded-xl border border-cyan-500/30 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Wand2 size={14} className="text-[#00E5FF]" />
            AUTO SCRATCH
          </button>
        ) : ticket.status === 'scratched' ? (
          <button
            onClick={() => onClaimClick(ticket)}
            className="px-4 py-2 bg-gradient-to-r from-[#00E5FF] via-[#3B82F6] to-[#9333EA] hover:from-[#00cce6] hover:to-[#7e22ce] text-white font-black text-xs rounded-xl shadow-lg shadow-cyan-500/25 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer animate-pulse"
          >
            <Gift size={14} />
            CLAIM PRIZE
          </button>
        ) : (
          <div className="text-right">
            {ticket.claimTxHash ? (
              <a
                href={`https://polygonscan.com/tx/${ticket.claimTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center justify-end gap-1 font-medium"
              >
                <span>{ticket.claimTxHash.slice(0, 8)}...</span>
                <ExternalLink size={12} />
              </a>
            ) : (
              <span className="text-[11px] font-mono text-slate-400 block font-medium">
                Confirmed
              </span>
            )}
            <span className="text-[10px] text-emerald-400 font-bold">Claimed on Polygon</span>
          </div>
        )}
      </div>
    </div>
  );
};
