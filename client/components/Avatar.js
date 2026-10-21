import Icon from './Icon';

function hue(name) {
  let h = 0;
  for (const ch of name) h = (h * 131 + ch.charCodeAt(0) * 2654435761) >>> 0;
  return (h ^ (h >>> 11)) % 360;
}

// Square portrait tile: a colour from the name and its initial (a skull once dead).
export default function Avatar({ name, size = 40, dead, ring }) {
  const h = hue(name);
  return (
    <span
      className={`av ${dead ? 'dead' : ''} ${ring ? 'ring' : ''}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        background: `linear-gradient(150deg, hsl(${h} 55% 42%), hsl(${(h + 30) % 360} 60% 22%))`,
      }}
      aria-hidden="true"
    >
      {dead ? <Icon name="skull" /> : name.slice(0, 1).toUpperCase()}
    </span>
  );
}
