import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

interface EmployeeFormData {
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  zipCode: string;
  dateOfBirth: string;
  gender: string;
  civilStatus: string;
  nationality: string;
  employeeNo: string;
  position: string;
  department: string;
  hireDate: string;
  regularizationDate: string;
  separationDate: string;
  status: string;
  role: string;
  sssNo: string;
  philhealthNo: string;
  pagibigNo: string;
  tinNo: string;
  rateType: string;
  dailyRate: string;
  monthlyRate: string;
  shiftStartTime: string;
  shiftEndTime: string;
  shiftWorkDays: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
}

const defaultFormData: EmployeeFormData = {
  firstName: "",
  lastName: "",
  middleName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  province: "",
  zipCode: "",
  dateOfBirth: "",
  gender: "Male",
  civilStatus: "Single",
  nationality: "Filipino",
  employeeNo: "",
  position: "",
  department: "",
  hireDate: "",
  regularizationDate: "",
  separationDate: "",
  status: "Active",
  role: "WORKER",
  sssNo: "",
  philhealthNo: "",
  pagibigNo: "",
  tinNo: "",
  rateType: "daily",
  dailyRate: "",
  monthlyRate: "",
  shiftStartTime: "08:00",
  shiftEndTime: "17:00",
  shiftWorkDays: "Mon,Tue,Wed,Thu,Fri",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelation: "",
};

export default function EmployeeForm() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Extract ID from URL for edit mode
  const pathParts = location.split("/");
  const isEdit = location.includes("/edit");
  const id = isEdit ? pathParts[pathParts.indexOf("employees") + 1] : null;

  const [form, setForm] = useState<EmployeeFormData>(defaultFormData);
  const [activeSection, setActiveSection] = useState("personal");

  // Fetch existing employee data for editing
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: [`/api/employees/${id}`],
    enabled: !!id,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        firstName: existing.firstName || "",
        lastName: existing.lastName || "",
        middleName: existing.middleName || "",
        email: existing.email || "",
        phone: existing.phone || "",
        address: existing.address || "",
        city: existing.city || "",
        province: existing.province || "",
        zipCode: existing.zipCode || "",
        dateOfBirth: existing.dateOfBirth || "",
        gender: existing.gender || "Male",
        civilStatus: existing.civilStatus || "Single",
        nationality: existing.nationality || "Filipino",
        employeeNo: existing.employeeNo || "",
        position: existing.position || "",
        department: existing.department || "",
        hireDate: existing.hireDate || "",
        regularizationDate: existing.regularizationDate || "",
        separationDate: existing.separationDate || "",
        status: existing.status || "Active",
        role: existing.role || "WORKER",
        sssNo: existing.sssNo || "",
        philhealthNo: existing.philhealthNo || "",
        pagibigNo: existing.pagibigNo || "",
        tinNo: existing.tinNo || "",
        rateType: existing.rateType || "daily",
        dailyRate: existing.dailyRate || "",
        monthlyRate: existing.monthlyRate || "",
        shiftStartTime: existing.shiftStartTime || "08:00",
        shiftEndTime: existing.shiftEndTime || "17:00",
        shiftWorkDays: existing.shiftWorkDays || "Mon,Tue,Wed,Thu,Fri",
        emergencyContactName: existing.emergencyContactName || "",
        emergencyContactPhone: existing.emergencyContactPhone || "",
        emergencyContactRelation: existing.emergencyContactRelation || "",
      });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const payload = {
        ...data,
        dailyRate: data.dailyRate || null,
        monthlyRate: data.monthlyRate || null,
      };
      if (isEdit && id) {
        const res = await apiRequest("PUT", `/api/employees/${id}`, payload);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/employees", payload);
        return res.json();
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: isEdit ? "Employee updated" : "Employee created",
        variant: "success",
      });
      setLocation(`/employees/${data.id || id}`);
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const handleChange = (field: keyof EmployeeFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.employeeNo || !form.position || !form.hireDate) {
      toast({
        title: "Please fill in all required fields (First Name, Last Name, Employee No, Position, Hire Date).",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(form);
  };

  if (loadingExisting) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sections = [
    { key: "personal", label: "Personal Details" },
    { key: "employment", label: "Employment Info" },
    { key: "payroll", label: "Payroll Setup" },
    { key: "shift", label: "Shift Schedule" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/employees">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {isEdit ? "Edit Employee" : "New Employee"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isEdit
              ? "Update employee information"
              : "Fill in the details to create a new employee record"}
          </p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="border-b">
        <div className="flex gap-0 overflow-x-auto">
          {sections.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeSection === section.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {activeSection === "personal" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField label="First Name *" value={form.firstName} onChange={(v) => handleChange("firstName", v)} />
                <FormField label="Middle Name" value={form.middleName} onChange={(v) => handleChange("middleName", v)} />
                <FormField label="Last Name *" value={form.lastName} onChange={(v) => handleChange("lastName", v)} />
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input type="date" value={form.dateOfBirth} onChange={(e) => handleChange("dateOfBirth", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <select value={form.gender} onChange={(e) => handleChange("gender", e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Civil Status</Label>
                  <select value={form.civilStatus} onChange={(e) => handleChange("civilStatus", e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                    <option value="Divorced">Divorced</option>
                  </select>
                </div>
                <FormField label="Nationality" value={form.nationality} onChange={(v) => handleChange("nationality", v)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact & Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField label="Email" value={form.email} onChange={(v) => handleChange("email", v)} type="email" />
                <FormField label="Phone" value={form.phone} onChange={(v) => handleChange("phone", v)} />
                <FormField label="Address" value={form.address} onChange={(v) => handleChange("address", v)} />
                <FormField label="City" value={form.city} onChange={(v) => handleChange("city", v)} />
                <FormField label="Province" value={form.province} onChange={(v) => handleChange("province", v)} />
                <FormField label="Zip Code" value={form.zipCode} onChange={(v) => handleChange("zipCode", v)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField label="Contact Name" value={form.emergencyContactName} onChange={(v) => handleChange("emergencyContactName", v)} />
                <FormField label="Contact Phone" value={form.emergencyContactPhone} onChange={(v) => handleChange("emergencyContactPhone", v)} />
                <FormField label="Relationship" value={form.emergencyContactRelation} onChange={(v) => handleChange("emergencyContactRelation", v)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Government IDs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField label="SSS No." value={form.sssNo} onChange={(v) => handleChange("sssNo", v)} />
                <FormField label="PhilHealth No." value={form.philhealthNo} onChange={(v) => handleChange("philhealthNo", v)} />
                <FormField label="Pag-IBIG No." value={form.pagibigNo} onChange={(v) => handleChange("pagibigNo", v)} />
                <FormField label="TIN" value={form.tinNo} onChange={(v) => handleChange("tinNo", v)} />
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === "employment" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Position & Role</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField label="Employee No. *" value={form.employeeNo} onChange={(v) => handleChange("employeeNo", v)} />
                <FormField label="Position *" value={form.position} onChange={(v) => handleChange("position", v)} />
                <FormField label="Department" value={form.department} onChange={(v) => handleChange("department", v)} />
                <div className="space-y-2">
                  <Label>Role</Label>
                  <select value={form.role} onChange={(e) => handleChange("role", e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                    <option value="ADMIN">Admin</option>
                    <option value="HR">HR</option>
                    <option value="ENGINEER">Engineer</option>
                    <option value="WORKER">Worker</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select value={form.status} onChange={(e) => handleChange("status", e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                    <option value="Active">Active</option>
                    <option value="Probationary">Probationary</option>
                    <option value="Terminated">Terminated</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Resigned">Resigned</option>
                  </select>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Hire Date *</Label>
                  <Input type="date" value={form.hireDate} onChange={(e) => handleChange("hireDate", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Regularization Date</Label>
                  <Input type="date" value={form.regularizationDate} onChange={(e) => handleChange("regularizationDate", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Separation Date</Label>
                  <Input type="date" value={form.separationDate} onChange={(e) => handleChange("separationDate", e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === "payroll" && (
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle className="text-base">Compensation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Rate Type</Label>
                <select value={form.rateType} onChange={(e) => handleChange("rateType", e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                  <option value="daily">Daily</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <FormField label="Daily Rate" value={form.dailyRate} onChange={(v) => handleChange("dailyRate", v)} type="number" />
              <FormField label="Monthly Rate" value={form.monthlyRate} onChange={(v) => handleChange("monthlyRate", v)} type="number" />
            </CardContent>
          </Card>
        )}

        {activeSection === "shift" && (
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle className="text-base">Shift Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Shift Start Time</Label>
                <Input type="time" value={form.shiftStartTime} onChange={(e) => handleChange("shiftStartTime", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Shift End Time</Label>
                <Input type="time" value={form.shiftEndTime} onChange={(e) => handleChange("shiftEndTime", e.target.value)} />
              </div>
              <FormField
                label="Work Days (comma-separated)"
                value={form.shiftWorkDays}
                onChange={(v) => handleChange("shiftWorkDays", v)}
                placeholder="Mon,Tue,Wed,Thu,Fri"
              />
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3 pt-6">
          <Button type="submit" disabled={saveMutation.isPending} className="gap-2">
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEdit ? "Update Employee" : "Create Employee"}
          </Button>
          <Link href="/employees">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
