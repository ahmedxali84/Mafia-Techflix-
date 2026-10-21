// Static background for the game screens: night sky (dusk amber by day), skyline, a faint
// tactical grid, vignette and grain. Nothing moves, so the UI on top stays easy to read.
export default function Backdrop({ day }) {
  return (
    <div className={`bd ${day ? 'day' : ''}`} aria-hidden="true">
      <div className="bd-sky" />
      <div className="bd-city" />
      <div className="bd-grid" />
      <div className="bd-vig" />
    </div>
  );
}
