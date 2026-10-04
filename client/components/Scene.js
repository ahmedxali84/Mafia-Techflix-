// Fixed animated background that cross-fades between night and day.
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
        <div className="cloud c1" />
        <div className="cloud c2" />
      </div>
      <div className="vignette" />
    </div>
  );
}
