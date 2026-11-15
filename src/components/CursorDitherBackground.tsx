import React, { useEffect, useRef } from "react";

// 4x4 Bayer ordered dithering matrix normalized to 0..1
const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16));

export const CursorDitherBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const CELL = 4; // 4px dither cell size
    const RADIUS_PX = 160; // Dither halo radius in px
    const RADIUS_CELLS = Math.ceil(RADIUS_PX / CELL);

    let mouseX = -1000;
    let mouseY = -1000;
    let targetX = -1000;
    let targetY = -1000;
    let currentOpacity = 0;
    let targetOpacity = 0;
    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const onPointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      targetOpacity = 1;
      if (mouseX < 0) {
        mouseX = e.clientX;
        mouseY = e.clientY;
      }
    };

    const onPointerLeave = () => {
      targetOpacity = 0;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("mouseleave", onPointerLeave);
    window.addEventListener("blur", onPointerLeave);

    const render = () => {
      animId = requestAnimationFrame(render);

      // Smooth lerp toward cursor
      mouseX += (targetX - mouseX) * 0.3;
      mouseY += (targetY - mouseY) * 0.3;
      currentOpacity += (targetOpacity - currentOpacity) * 0.15;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (currentOpacity < 0.02 || mouseX < -500) {
        return;
      }

      const centerCellX = Math.floor(mouseX / CELL);
      const centerCellY = Math.floor(mouseY / CELL);

      const minCellX = Math.max(0, centerCellX - RADIUS_CELLS);
      const maxCellX = Math.min(Math.floor(canvas.width / CELL), centerCellX + RADIUS_CELLS);
      const minCellY = Math.max(0, centerCellY - RADIUS_CELLS);
      const maxCellY = Math.min(Math.floor(canvas.height / CELL), centerCellY + RADIUS_CELLS);

      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const dy = (cy - centerCellY) * CELL;
        const dy2 = dy * dy;
        const bayerRow = BAYER4[cy & 3];

        for (let cx = minCellX; cx <= maxCellX; cx++) {
          const dx = (cx - centerCellX) * CELL;
          const dist2 = dx * dx + dy2;

          if (dist2 <= RADIUS_PX * RADIUS_PX) {
            const dist = Math.sqrt(dist2);
            const normDist = dist / RADIUS_PX; // 0 to 1
            const density = Math.pow(1 - normDist, 1.4);
            const threshold = bayerRow[cx & 3];

            if (density > threshold) {
              const alpha = Math.min(0.8, currentOpacity * (1 - normDist * 0.5) * 0.7);
              // Electric cyan dither pixel
              ctx.fillStyle = `rgba(56, 189, 248, ${alpha.toFixed(3)})`;
              ctx.fillRect(cx * CELL, cy * CELL, CELL - 0.5, CELL - 0.5);
            }
          }
        }
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("mouseleave", onPointerLeave);
      window.removeEventListener("blur", onPointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-20 h-full w-full"
      aria-hidden="true"
    />
  );
};
