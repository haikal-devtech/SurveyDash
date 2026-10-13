'use client';
import { useEffect, useRef, useState } from 'react';
import { SLIDE_HEIGHT, SLIDE_WIDTH, type Slide, type SlideElement } from '@/lib/presentation-model';
const chartColors = ['#7549df', '#aa8add', '#89b6aa', '#d5bb7d', '#768fb2', '#c68fa5', '#97a7bf'];
function BoundChart({ element }: { element: SlideElement }) {
  const data = element.data ?? [];
  const total = data.reduce((sum, row) => sum + row.count, 0);
  const type = element.binding?.chartType ?? 'bar';
  if (!total)
    return (
      <div className="slide-chart-empty">
        <strong>{element.text}</strong>
        <span>{element.missing ? 'Data belum tersedia' : 'Belum ada jawaban untuk pertanyaan ini.'}</span>
      </div>
    );
  const sorted = data.filter((row) => row.count).toSorted((a, b) => b.count - a.count);
  if (type === 'table')
    return (
      <div className="slide-chart-table">
        <strong>{element.text}</strong>
        <table>
          <thead>
            <tr>
              <th>Jawaban</th>
              <th>Jumlah</th>
              <th>Persentase</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 12).map((row, index) => (
              <tr key={index}>
                <td>{row.name}</td>
                <td>{row.count}</td>
                <td>{((row.count / total) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 12 && <small>Menampilkan 12 dari {data.length} kategori</small>}
      </div>
    );
  if (type === 'pie') {
    const portions = sorted.slice(0, 6);
    if (sorted.length > 6)
      portions.push({
        name: 'Kategori lainnya',
        count: sorted.slice(6).reduce((sum, row) => sum + row.count, 0),
      });
    const gradient = portions
      .map((row, index) => {
        const start = (portions.slice(0, index).reduce((sum, item) => sum + item.count, 0) / total) * 100;
        return `${chartColors[index % chartColors.length]} ${start}% ${start + (row.count / total) * 100}%`;
      })
      .join(',');
    return (
      <div className="slide-chart-pie" style={{ color: element.color }}>
        <strong>{element.text}</strong>
        <div className="slide-pie-body">
          <div className="slide-pie-circle" style={{ background: `conic-gradient(${gradient})` }}>
            <span>
              {total}
              <small>jawaban</small>
            </span>
          </div>
          <ul>
            {portions.map((row, index) => (
              <li key={index}>
                <i style={{ background: chartColors[index % chartColors.length] }} />
                <span>{row.name}</span>
                <b>{row.count}</b>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  const bars = sorted.slice(0, 10);
  const max = Math.max(...bars.map((row) => row.count), 1);
  const height = Math.max(250, 70 + bars.length * 36);
  return (
    <div className="slide-chart-bar">
      <strong>{element.text}</strong>
      <svg
        viewBox={`0 0 750 ${height}`}
        width="100%"
        height="100%"
        role="img"
        aria-label={data.map((row) => `${row.name}: ${row.count}`).join(', ')}
      >
        {bars.map((row, index) => (
          <g key={index}>
            <text x="5" y={39 + index * 36} fill={element.color} fontSize="17">
              {row.name.length > 27 ? `${row.name.slice(0, 25)}…` : row.name}
            </text>
            <title>{row.name}</title>
            <rect
              x="295"
              y={20 + index * 36}
              width={Math.max(2, (row.count / max) * 390)}
              height="23"
              rx="4"
              fill={element.fill}
            />
            <text x={310 + (row.count / max) * 390} y={39 + index * 36} fill={element.color} fontSize="16">
              {row.count}
            </text>
          </g>
        ))}
      </svg>
      {sorted.length > 10 && <small>10 kategori terbesar dari {sorted.length}</small>}
    </div>
  );
}
export function ElementContent({
  element,
  assetBase = '/api/assets',
}: {
  element: SlideElement;
  assetBase?: string;
}) {
  if (element.type === 'text')
    return (
      <div
        className="slide-text"
        style={{
          fontSize: element.fontSize,
          fontWeight: element.fontWeight,
          fontFamily: element.fontFamily,
          textAlign: element.align,
          lineHeight: element.lineHeight,
          color: element.color,
        }}
      >
        {element.text}
      </div>
    );
  if (element.type === 'chart') return <BoundChart element={element} />;
  if (element.type === 'image')
    return (
      <img
        className="slide-image"
        src={`${assetBase}/${element.assetId}`}
        alt={element.text || 'Gambar pada slide'}
        draggable={false}
        style={{ objectFit: element.fit }}
      />
    );
  return (
    <div
      className="slide-shape"
      style={{
        background: element.shape === 'line' ? 'transparent' : element.fill,
        border: element.shape === 'line' ? undefined : `${element.strokeWidth}px solid ${element.stroke}`,
        borderBottom:
          element.shape === 'line'
            ? `${Math.max(2, element.strokeWidth)}px solid ${element.stroke}`
            : undefined,
        borderRadius: element.shape === 'circle' ? '50%' : element.shape === 'rounded' ? 18 : 0,
      }}
    />
  );
}
export function SlideRenderer({
  slide,
  assetBase,
  nodeRef,
}: {
  slide: Slide;
  assetBase?: string;
  nodeRef?: (node: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={nodeRef}
      className="presentation-slide"
      style={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT, background: slide.background }}
    >
      {slide.elements.map((element) => (
        <div
          className="slide-object"
          key={element.id}
          style={{
            left: element.x,
            top: element.y,
            width: element.w,
            height: element.h,
            opacity: element.opacity,
            transform: `rotate(${element.rotation}deg)`,
          }}
        >
          <ElementContent element={element} assetBase={assetBase} />
        </div>
      ))}
    </div>
  );
}
export function SlideThumbnail({ slide, assetBase }: { slide: Slide; assetBase?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(180);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="slide-thumbnail" ref={ref} style={{ height: (width * 9) / 16 }}>
      <div
        style={{
          transform: `scale(${width / SLIDE_WIDTH})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      >
        <SlideRenderer slide={slide} assetBase={assetBase} />
      </div>
    </div>
  );
}
