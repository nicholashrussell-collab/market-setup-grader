"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Candle, GradeResult } from "@/lib/trading";

type TradingChartProps = {
  candles: Candle[];
  grade: GradeResult | null;
};

function sma(values: Candle[], period: number) {
  return values.map((candle, index) => {
    const start = Math.max(0, index - period + 1);
    const slice = values.slice(start, index + 1);
    const value = slice.reduce((sum, c) => sum + c.close, 0) / slice.length;
    return {
      time: Math.floor(new Date(candle.time).getTime() / 1000) as any,
      value,
    };
  });
}

export default function TradingChart({ candles, grade }: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const chartData = useMemo(() => {
    return candles
      .filter((c) => Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close))
      .map((c) => ({
        time: Math.floor(new Date(c.time).getTime() / 1000) as any,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
  }, [candles]);

  const volumeData = useMemo(() => {
    return candles.map((c) => ({
      time: Math.floor(new Date(c.time).getTime() / 1000) as any,
      value: c.volume || 0,
      color: c.close >= c.open ? "rgba(34, 197, 94, 0.35)" : "rgba(239, 68, 68, 0.35)",
    }));
  }, [candles]);

  useEffect(() => {
    if (!containerRef.current || chartData.length === 0) return;

    let disposed = false;
    let cleanup = () => {};

    import("lightweight-charts").then(({ createChart, ColorType, LineStyle }) => {
      if (!containerRef.current || disposed) return;
      containerRef.current.innerHTML = "";

      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 480,
        layout: {
          background: { type: ColorType.Solid, color: "#0b1220" },
          textColor: "#cbd5e1",
        },
        grid: {
          vertLines: { color: "rgba(148, 163, 184, 0.12)" },
          horzLines: { color: "rgba(148, 163, 184, 0.12)" },
        },
        rightPriceScale: {
          borderColor: "rgba(148, 163, 184, 0.25)",
          scaleMargins: { top: 0.08, bottom: 0.22 },
        },
        timeScale: {
          borderColor: "rgba(148, 163, 184, 0.25)",
          timeVisible: true,
          secondsVisible: false,
        },
        crosshair: {
          mode: 0,
        },
      });

      const candleSeries = chart.addCandlestickSeries({
        upColor: "#22c55e",
        downColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
        borderVisible: false,
        priceLineVisible: true,
        lastValueVisible: true,
      });
      candleSeries.setData(chartData);

      const volumeSeries = chart.addHistogramSeries({
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
      });
      chart.priceScale("volume").applyOptions({
        scaleMargins: { top: 0.78, bottom: 0 },
      });
      volumeSeries.setData(volumeData);

      const sma20Series = chart.addLineSeries({
        color: "#f59e0b",
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      sma20Series.setData(sma(candles, 20));

      if (grade && grade.bias !== "Neutral") {
        candleSeries.createPriceLine({
          price: grade.entry,
          color: "#38bdf8",
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: "Entry",
        });
        candleSeries.createPriceLine({
          price: grade.stop,
          color: "#ef4444",
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "Stop",
        });
        candleSeries.createPriceLine({
          price: grade.target,
          color: "#22c55e",
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "Target",
        });
      }

      chart.timeScale().fitContent();

      const resize = () => {
        if (containerRef.current) {
          chart.applyOptions({ width: containerRef.current.clientWidth });
        }
      };
      window.addEventListener("resize", resize);

      cleanup = () => {
        window.removeEventListener("resize", resize);
        chart.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [chartData, volumeData, candles, grade]);

  if (!candles.length) {
    return <div className="chart-empty">Fetch candles or paste CSV data to show the chart.</div>;
  }

  return <div className="chart-wrap" ref={containerRef} />;
}
