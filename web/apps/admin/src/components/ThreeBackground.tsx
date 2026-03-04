import { useEffect, useRef } from "react";

/**
 * Animated Canvas 2D particle network background for the Login page.
 *
 * Features:
 * - 100+ floating particles connected by lines when close
 * - Mouse interaction: particles gently attract near cursor
 * - Rich dark-blue gradient background with animated noise
 * - Fully responsive, auto-resizes with window
 * - Zero external dependencies
 */
export function ThreeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);

    // ── Resize ──
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Mouse ──
    const mouse = { x: -9999, y: -9999 };
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onMouseLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);

    // ── Particles ──
    const PARTICLE_COUNT = Math.min(130, Math.floor((width * height) / 8000));
    const CONNECTION_DIST = 140;
    const MOUSE_RADIUS = 180;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      opacity: number;
    }

    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 1.8 + 0.5,
        opacity: Math.random() * 0.5 + 0.3,
      });
    }

    // ── Animation ──
    let time = 0;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      time += 0.003;

      // ── Background gradient (animated) ──
      const grad = ctx.createLinearGradient(0, 0, width, height);
      const shift = Math.sin(time) * 0.02;
      grad.addColorStop(0, `hsl(${220 + shift * 50}, 60%, 8%)`);
      grad.addColorStop(0.5, `hsl(${230 + shift * 30}, 55%, 11%)`);
      grad.addColorStop(1, `hsl(${210 + shift * 40}, 65%, 7%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Subtle radial glow in center
      const glowX = width * 0.5 + Math.sin(time * 0.7) * 60;
      const glowY = height * 0.4 + Math.cos(time * 0.5) * 40;
      const glow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, width * 0.4);
      glow.addColorStop(0, "rgba(79, 172, 254, 0.06)");
      glow.addColorStop(0.5, "rgba(40, 100, 200, 0.03)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // ── Update particles ──
      for (const p of particles) {
        // Mouse attraction
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 1) {
          const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS * 0.008;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        // Damping
        p.vx *= 0.999;
        p.vy *= 0.999;
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;
      }

      // ── Draw connections ──
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.25;
            ctx.strokeStyle = `rgba(79, 172, 254, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // ── Draw mouse connections ──
      if (mouse.x > 0 && mouse.y > 0) {
        for (const p of particles) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MOUSE_RADIUS) {
            const alpha = (1 - dist / MOUSE_RADIUS) * 0.35;
            ctx.strokeStyle = `rgba(120, 200, 255, ${alpha})`;
            ctx.lineWidth = 0.4;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
        }
      }

      // ── Draw particles ──
      for (const p of particles) {
        // Glow
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
        grd.addColorStop(0, `rgba(79, 172, 254, ${p.opacity * 0.6})`);
        grd.addColorStop(1, "transparent");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = `rgba(180, 220, 255, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
}
