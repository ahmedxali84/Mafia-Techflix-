'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { play } from '@/lib/sound';
import { gsap, reduced, charsIn } from '@/lib/anim';
import Scene from '@/components/Scene';
import { embers } from '@/components/Embers3D';
import Chars from '@/components/Chars';
import Cursor from '@/components/Cursor';
import HowToPlay from '@/components/HowToPlay';
import SoundToggle from '@/components/SoundToggle';
import PoweredBy from '@/components/PoweredBy';
import { ROLES, CARDS as ART } from '@/lib/roles';

const CAPS = [
  ['Chapter I', 'The city sleeps.', 'One table. One secret. Nobody is who they seem.'],
  ['Night', 'The family chooses.', 'Mafia pick a victim. The Doctor and Detective act in the dark.'],
  ['Dawn', 'The town accuses.', 'Someone is gone. Everyone votes. Someone pays.'],
  ['Your move', 'Take your seat.', 'Five to twelve players. Free to play.'],
];
const EDGES = [0, 0.25, 0.5, 0.75, 1.1];

// Role cards orbiting the logo: role, resting spot (fraction of the viewport), depth, tilt.
const CARDS = [
  ['MAFIA', -0.34, -0.2, 140, -18],
  ['DOCTOR', 0.34, 0.16, 80, 22],
  ['VILLAGER', -0.31, 0.29, 60, -10],
  ['DETECTIVE', 0.31, -0.27, 100, 14],
  ['JESTER', -0.17, -0.37, 30, -8],
  ['THIEF', 0.17, 0.36, 30, 9],
];

export default function Home() {
  const [help, setHelp] = useState(false);
  const [cap, setCap] = useState(0);
  const story = useRef(null);
  const rig = useRef(null);
  const logo = useRef(null);
  const spot = useRef(null);
  const bar = useRef(null);
  const scrub = useRef(null);
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);

  useEffect(() => {
    router.prefetch('/play');
  }, [router]);

  // Outro: the cards fly past the camera, the logo rushes in until it fills the screen,
  // the embers warp into streaks, then /play opens (the warp slows down there).
  function enterTable(e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return; // let new-tab clicks through
    e.preventDefault();
    if (leavingRef.current) return;
    play('click');
    if (reduced()) return router.push('/play');
    leavingRef.current = true;
    setLeaving(true);
    scrub.current?.scrollTrigger?.disable(false); // freeze the scroll story where it is
    embers.target = 38;
    gsap.timeline({ onComplete: () => router.push('/play') })
      .to(rig.current, { rotationX: 0, rotationY: 0, duration: 0.5, ease: 'power2.out' }, 0)
      .to(story.current.querySelectorAll('.k'), {
        z: 1500, rotationZ: (i) => (i % 2 ? 120 : -120), autoAlpha: 0, duration: 0.9, ease: 'power3.in', stagger: 0.04,
      }, 0)
      .to(spot.current, { '--r': '120%', duration: 0.8, ease: 'power2.out' }, 0)
      .to(logo.current, { scale: 7, '--blur': '0px', '--lit': 1.25, '--glow': '90px', duration: 1.2, ease: 'power4.inOut' }, 0.05);
  }

  useLayoutEffect(() => {
    const cards = story.current.querySelectorAll('.k');
    const ctx = gsap.context(() => {
      // Scroll-driven reveal: the logo comes out of the blur and the dark, the spotlight opens,
      // and the cards fly in from deep behind it. Scrubbed, so it plays back when scrolling up.
      scrub.current = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: story.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: reduced() ? true : 1.2,
          invalidateOnRefresh: true,
          onUpdate: (st) => setCap(EDGES.findIndex((a, i) => st.progress >= a && st.progress < EDGES[i + 1])),
        },
      })
        .fromTo(logo.current, { '--blur': '16px', '--lit': 0.3, scale: 0.7, rotationX: 22 },
          { '--blur': '0px', '--lit': 1, scale: 0.96, rotationX: 0, duration: 0.6 }, 0)
        .to(logo.current, { scale: 1.06, duration: 0.4 }, 0.6)
        .fromTo(spot.current, { '--r': '6%' }, { '--r': '62%', duration: 0.6 }, 0)
        .fromTo(cards,
          { autoAlpha: 0, z: -1100, x: (i) => CARDS[i][1] * innerWidth * 0.3, y: (i) => CARDS[i][2] * innerHeight * 0.3, rotationY: (i) => (i % 2 ? 170 : -170), rotationZ: 0 },
          { autoAlpha: 1, z: (i) => CARDS[i][3], x: (i) => CARDS[i][1] * innerWidth, y: (i) => CARDS[i][2] * innerHeight, rotationY: (i) => CARDS[i][4], rotationZ: (i) => CARDS[i][4] / 2, duration: 0.45, stagger: 0.05 }, 0.12)
        .to(cards, { y: (i) => CARDS[i][2] * innerHeight + (i % 2 ? -50 : 50), rotationX: (i) => (i % 2 ? 16 : -16), duration: 0.4 }, 0.6)
        .fromTo(bar.current, { scaleX: 0 }, { scaleX: 1, duration: 1 }, 0);

      if (!reduced()) {
        gsap.from('.cine > .topbar', { y: -60, autoAlpha: 0, duration: 1.2, ease: 'expo.out', delay: 0.2 });
        gsap.from('.hint', { autoAlpha: 0, y: 20, duration: 1, delay: 0.8 });
      }
    }, story.current.parentElement);

    // The whole rig turns in 3D with the pointer.
    let onMove;
    if (!reduced() && matchMedia('(hover: hover)').matches) {
      const rx = gsap.quickTo(rig.current, 'rotationX', { duration: 1, ease: 'power3' });
      const ry = gsap.quickTo(rig.current, 'rotationY', { duration: 1, ease: 'power3' });
      onMove = (e) => {
        if (leavingRef.current) return;
        ry((e.clientX / innerWidth - 0.5) * 18);
        rx((0.5 - e.clientY / innerHeight) * 12);
      };
      addEventListener('pointermove', onMove, { passive: true });
    }
    return () => {
      ctx.revert();
      if (onMove) removeEventListener('pointermove', onMove);
    };
  }, []);

  // Each caption's headline flips up letter by letter when its chapter arrives.
  useEffect(() => {
    const el = story.current?.querySelector(`.cap[data-i="${cap}"]`);
    if (!el || reduced()) return;
    const ctx = gsap.context(() => {
      charsIn(el.querySelectorAll('.ch'), { stagger: 0.022 });
      gsap.fromTo(el.querySelectorAll('small, p, .cap-num'), { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out', delay: 0.1 });
    }, el);
    return () => ctx.revert();
  }, [cap]);

  return (
    <main className={`screen cine ${leaving ? 'leaving' : ''}`}>
      <Scene />
      <Cursor />
      <div className="topbar floating">
        <b className="wordmark">MAFIA</b>
        <div className="topbar-actions">
          <Link className="btn small" href="/play" onClick={enterTable}>Play</Link>
          <SoundToggle />
          <button className="icon-btn" onClick={() => setHelp(true)} aria-label="How to play" title="How to play">❔</button>
        </div>
      </div>

      <section ref={story} className="story">
        <div className="story-stage">
          <div ref={rig} className="rig">
            <div className="halo" />
            {CARDS.map(([role], i) => (
              <div key={role} className={`k tone-${ROLES[role].tone}`} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ART[role].thumb} alt="" width={256} height={Math.round(256 / ART[role].ar)} decoding="async" fetchPriority="low" draggable={false} />
              </div>
            ))}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={logo} className="logo-main" src="/logo.webp" alt="Mafia Game" width={820} height={820} fetchPriority="high" decoding="async" />
          </div>
          <div ref={spot} className="spot" />
          {CAPS.map(([k, h, t], i) => (
            <div key={k} data-i={i} className={`cap ${i % 2 ? 'r' : 'l'} ${cap === i ? 'on' : ''}`}>
              <span className="cap-num" aria-hidden="true">0{i + 1}</span>
              <small>{k}</small>
              <h2><Chars text={h} /></h2>
              <p>{t}</p>
              {i === CAPS.length - 1 && <Link className="btn primary" href="/play" onClick={enterTable}>Join a table</Link>}
            </div>
          ))}
          <ol className="dots" aria-hidden="true">
            {CAPS.map((c, i) => <li key={c[0]} className={cap === i ? 'on' : ''} />)}
          </ol>
          <div className="hint">Scroll</div>
          <div ref={bar} className="pbar" />
        </div>
      </section>

      <PoweredBy className="corner" />
      {leaving && <div className="outro-veil" aria-hidden="true" />}
      {help && <HowToPlay onClose={() => setHelp(false)} />}
    </main>
  );
}
