import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn, getInitials } from "@/lib/utils";

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  employeeNo: string;
  position: string;
  photoUrl?: string;
}

interface SearchableEmployeeSelectProps {
  value?: number;
  onValueChange: (employeeId: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableEmployeeSelect({
  value,
  onValueChange,
  placeholder = "Select employee...",
  className,
  disabled,
}: SearchableEmployeeSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const filtered = useMemo(() => {
    if (!search) return employees;
    const q = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.firstName.toLowerCase().includes(q) ||
        e.lastName.toLowerCase().includes(q) ||
        e.employeeNo.toLowerCase().includes(q)
    );
  }, [employees, search]);

  const selected = employees.find((e) => e.id === value);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {selected ? (
          <span>
            {selected.firstName} {selected.lastName} ({selected.employeeNo})
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <svg
          className="h-4 w-4 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="p-2">
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No employees found
              </div>
            ) : (
              filtered.map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => {
                    onValueChange(emp.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2 text-sm rounded-md hover:bg-accent text-left",
                    value === emp.id && "bg-accent"
                  )}
                >
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                    {getInitials(emp.firstName, emp.lastName)}
                  </div>
                  <div>
                    <div className="font-medium">
                      {emp.firstName} {emp.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {emp.employeeNo} &middot; {emp.position}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Backdrop to close */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setOpen(false);
            setSearch("");
          }}
        />
      )}
    </div>
  );
}
