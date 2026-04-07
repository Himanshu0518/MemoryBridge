import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useGetLocationsQuery } from "@/services/patientApi";
import { MapPin, Navigation, ShieldCheck } from "lucide-react";
import type { TrackingLocation } from "@/types";

// Fix default Leaflet icon paths in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in metres
  const phi1 = lat1 * Math.PI/180;
  const phi2 = lat2 * Math.PI/180;
  const deltaPhi = (lat2-lat1) * Math.PI/180;
  const deltaLambda = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function MapBoundsFit({ locations }: { locations: TrackingLocation[] }) {
  const map = useMap();
  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map((loc) => [loc.latitude, loc.longitude]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [locations, map]);
  return null;
}

export function PatientTrackingMap({ patientId }: { patientId: number }) {
  const { data: locations = [], isLoading } = useGetLocationsQuery(patientId, {
    pollingInterval: 5000, 
  });

  // Calculate distances and identify if patient has breached 50m radius from start
  const { isExceedingRadius, speed, endLocation, startLocation } = useMemo(() => {
    if (locations.length === 0) return { isExceedingRadius: false, speed: 0, endLocation: null, startLocation: null };
    
    // We treat the very first ping as "Home" for this journey
    const startLoc = locations[0];
    const latestLoc = locations[locations.length - 1];

    let maxDist = 0;
    for (const loc of locations) {
      const dist = getDistanceMeters(startLoc.latitude, startLoc.longitude, loc.latitude, loc.longitude);
      if (dist > maxDist) maxDist = dist;
    }

    // Attempt to calculate speed from last two points
    let currentSpeed = 0;
    if (locations.length >= 2) {
      const prev = locations[locations.length - 2];
      const dist = getDistanceMeters(prev.latitude, prev.longitude, latestLoc.latitude, latestLoc.longitude);
      const timeDiffSeconds = (new Date(latestLoc.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;
      if (timeDiffSeconds > 0) {
        currentSpeed = dist / timeDiffSeconds;
      }
    }

    return { 
      isExceedingRadius: maxDist > 50, 
      speed: currentSpeed,
      endLocation: latestLoc,
      startLocation: startLoc
    };
  }, [locations]);

  if (isLoading) {
    return <div className="animate-pulse h-[400px] w-full bg-muted rounded-xl mt-6"></div>;
  }

  if (locations.length === 0 || !startLocation || !endLocation) {
    return (
      <div className="flex flex-col items-center justify-center p-10 mt-6 rounded-xl border border-dashed border-border bg-card">
        <MapPin className="size-10 text-muted-foreground opacity-50 mb-4" />
        <p className="font-medium">No tracking history</p>
        <p className="text-sm text-muted-foreground mt-1">
          Tracking data has not been sent for this patient yet.
        </p>
      </div>
    );
  }

  if (!isExceedingRadius) {
    return (
      <div className="mt-6 flex flex-col items-center justify-center p-10 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/20 mb-4">
          <ShieldCheck className="size-7 text-emerald-600" />
        </div>
        <p className="text-lg font-bold text-emerald-700">Patient is Safe at Home</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          The patient is currently within the safe radius (50 meters) of their starting location. 
          Live location plotting will automatically start if they travel beyond this radius.
        </p>
      </div>
    );
  }

  const coordinates = locations.map((loc) => [loc.latitude, loc.longitude] as [number, number]);

  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
        <Navigation className="size-4 text-blue-500" /> Live Tracking Map
      </h2>
      
      {/* HUD Info */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xl font-semibold">{speed.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Current Speed (m/s)</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xl font-semibold text-amber-600">Travelling</p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center">
            <span className="size-2 rounded-full mr-2 bg-amber-500 animate-pulse"></span>
            Beyond 50m radius
          </p>
        </div>
      </div>

      {/* Map Container */}
      <div className="h-[400px] w-full rounded-xl overflow-hidden border border-border shadow-sm">
        <MapContainer center={[startLocation.latitude, startLocation.longitude]} zoom={15} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Polyline positions={coordinates} pathOptions={{ color: "#2563eb", weight: 4 }} />
          <Marker position={[startLocation.latitude, startLocation.longitude]}>
            <Popup>Home / Start Point</Popup>
          </Marker>
          <Marker position={[endLocation.latitude, endLocation.longitude]}>
            <Popup>
              <b>Current Location</b><br/>
              {new Date(endLocation.timestamp).toLocaleString()}<br/>
              Speed: {speed.toFixed(1)} m/s
            </Popup>
          </Marker>
          <MapBoundsFit locations={locations} />
        </MapContainer>
      </div>
    </div>
  );
}
