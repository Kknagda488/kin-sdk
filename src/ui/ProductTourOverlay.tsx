import React, { useEffect, useState } from 'react';
import type { ProductTour } from '../core';

type Props = { tour: ProductTour; onClose: () => void };
type Rect = { top: number; left: number; width: number; height: number } | null;

export function ProductTourOverlay({ tour, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect>(null);
  const step = tour.steps[index];

  useEffect(() => {
    if (!step?.selector) { setRect(null); return; }
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let target: Element | null = null;
        try { target = document.querySelector(step.selector!); } catch { target = null; }
        if (!target) { setRect(null); return; }
        const box = target.getBoundingClientRect();
        setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const timer = window.setInterval(update, 900);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(timer);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [step?.selector]);

  if (!step) return null;
  const cardWidth = Math.min(360, window.innerWidth - 32);
  const cardHeight = 180;
  const cardStyle: React.CSSProperties = rect ? {
    position: 'fixed', zIndex: 2147483002, width: `min(360px, calc(100vw - 32px))`,
    ...(step.placement === 'top'
      ? { left: Math.max(16, Math.min(rect.left, window.innerWidth - cardWidth - 16)), top: Math.max(12, rect.top - cardHeight - 12) }
      : step.placement === 'left'
        ? { left: Math.max(16, rect.left - cardWidth - 12), top: Math.max(12, Math.min(rect.top, window.innerHeight - cardHeight - 12)) }
        : step.placement === 'right'
          ? { left: Math.min(window.innerWidth - cardWidth - 16, rect.left + rect.width + 12), top: Math.max(12, Math.min(rect.top, window.innerHeight - cardHeight - 12)) }
          : { left: Math.max(16, Math.min(rect.left, window.innerWidth - cardWidth - 16)), top: Math.min(window.innerHeight - cardHeight - 12, rect.top + rect.height + 12) }),
  } : {
    position: 'fixed', zIndex: 2147483002, width: 'min(360px, calc(100vw - 32px))',
    left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
  };

  return <>
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 2147483000, background: rect ? 'rgba(4,8,14,.58)' : 'rgba(4,8,14,.76)', pointerEvents: 'none' }} />
    {rect && <div aria-hidden="true" style={{ position: 'fixed', zIndex: 2147483001, top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12, borderRadius: 12, border: '2px solid #98d957', boxShadow: '0 0 0 9999px rgba(4,8,14,.58)', pointerEvents: 'none' }} />}
    <section role="dialog" aria-label={`${tour.name}: step ${index + 1}`} style={{ ...cardStyle, boxSizing: 'border-box', padding: 20, borderRadius: 18, border: '1px solid #333a44', background: '#16191f', color: '#f6f7f8', boxShadow: '0 18px 60px rgba(0,0,0,.38)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 12 }}>
        <span style={{ color: '#98d957', fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>{tour.name}</span>
        <button type="button" onClick={onClose} aria-label="Close product tour" style={{ color: '#a3aab4', border: 0, background: 'transparent', fontSize: 21, cursor: 'pointer' }}>×</button>
      </div>
      <h2 style={{ margin: '0 0 8px', fontSize: 19, lineHeight: 1.3 }}>{step.title}</h2>
      <p style={{ margin: 0, color: '#c2c7d0', fontSize: 14, lineHeight: 1.55 }}>{step.body}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
        <span style={{ color: '#8b929d', fontSize: 12 }}>{index + 1} of {tour.steps.length}</span>
        <button type="button" onClick={() => index + 1 === tour.steps.length ? onClose() : setIndex(index + 1)} style={{ border: 0, borderRadius: 10, padding: '10px 16px', background: '#98d957', color: '#11151a', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{index + 1 === tour.steps.length ? 'Finish tour' : 'Next'}</button>
      </div>
    </section>
  </>;
}
