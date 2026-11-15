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

    const CELL_SIZE = 5; // Size of each dither pixel cell
    const RADIUS_PX = 200; // Glow radius in CSS pixels
    const RADIUS_CELLS = Math.ceil(RADIUS_PX / CELL_SIZE);

    let mouseX = -1000;
    let mouseY = -1000;
    let targetX = -1000;
    let targetY = -1000;
    let isVisible = false;
    let targetOpacity = 0;
    let currentOpacity = 0;
    let animId: number;

    const resize = () => {
      canvas.width = Math.ceil(window.innerWidth / CELL_SIZE);
      canvas.height = Math.ceil(window.innerHeight / CELL_SIZE);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };

    resize();
    window.addEventListener("resize", resize);

    const onPointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      isVisible = true;
      targetOpacity = 0.5;
    };

    const onPointerLeave = () => {
      isVisible = false;
      targetOpacity = 0;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);

    let prevCellX = -9999;
    let prevCellY = -9999;

    const render = () => {
      animId = requestAnimationFrame(render);

      // Smooth lerp toward mouse coordinates
      mouseX += (targetX - mouseX) * 0.25;
      mouseY += (targetY - mouseY) * 0.25;
      currentOpacity += (targetOpacity - currentOpacity) * 0.15;

      if (currentOpacity < 0.01 && !isVisible) {
        if (prevCellX !== -9999) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          prevCellX = -9999;
          prevCellY = -9999;
        }
        return;
      }

      const centerCellX = Math.round(mouseX / CELL_SIZE);
      const centerCellY = Math.round(mouseY / CELL_SIZE);

      // Clear previous bounding box + margin
      const clearMinX = Math.max(0, Math.min(centerCellX, prevCellX) - RADIUS_CELLS - 2);
      const clearMinY = Math.max(0, Math.min(centerCellY, prevCellY) - RADIUS_CELLS - 2);
      const clearMaxX = Math.min(canvas.width, Math.max(centerCellX, prevCellX) + RADIUS_CELLS + 2);
      const clearMaxY = Math.min(canvas.height, Math.max(centerCellY, prevCellY) + RADIUS_CELLS + 2);

      ctx.clearRect(clearMinX, clearMinY, clearMaxX - clearMinX, clearMaxY - clearMinY);

      prevCellX = centerCellX;
      prevCellY = centerCellY;

      // Draw dithered circular spotlight around cursor
      const minX = Math.max(0, centerCellX - RADIUS_CELLS);
      const maxX = Math.min(canvas.width, centerCellX + RADIUS_CELLS);
      const minY = Math.max(0, centerCellY - RADIUS_CELLS);
      const maxY = Math.min(canvas.height, centerCellY + RADIUS_CELLS);

      const r2 = RADIUS_CELLS * RADIUS_CELLS;
      ctx.fillStyle = `rgba(56, 189, 248, ${currentOpacity.toFixed(3)})`; // Cyan glow

      for (let y = minY; y < maxY; y++) {
        const dy = y - centerCellY;
        const dy2 = dy * dy;
        const bayerRow = BAYER4[y & 3];

        for (let x = minX; x < maxX; x++) {
          const dx = x - centerCellX;
          const dist2 = dx * dx + dy2;

          if (dist2 < r2) {
            const dist = Math.sqrt(dist2);
            const normDist = dist / RADIUS_CELLS;
            // Radial density curve with smooth outer falloff
            const density = Math.pow(1 - normDist, 1.8) * 0.95;
            const threshold = bayerRow[x & 3];

            if (density > threshold) {
              ctx.fillRect(x, y, 1, 1);
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
      document.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full opacity-60 mix-blend-screen"
      aria-hidden="true"
      style={{ imageRendering: "pixelated" }}
    />
  );
};
