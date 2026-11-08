import './HoloBackground.css';

export default function HoloBackground() {
  return (
    <div className="holo-background" aria-hidden="true">
      <div className="holo-aurora holo-aurora-cyan" />
      <div className="holo-aurora holo-aurora-green" />
      <div className="holo-stars">
        {Array.from({ length: 10 }, (_, index) => <span key={index} />)}
      </div>
    </div>
  );
}
