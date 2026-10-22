/**
 * TiltStage: lays a board back in perspective (CSS only, no preserve-3d), so it reads
 * as a physical board on a table. `tilt` is the angle in degrees; 0 renders the
 * children untouched. Clicks and drags still land on the right square because the
 * browser hit-tests transformed elements.
 *
 * The stage owns the perspective; the inner element carries the rotation, anchored
 * near the bottom edge so the near side stays put and the far side recedes.
 */

import React from 'react';

export default function TiltStage({ width, tilt = 0, className = '', children }) {
  if (!(tilt > 0)) return <div className={`tilt-stage ${className}`}>{children}</div>;
  return (
    <div
      className={`tilt-stage tilted ${className}`}
      style={{
        width,
        perspective: width * 2.4,
        perspectiveOrigin: '50% 30%',
        paddingBottom: Math.round(width * 0.045), // room for the board's edge and shadow
      }}
    >
      <div className="tilt-stage-board" style={{ transform: `rotateX(${tilt}deg)`, transformOrigin: '50% 88%' }}>
        {children}
      </div>
    </div>
  );
}
