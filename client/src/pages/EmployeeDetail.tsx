import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { formatCurrency, formatDate, getStatusColor, getInitials } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Edit,
  Loader2,
  User,
  Briefcase,
  DollarSign,
  FileText,
  AlertTriangle,
} from "lucide-react";

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
  }>;
}

const tabs = [
  { key: "personal", label: "Personal Info", icon: User },
  { key: "employment", label: "Employment", icon: Briefcase },
  { key: "payroll", label: "Payroll Setup", icon: DollarSign },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "disciplinary", label: "Disciplinary History", icon: AlertTriangle },
];

export default function EmployeeDetail() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("personal");

  const id = location.split("/employees/")[1]?.split("/")[0];

  const { data: employee, isLoading } = useQuery<EmployeeComplete>({
    queryKey: [`/api/employees/${id}/complete-file`],
    enabled: !!id,
  });

  const canEdit = user?.role === "ADMIN" || user?.role === "HR" || user?.isSuperadmin;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-semibold mb-2">Employee not found</h2>
        <Link href="/employees">
          <Button variant="outline">Back to Employees</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/employees">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {employee.photoUrl ? (
              <img
                src={employee.photoUrl}
                alt=""
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                {getInitials(employee.firstName, employee.lastName)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {employee.firstName} {employee.middleName ? `${employee.middleName} ` : ""}
                {employee.lastName}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{employee.employeeNo}</span>
                <span className="text-muted-foreground/40">|</span>
                <span>{employee.position}</span>
                <span
                  className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(employee.status)}`}
                >
                  {employee.status}
                </span>
              </div>
            </div>
          </div>
        </div>
        {canEdit && (
          <Link href={`/employees/${id}/edit`}>
            <Button variant="outline" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "personal" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="First Name" value={employee.firstName} />
              <InfoRow label="Middle Name" value={employee.middleName} />
              <InfoRow label="Last Name" value={employee.lastName} />
              <InfoRow label="Date of Birth" value={employee.dateOfBirth ? formatDate(employee.dateOfBirth) : undefined} />
              <InfoRow label="Gender" value={employee.gender} />
              <InfoRow label="Civil Status" value={employee.civilStatus} />
              <InfoRow label="Nationality" value={employee.nationality} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact & Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Email" value={employee.email} />
              <InfoRow label="Phone" value={employee.phone} />
              <InfoRow label="Address" value={employee.address} />
              <InfoRow label="City" value={employee.city} />
              <InfoRow label="Province" value={employee.province} />
              <InfoRow label="Zip Code" value={employee.zipCode} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Name" value={employee.emergencyContactName} />
              <InfoRow label="Phone" value={employee.emergencyContactPhone} />
              <InfoRow label="Relation" value={employee.emergencyContactRelation} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Government IDs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="SSS No." value={employee.sssNo} />
              <InfoRow label="PhilHealth No." value={employee.philhealthNo} />
              <InfoRow label="Pag-IBIG No." value={employee.pagibigNo} />
              <InfoRow label="TIN" value={employee.tinNo} />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "employment" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Employment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Employee No." value={employee.employeeNo} />
              <InfoRow label="Position" value={employee.position} />
              <InfoRow label="Department" value={employee.department} />
              <InfoRow label="Role" value={employee.role} />
              <InfoRow label="Status" value={employee.status} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Hire Date" value={formatDate(employee.hireDate)} />
              <InfoRow label="Regularization Date" value={employee.regularizationDate ? formatDate(employee.regularizationDate) : undefined} />
              <InfoRow label="Separation Date" value={employee.separationDate ? formatDate(employee.separationDate) : undefined} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Shift Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Shift Start" value={employee.shiftStartTime} />
              <InfoRow label="Shift End" value={employee.shiftEndTime} />
              <InfoRow label="Work Days" value={employee.shiftWorkDays} />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "payroll" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compensation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Rate Type" value={employee.rateType} />
              <InfoRow
                label="Daily Rate"
                value={employee.dailyRate ? formatCurrency(employee.dailyRate) : undefined}
              />
              <InfoRow
                label="Monthly Rate"
                value={employee.monthlyRate ? formatCurrency(employee.monthlyRate) : undefined}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "documents" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {!employee.documents || employee.documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
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
                    {employee.documents.map((doc) => (
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
      )}

      {activeTab === "disciplinary" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Disciplinary History</CardTitle>
          </CardHeader>
          <CardContent>
            {!employee.disciplinaryRecords || employee.disciplinaryRecords.length === 0 ? (
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
                    {employee.disciplinaryRecords.map((rec) => (
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
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || "--"}</span>
    </div>
  );
}
