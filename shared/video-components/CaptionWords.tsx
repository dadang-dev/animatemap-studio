import React from 'react';
const gold = '#ffcf76',
  cream = '#fff0d5';
export function CaptionWords({
  words,
  time,
  protectedNames = [],
}: {
  protectedNames?: string[];
  words: { text: string; startSeconds: number; endSeconds: number }[];
  time: number;
}) {
  const groups: (typeof words)[] = [];
  for (let i = 0; i < words.length; ) {
    const name = protectedNames.find(
        (n) =>
          words
            .slice(i, i + n.split(' ').length)
            .map((w) => w.text.replace(/[.,?!]/g, ''))
            .join(' ') === n,
      ),
      n = name ? name.split(' ').length : 1;
    groups.push(words.slice(i, i + n));
    i += n;
  }
  return (
    <>
      {groups.map((group, i) => (
        <React.Fragment key={i}>
          <span style={{ whiteSpace: 'nowrap' }}>
            {group.map((w, k) => (
              <span
                key={k}
                data-active={
                  time >= w.startSeconds && time < w.endSeconds
                    ? 'true'
                    : 'false'
                }
                style={{
                  color:
                    time >= w.startSeconds && time < w.endSeconds
                      ? gold
                      : cream,
                }}
              >
                {w.text}
                {k < group.length - 1 ? ' ' : ''}
              </span>
            ))}
          </span>
          {i < groups.length - 1 ? ' ' : ''}
        </React.Fragment>
      ))}
    </>
  );
}
