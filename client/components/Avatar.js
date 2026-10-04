function hue(name) {
  let h = 0;
  for (const ch of name) h = (h * 131 + ch.charCodeAt(0) * 2654435761) >>> 0;
  return (h ^ (h >>> 11)) % 360;
}

export default function Avatar({ name, size = 40, dead, ring }) {
  const h = hue(name);
  return (
    <span
      className={`avatar ${dead ? 'dead' : ''} ${ring ? 'ring' : ''}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        background: `linear-gradient(135deg, hsl(${h} 70% 55%), hsl(${(h + 40) % 360} 70% 38%))`,
      }}
      aria-hidden="true"
    >
      {dead ? '💀' : name.slice(0, 1).toUpperCase()}
    </span>
  );
}
