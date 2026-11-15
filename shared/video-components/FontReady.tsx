import React, { useState, useEffect } from 'react';
import { delayRender, continueRender } from 'remotion';
/** Load every Vietnamese subset before a child measures map labels on Canvas. */
export function FontReady({
  children,
  text = 'Đường Hoàng Sa Trường Sa kiểm tra chữ Việt',
  sizes = [27, 35, 43],
}: {
  children: React.ReactNode;
  text?: string;
  sizes?: number[];
}) {
  const [handle] = useState(() =>
    delayRender('Load complete Vietnamese font subsets'),
  );
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      sizes.map((size) => document.fonts.load(`700 ${size}px Noto`, text)),
    )
      .then(() => document.fonts.ready)
      .then(() => {
        if (!cancelled) {
          setReady(true);
          continueRender(handle);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [handle]);
  return ready ? <>{children}</> : null;
}
