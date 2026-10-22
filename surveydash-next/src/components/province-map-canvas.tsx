'use client';
import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import geography from '@/data/indonesia-provinces.json';
import { mapTooltipPosition } from '@/lib/assignment-map';
import { Button } from './ui';
export interface ProvinceMapDatum {
  id: string;
  label: string;
  value: number;
  content: ReactNode;
}
export function ProvinceMapCanvas({
  rows,
  selected,
  onSelect,
  controls,
}: Readonly<{
  rows: ProvinceMapDatum[];
  selected: string;
  onSelect: (id: string) => void;
  controls?: ReactNode;
}>) {
  const [zoom, setZoom] = useState(1),
    [hovered, setHovered] = useState<string | null>(null);
  const frame = useRef<HTMLDivElement>(null),
    tooltip = useRef<HTMLDivElement>(null);
  const byId = new Map(rows.map((row) => [row.id, row])),
    maximum = Math.max(0, ...rows.map((row) => row.value));
  const hoveredRow = hovered ? byId.get(hovered) : undefined;
  function position(clientX: number, clientY: number) {
    const host = frame.current;
    if (!host) return;
    const bounds = host.getBoundingClientRect();
    const size = tooltip.current?.getBoundingClientRect() ?? {
      width: Math.min(248, bounds.width - 16),
      height: 172,
    };
    const point = mapTooltipPosition(clientX - bounds.left, clientY - bounds.top, bounds, size);
    host.style.setProperty('--map-tooltip-x', `${point.x}px`);
    host.style.setProperty('--map-tooltip-y', `${point.y}px`);
  }
  return (
    <>
      <div className="assignment-map-toolbar">
        {controls}
        <div className="actions" role="group" aria-label="Perbesaran peta">
          <Button
            variant="ghost"
            disabled={zoom <= 1}
            onClick={() => setZoom((v) => Math.max(1, v - 0.5))}
            aria-label="Perkecil peta"
          >
            <ZoomOut size={17} />
          </Button>
          <Button
            variant="ghost"
            disabled={zoom >= 3}
            onClick={() => setZoom((v) => Math.min(3, v + 0.5))}
            aria-label="Perbesar peta"
          >
            <ZoomIn size={17} />
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setZoom(1);
              setHovered(null);
            }}
            aria-label="Reset perbesaran peta"
          >
            <RotateCcw size={16} />
          </Button>
        </div>
      </div>
      <div className="assignment-map-stage" ref={frame}>
        <div
          className="assignment-map-viewport"
          tabIndex={0}
          aria-label="Peta Indonesia. Geser untuk melihat wilayah saat diperbesar."
          onScroll={() => setHovered(null)}
        >
          <svg
            viewBox={geography.viewBox}
            style={{ width: `${zoom * 100}%` }}
            role="group"
            aria-label="Pilih provinsi"
            onPointerLeave={() => setHovered(null)}
          >
            {geography.shapes.map((province) => {
              const row = byId.get(province.id)!;
              return (
                <path
                  key={province.id}
                  d={province.path}
                  fillRule="evenodd"
                  vectorEffect="non-scaling-stroke"
                  role="button"
                  tabIndex={0}
                  aria-label={row.label}
                  aria-pressed={selected === province.id}
                  data-has-value={row.value > 0}
                  data-hovered={hovered === province.id}
                  style={
                    {
                      '--map-intensity': `${Math.round(25 + (75 * Math.log1p(row.value)) / Math.log1p(Math.max(1, maximum)))}%`,
                    } as CSSProperties
                  }
                  onPointerEnter={(event) => {
                    position(event.clientX, event.clientY);
                    setHovered(province.id);
                  }}
                  onPointerMove={(event) => position(event.clientX, event.clientY)}
                  onPointerLeave={() => setHovered(null)}
                  onFocus={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    position(rect.left + rect.width / 2, rect.top + rect.height / 2);
                    setHovered(province.id);
                  }}
                  onBlur={() => setHovered(null)}
                  onClick={() => onSelect(province.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') setHovered(null);
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect(province.id);
                    }
                  }}
                />
              );
            })}
          </svg>
        </div>
        {hoveredRow && (
          <div ref={tooltip} className="assignment-map-tooltip" role="tooltip">
            {hoveredRow.content}
          </div>
        )}
      </div>
    </>
  );
}
export function MapAttribution({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <footer className="assignment-map-source">
      {children} Geometri:{' '}
      <a href={geography.source} target="_blank" rel="noreferrer">
        denyherianto
      </a>{' '}
      ·{' '}
      <a href="/licenses/indonesia-provinces.txt" target="_blank" rel="noreferrer">
        CC BY 4.0, diolah untuk tampilan
      </a>
      .
    </footer>
  );
}
