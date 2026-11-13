// app/(admin)/system/geo/page.tsx
import { Suspense } from "react";
import { GeoIpLocationsTableClient } from "./_components/geoip-locations-table-client";

export default function GeoLocationsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Загрузка...</div>}>
      <GeoIpLocationsTableClient backUrl="/dashboard" />
    </Suspense>
  );
}