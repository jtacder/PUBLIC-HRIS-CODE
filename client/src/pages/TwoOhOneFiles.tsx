import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDate, getStatusColor, getInitials } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  User,
  Briefcase,
  CreditCard,
  DollarSign,
  FileText,
  AlertTriangle,
  Search,
} from "lucide-react";

interface Employee {
  id: number;
  employeeNo: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  position: string;
  department?: string;
  status: string;
}

interface EmployeeComplete {
  id: number;
  employeeNo: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  dateOfBirth?: string;
  gender?: string;
  civilStatus?: string;
  nationality?: string;
  position: string;
  department?: string;
  hireDate: string;
  regularizationDate?: string;
  separationDate?: string;
  status: string;
  role: string;
  sssNo?: string;
  philhealthNo?: string;
  pagibigNo?: string;
  tinNo?: string;
  rateType: string;
  dailyRate?: string;
  monthlyRate?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  shiftWorkDays?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  photoUrl?: string;
  documents?: Array<{
    id: number;
    documentType: string;
    documentName: string;
    verified: boolean;
    createdAt: string;
  }>;
  disciplinaryRecords?: Array<{
    id: number;
    violation: string;
    severity: string;
    dateIssued: string;
    status: string;
    description?: string;
  }>;
}

export default function TwoOhOneFiles() {
  const { user } = useAuth();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: employees = [], isLoading: loadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: employeeFile, isLoading: loadingFile } = useQuery<EmployeeComplete>({
    queryKey: [`/api/employees/${selectedEmployeeId}/complete-file`],
    enabled: !!selectedEmployeeId,
  });

  const filteredEmployees = employees.filter((emp) =>
    !search ||
    `${emp.firstName} ${emp.lastName} ${emp.employeeNo}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">201 Files</h1>
        <p className="text-muted-foreground">Comprehensive employee records</p>
      </div>

      {/* Employee Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <label className="text-sm font-medium">Select Employee</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent pl-9 pr-3 text-sm"
              />
            </div>
            {loadingEmployees ? (
              <div className="flex items-center justify-center h-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <select
                value={selectedEmployeeId ?? ""}
                onChange={(e) => setSelectedEmployeeId(e.target.value ? Number(e.target.value) : null)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">-- Choose an employee --</option>
                {filteredEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeNo}) - {emp.position}
                  </option>
                ))}
              </select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {loadingFile && selectedEmployeeId && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!selectedEmployeeId && !loadingFile && (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">Select an Employee</h3>
            <p className="text-sm text-muted-foreground">
              Choose an employee from the dropdown above to view their complete 201 file.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Employee File Content */}
      {employeeFile && !loadingFile && (
        <div className="space-y-6">
          {/* Employee Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                {employeeFile.photoUrl ? (
                  <img
                    src={employeeFile.photoUrl}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-lg font-medium text-primary">
                    {getInitials(employeeFile.firstName, employeeFile.lastName)}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold">
                    {employeeFile.firstName} {employeeFile.middleName ? `${employeeFile.middleName} ` : ""}
                    {employeeFile.lastName}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{employeeFile.employeeNo}</span>
                    <span className="text-muted-foreground/40">|</span>
                    <span>{employeeFile.position}</span>
                    <span
                      className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(employeeFile.status)}`}
                    >
                      {employeeFile.status}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoRow label="First Name" value={employeeFile.firstName} />
                <InfoRow label="Middle Name" value={employeeFile.middleName} />
                <InfoRow label="Last Name" value={employeeFile.lastName} />
                <InfoRow label="Date of Birth" value={employeeFile.dateOfBirth ? formatDate(employeeFile.dateOfBirth) : undefined} />
                <InfoRow label="Gender" value={employeeFile.gender} />
                <InfoRow label="Civil Status" value={employeeFile.civilStatus} />
                <InfoRow label="Nationality" value={employeeFile.nationality} />
                <InfoRow label="Email" value={employeeFile.email} />
                <InfoRow label="Phone" value={employeeFile.phone} />
                <InfoRow label="Address" value={employeeFile.address} />
                <InfoRow label="City" value={employeeFile.city} />
                <InfoRow label="Province" value={employeeFile.province} />
                <InfoRow label="Zip Code" value={employeeFile.zipCode} />
                <InfoRow label="Emergency Contact" value={employeeFile.emergencyContactName} />
                <InfoRow label="Emergency Phone" value={employeeFile.emergencyContactPhone} />
                <InfoRow label="Emergency Relation" value={employeeFile.emergencyContactRelation} />
              </div>
            </CardContent>
          </Card>

          {/* Employment Records */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Employment Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoRow label="Employee No." value={employeeFile.employeeNo} />
                <InfoRow label="Position" value={employeeFile.position} />
                <InfoRow label="Department" value={employeeFile.department} />
                <InfoRow label="Role" value={employeeFile.role} />
                <InfoRow label="Status" value={employeeFile.status} />
                <InfoRow label="Hire Date" value={formatDate(employeeFile.hireDate)} />
                <InfoRow label="Regularization Date" value={employeeFile.regularizationDate ? formatDate(employeeFile.regularizationDate) : undefined} />
                <InfoRow label="Separation Date" value={employeeFile.separationDate ? formatDate(employeeFile.separationDate) : undefined} />
                <InfoRow label="Shift Start" value={employeeFile.shiftStartTime} />
                <InfoRow label="Shift End" value={employeeFile.shiftEndTime} />
                <InfoRow label="Work Days" value={employeeFile.shiftWorkDays} />
              </div>
            </CardContent>
          </Card>

          {/* Government IDs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Government IDs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <InfoRow label="SSS No." value={employeeFile.sssNo} />
                <InfoRow label="PhilHealth No." value={employeeFile.philhealthNo} />
                <InfoRow label="Pag-IBIG No." value={employeeFile.pagibigNo} />
                <InfoRow label="TIN" value={employeeFile.tinNo} />
              </div>
            </CardContent>
          </Card>

          {/* Payroll Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Payroll Setup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InfoRow label="Rate Type" value={employeeFile.rateType} />
                <InfoRow label="Daily Rate" value={employeeFile.dailyRate ? formatCurrency(employeeFile.dailyRate) : undefined} />
                <InfoRow label="Monthly Rate" value={employeeFile.monthlyRate ? formatCurrency(employeeFile.monthlyRate) : undefined} />
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!employeeFile.documents || employeeFile.documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No documents uploaded.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Document</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Type</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Verified</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Uploaded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeFile.documents.map((doc) => (
                        <tr key={doc.id} className="border-b last:border-0">
                          <td className="px-4 py-3 text-sm">{doc.documentName}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{doc.documentType}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                doc.verified
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {doc.verified ? "Verified" : "Pending"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {formatDate(doc.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Disciplinary History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Disciplinary History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!employeeFile.disciplinaryRecords || employeeFile.disciplinaryRecords.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No disciplinary records.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Violation</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Severity</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Date Issued</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeFile.disciplinaryRecords.map((rec) => (
                        <tr key={rec.id} className="border-b last:border-0">
                          <td className="px-4 py-3 text-sm">{rec.violation}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                rec.severity === "Grave"
                                  ? "bg-red-100 text-red-700"
                                  : rec.severity === "Major"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {rec.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {formatDate(rec.dateIssued)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(rec.status)}`}
                            >
                              {rec.status.replace("_", " ")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "--"}</p>
    </div>
  );
}
