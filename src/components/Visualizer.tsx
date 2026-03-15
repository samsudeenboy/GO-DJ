import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

interface VisualizerProps {
  isPlaying: boolean;
  bpm: number;
  intensity: number;
  mode: 'psychedelic' | 'tunnel' | 'ambient' | 'equalizer';
}

export const Visualizer: React.FC<VisualizerProps> = ({ isPlaying, bpm, intensity, mode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(null);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    });

    resizeObserver.observe(container);

    const render = (time: number) => {
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      if (!isPlaying) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, width, height);
        requestRef.current = requestAnimationFrame(render);
        return;
      }

      // Smooth time progression based on BPM
      timeRef.current += (bpm / 60) * 0.016;
      const t = timeRef.current;

      // Trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      ctx.save();
      
      if (mode === 'psychedelic') {
        ctx.translate(centerX, centerY);
        ctx.rotate(t * 0.2);
        for (let i = 0; i < 8; i++) {
          ctx.beginPath();
          const radius = (Math.sin(t + i * 0.5) * 0.5 + 0.5) * (Math.min(width, height) * 0.4) * intensity;
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${(t * 40 + i * 45) % 360}, 80%, 60%, 0.4)`;
          ctx.lineWidth = 3;
          ctx.shadowBlur = 15;
          ctx.shadowColor = `hsla(${(t * 40 + i * 45) % 360}, 80%, 60%, 0.8)`;
          ctx.stroke();
        }
      } else if (mode === 'tunnel') {
        ctx.translate(centerX, centerY);
        for (let i = 0; i < 15; i++) {
          const z = (t * 0.5 + i / 15) % 1;
          const size = (1 / (z + 0.01)) * 40 * intensity;
          const opacity = (1 - z) * 0.5;
          ctx.strokeStyle = `hsla(${(t * 80 + i * 20) % 360}, 90%, 65%, ${opacity})`;
          ctx.lineWidth = 2 / (z + 0.1);
          ctx.strokeRect(-size / 2, -size / 2, size, size);
          ctx.rotate(t * 0.05);
        }
      } else if (mode === 'equalizer') {
        const bars = 128;
        const barWidth = width / bars;
        ctx.shadowBlur = 10;
        for (let i = 0; i < bars; i++) {
          const distFromCenter = Math.abs(i - bars / 2) / (bars / 2);
          const h = (Math.sin(t * 4 + i * 0.1) * 0.5 + 0.5) * (height * 0.4) * intensity * (1 - distFromCenter * 0.5);
          const hue = (i / bars) * 360 + t * 20;
          ctx.fillStyle = `hsla(${hue % 360}, 80%, 60%, 0.6)`;
          ctx.shadowColor = `hsla(${hue % 360}, 80%, 60%, 0.8)`;
          ctx.fillRect(i * barWidth, height / 2 - h / 2, barWidth - 1, h);
        }
      } else if (mode === 'ambient') {
        for (let i = 0; i < 20; i++) {
          const x = (Math.sin(t * 0.5 + i) * 0.5 + 0.5) * width;
          const y = (Math.cos(t * 0.3 + i * 2) * 0.5 + 0.5) * height;
          const r = (Math.sin(t + i) * 0.5 + 0.5) * 100 * intensity;
          const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
          grad.addColorStop(0, `hsla(${(t * 20 + i * 18) % 360}, 70%, 50%, 0.3)`);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => {
      resizeObserver.disconnect();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, bpm, intensity, mode]);

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none z-0">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full opacity-40"
        style={{ filter: 'blur(8px) contrast(1.2)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-dj-background/80 via-transparent to-dj-background/80" />
    </div>
  );
};
