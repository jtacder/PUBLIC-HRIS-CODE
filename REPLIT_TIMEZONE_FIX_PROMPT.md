# CRITICAL: Fix Attendance System Timezone Issues

## PROBLEM STATEMENT
The attendance system is not saving dates correctly because it uses local timezone methods on manually-shifted Date objects. All dates must be in Philippines (PH) local time (UTC+8) without any conversion issues.

## ROOT CAUSE
The codebase uses `getPhilippineTime()` which manually adds 8 hours to create a PHT-shifted Date object. However, the code incorrectly uses LOCAL timezone methods (like `getHours()`, `setHours()`, `getDate()`, `setDate()`) on these shifted objects. When the server runs in UTC timezone (like in Replit cloud), these methods return wrong values.

## THE SOLUTION
Use UTC methods (`getUTCHours()`, `setUTCHours()`, `getUTCDate()`, `setUTCDate()`, etc.) consistently on all PHT-shifted Date objects returned by `getPhilippineTime()`.

---

## FILE 1: server/utils/datetime.ts

### Fix 1: formatTimestampAsPHT() function (around line 80-98)
**FIND THIS CODE:**
```typescript
export function formatTimestampAsPHT(timestamp: Date | string | null): string | null {
  if (!timestamp) return null;

  let dateStr: string;

  if (timestamp instanceof Date) {
    const year = timestamp.getFullYear();
    const month = String(timestamp.getMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getDate()).padStart(2, '0');
    const hours = String(timestamp.getHours()).padStart(2, '0');
    const minutes = String(timestamp.getMinutes()).padStart(2, '0');
    const seconds = String(timestamp.getSeconds()).padStart(2, '0');
    dateStr = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  } else {
    dateStr = String(timestamp).replace(' ', 'T').slice(0, 19);
  }

  return dateStr + '+08:00';
}
```

**REPLACE WITH:**
```typescript
export function formatTimestampAsPHT(timestamp: Date | string | null): string | null {
  if (!timestamp) return null;

  let dateStr: string;

  if (timestamp instanceof Date) {
    const year = timestamp.getUTCFullYear();
    const month = String(timestamp.getUTCMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getUTCDate()).padStart(2, '0');
    const hours = String(timestamp.getUTCHours()).padStart(2, '0');
    const minutes = String(timestamp.getUTCMinutes()).padStart(2, '0');
    const seconds = String(timestamp.getUTCSeconds()).padStart(2, '0');
    dateStr = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  } else {
    dateStr = String(timestamp).replace(' ', 'T').slice(0, 19);
  }

  return dateStr + '+08:00';
}
```

**WHY:** This function formats timestamps for display. Using local methods causes wrong dates/times when server is in UTC.

---

### Fix 2: getScheduledShiftDate() function (around line 161-168)
**FIND THIS CODE:**
```typescript
export function getScheduledShiftDate(now: Date, isNightShift: boolean): string {
  if (isNightShift && now.getHours() < 6) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
  return now.toISOString().split('T')[0];
}
```

**REPLACE WITH:**
```typescript
export function getScheduledShiftDate(now: Date, isNightShift: boolean): string {
  if (isNightShift && now.getUTCHours() < 6) {
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
  return now.toISOString().split('T')[0];
}
```

**WHY:** Night shift detection fails with local methods. If someone clocks in at 2 AM PHT, we need to assign it to the previous day's shift.

---

### Fix 3: calculateWorkingDays() function (around line 177-191)
**FIND THIS CODE:**
```typescript
export function calculateWorkingDays(startDate: Date, endDate: Date, currentDate?: Date): number {
  let workingDays = 0;
  const tempDate = new Date(startDate);
  const limitDate = currentDate && currentDate < endDate ? currentDate : endDate;

  while (tempDate <= limitDate) {
    const dayOfWeek = tempDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    tempDate.setDate(tempDate.getDate() + 1);
  }

  return workingDays;
}
```

**REPLACE WITH:**
```typescript
export function calculateWorkingDays(startDate: Date, endDate: Date, currentDate?: Date): number {
  let workingDays = 0;
  const tempDate = new Date(startDate);
  const limitDate = currentDate && currentDate < endDate ? currentDate : endDate;

  while (tempDate <= limitDate) {
    const dayOfWeek = tempDate.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    tempDate.setUTCDate(tempDate.getUTCDate() + 1);
  }

  return workingDays;
}
```

**WHY:** Working days calculation can skip or duplicate days with local methods.

---

## FILE 2: server/routes/attendance.ts

### Fix 4: Clock-in endpoint - current hour check (around line 58-59)
**FIND THIS CODE:**
```typescript
    const now = getPhilippineTime();
    const currentHour = now.getHours();
```

**REPLACE WITH:**
```typescript
    const now = getPhilippineTime();
    const currentHour = now.getUTCHours();
```

**WHY:** Night shift detection fails. If it's 22:00 PHT but server is in UTC, `getHours()` returns 14, not 22.

---

### Fix 5: Clock-in endpoint - night shift date (around line 75-80)
**FIND THIS CODE:**
```typescript
    let scheduledShiftDate = now.toISOString().split('T')[0];
    if (actualShiftType === "night" && currentHour < 6) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      scheduledShiftDate = yesterday.toISOString().split('T')[0];
    }
```

**REPLACE WITH:**
```typescript
    let scheduledShiftDate = now.toISOString().split('T')[0];
    if (actualShiftType === "night" && currentHour < 6) {
      const yesterday = new Date(now);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      scheduledShiftDate = yesterday.toISOString().split('T')[0];
    }
```

**WHY:** Setting wrong scheduled shift date for overnight shifts.

---

### Fix 6: Clock-in endpoint - shift start time (around line 147-149)
**FIND THIS CODE:**
```typescript
    const shiftStartToday = new Date(now);
    const [shiftHours, shiftMinutes] = scheduledShiftStart.split(':').map(Number);
    shiftStartToday.setHours(shiftHours, shiftMinutes, 0, 0);
```

**REPLACE WITH:**
```typescript
    const shiftStartToday = new Date(now);
    const [shiftHours, shiftMinutes] = scheduledShiftStart.split(':').map(Number);
    shiftStartToday.setUTCHours(shiftHours, shiftMinutes, 0, 0);
```

**WHY:** Late minutes calculated wrong because shift start time is in wrong timezone.

---

### Fix 7: Manual attendance endpoint (around line 304-311)
**FIND THIS CODE:**
```typescript
    if (employee.shiftStartTime) {
      const [startHours, startMinutes] = employee.shiftStartTime.split(':').map(Number);
      const shiftStart = new Date(timeInDate);
      shiftStart.setHours(startHours, startMinutes, 0, 0);
      if (timeInDate > shiftStart) {
        lateMinutes = Math.floor((timeInDate.getTime() - shiftStart.getTime()) / (1000 * 60));
      }
    }
```

**REPLACE WITH:**
```typescript
    if (employee.shiftStartTime) {
      const [startHours, startMinutes] = employee.shiftStartTime.split(':').map(Number);
      const shiftStart = new Date(timeInDate);
      shiftStart.setUTCHours(startHours, startMinutes, 0, 0);
      if (timeInDate > shiftStart) {
        lateMinutes = Math.floor((timeInDate.getTime() - shiftStart.getTime()) / (1000 * 60));
      }
    }
```

**WHY:** Manual attendance late minutes calculated incorrectly.

---

### Fix 8: Date range filter (around line 29-35)
**FIND THIS CODE:**
```typescript
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : undefined;
    let end: Date | undefined;
    if (endDate) {
      end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
    }
```

**REPLACE WITH:**
```typescript
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : undefined;
    let end: Date | undefined;
    if (endDate) {
      end = new Date(endDate as string);
      end.setUTCHours(23, 59, 59, 999);
    }
```

**WHY:** Date range queries might miss records at day boundaries.

---

## FILE 3: server/routes/dashboard.ts

### Fix 9: Import statement (line 4)
**FIND THIS CODE:**
```typescript
import { getPhilippineDateString, getPhilippineDayName, extractDateString } from "../utils/datetime";
```

**REPLACE WITH:**
```typescript
import { getPhilippineTime, getPhilippineDateString, getPhilippineDayName, extractDateString } from "../utils/datetime";
```

**WHY:** Need to import getPhilippineTime for the next fix.

---

### Fix 10: Dashboard payroll cutoff (around line 25-28)
**FIND THIS CODE:**
```typescript
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
```

**REPLACE WITH:**
```typescript
    const now = getPhilippineTime();
    const currentDay = now.getUTCDate();
    const currentMonth = now.getUTCMonth();
    const currentYear = now.getUTCFullYear();
```

**WHY:** Dashboard shows wrong payroll period because it's using server's local time instead of PH time.

---

## VERIFICATION CHECKLIST

After making these changes, verify:
- [ ] Attendance logs show correct PH dates when created
- [ ] Night shift (22:00-06:00) detection works
- [ ] Late minutes calculated correctly
- [ ] Manual attendance saves with correct dates
- [ ] Dashboard payroll cutoff shows correct period
- [ ] Date range filters return correct records

## IMPACT
This fixes ALL date/timezone issues in the attendance system. All dates will be treated as Philippines local time regardless of where the server is deployed.

## TESTING
After deployment, test:
1. Clock in during day shift (08:00-17:00) - should save correct date
2. Clock in during night shift (22:00-06:00) - should assign correct shift date
3. Clock in late (e.g., 08:30 for 08:00 shift) - should calculate correct late minutes
4. Manually create attendance - should save correct date
5. Filter attendance by date range - should return all records in range
6. Check dashboard stats - should show current payroll period correctly
