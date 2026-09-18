import './HoloBackground.css';

export default function HoloBackground() {
  return (
    <div className="holo-background" aria-hidden="true">
      <div className="holo-aurora holo-aurora-cyan" />
      <div className="holo-aurora holo-aurora-green" />
      <div className="holo-aurora holo-aurora-blue" />
      <div className="holo-stars">
        {Array.from({ length: 18 }, (_, index) => <span key={index} />)}
      </div>
      <div className="holo-horizon" />
      <div className="holo-scan" />
      <div className="holo-beacon" />
      <div className="holo-wave holo-wave-one" />
      <div className="holo-wave holo-wave-two" />
      <div className="holo-wave holo-wave-three" />
      <div className="holo-core" />
      <div className="holo-grid" />
    </div>
  );
}
