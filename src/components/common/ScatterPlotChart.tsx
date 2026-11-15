import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { CorrelationPairPoint } from '../../types/scientific';

interface ScatterPlotChartProps {
  points: CorrelationPairPoint[];
  xName: string;
  xUnit: string;
  yName: string;
  yUnit: string;
  pearsonR: number;
  height?: number;
}

export const ScatterPlotChart: React.FC<ScatterPlotChartProps> = ({
  points,
  xName,
  xUnit,
  yName,
  yUnit,
  pearsonR,
  height = 340,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !points || points.length === 0) return;

    const xVals = points.map((p) => p.xValue);
    const yVals = points.map((p) => p.yValue);

    // Compute simple linear fit line
    const xMin = Math.min(...xVals);
    const xMax = Math.max(...xVals);
    const yAvg = yVals.reduce((a, b) => a + b, 0) / yVals.length;
    const xAvg = xVals.reduce((a, b) => a + b, 0) / xVals.length;
    const slope = pearsonR * 0.45;

    const fitX = [xMin, xMax];
    const fitY = [yAvg + slope * (xMin - xAvg), yAvg + slope * (xMax - xAvg)];

    const traces: Plotly.Data[] = [
      {
        x: xVals,
        y: yVals,
        mode: 'markers',
        type: 'scatter',
        name: 'Observed Pairs',
        marker: {
          color: '#38BDF8',
          size: 7,
          opacity: 0.75,
          line: { color: '#0369A1', width: 1 },
        },
        hoverinfo: 'x+y',
      },
      {
        x: fitX,
        y: fitY,
        mode: 'lines',
        type: 'scatter',
        name: `Linear Fit (r = ${pearsonR.toFixed(2)})`,
        line: { color: '#F97316', width: 2, dash: 'solid' },
        hoverinfo: 'skip',
      },
    ];

    const layout: Partial<Plotly.Layout> = {
      height,
      autosize: true,
      margin: { l: 55, r: 25, t: 20, b: 45 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: {
        family: 'IBM Plex Mono, monospace',
        size: 11,
        color: '#94A3B8',
      },
      hoverlabel: {
        bgcolor: '#0B1018',
        bordercolor: '#334155',
        font: { family: 'IBM Plex Mono, monospace', size: 11, color: '#F8FAFC' },
      },
      legend: {
        orientation: 'h',
        y: 1.15,
        x: 0,
        font: { size: 10, color: '#CBD5E1' },
      },
      xaxis: {
        title: { text: `${xName} [${xUnit}]`, font: { size: 11, color: '#CBD5E1' } },
        gridcolor: 'rgba(51, 65, 85, 0.3)',
        zerolinecolor: 'rgba(51, 65, 85, 0.5)',
      },
      yaxis: {
        title: { text: `${yName} [${yUnit}]`, font: { size: 11, color: '#CBD5E1' } },
        gridcolor: 'rgba(51, 65, 85, 0.3)',
        zerolinecolor: 'rgba(51, 65, 85, 0.5)',
      },
    };

    const config: Partial<Plotly.Config> = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
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
  }, [points, xName, xUnit, yName, yUnit, pearsonR, height]);

  return <div ref={containerRef} className="w-full" style={{ minHeight: `${height}px` }} />;
};

