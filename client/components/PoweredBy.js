// "Powered by TECHFLIX" credit, shown on the home screen, menus, lobby and game over.
export default function PoweredBy({ className = '' }) {
  return (
    <p className={`powered ${className}`}>
      <span>Powered by</span> <b>TECHFLIX</b>
    </p>
  );
}
