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
  const requestRef = useRef<number>(null);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const render = (time: number) => {
      if (!isPlaying) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        requestRef.current = requestAnimationFrame(render);
        return;
      }

      timeRef.current += (bpm / 60) * 0.02;
      const t = timeRef.current;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      if (mode === 'psychedelic') {
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          const radius = (Math.sin(t + i) * 0.5 + 0.5) * 300 * intensity;
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${(t * 50 + i * 30) % 360}, 70%, 50%, 0.3)`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      } else if (mode === 'tunnel') {
        for (let i = 0; i < 10; i++) {
          const z = (t + i / 10) % 1;
          const size = (1 / z) * 50 * intensity;
          ctx.strokeStyle = `hsla(${(t * 100) % 360}, 80%, 60%, ${1 - z})`;
          ctx.strokeRect(centerX - size / 2, centerY - size / 2, size, size);
        }
      } else if (mode === 'equalizer') {
        const bars = 64;
        const barWidth = canvas.width / bars;
        for (let i = 0; i < bars; i++) {
          const h = (Math.sin(t * 2 + i * 0.2) * 0.5 + 0.5) * 200 * intensity;
          ctx.fillStyle = `hsla(${(i / bars) * 360}, 70%, 50%, 0.5)`;
          ctx.fillRect(i * barWidth, canvas.height - h, barWidth - 2, h);
        }
      }

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => {
      window.removeEventListener('resize', resize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, bpm, intensity, mode]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none opacity-30 z-0"
      style={{ filter: 'blur(4px)' }}
    />
  );
};
