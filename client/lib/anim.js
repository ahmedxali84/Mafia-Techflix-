import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
  // Phones show/hide the address bar while scrolling; recalculating every trigger then causes jank.
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export { gsap, ScrollTrigger };

export const reduced = () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Letters of a <Chars> heading flip up out of the floor, one after another.
export const charsIn = (targets, vars = {}) =>
  gsap.fromTo(
    targets,
    { autoAlpha: 0, yPercent: 70, rotationX: -100, transformPerspective: 600, transformOrigin: '50% 100% -30px' },
    { autoAlpha: 1, yPercent: 0, rotationX: 0, duration: 1, ease: 'expo.out', stagger: 0.025, ...vars }
  );
