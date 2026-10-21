import { Fragment } from 'react';

// Splits a heading into per-letter spans (class "ch") so GSAP can animate each one.
// Words stay unbreakable; screen readers get the plain text.
export default function Chars({ text }) {
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.split(' ').map((w, i) => (
          <Fragment key={i}>
            {i > 0 && ' '}
            <span className="w">{[...w].map((c, j) => <span key={j} className="ch">{c}</span>)}</span>
          </Fragment>
        ))}
      </span>
    </>
  );
}
