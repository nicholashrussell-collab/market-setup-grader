"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Candle, GradeResult } from "@/lib/trading";

type ChartOverlay = {
  entry?: number | null;
  stop?: number | null;
  target?: number | null;
  source?: string;
};

type TradingChartProps = {
  candles: Candle[];
  grade: GradeResult | null;
  overlay?: ChartOverlay | null;
};

function formatEtTime(timestampSeconds: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestampSeconds * 1000));
}

function validNumber(value?: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

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

export default function TradingChart({ candles, grade, overlay }: TradingChartProps) {
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
        localization: {
          timeFormatter: (time: any) => {
            const seconds = typeof time === "number" ? time : Number(time?.timestamp || 0);
            return seconds ? `${formatEtTime(seconds)} ET` : "";
          },
        },
        timeScale: {
          borderColor: "rgba(148, 163, 184, 0.25)",
          timeVisible: true,
          secondsVisible: false,
          tickMarkFormatter: (time: any) => {
            const seconds = typeof time === "number" ? time : Number(time?.timestamp || 0);
            if (!seconds) return "";
            return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(new Date(seconds * 1000));
          },
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

      const entry = overlay && validNumber(overlay.entry) ? overlay.entry : grade && grade.bias !== "Neutral" ? grade.entry : null;
      const stop = overlay && validNumber(overlay.stop) ? overlay.stop : grade && grade.bias !== "Neutral" ? grade.stop : null;
      const target = overlay && validNumber(overlay.target) ? overlay.target : grade && grade.bias !== "Neutral" ? grade.target : null;

      if (validNumber(entry)) {
        candleSeries.createPriceLine({
          price: entry,
          color: "#38bdf8",
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: "Entry",
        });
      }
      if (validNumber(stop)) {
        candleSeries.createPriceLine({
          price: stop,
          color: "#ef4444",
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "Stop",
        });
      }
      if (validNumber(target)) {
        candleSeries.createPriceLine({
          price: target,
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
  }, [chartData, volumeData, candles, grade, overlay]);

  if (!candles.length) {
    return <div className="chart-empty">Fetch candles or paste CSV data to show the chart.</div>;
  }

  return (
    <div>
      <div className="chart-wrap" ref={containerRef} />
      <div className="chart-time-note">Chart time zone: Eastern Time (ET). Levels prioritize open app/broker trade records, then latest signal levels.</div>
    </div>
  );
}
