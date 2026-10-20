'use client';
import { useEffect, useRef, useState } from 'react';
import { SLIDE_HEIGHT, SLIDE_WIDTH, type Slide, type SlideElement } from '@/lib/presentation-model';
import { DataChart } from './data-chart';
function BoundChart({ element }: { element: SlideElement }) {
  return (
    <div className="slide-data-chart" style={{ color: element.color }}>
      <strong>{element.text}</strong>
      <DataChart
        type={element.binding?.chartType ?? 'bar'}
        data={element.data ?? []}
        title={element.text}
        accent={element.fill}
        ink={element.color}
        variant="slide"
        unit={element.binding?.kind === 'timeline' ? 'respons' : 'pilihan/jawaban'}
      />
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
