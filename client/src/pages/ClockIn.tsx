import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { formatTime, cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Camera,
  QrCode,
  Play,
  Square,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface GeoPosition {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
}

interface ActiveAttendance {
  id: number;
  employeeId: number;
  date: string;
  timeIn: string;
  timeOut?: string;
  employee?: {
    firstName: string;
    lastName: string;
    employeeNo: string;
  };
}

export default function ClockIn() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [qrToken, setQrToken] = useState("");
  const [position, setPosition] = useState<GeoPosition>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
  });
  const [gettingLocation, setGettingLocation] = useState(false);

  const { data: activeAttendances = [], isLoading: loadingActive } = useQuery<ActiveAttendance[]>({
    queryKey: ["/api/attendance/active"],
  });

  // Get GPS location
  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setPosition((prev) => ({ ...prev, error: "Geolocation is not supported by this browser." }));
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          error: null,
        });
        setGettingLocation(false);
      },
      (err) => {
        setPosition((prev) => ({
          ...prev,
          error: `Location error: ${err.message}`,
        }));
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // Auto-get location on mount
  useEffect(() => {
    getLocation();
  }, [getLocation]);

  const clockInMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {};
      if (qrToken) payload.qrToken = qrToken;
      if (position.latitude !== null && position.longitude !== null) {
        payload.latitude = position.latitude;
        payload.longitude = position.longitude;
        payload.accuracy = position.accuracy;
      }
      const res = await apiRequest("POST", "/api/attendance/clock-in", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({ title: "Clocked in successfully!", variant: "success" });
      setQrToken("");
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async (attendanceId: number) => {
      const payload: Record<string, unknown> = {};
      if (position.latitude !== null && position.longitude !== null) {
        payload.latitude = position.latitude;
        payload.longitude = position.longitude;
      }
      const res = await apiRequest("POST", `/api/attendance/${attendanceId}/clock-out`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({ title: "Clocked out successfully!", variant: "success" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/attendance">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Clock In / Out</h1>
          <p className="text-muted-foreground text-sm">
            Record your attendance
          </p>
        </div>
      </div>

      {/* Clock In Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="h-4 w-4" />
            Clock In
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* QR Token */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              QR Token (optional)
            </Label>
            <Input
              value={qrToken}
              onChange={(e) => setQrToken(e.target.value)}
              placeholder="Enter or scan QR token"
            />
          </div>

          {/* GPS Location */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              GPS Location
            </Label>
            <div className="p-3 rounded-lg border bg-muted/30">
              {gettingLocation ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Getting your location...
                </div>
              ) : position.error ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {position.error}
                  </div>
                  <Button variant="outline" size="sm" onClick={getLocation}>
                    Retry
                  </Button>
                </div>
              ) : position.latitude !== null ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <CheckCircle className="h-4 w-4" />
                    Location acquired
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    Lat: {position.latitude.toFixed(6)}, Lng: {position.longitude?.toFixed(6)}
                  </p>
                  {position.accuracy && (
                    <p className="text-xs text-muted-foreground">
                      Accuracy: {position.accuracy.toFixed(0)}m
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Location not available
                </div>
              )}
            </div>
          </div>

          {/* Photo Capture Placeholder */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Photo (optional)
            </Label>
            <div className="h-32 rounded-lg border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
              <Camera className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">Photo capture</p>
              <p className="text-xs">Camera feature coming soon</p>
            </div>
          </div>

          {/* Clock In Button */}
          <Button
            className="w-full gap-2"
            size="lg"
            onClick={() => clockInMutation.mutate()}
            disabled={clockInMutation.isPending}
          >
            {clockInMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Clock In
          </Button>
        </CardContent>
      </Card>

      {/* Active Attendance / Clock Out */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Active Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingActive ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeAttendances.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No active clock-in records. Clock in to start recording attendance.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Time In</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeAttendances.map((attendance) => (
                    <TableRow key={attendance.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {attendance.employee
                              ? `${attendance.employee.firstName} ${attendance.employee.lastName}`
                              : `Employee #${attendance.employeeId}`}
                          </p>
                          {attendance.employee && (
                            <p className="text-xs text-muted-foreground">
                              {attendance.employee.employeeNo}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {formatTime(attendance.timeIn)}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-100 text-emerald-700">
                          Clocked In
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-1"
                          onClick={() => clockOutMutation.mutate(attendance.id)}
                          disabled={clockOutMutation.isPending}
                        >
                          {clockOutMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Square className="h-3 w-3" />
                          )}
                          Clock Out
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
