'use client';
import { useEffect } from 'react';
import { play, playedRecently } from '@/lib/sound';

// One click sound for every button and menu link, so no button is silent.
// Runs after the button's own handler (bubble phase on document), and stays quiet when that
// handler already played its own sound (e.g. 'select' on a target). Opt out with data-silent.
export default function ClickSounds() {
  useEffect(() => {
    const onClick = (e) => {
      const el = e.target.closest?.('button, [role="button"], [role="tab"], a.b, nav a');
      if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true' || el.closest('[data-silent]')) return;
      if (!playedRecently()) play('click');
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}
