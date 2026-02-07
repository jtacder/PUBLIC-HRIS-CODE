# Module 03: Schedule Management

## Purpose

Shift scheduling with day and night shift support for field-service and construction employees. Schedules are defined at the employee level (not as separate schedule entities), with shift start time, end time, and work days stored directly on the employee record. This module is documented separately from employee management because the scheduling concept transforms significantly when adapted for academic class scheduling.

## File Inventory

| File | Original Path | Layer | Description |
|------|--------------|-------|-------------|
| Schedules.tsx | client/src/pages/Schedules.tsx | Frontend | Schedule management view showing employee shift assignments |

**Note:** Schedule data is stored on the `employees` table and managed through the employee API. There is no separate backend route file for schedules -- the schedule fields are part of the employee CRUD in `server/routes/employees.ts`.

## Key Features

- **Day/Night Shift Detection**: Automatic shift type classification based on clock-in hour
  - Day Shift: 06:00 - 21:59
  - Night Shift: 22:00 - 05:59
- **Per-Employee Shift Configuration**: Each employee has individual shift settings
  - `shiftStartTime` -- e.g., "08:00" (HH:MM format)
  - `shiftEndTime` -- e.g., "17:00" (HH:MM format)
  - `shiftWorkDays` -- e.g., "Mon,Tue,Wed,Thu,Fri" (comma-separated)
- **Overnight Shift Support**: Night shifts that cross midnight are handled with scheduled shift date calculation
- **Shift Duration Calculation**: `calculateShiftMinutes()` utility computes expected work minutes per shift
- **Integration with Attendance**: Shift configuration determines tardiness calculation, overtime detection, and lunch deduction rules

## API Routes

Schedule management uses the Employee API endpoints:

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| PATCH | /api/employees/:id | ADMIN, HR | Update shift fields: shiftStartTime, shiftEndTime, shiftWorkDays |
| GET | /api/employees | All authenticated | List employees with their shift configurations |
| GET | /api/employees/:id | All authenticated | Get single employee with shift details |

## Dependencies

### Internal Module Dependencies
- **02-employee-management** -- Schedule fields are stored on the employee record
- **04-attendance-system** -- Reads shift configuration for tardiness and overtime calculations
- **_shared/components/ui/*** -- Table, Card, Select, Input

### External Libraries
- **date-fns** (v3.6.0) -- Date manipulation for shift date calculations

### Server Utilities
- **server/utils/datetime.ts** -- Contains all shift-related calculation functions:
  - `parseShiftTime(timeStr)` -- Parses "HH:MM" string into hours and minutes
  - `calculateShiftMinutes(startTime, endTime)` -- Calculates total shift duration in minutes
  - `isNightClockIn(hour)` -- Returns true if hour is between 22:00 and 05:59
  - `getScheduledShiftDate(clockInTime, isNightShift)` -- Determines the shift date for overnight shifts
  - `getPhilippineTime()` -- Gets current time in PHT (UTC+8)

## Database Tables

| Table | Fields Used | Description |
|-------|------------|-------------|
| employees | shiftStartTime, shiftEndTime, shiftWorkDays | Shift configuration stored directly on employee |
| attendance_logs | scheduledShiftDate, actualShiftType | Shift context recorded at clock-in time |

## Business Logic Rules

| Rule | Description |
|------|-------------|
| Shift Type Detection | Clock-in hour 06:00-21:59 = Day Shift; 22:00-05:59 = Night Shift |
| Overnight Shift Date | If night shift clock-in after 22:00, the scheduled shift date is the current calendar date; if clock-in before 06:00, the scheduled shift date is the previous calendar date |
| Work Days Validation | `shiftWorkDays` is a comma-separated string of 3-letter day abbreviations (Mon, Tue, Wed, etc.) |
| Default Shift | If no shift configured, system defaults to standard day shift (08:00-17:00, Mon-Fri) |
| Tardiness Base | Late minutes calculated from `shiftStartTime`; 15-minute grace period before deductible tardiness |
| Lunch Deduction | 60-minute automatic deduction if total working time >= 5 hours |
| Overtime Trigger | Working minutes beyond scheduled shift duration (after lunch deduction) flagged as overtime |
| Philippine Timezone | All shift calculations use UTC+8 (Asia/Manila); configured in `server/config/index.ts` |

## Scholaris Adaptation Notes

This module requires the most significant transformation for a school management system:

- **Replace shift-based scheduling with period-based class scheduling**:
  - Periods: Period 1 (7:30-8:30), Period 2 (8:30-9:30), etc.
  - Each period links to a subject, room, section, and faculty member
- **Create new `class_schedules` table**:
  ```
  class_schedules: id, schoolYear, semester, dayOfWeek, periodNumber,
                   startTime, endTime, subjectId, sectionId, roomId, facultyId
  ```
- **Add room assignments**: Track room availability and prevent double-booking
- **Add faculty load tracking**: Total teaching hours per week, overload detection
- **Add section management**: Grade level + section (e.g., "Grade 10 - Section A")
- **Keep shift-based attendance for non-teaching staff**: Administrative staff still uses clock-in/out
- **Add bell schedule configuration**: Define school-wide period timings that can vary by day (e.g., Wednesday shortened schedule)
- **Calendar integration**: Map class schedules to the academic calendar (suspension of classes, special schedules)
