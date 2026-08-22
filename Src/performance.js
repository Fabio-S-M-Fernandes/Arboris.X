export function prefersReducedMotion() {
  return Boolean(
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function isConstrainedDevice() {
  const coarsePointer = Boolean(
    window.matchMedia &&
    window.matchMedia('(pointer: coarse)').matches
  );
  const narrowScreen = Boolean(
    window.matchMedia &&
    window.matchMedia('(max-width: 760px)').matches
  );
  const lowCoreCount = navigator.hardwareConcurrency
    ? navigator.hardwareConcurrency <= 4
    : false;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  return Boolean(
    prefersReducedMotion() ||
    coarsePointer ||
    narrowScreen ||
    lowCoreCount ||
    (connection && connection.saveData)
  );
}

export function getAnimationDefault() {
  return !isConstrainedDevice();
}

export function getLowPerfDefault() {
  return isConstrainedDevice();
}
