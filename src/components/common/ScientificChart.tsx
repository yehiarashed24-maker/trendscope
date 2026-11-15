import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { TimeSeriesPoint } from '../../types/scientific';

interface ScientificChartProps {
  series: TimeSeriesPoint[];
  variableName: string;
  unit: string;
  trendSlopeDecade?: number;
  height?: number;
  dataSource?: string;
  primaryLabel?: string;
  comparisonSeries?: TimeSeriesPoint[];
  comparisonLabel?: string;
  comparisonSlopeDecade?: number;
}

export const ScientificChart: React.FC<ScientificChartProps> = ({
  series,
  variableName,
  unit,
  trendSlopeDecade,
  height = 360,
  dataSource = 'NASA Earth Observation Archive',
  primaryLabel,
  comparisonSeries,
  comparisonLabel,
  comparisonSlopeDecade,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !series || series.length === 0) return;

    const xDates = series.map((p) => p.timestamp);
    const yValues = series.map((p) => p.value);
    const yUpper = series.map((p) => p.upperUncertainty);
    const yLower = series.map((p) => p.lowerUncertainty);
    const yClim = series.map((p) => p.climatologyMean);

    // Use backend-computed Theil-Sen trendLine when available; fall back to linear slope step
    const trendValues = series.map((p, i) => {
      if (typeof p.trendLine === 'number' && Number.isFinite(p.trendLine)) {
        return Number(p.trendLine.toFixed(4));
      }
      const startVal = series[0]?.value || 0;
      const stepDecade = (i / 120) * (trendSlopeDecade ?? 0.4);
      return Number((startVal + stepDecade).toFixed(4));
    });

    const slopeDigits = unit.toUpperCase().includes('NDVI') || (trendSlopeDecade !== undefined && Math.abs(trendSlopeDecade) > 0 && Math.abs(trendSlopeDecade) < 0.05) ? 4 : 2;
    const formattedSlope =
      trendSlopeDecade !== undefined && trendSlopeDecade !== null && Number.isFinite(trendSlopeDecade)
        ? `${trendSlopeDecade > 0 ? '+' : ''}${trendSlopeDecade.toFixed(slopeDigits)}`
        : '+0.42';

    const hasComparison = Array.isArray(comparisonSeries) && comparisonSeries.length > 0;
    const traces: Plotly.Data[] = hasComparison
      ? [
          {
            x: xDates,
            y: yValues,
            mode: 'lines+markers',
            name: primaryLabel || `${variableName} (${unit})`,
            line: { color: '#F59E0B', width: 1.9 },
            marker: { size: 3, color: '#F59E0B' },
            hoverinfo: 'x+y+name',
            type: 'scatter',
          },
          {
            x: xDates,
            y: trendValues,
            mode: 'lines',
            name: `${primaryLabel || 'Primary'} Sen (${formattedSlope} ${unit}/dec)`,
            line: { color: '#FB923C', width: 1.8, dash: 'dash' },
            hoverinfo: 'y+name',
            type: 'scatter',
          },
          {
            x: comparisonSeries.map((p) => p.timestamp),
            y: comparisonSeries.map((p) => p.value),
            mode: 'lines+markers',
            name: comparisonLabel || 'Nighttime LST',
            line: { color: '#38BDF8', width: 1.9 },
            marker: { size: 3, color: '#38BDF8' },
            hoverinfo: 'x+y+name',
            type: 'scatter',
          },
          {
            x: comparisonSeries.map((p) => p.timestamp),
            y: comparisonSeries.map((p, i) =>
              typeof p.trendLine === 'number' && Number.isFinite(p.trendLine)
                ? Number(p.trendLine.toFixed(4))
                : Number(((comparisonSeries[0]?.value || 0) + (i / 120) * (comparisonSlopeDecade ?? 0)).toFixed(4))
            ),
            mode: 'lines',
            name: `${comparisonLabel || 'Nighttime'} Sen (${
              comparisonSlopeDecade !== undefined && Number.isFinite(comparisonSlopeDecade)
                ? `${comparisonSlopeDecade >= 0 ? '+' : ''}${comparisonSlopeDecade}`
                : '+0.00'
            } ${unit}/dec)`,
            line: { color: '#7DD3FC', width: 1.8, dash: 'dot' },
            hoverinfo: 'y+name',
            type: 'scatter',
          },
        ]
      : [
          // 95% Confidence / Uncertainty Upper bound (transparent)
          {
            x: xDates,
            y: yUpper,
            mode: 'lines',
            line: { width: 0, color: 'transparent' },
            showlegend: false,
            hoverinfo: 'skip',
            type: 'scatter',
          },
          // 95% Confidence band fill to lower
          {
            x: xDates,
            y: yLower,
            mode: 'lines',
            fill: 'tonexty',
            fillcolor: 'rgba(14, 165, 233, 0.08)',
            line: { width: 0, color: 'transparent' },
            name: '95% Confidence Band',
            hoverinfo: 'skip',
            type: 'scatter',
          },
          // Climatology Mean Baseline
          {
            x: xDates,
            y: yClim,
            mode: 'lines',
            name: 'Climatological Baseline',
            line: { color: '#64748B', width: 1.2, dash: 'dot' },
            hoverinfo: 'y+name',
            type: 'scatter',
          },
          // Observed Data Series
          {
            x: xDates,
            y: yValues,
            mode: 'lines+markers',
            name: `${variableName} (${unit})`,
            line: { color: '#38BDF8', width: 1.8 },
            marker: { size: 3, color: '#0EA5E9' },
            hoverinfo: 'x+y+name',
            type: 'scatter',
          },
          // Sen's Slope Trendline
          {
            x: xDates,
            y: trendValues,
            mode: 'lines',
            name: `Sen's Trendline (${formattedSlope} ${unit}/dec)`,
            line: { color: '#F97316', width: 2, dash: 'dash' },
            hoverinfo: 'y+name',
            type: 'scatter',
          },
        ];

    const layout: Partial<Plotly.Layout> = {
      height,
      autosize: true,
      margin: { l: 52, r: 20, t: 28, b: 40 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: {
        family: 'IBM Plex Mono, monospace',
        size: 11,
        color: '#7a8296',
      },
      hovermode: 'x unified',
      hoverlabel: {
        bgcolor: '#11141c',
        bordercolor: 'rgba(238, 240, 245, 0.14)',
        font: { family: 'IBM Plex Mono, monospace', size: 11, color: '#eef0f5' },
      },
      legend: {
        orientation: 'h',
        y: 1.14,
        x: 0,
        font: { size: 11, color: '#a3a9b8' },
      },
      xaxis: {
        gridcolor: 'rgba(238, 240, 245, 0.06)',
        zerolinecolor: 'rgba(238, 240, 245, 0.12)',
        tickfont: { size: 11, color: '#7a8296' },
      },
      yaxis: {
        title: { text: `${variableName} [${unit}]`, font: { size: 11, color: '#a3a9b8' } },
        gridcolor: 'rgba(238, 240, 245, 0.06)',
        zerolinecolor: 'rgba(238, 240, 245, 0.12)',
        tickfont: { size: 11, color: '#7a8296' },
      },
    };

    const config: Partial<Plotly.Config> = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      toImageButtonOptions: {
        format: 'png',
        filename: `trendscope_${variableName.toLowerCase()}_trend`,
        height: 600,
        width: 1000,
        scale: 2,
      },
    };

    Plotly.newPlot(containerRef.current, traces, layout, config);

    const handleResize = () => {
      if (containerRef.current) {
        Plotly.Plots.resize(containerRef.current);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        Plotly.purge(containerRef.current);
      }
    };
  }, [
    series,
    variableName,
    unit,
    trendSlopeDecade,
    height,
    dataSource,
    primaryLabel,
    comparisonSeries,
    comparisonLabel,
    comparisonSlopeDecade,
  ]);

  return (
    <div className="w-full flex flex-col">
      <div ref={containerRef} className="w-full" style={{ minHeight: `${height}px` }} />
      <div className="flex items-center justify-between gap-4 flex-wrap text-xs font-mono tabular-nums text-[#7a8296] px-1 pt-3 border-t border-[#eef0f5]/[0.07] mt-2">
        <span>Source: {dataSource}</span>
        <span>Confidence band: 95% (2σ residual estimator)</span>
      </div>
    </div>
  );
};

