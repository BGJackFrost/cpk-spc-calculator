import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Clock, 
  Globe,
  Monitor,
  Loader2,
  RefreshCw,
  ChevronLeft,
  Building2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { vi } from "date-fns/locale";
import { Link } from "wouter";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export default function LoginHistoryDetail() {
  const { toast } = useToast();
  const [mapCenter, setMapCenter] = useState<[number, number]>([21.0285, 105.8542]); // Default: Hanoi

  const { data: locations, isLoading, refetch } = trpc.localAuth.getLoginLocationHistory.useQuery({ limit: 50 });

  // Update map center when data loads
  useEffect(() => {
    if (locations && locations.length > 0) {
      const firstWithCoords = locations.find(l => l.latitude && l.longitude);
      if (firstWithCoords && firstWithCoords.latitude && firstWithCoords.longitude) {
        setMapCenter([parseFloat(firstWithCoords.latitude), parseFloat(firstWithCoords.longitude)]);
      }
    }
  }, [locations]);

  const getCountryFlag = (countryCode: string | null) => {
    if (!countryCode || countryCode.length !== 2) return "🌍";
    const codePoints = countryCode
      .toUpperCase()
      .split("")
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const validLocations = locations?.filter(l => l.latitude && l.longitude) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Lịch sử đăng nhập chi tiết</h1>
            <p className="text-muted-foreground">Xem vị trí địa lý của các lần đăng nhập</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Làm mới
        </Button>
      </div>

      {/* Map */}
      {validLocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Bản đồ vị trí đăng nhập
            </CardTitle>
            <CardDescription>
              Hiển thị {validLocations.length} vị trí đăng nhập gần đây
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] rounded-lg overflow-hidden border">
              <MapContainer
                center={mapCenter}
                zoom={4}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {validLocations.map((location, index) => (
                  <Marker
                    key={location.id}
                    position={[parseFloat(location.latitude!), parseFloat(location.longitude!)]}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-medium">{location.city}, {location.country}</p>
                        <p className="text-muted-foreground">IP: {location.ipAddress}</p>
                        <p className="text-muted-foreground">
                          {format(new Date(location.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Danh sách đăng nhập
          </CardTitle>
          <CardDescription>
            Chi tiết các lần đăng nhập gần đây
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!locations || locations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có lịch sử đăng nhập
            </div>
          ) : (
            <div className="space-y-4">
              {locations.map((location) => (
                <div 
                  key={location.id} 
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">
                      {getCountryFlag(location.countryCode)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {location.city || "Unknown"}, {location.country || "Unknown"}
                        </p>
                        {location.countryCode && (
                          <Badge variant="outline" className="text-xs">
                            {location.countryCode}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Monitor className="h-3 w-3" />
                          {location.ipAddress}
                        </span>
                        {location.isp && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {location.isp}
                          </span>
                        )}
                        {location.timezone && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {location.timezone}
                          </span>
                        )}
                      </div>
                      {location.region && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Khu vực: {location.region}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">
                      {formatDistanceToNow(new Date(location.createdAt), { addSuffix: true, locale: vi })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(location.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
