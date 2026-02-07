# Module 04: Attendance System

## Purpose

QR-based clock-in/out system with GPS geofencing, photo capture, face detection with liveness challenges, and automated tardiness/overtime tracking. This is the most complex module in the HRIS, integrating GPS verification, camera hardware access, facial recognition, and real-time shift calculations. Attendance data feeds directly into the payroll module for compensation computation.

## File Inventory

| File | Original Path | Layer | Description |
|------|--------------|-------|-------------|
| Attendance.tsx | client/src/pages/Attendance.tsx | Frontend | Attendance records list with filters, search, manual entry, bulk upload |
| ClockIn.tsx | client/src/pages/ClockIn.tsx | Frontend | QR scanner + GPS capture + photo snapshot + face detection UI |
| attendance.ts | server/routes/attendance.ts | Backend | Clock-in/out API with geofence validation, tardiness calculation |
| geo.ts | server/utils/geo.ts | Backend | Haversine formula distance calculation and geofence checking |
| datetime.ts | server/utils/datetime.ts | Backend | Philippine timezone utilities, shift detection, working day calculations |

## Key Features

- **QR-Based Clock-In**: Employee scans their QR badge; system validates the 32-char hex token and identifies the employee
- **GPS Geofencing**: Haversine formula validates that the employee is within the configured radius of at least one assigned project site
- **Photo Capture**: Front-facing camera captures a selfie at clock-in (640x480 JPEG, 80% quality, stored as base64 in database)
- **Face Detection**: face-api.js with TinyFaceDetector model provides face presence verification
- **Liveness Challenges**: Anti-spoofing checks requiring blink detection (EAR < 0.2), head turn left (yaw < -0.15), head turn right (yaw > 0.15) with 10-second timeout per challenge
- **Automatic Shift Detection**: Day shift (06:00-21:59) or Night shift (22:00-05:59) auto-detected from clock-in hour
- **Tardiness Tracking**: Late minutes calculated from employee's configured shift start time with 15-minute grace period
- **Overtime Detection**: Working minutes beyond scheduled shift flagged for approval
- **Lunch Deduction**: Automatic 60-minute deduction when total working time >= 5 hours
- **Verification Statuses**: Verified, Off-site, Pending, Flagged
- **Bulk Import**: Upload attendance records via Excel spreadsheet
- **Off-site Justification**: Employees can submit justification for off-site clock-in attempts
- **Manual Entry**: Admin/HR can create attendance records manually (bypasses geofence)

## Clock-In Flow (Complete Sequence)

```
1. Employee opens ClockIn page
2. Camera activates (front-facing, 640x480)
3. Employee scans QR code using html5-qrcode library
4. QR token extracted and sent to server
   |
   v
5. SERVER: Validate QR token --> Find employee
6. SERVER: Auto-detect shift type (day/night based on clock-in hour)
7. SERVER: Check for duplicate clock-in (existing record without timeOut)
   - If duplicate found and shift completed: Accept as overtime session
   - If duplicate found and shift not completed: REJECT "Already clocked in"
8. SERVER: Verify active project assignment exists
   - If no assignment: REJECT "No active assignment"
9. SERVER: GEOFENCE CHECK
   - Loop through ALL assigned projects
   - Calculate Haversine distance for each
   - If within ANY project's geoRadius: ACCEPT (verificationStatus = "Verified")
   - If outside ALL projects: REJECT with nearest distance
10. SERVER: Calculate tardiness
    - Compare clock-in time to shiftStartTime
    - < 15 minutes late: Record, lateDeductible = false
    - >= 15 minutes late: Record, lateDeductible = true
11. SERVER: Accept photo snapshot (base64 JPEG from request body)
12. SERVER: Create attendance_logs record with all captured data
13. Return success response with attendance record
```

## Geofencing Details

### Haversine Formula
```
R = 6371e3 meters (Earth's mean radius)
a = sin²(delta_lat/2) + cos(lat1) * cos(lat2) * sin²(delta_lng/2)
c = 2 * atan2(sqrt(a), sqrt(1-a))
distance = R * c (result in meters)
isWithin = distance <= project.geoRadius
```

### Configuration
| Setting | Value | Source |
|---------|-------|--------|
| Default Radius | 100 meters | server/config/index.ts |
| Per-Project Radius | Customizable (integer, meters) | projects.geoRadius field |
| Coordinate Precision | 7 decimal places (~1.1cm accuracy) | Database DECIMAL(10,7) |
| GPS Accuracy Requirement | <= 50 meters | Client-side validation |

### Verification Statuses
| Status | Trigger | Consequence |
|--------|---------|-------------|
| Verified | distance <= geoRadius | Clock-in accepted normally |
| Off-site | distance > geoRadius for ALL projects | Clock-in REJECTED (HTTP 400) |
| Pending | Employee submits justification | Awaiting HR review |
| Flagged | Set manually by HR/Admin | Under investigation |

## Face Detection Details

### Libraries
- **face-api.js** (v0.22.2) -- Primary face detection library
- **@vladmandic/face-api** (v1.7.15) -- Fallback implementation

### Models (loaded from /public/models/)
1. **TinyFaceDetector** -- Fast face detection model
2. **FaceLandmark68Net** -- 68-point facial landmark detection
3. **FaceRecognitionNet** -- 128-dimension face descriptor generation

### Liveness Challenges
| Challenge | Detection Method | Threshold | Timeout |
|-----------|-----------------|-----------|---------|
| Blink | Eye Aspect Ratio (EAR) | EAR < 0.2 | 10 seconds |
| Turn Left | Head yaw from landmarks | yaw < -0.15 | 10 seconds |
| Turn Right | Head yaw from landmarks | yaw > 0.15 | 10 seconds |

**Known Limitation**: Face verification runs client-side but the result is NOT sent to the server. The `faceVerified` field exists in the schema but always remains `false`. Liveness check is skippable with a security warning logged.

## API Routes

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/attendance/today | All authenticated | Get today's attendance records with optional filters |
| POST | /api/attendance/clock-in | All authenticated | Clock in with QR token, GPS coordinates, and photo |
| POST | /api/attendance/clock-out | All authenticated | Clock out, calculates total working minutes, overtime |
| PATCH | /api/attendance/:id | ADMIN, HR | Edit an attendance record (admin correction) |
| POST | /api/attendance/bulk-upload | ADMIN, HR | Bulk import attendance from Excel file |
| GET | /api/attendance/template/download | ADMIN, HR | Download Excel template for bulk import |
| POST | /api/attendance/:id/justification | All authenticated | Submit off-site justification for flagged attendance |

## Dependencies

### Internal Module Dependencies
- **02-employee-management** -- Employee lookup by QR token; shift configuration for tardiness
- **03-schedule-management** -- Shift times and work days for late/OT calculation
- **16-project-management** -- Project geofence coordinates and radius; project assignments
- **_shared/hooks/use-auth** -- Role-based UI display
- **_shared/components/ui/*** -- Table, Card, Badge, Button, Dialog, Select

### External Libraries
- **html5-qrcode** (v2.3.8) -- QR code scanning from camera feed (10 FPS, rear camera)
- **face-api.js** (v0.22.2) -- Face detection and liveness verification
- **@vladmandic/face-api** (v1.7.15) -- Fallback face detection
- **xlsx** (v0.18.5) -- Excel parsing for bulk import
- **navigator.mediaDevices.getUserMedia()** -- Native browser camera API (front-facing, 640x480)

## Database Tables

| Table | Operations | Key Fields |
|-------|-----------|------------|
| attendance_logs | CRUD | id, employeeId, projectId, timeIn, timeOut, gpsLatitude, gpsLongitude, gpsAccuracy, photoSnapshotUrl, verificationStatus, lateMinutes, lateDeductible, overtimeMinutes, otStatus, isOvertimeSession, scheduledShiftDate, actualShiftType, lunchDeductionMinutes, totalWorkingMinutes, justification |
| attendance_verifications | Read | Verification status tracking records |

### Key Database Indexes
- `idx_attendance_employee_date` -- (employee_id, scheduled_shift_date) for daily lookups
- `idx_attendance_project_date` -- (project_id, scheduled_shift_date) for project reports

## Business Logic Rules

| Condition | Action | Outcome |
|-----------|--------|---------|
| Clock-in within geofence | Accept | verificationStatus = "Verified" |
| Clock-in outside ALL geofences | REJECT | HTTP 400, no record created |
| No active project assignment | REJECT | Error: "No active assignment" |
| Already clocked in (no timeOut) | REJECT | Error: "Already clocked in" |
| Completed shift + clock-in again | Accept as OT | isOvertimeSession = true |
| Clock-in 06:00-21:59 | Auto-detect day shift | actualShiftType = "day" |
| Clock-in 22:00-05:59 | Auto-detect night shift | actualShiftType = "night" |
| Late < 15 minutes | Record but non-deductible | lateDeductible = false |
| Late >= 15 minutes | Record and deductible | lateDeductible = true |
| Worked >= 5 hours | Apply lunch deduction | lunchDeductionMinutes = 60 |
| Worked < 5 hours | No lunch deduction | lunchDeductionMinutes = 0 |
| Gross minutes > scheduled shift | Calculate overtime | overtimeMinutes = excess |
| Any overtime detected | Requires approval | otStatus = "Pending" |

## Photo Storage

| Aspect | Value |
|--------|-------|
| Format | JPEG, 80% quality |
| Resolution | 640 x 480 pixels |
| Storage | Base64 string in PostgreSQL TEXT field |
| Location | attendance_logs.photo_snapshot_url |
| Estimated Size | ~40-60 KB per photo |
| Camera Facing | Front camera ("user") for selfie |

**Warning**: Photos are stored directly in the database as base64 strings, not in external storage (S3/GCS). This can cause database bloat at scale. Consider migrating to cloud storage for production deployments with large employee counts.

## Scholaris Adaptation Notes

- **Keep QR-based attendance for faculty/staff**: School gate check-in using QR badges works identically
- **Replace project geofencing with campus geofencing**: Define school campus boundary as the geofence; single campus = single geofence zone
- **Add period-based attendance (optional)**: Track faculty presence per class period, not just daily clock-in/out
- **Simplify for single-campus schools**: Remove multi-project geofence loop; use single campus boundary
- **Student attendance (separate module)**: Faculty marks student attendance per class period -- different workflow from employee attendance
- **Remove overtime tracking for faculty**: Teachers typically have fixed schedules without overtime
- **Keep tardiness tracking**: Late arrival tracking is relevant for school staff
- **Consider biometric alternative**: Schools may prefer fingerprint or face-only authentication instead of QR codes
