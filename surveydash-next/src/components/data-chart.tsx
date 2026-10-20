'use client';
import { useId } from 'react';
import type { Distribution } from '@/lib/types';
import { chartSeries } from '@/lib/analytics-model';
import {
  categoryChartTypes,
  trendChartTypes,
  chartCatalog,
  chartColors,
  type DataChartType,
} from '@/lib/chart-types';

const number = (value: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value);
const short = (value: string, length = 26) =>
  value.length > length ? value.slice(0, length - 1) + '…' : value;
export function ChartTypePicker({
  value,
  onChange,
  trend = false,
  compact = false,
}: {
  value: DataChartType;
  onChange: (type: DataChartType) => void;
  trend?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={'chart-type-picker' + (compact ? ' compact' : '')} role="group" aria-label="Jenis grafik">
      {(trend ? trendChartTypes : categoryChartTypes).map((type) => (
        <button
          type="button"
          key={type}
          aria-pressed={value === type}
          onClick={() => onChange(type)}
          title={chartCatalog[type].description}
        >
          <ChartPreview type={type} />
          <span>{chartCatalog[type].label}</span>
          {!compact && <small>{chartCatalog[type].description}</small>}
        </button>
      ))}
    </div>
  );
}
export function ChartPreview({ type }: { type: DataChartType }) {
  const values = [28, 44, 34, 56, 39];
  return (
    <svg viewBox="0 0 120 76" aria-hidden="true" focusable="false" className="chart-preview">
      {type === 'donut' || type === 'pie' ? (
        <>
          <circle
            cx="60"
            cy="38"
            r="25"
            fill={type === 'pie' ? '#dcd5f3' : 'none'}
            stroke="#dcd5f3"
            strokeWidth={type === 'pie' ? 0 : 12}
          />
          <circle
            cx="60"
            cy="38"
            r="25"
            fill="none"
            stroke="#7356d8"
            strokeWidth={type === 'pie' ? 25 : 12}
            strokeDasharray="99 158"
            transform="rotate(-90 60 38)"
          />
        </>
      ) : type === 'stacked' ? (
        <>
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={8 + i * 26} y="25" width="24" height="26" rx="3" fill={chartColors[i]} />
          ))}
        </>
      ) : type === 'line' || type === 'area' ? (
        <>
          {type === 'area' && (
            <path d="M8 58 L28 41 L48 46 L68 22 L88 30 L110 10 L110 66 L8 66 Z" fill="#eee9fb" />
          )}
          <path
            d="M8 58 L28 41 L48 46 L68 22 L88 30 L110 10"
            fill="none"
            stroke="#7356d8"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : type === 'table' ? (
        <>
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x="8" y={10 + i * 16} width="104" height="12" rx="2" fill={i ? '#f0edf6' : '#dcd5f3'} />
              <path d={'M78 ' + (10 + i * 16) + 'v12'} stroke="#fff" strokeWidth="3" />
            </g>
          ))}
        </>
      ) : (
        values.map((v, i) =>
          type === 'column' ? (
            <rect
              key={i}
              x={10 + i * 21}
              y={66 - v}
              width="13"
              height={v}
              rx="3"
              fill={i === 3 ? '#7356d8' : '#b7a7e7'}
            />
          ) : (
            <g key={i}>
              <rect
                x="12"
                y={8 + i * 13}
                width={v * 1.5}
                height={type === 'lollipop' ? 3 : 8}
                rx="3"
                fill={type === 'lollipop' ? '#dcd5f3' : i === 3 ? '#7356d8' : '#b7a7e7'}
              />
              {type === 'lollipop' && <circle cx={12 + v * 1.5} cy={9.5 + i * 13} r="4" fill="#7356d8" />}
            </g>
          ),
        )
      )}
    </svg>
  );
}
export function DataChart({
  type,
  data,
  title = 'Distribusi jawaban',
  accent = chartColors[0],
  ink = 'var(--ink)',
  unit = 'jawaban',
  variant = 'dashboard',
  maxValue,
  decimals = false,
}: {
  type: DataChartType;
  data: Distribution[];
  title?: string;
  accent?: string;
  ink?: string;
  unit?: string;
  variant?: 'dashboard' | 'slide';
  maxValue?: number;
  decimals?: boolean;
}) {
  const muted = variant === 'slide' ? '#777582' : 'var(--muted)';
  const grid = variant === 'slide' ? '#e9e7ee' : 'var(--border)';
  const track = variant === 'slide' ? '#f1eef7' : 'var(--surface-soft)';
  const id = useId().replaceAll(':', '');
  const trend = type === 'line' || type === 'area';
  const series = chartSeries(data, type === 'pie' || type === 'donut' || type === 'stacked' ? 7 : 10);
  const rows = trend ? data : series.rows;
  const total = trend ? data.reduce((sum, row) => sum + row.count, 0) : series.total;
  const colors = [accent, ...chartColors.slice(1)];
  const label = (row: Distribution) => `${row.name}: ${number(row.count)} ${unit}`;
  const displayed = decimals ? (value: number) => value.toFixed(2) : number;
  const percent = (value: number) =>
    total ? ((value / total) * 100).toFixed(1).replace('.', ',') + '%' : '0%';
  const maximum = maxValue ?? Math.max(1, ...rows.map((row) => row.count));
  if (!rows.length || (!total && type !== 'table' && !trend))
    return (
      <div className="data-chart-empty">
        <span>Belum ada data</span>
        <p>Grafik muncul setelah pertanyaan ini memiliki jawaban.</p>
      </div>
    );
  function legend() {
    return (
      <ul className="data-chart-legend">
        {rows.map((row, index) => (
          <li key={index}>
            <i style={{ background: colors[index % colors.length] }} />
            <span title={row.name}>{row.name}</span>
            <b>{displayed(row.count)}</b>
            <small>{percent(row.count)}</small>
          </li>
        ))}
      </ul>
    );
  }
  let view;
  if (type === 'table')
    view = (
      <div className="data-chart-table-wrap">
        <table className="data-chart-table">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr>
              <th>Kategori</th>
              <th>Jumlah</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                <td>{row.name}</td>
                <td>{displayed(row.count)}</td>
                <td>{percent(row.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  else if (type === 'donut' || type === 'pie') {
    view = (
      <div className="data-chart-round">
        <svg viewBox="0 0 260 240" role="img" aria-label={title + '. ' + rows.map(label).join('; ')}>
          {rows.map((row, index) => {
            const before = rows.slice(0, index).reduce((sum, item) => sum + item.count, 0);
            const start = before / total;
            const end = (before + row.count) / total;
            if (type === 'donut')
              return (
                <circle
                  key={index}
                  cx="130"
                  cy="120"
                  r="80"
                  fill="none"
                  stroke={colors[index % colors.length]}
                  strokeWidth="30"
                  strokeDasharray={`${Math.max(0, (end - start) * Math.PI * 160)} ${Math.PI * 160}`}
                  strokeDashoffset={-start * Math.PI * 160}
                  transform="rotate(-90 130 120)"
                >
                  <title>{label(row)}</title>
                </circle>
              );
            const point = (angle: number) => [
              130 + Math.cos(angle * Math.PI * 2 - Math.PI / 2) * 96,
              120 + Math.sin(angle * Math.PI * 2 - Math.PI / 2) * 96,
            ];
            if (end - start >= 0.999999)
              return (
                <circle key={index} cx="130" cy="120" r="96" fill={colors[index % colors.length]}>
                  <title>{label(row)}</title>
                </circle>
              );
            const [x1, y1] = point(start),
              [x2, y2] = point(end);
            return (
              <path
                key={index}
                d={`M130 120 L${x1} ${y1} A96 96 0 ${end - start > 0.5 ? 1 : 0} 1 ${x2} ${y2} Z`}
                fill={colors[index % colors.length]}
              >
                <title>{label(row)}</title>
              </path>
            );
          })}
          {type === 'donut' && (
            <>
              <text x="130" y="119" textAnchor="middle" fontSize="29" fontWeight="650" fill={ink}>
                {number(total)}
              </text>
              <text x="130" y="143" textAnchor="middle" fontSize="13" fill={muted}>
                {unit}
              </text>
            </>
          )}
        </svg>
        {legend()}
      </div>
    );
  } else if (type === 'stacked') {
    view = (
      <>
        <svg
          viewBox="0 0 640 110"
          className="data-chart-proportion"
          role="img"
          aria-label={rows.map(label).join('; ')}
        >
          {rows.map((row, index) => {
            const before = rows.slice(0, index).reduce((sum, item) => sum + item.count, 0);
            const x = (before / total) * 624;
            return (
              <rect
                key={index}
                x={8 + x}
                y="28"
                width={(row.count / total) * 624}
                height="42"
                fill={colors[index % colors.length]}
              >
                <title>{label(row)}</title>
              </rect>
            );
          })}
          <text x="8" y="98" fill={muted} fontSize="12">
            0%
          </text>
          <text x="632" y="98" textAnchor="end" fill={muted} fontSize="12">
            100%
          </text>
        </svg>
        {legend()}
      </>
    );
  } else if (trend) {
    const x = (index: number) => (rows.length === 1 ? 342 : 48 + (index / (rows.length - 1)) * 570);
    const y = (value: number) => 222 - (value / maximum) * 180;
    const line = rows.map((row, index) => `${index ? 'L' : 'M'}${x(index)} ${y(row.count)}`).join(' ');
    view = (
      <svg viewBox="0 0 640 270" role="img" aria-label={title + '. ' + rows.map(label).join('; ')}>
        <defs>
          <linearGradient id={'area-' + id} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor={accent} stopOpacity=".22" />
            <stop offset="1" stopColor={accent} stopOpacity=".02" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <g key={ratio}>
            <line
              x1="48"
              x2="618"
              y1={y(maximum * ratio)}
              y2={y(maximum * ratio)}
              stroke={grid}
              strokeDasharray="3 4"
            />
            <text x="38" y={y(maximum * ratio) + 4} textAnchor="end" fontSize="11" fill={muted}>
              {number(maximum * ratio)}
            </text>
          </g>
        ))}
        {type === 'area' && (
          <path d={line + ` L${x(rows.length - 1)} 222 L${x(0)} 222 Z`} fill={'url(#area-' + id + ')'} />
        )}
        <path
          d={line}
          fill="none"
          stroke={accent}
          strokeWidth="2.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {rows.map((row, index) => (
          <g key={index}>
            {(rows.length < 20 || index === rows.length - 1) && (
              <circle cx={x(index)} cy={y(row.count)} r="3.5" fill={accent} stroke="#fff" strokeWidth="1.5">
                <title>{label(row)}</title>
              </circle>
            )}
            {(index === 0 || index === rows.length - 1 || index === Math.floor(rows.length / 2)) && (
              <text
                x={x(index)}
                y="250"
                textAnchor={index === 0 ? 'start' : index === rows.length - 1 ? 'end' : 'middle'}
                fontSize="11"
                fill={muted}
              >
                {row.name}
              </text>
            )}
          </g>
        ))}
      </svg>
    );
  } else if (type === 'column') {
    const slot = 560 / Math.max(1, rows.length);
    const width = Math.min(44, slot * 0.62);
    view = (
      <svg viewBox="0 0 640 290" role="img" aria-label={title + '. ' + rows.map(label).join('; ')}>
        {[0, 0.5, 1].map((ratio) => (
          <g key={ratio}>
            <line
              x1="46"
              x2="620"
              y1={230 - ratio * 184}
              y2={230 - ratio * 184}
              stroke={grid}
              strokeDasharray="3 4"
            />
            <text x="37" y={234 - ratio * 184} textAnchor="end" fontSize="11" fill={muted}>
              {displayed(maximum * ratio)}
            </text>
          </g>
        ))}
        {rows.map((row, index) => (
          <g key={index}>
            <rect
              x={56 + index * slot + (slot - width) / 2}
              y={230 - (row.count / maximum) * 184}
              width={width}
              height={(row.count / maximum) * 184}
              rx="4"
              fill={accent}
            >
              <title>{label(row)}</title>
            </rect>
            <text
              x={56 + index * slot + slot / 2}
              y={219 - (row.count / maximum) * 184}
              textAnchor="middle"
              fill={ink}
              fontSize="12"
              fontWeight="600"
            >
              {displayed(row.count)}
            </text>
            <text x={56 + index * slot + slot / 2} y="253" textAnchor="middle" fill={muted} fontSize="10">
              <title>{row.name}</title>
              {short(row.name, 10)}
            </text>
          </g>
        ))}
      </svg>
    );
  } else {
    view = (
      <div
        className={'chart-bars' + (type === 'lollipop' ? ' chart-bars--dots' : '')}
        role="img"
        aria-label={title + '. ' + rows.map(label).join('; ')}
      >
        {rows.map((row, index) => (
          <div className="chart-bar-row" key={index}>
            <div className="chart-bar-caption">
              <span title={row.name}>{row.name}</span>
              <b>{displayed(row.count)}</b>
            </div>
            <div className="chart-bar-track" style={{ background: track }}>
              <span style={{ width: (row.count / maximum) * 100 + '%', background: accent }}>
                {type === 'lollipop' && <i style={{ background: accent }} />}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={'data-chart data-chart--' + variant} style={{ color: ink }}>
      {view}
      {!trend && series.grouped && type !== 'table' && (
        <p className="data-chart-footnote">
          {series.categories} kategori; sisanya digabung sebagai kategori lainnya.
        </p>
      )}
    </div>
  );
}
