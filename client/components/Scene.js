// Fixed animated background that cross-fades between night (red moon) and day (dusk amber).
// Layers, back to front: sky, skyline, street lamp, wet street in perspective, fog, rain, grain.
export default function Scene({ day }) {
  return (
    <div className="scene" aria-hidden="true">
      <div className={`scene-layer night-sky ${day ? '' : 'on'}`}>
        <div className="stars s1" />
        <div className="stars s2" />
        <div className="moon" />
      </div>
      <div className={`scene-layer day-sky ${day ? 'on' : ''}`}>
        <div className="sun" />
      </div>
      <div className="skyline" />
      <div className="lamp"><i /></div>
      <div className="street" />
      <div className="fog f1" />
      <div className="fog f2" />
      <div className="rain" />
      <div className="embers" />
      <div className="grain" />
      <div className="vignette" />
    </div>
  );
}
