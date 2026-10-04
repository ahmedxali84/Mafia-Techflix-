const COLORS = ['#f5c542', '#e5484d', '#3dd68c', '#5b9cf6', '#c084fc', '#ffffff'];

export default function Confetti() {
  const pieces = Array.from({ length: 70 }, (_, i) => ({
    left: (i * 37) % 100,
    delay: ((i * 53) % 100) / 60,
    dur: 2.6 + ((i * 17) % 20) / 10,
    color: COLORS[i % COLORS.length],
    rot: (i * 47) % 360,
  }));
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i key={i} style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, transform: `rotate(${p.rot}deg)` }} />
      ))}
    </div>
  );
}
