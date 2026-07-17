import Map, { Marker } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, LocateFixed, ShieldAlert } from "lucide-react";
import { env } from "@/lib/env";
import { cn } from "@/lib/cn";
import { useThemeStore, resolveTheme } from "@/stores/themeStore";

interface MapPreviewProps {
  lat?: number;
  lng?: number;
  className?: string;
  interactive?: boolean;
  markers?: { lat: number; lng: number; label?: string }[];
  /** Pass through from useGeolocation() so a permission/hardware failure is shown honestly instead of a generic placeholder. */
  locationError?: string | null;
  locationLoading?: boolean;
  onRetryLocation?: (e?: React.MouseEvent) => void;
}

const LIGHT_STYLE = "mapbox://styles/mapbox/light-v11";
const DARK_STYLE = "mapbox://styles/mapbox/dark-v11";

/**
 * Renders a live Mapbox map when VITE_MAPBOX_TOKEN is configured AND a real
 * lat/lng is available. Distinguishes "no token configured" from "waiting
 * on the browser's location permission" from "location denied" — these
 * look identical to a user if collapsed into one generic fallback.
 */
export function MapPreview({
  lat,
  lng,
  className,
  interactive = false,
  markers,
  locationError,
  locationLoading,
  onRetryLocation,
}: MapPreviewProps) {
  const themePreference = useThemeStore((s) => s.preference);
  const resolvedTheme = resolveTheme(themePreference);

  if (lat !== undefined && lng !== undefined && env.mapboxToken) {
    return (
      <div className={cn("overflow-hidden rounded-3xl border border-subtle", className)}>
        <Map
          mapboxAccessToken={env.mapboxToken}
          initialViewState={{ longitude: lng, latitude: lat, zoom: 14.5 }}
          mapStyle={resolvedTheme === "dark" ? DARK_STYLE : LIGHT_STYLE}
          dragPan={interactive}
          scrollZoom={interactive}
          dragRotate={false}
          touchZoomRotate={interactive}
          doubleClickZoom={interactive}
          attributionControl={false}
          style={{ width: "100%", height: "100%" }}
        >
          <Marker longitude={lng} latitude={lat} />
          {markers?.map((m, i) => (
            <Marker key={i} longitude={m.lng} latitude={m.lat} />
          ))}
        </Map>
      </div>
    );
  }

  if (locationError) {
    return (
      <PlaceholderShell className={className}>
        <ShieldAlert size={20} strokeWidth={2.5} className="text-primary" />
        <span className="text-xs font-semibold text-primary">Location access blocked</span>
        <span className="max-w-[220px] text-center text-[11px] leading-snug text-muted">{locationError}</span>
        {onRetryLocation && (
          <button
            onClick={onRetryLocation}
            className="mt-1 rounded-full bg-primary px-4 py-1.5 text-[11px] font-bold text-white"
          >
            Try again
          </button>
        )}
      </PlaceholderShell>
    );
  }

  if (locationLoading) {
    return (
      <PlaceholderShell className={className}>
        <span className="relative grid h-11 w-11 place-items-center rounded-full bg-accent text-white">
          <span className="absolute inset-0 rounded-full border-2 border-white/60 animate-pulse-ring" />
          <LocateFixed size={20} strokeWidth={2.5} />
        </span>
        <span className="text-xs font-semibold text-muted">Getting your location…</span>
      </PlaceholderShell>
    );
  }

  return (
    <PlaceholderShell className={className}>
      <span className="relative grid h-11 w-11 place-items-center rounded-full bg-accent text-white shadow-[0_10px_24px_-6px_rgb(25_118_210_/_0.5)]">
        <span className="absolute inset-0 rounded-full border-2 border-white/40 animate-pulse-ring" />
        <MapPin size={20} strokeWidth={2.5} />
      </span>
      <span className="text-xs font-semibold text-muted">{env.mapboxToken ? "Waiting for location" : "Map preview"}</span>
    </PlaceholderShell>
  );
}

function PlaceholderShell({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-3xl border border-subtle bg-tint-accent",
        className,
      )}
      style={{
        backgroundImage:
          "radial-gradient(circle at 30% 30%, var(--tint-accent), transparent 60%), linear-gradient(135deg, var(--surface-card-elevated), var(--surface-canvas))",
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="relative flex flex-col items-center gap-2 px-4 py-3">{children}</div>
    </div>
  );
}
