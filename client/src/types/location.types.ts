export type TrackingLocation = {
  id: number;
  patient_id: number;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed_mps?: number;
  geofence_alert?: boolean;
};
