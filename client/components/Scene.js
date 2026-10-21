import Embers3D from './Embers3D';

// The home page's animated night: red moon sky, skyline, street lamp, wet street in perspective,
// fog, rain, 3D embers and film grain. The game screens use the calmer, static <Backdrop>.
export default function Scene() {
  return (
    <div className="scene" aria-hidden="true">
      <div className="night-sky">
        <div className="stars s1" />
        <div className="stars s2" />
        <div className="moon" />
      </div>
      <div className="skyline" />
      <div className="lamp"><i /></div>
      <div className="street" />
      <div className="fog f1" />
      <div className="fog f2" />
      <div className="rain" />
      <Embers3D />
      <div className="grain" />
      <div className="vignette" />
    </div>
  );
}
