import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    Active: "bg-emerald-100 text-emerald-700",
    Probationary: "bg-amber-100 text-amber-700",
    Terminated: "bg-red-100 text-red-700",
    Suspended: "bg-orange-100 text-orange-700",
    Resigned: "bg-gray-100 text-gray-700",
    Pending: "bg-amber-100 text-amber-700",
    Approved: "bg-emerald-100 text-emerald-700",
    Rejected: "bg-red-100 text-red-700",
    Cancelled: "bg-gray-100 text-gray-700",
    DRAFT: "bg-gray-100 text-gray-700",
    APPROVED: "bg-emerald-100 text-emerald-700",
    RELEASED: "bg-blue-100 text-blue-700",
    Verified: "bg-emerald-100 text-emerald-700",
    "Off-site": "bg-orange-100 text-orange-700",
    Flagged: "bg-red-100 text-red-700",
    Planning: "bg-blue-100 text-blue-700",
    "On Hold": "bg-amber-100 text-amber-700",
    Completed: "bg-emerald-100 text-emerald-700",
    Issued: "bg-red-100 text-red-700",
    Explanation_Received: "bg-amber-100 text-amber-700",
    Resolved: "bg-emerald-100 text-emerald-700",
    Disbursed: "bg-blue-100 text-blue-700",
    Fully_Paid: "bg-emerald-100 text-emerald-700",
    Todo: "bg-gray-100 text-gray-700",
    In_Progress: "bg-blue-100 text-blue-700",
    Blocked: "bg-red-100 text-red-700",
    Done: "bg-emerald-100 text-emerald-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}
