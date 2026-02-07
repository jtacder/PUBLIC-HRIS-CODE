/**
 * Philippine Payroll Computation Engine
 *
 * Implements statutory deduction calculations per Philippine law:
 *   - SSS (Social Security System) — 2024/2025 contribution schedule
 *   - PhilHealth — Universal Health Care Act rates
 *   - Pag-IBIG (HDMF) — Home Development Mutual Fund
 *   - Withholding Tax — TRAIN Law (RA 10963) revised brackets
 *
 * All monetary values are in Philippine Pesos (PHP).
 * Semi-monthly payroll cycle assumed (2 pay periods per month).
 * Standard working arrangement: 22 days/month, 8 hours/day.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WORKING_DAYS_PER_MONTH = 22;
const HOURS_PER_DAY = 8;
const PAY_PERIODS_PER_MONTH = 2; // semi-monthly

// ---------------------------------------------------------------------------
// SSS Contribution Table — 2024/2025 Schedule
// ---------------------------------------------------------------------------
// Each bracket: [lowerBound, upperBound, monthlySalaryCredit]
// Employee share = 4.5% of MSC
// Employer share = 9.5% of MSC (not computed here — employee-side only)

interface SSSBracket {
  lowerBound: number;
  upperBound: number;
  monthlySalaryCredit: number;
}

const SSS_EMPLOYEE_RATE = 0.045;
const SSS_SEMI_MONTHLY_MAX = 675;

const SSS_TABLE: SSSBracket[] = [
  { lowerBound: 0, upperBound: 4249.99, monthlySalaryCredit: 4000 },
  { lowerBound: 4250, upperBound: 4749.99, monthlySalaryCredit: 4500 },
  { lowerBound: 4750, upperBound: 5249.99, monthlySalaryCredit: 5000 },
  { lowerBound: 5250, upperBound: 5749.99, monthlySalaryCredit: 5500 },
  { lowerBound: 5750, upperBound: 6249.99, monthlySalaryCredit: 6000 },
  { lowerBound: 6250, upperBound: 6749.99, monthlySalaryCredit: 6500 },
  { lowerBound: 6750, upperBound: 7249.99, monthlySalaryCredit: 7000 },
  { lowerBound: 7250, upperBound: 7749.99, monthlySalaryCredit: 7500 },
  { lowerBound: 7750, upperBound: 8249.99, monthlySalaryCredit: 8000 },
  { lowerBound: 8250, upperBound: 8749.99, monthlySalaryCredit: 8500 },
  { lowerBound: 8750, upperBound: 9249.99, monthlySalaryCredit: 9000 },
  { lowerBound: 9250, upperBound: 9749.99, monthlySalaryCredit: 9500 },
  { lowerBound: 9750, upperBound: 10249.99, monthlySalaryCredit: 10000 },
  { lowerBound: 10250, upperBound: 10749.99, monthlySalaryCredit: 10500 },
  { lowerBound: 10750, upperBound: 11249.99, monthlySalaryCredit: 11000 },
  { lowerBound: 11250, upperBound: 11749.99, monthlySalaryCredit: 11500 },
  { lowerBound: 11750, upperBound: 12249.99, monthlySalaryCredit: 12000 },
  { lowerBound: 12250, upperBound: 12749.99, monthlySalaryCredit: 12500 },
  { lowerBound: 12750, upperBound: 13249.99, monthlySalaryCredit: 13000 },
  { lowerBound: 13250, upperBound: 13749.99, monthlySalaryCredit: 13500 },
  { lowerBound: 13750, upperBound: 14249.99, monthlySalaryCredit: 14000 },
  { lowerBound: 14250, upperBound: 14749.99, monthlySalaryCredit: 14500 },
  { lowerBound: 14750, upperBound: 15249.99, monthlySalaryCredit: 15000 },
  { lowerBound: 15250, upperBound: 15749.99, monthlySalaryCredit: 15500 },
  { lowerBound: 15750, upperBound: 16249.99, monthlySalaryCredit: 16000 },
  { lowerBound: 16250, upperBound: 16749.99, monthlySalaryCredit: 16500 },
  { lowerBound: 16750, upperBound: 17249.99, monthlySalaryCredit: 17000 },
  { lowerBound: 17250, upperBound: 17749.99, monthlySalaryCredit: 17500 },
  { lowerBound: 17750, upperBound: 18249.99, monthlySalaryCredit: 18000 },
  { lowerBound: 18250, upperBound: 18749.99, monthlySalaryCredit: 18500 },
  { lowerBound: 18750, upperBound: 19249.99, monthlySalaryCredit: 19000 },
  { lowerBound: 19250, upperBound: 19749.99, monthlySalaryCredit: 19500 },
  { lowerBound: 19750, upperBound: 20249.99, monthlySalaryCredit: 20000 },
  { lowerBound: 20250, upperBound: 20749.99, monthlySalaryCredit: 20500 },
  { lowerBound: 20750, upperBound: 21249.99, monthlySalaryCredit: 21000 },
  { lowerBound: 21250, upperBound: 21749.99, monthlySalaryCredit: 21500 },
  { lowerBound: 21750, upperBound: 22249.99, monthlySalaryCredit: 22000 },
  { lowerBound: 22250, upperBound: 22749.99, monthlySalaryCredit: 22500 },
  { lowerBound: 22750, upperBound: 23249.99, monthlySalaryCredit: 23000 },
  { lowerBound: 23250, upperBound: 23749.99, monthlySalaryCredit: 23500 },
  { lowerBound: 23750, upperBound: 24249.99, monthlySalaryCredit: 24000 },
  { lowerBound: 24250, upperBound: 24749.99, monthlySalaryCredit: 24500 },
  { lowerBound: 24750, upperBound: 25249.99, monthlySalaryCredit: 25000 },
  { lowerBound: 25250, upperBound: 25749.99, monthlySalaryCredit: 25500 },
  { lowerBound: 25750, upperBound: 26249.99, monthlySalaryCredit: 26000 },
  { lowerBound: 26250, upperBound: 26749.99, monthlySalaryCredit: 26500 },
  { lowerBound: 26750, upperBound: 27249.99, monthlySalaryCredit: 27000 },
  { lowerBound: 27250, upperBound: 27749.99, monthlySalaryCredit: 27500 },
  { lowerBound: 27750, upperBound: 28249.99, monthlySalaryCredit: 28000 },
  { lowerBound: 28250, upperBound: 28749.99, monthlySalaryCredit: 28500 },
  { lowerBound: 28750, upperBound: 29249.99, monthlySalaryCredit: 29000 },
  { lowerBound: 29250, upperBound: 29749.99, monthlySalaryCredit: 29500 },
  { lowerBound: 29750, upperBound: 30249.99, monthlySalaryCredit: 30000 },
  { lowerBound: 30250, upperBound: 30749.99, monthlySalaryCredit: 30500 },
  { lowerBound: 30750, upperBound: 31249.99, monthlySalaryCredit: 31000 },
  { lowerBound: 31250, upperBound: 31749.99, monthlySalaryCredit: 31500 },
  { lowerBound: 31750, upperBound: Infinity, monthlySalaryCredit: 32000 },
];

// ---------------------------------------------------------------------------
// PhilHealth Constants
// ---------------------------------------------------------------------------

const PHILHEALTH_RATE = 0.05; // 5% total premium rate
const PHILHEALTH_EMPLOYEE_SHARE = 0.5; // 50/50 split
const PHILHEALTH_SALARY_FLOOR = 10000;
const PHILHEALTH_SALARY_CEILING = 100000;
const PHILHEALTH_SEMI_MONTHLY_MAX = 1250; // max employee share per semi-monthly period

// ---------------------------------------------------------------------------
// Pag-IBIG Constants
// ---------------------------------------------------------------------------

const PAGIBIG_THRESHOLD = 1500;
const PAGIBIG_RATE_LOW = 0.01; // 1% if salary <= 1,500
const PAGIBIG_RATE_HIGH = 0.02; // 2% if salary > 1,500
const PAGIBIG_MSC_CAP = 5000; // maximum monthly salary credit
const PAGIBIG_SEMI_MONTHLY_MAX = 100; // max employee share per semi-monthly period (200/month)

// ---------------------------------------------------------------------------
// Withholding Tax Brackets — TRAIN Law (monthly basis)
// ---------------------------------------------------------------------------

interface TaxBracket {
  lowerBound: number;
  upperBound: number;
  baseTax: number;
  rate: number;
}

const TAX_BRACKETS: TaxBracket[] = [
  { lowerBound: 0, upperBound: 20833, baseTax: 0, rate: 0.0 },
  { lowerBound: 20833, upperBound: 33333, baseTax: 0, rate: 0.15 },
  { lowerBound: 33333, upperBound: 66667, baseTax: 1875.0, rate: 0.2 },
  { lowerBound: 66667, upperBound: 166667, baseTax: 8541.8, rate: 0.25 },
  { lowerBound: 166667, upperBound: 666667, baseTax: 33541.8, rate: 0.3 },
  { lowerBound: 666667, upperBound: Infinity, baseTax: 183541.8, rate: 0.35 },
];

// ---------------------------------------------------------------------------
// Overtime Multipliers
// ---------------------------------------------------------------------------

const OVERTIME_MULTIPLIERS: Record<string, number> = {
  regular: 1.25,
  rest_day: 1.3,
  holiday: 2.0,
};

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface PayrollInput {
  employeeId: number;
  dailyRate: number;
  monthlyRate?: number;
  rateType: "daily" | "monthly";
  daysWorked: number;
  overtimeMinutes: number;
  overtimeType?: "regular" | "rest_day" | "holiday";
  lateMinutesDeductible: number;
  unpaidLeaveDays: number;
  cashAdvanceDeduction: number;
  otherDeductions?: number;
}

export interface PayrollResult {
  basicPay: number;
  overtimePay: number;
  grossPay: number;
  sssDeduction: number;
  philhealthDeduction: number;
  pagibigDeduction: number;
  withholdingTax: number;
  lateDeduction: number;
  cashAdvanceDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
}

// ---------------------------------------------------------------------------
// Utility: round to two decimal places (standard financial rounding)
// ---------------------------------------------------------------------------

function roundTwo(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Derive the daily rate from a monthly rate.
 *
 * @param monthlyRate - gross monthly salary
 * @param workingDays - working days per month (default 22)
 * @returns daily rate
 */
export function calculateDailyRate(
  monthlyRate: number,
  workingDays: number = WORKING_DAYS_PER_MONTH,
): number {
  if (monthlyRate < 0) {
    throw new Error("Monthly rate must not be negative.");
  }
  if (workingDays <= 0) {
    throw new Error("Working days must be greater than zero.");
  }
  return roundTwo(monthlyRate / workingDays);
}

/**
 * Derive the hourly rate from a daily rate.
 *
 * @param dailyRate - gross daily rate
 * @param hoursPerDay - work hours per day (default 8)
 * @returns hourly rate
 */
export function calculateHourlyRate(
  dailyRate: number,
  hoursPerDay: number = HOURS_PER_DAY,
): number {
  if (dailyRate < 0) {
    throw new Error("Daily rate must not be negative.");
  }
  if (hoursPerDay <= 0) {
    throw new Error("Hours per day must be greater than zero.");
  }
  return roundTwo(dailyRate / hoursPerDay);
}

/**
 * Calculate the **semi-monthly employee SSS contribution** based on monthly salary.
 *
 * Looks up the Monthly Salary Credit (MSC) from the 2024/2025 SSS table,
 * computes 4.5% of MSC, then divides by 2 for semi-monthly.
 * Capped at PHP 675 per semi-monthly period.
 *
 * @param monthlySalary - gross monthly salary
 * @returns semi-monthly SSS employee deduction
 */
export function calculateSSS(monthlySalary: number): number {
  if (monthlySalary <= 0) {
    return 0;
  }

  // Find the matching bracket
  let msc = SSS_TABLE[SSS_TABLE.length - 1].monthlySalaryCredit; // default to highest

  for (const bracket of SSS_TABLE) {
    if (monthlySalary >= bracket.lowerBound && monthlySalary <= bracket.upperBound) {
      msc = bracket.monthlySalaryCredit;
      break;
    }
  }

  const monthlyEmployeeShare = roundTwo(msc * SSS_EMPLOYEE_RATE);
  const semiMonthlyShare = roundTwo(monthlyEmployeeShare / PAY_PERIODS_PER_MONTH);

  return Math.min(semiMonthlyShare, SSS_SEMI_MONTHLY_MAX);
}

/**
 * Calculate the **semi-monthly employee PhilHealth contribution**.
 *
 * Premium = 5% of monthly basic salary (clamped between floor and ceiling),
 * split 50/50 between employee and employer, then halved for semi-monthly.
 * Capped at PHP 1,250 per semi-monthly period.
 *
 * @param monthlySalary - gross monthly salary
 * @returns semi-monthly PhilHealth employee deduction
 */
export function calculatePhilHealth(monthlySalary: number): number {
  if (monthlySalary <= 0) {
    return 0;
  }

  // Clamp salary to floor and ceiling
  const clampedSalary = Math.max(
    PHILHEALTH_SALARY_FLOOR,
    Math.min(monthlySalary, PHILHEALTH_SALARY_CEILING),
  );

  const monthlyPremium = clampedSalary * PHILHEALTH_RATE;
  const monthlyEmployeeShare = roundTwo(monthlyPremium * PHILHEALTH_EMPLOYEE_SHARE);
  const semiMonthlyShare = roundTwo(monthlyEmployeeShare / PAY_PERIODS_PER_MONTH);

  return Math.min(semiMonthlyShare, PHILHEALTH_SEMI_MONTHLY_MAX);
}

/**
 * Calculate the **semi-monthly employee Pag-IBIG contribution**.
 *
 * - 1% of salary if monthly salary <= PHP 1,500
 * - 2% of salary if monthly salary >  PHP 1,500
 * - Monthly salary credit capped at PHP 5,000
 * - Maximum semi-monthly employee contribution: PHP 100 (PHP 200/month)
 *
 * @param monthlySalary - gross monthly salary
 * @returns semi-monthly Pag-IBIG employee deduction
 */
export function calculatePagIBIG(monthlySalary: number): number {
  if (monthlySalary <= 0) {
    return 0;
  }

  const rate = monthlySalary <= PAGIBIG_THRESHOLD ? PAGIBIG_RATE_LOW : PAGIBIG_RATE_HIGH;
  const applicableSalary = Math.min(monthlySalary, PAGIBIG_MSC_CAP);
  const monthlyContribution = roundTwo(applicableSalary * rate);
  const semiMonthlyShare = roundTwo(monthlyContribution / PAY_PERIODS_PER_MONTH);

  return Math.min(semiMonthlyShare, PAGIBIG_SEMI_MONTHLY_MAX);
}

/**
 * Calculate **monthly withholding tax** under the TRAIN Law.
 *
 * Uses six progressive brackets applied to monthly taxable income
 * (gross monthly salary minus total monthly statutory contributions).
 *
 * @param monthlyTaxableIncome - monthly taxable income after statutory deductions
 * @returns monthly withholding tax
 */
export function calculateWithholdingTax(monthlyTaxableIncome: number): number {
  if (monthlyTaxableIncome <= 0) {
    return 0;
  }

  for (let i = TAX_BRACKETS.length - 1; i >= 0; i--) {
    const bracket = TAX_BRACKETS[i];
    if (monthlyTaxableIncome > bracket.lowerBound) {
      if (bracket.rate === 0) {
        return 0;
      }
      const excess = monthlyTaxableIncome - bracket.lowerBound;
      return roundTwo(bracket.baseTax + excess * bracket.rate);
    }
  }

  return 0;
}

// ---------------------------------------------------------------------------
// Main Payroll Computation
// ---------------------------------------------------------------------------

/**
 * Compute the complete semi-monthly payroll for a single employee.
 *
 * Processing steps:
 *   1. Determine the effective daily rate (convert from monthly if needed).
 *   2. Calculate basic pay from days worked minus unpaid leave.
 *   3. Compute overtime pay using the applicable multiplier.
 *   4. Deduct for tardiness (late minutes) from gross pay.
 *   5. Derive gross pay = basic pay + overtime pay - late deduction.
 *   6. Estimate monthly salary for statutory deduction lookups.
 *   7. Compute semi-monthly SSS, PhilHealth, Pag-IBIG deductions.
 *   8. Compute monthly taxable income and derive semi-monthly withholding tax.
 *   9. Sum all deductions and calculate net pay.
 *
 * @param input - payroll input parameters for the pay period
 * @returns full payroll breakdown
 */
export function computePayroll(input: PayrollInput): PayrollResult {
  // ── Step 1: Resolve daily rate ──────────────────────────────────────────
  let dailyRate: number;
  let estimatedMonthlySalary: number;

  if (input.rateType === "monthly") {
    const monthlyRate = input.monthlyRate ?? 0;
    if (monthlyRate <= 0) {
      throw new Error("Monthly rate must be provided and positive when rateType is 'monthly'.");
    }
    dailyRate = calculateDailyRate(monthlyRate);
    estimatedMonthlySalary = monthlyRate;
  } else {
    dailyRate = input.dailyRate;
    if (dailyRate <= 0) {
      throw new Error("Daily rate must be positive when rateType is 'daily'.");
    }
    estimatedMonthlySalary = roundTwo(dailyRate * WORKING_DAYS_PER_MONTH);
  }

  const hourlyRate = calculateHourlyRate(dailyRate);

  // ── Step 2: Basic pay ───────────────────────────────────────────────────
  const effectiveDaysWorked = Math.max(0, input.daysWorked - input.unpaidLeaveDays);
  const basicPay = roundTwo(dailyRate * effectiveDaysWorked);

  // ── Step 3: Overtime pay ────────────────────────────────────────────────
  const overtimeType = input.overtimeType ?? "regular";
  const multiplier = OVERTIME_MULTIPLIERS[overtimeType] ?? OVERTIME_MULTIPLIERS.regular;
  const overtimeHours = input.overtimeMinutes / 60;
  const overtimePay = roundTwo(hourlyRate * multiplier * overtimeHours);

  // ── Step 4: Late deduction ──────────────────────────────────────────────
  const minuteRate = roundTwo(hourlyRate / 60);
  const lateDeduction = roundTwo(minuteRate * input.lateMinutesDeductible);

  // ── Step 5: Gross pay ───────────────────────────────────────────────────
  const grossPay = roundTwo(basicPay + overtimePay - lateDeduction);

  // ── Step 6: Statutory deductions (semi-monthly) ─────────────────────────
  // Deductions are based on the estimated monthly salary, not the period gross.
  const sssDeduction = calculateSSS(estimatedMonthlySalary);
  const philhealthDeduction = calculatePhilHealth(estimatedMonthlySalary);
  const pagibigDeduction = calculatePagIBIG(estimatedMonthlySalary);

  // ── Step 7: Withholding tax ─────────────────────────────────────────────
  // Monthly statutory deductions = semi-monthly amounts * 2
  const totalMonthlyStatutory =
    (sssDeduction + philhealthDeduction + pagibigDeduction) * PAY_PERIODS_PER_MONTH;
  const monthlyTaxableIncome = Math.max(0, estimatedMonthlySalary - totalMonthlyStatutory);
  const monthlyTax = calculateWithholdingTax(monthlyTaxableIncome);
  const withholdingTax = roundTwo(monthlyTax / PAY_PERIODS_PER_MONTH);

  // ── Step 8: Other deductions ────────────────────────────────────────────
  const cashAdvanceDeduction = Math.max(0, input.cashAdvanceDeduction);
  const otherDeductions = Math.max(0, input.otherDeductions ?? 0);

  // ── Step 9: Totals ─────────────────────────────────────────────────────
  const totalDeductions = roundTwo(
    sssDeduction +
      philhealthDeduction +
      pagibigDeduction +
      withholdingTax +
      lateDeduction +
      cashAdvanceDeduction +
      otherDeductions,
  );

  const netPay = roundTwo(grossPay - totalDeductions + lateDeduction);
  // Note: lateDeduction was already subtracted from grossPay, so we add it
  // back here to avoid double-counting (it is included in totalDeductions).

  return {
    basicPay,
    overtimePay,
    grossPay,
    sssDeduction,
    philhealthDeduction,
    pagibigDeduction,
    withholdingTax,
    lateDeduction,
    cashAdvanceDeduction,
    otherDeductions,
    totalDeductions,
    netPay,
  };
}
