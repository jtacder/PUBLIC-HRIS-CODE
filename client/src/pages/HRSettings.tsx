import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function HRSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Leave types
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ name: "", defaultDays: "0", carryOver: false, paid: true });

  // Holidays
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ name: "", date: "", type: "regular" });

  // Company info
  const [companyForm, setCompanyForm] = useState({
    name: "", address: "", tin: "", sssEmployerNo: "", philhealthEmployerNo: "", pagibigEmployerNo: "",
  });

  const { data: settings } = useQuery<any>({
    queryKey: ["/api/hr-settings"],
  });

  const { data: leaveTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/leave-types"],
  });

  const { data: holidays = [] } = useQuery<any[]>({
    queryKey: ["/api/holidays"],
  });

  const createLeaveTypeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/hr-settings/leave-types", {
        method: "POST",
        body: JSON.stringify({
          name: leaveForm.name,
          defaultDays: parseInt(leaveForm.defaultDays),
          carryOver: leaveForm.carryOver,
          paid: leaveForm.paid,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-types"] });
      toast({ title: "Leave type created" });
      setLeaveDialogOpen(false);
      setLeaveForm({ name: "", defaultDays: "0", carryOver: false, paid: true });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create leave type", description: error.message, variant: "destructive" });
    },
  });

  const createHolidayMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/hr-settings/holidays", {
        method: "POST",
        body: JSON.stringify(holidayForm),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      toast({ title: "Holiday added" });
      setHolidayDialogOpen(false);
      setHolidayForm({ name: "", date: "", type: "regular" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add holiday", description: error.message, variant: "destructive" });
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/hr-settings/holidays/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      toast({ title: "Holiday deleted" });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/hr-settings/company", {
        method: "PUT",
        body: JSON.stringify(companyForm),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr-settings"] });
      toast({ title: "Company information updated" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">HR Settings</h1>
        <p className="text-muted-foreground">Manage payroll configuration, leave types, holidays, and company settings</p>
      </div>

      <Accordion type="multiple" defaultValue={["payroll", "leave-types"]} className="space-y-4">
        {/* Payroll Settings */}
        <AccordionItem value="payroll" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">Payroll Settings</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Cutoff Period</Label>
                  <p className="text-sm text-muted-foreground">1st - 15th of each month</p>
                  <Input defaultValue="15" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Second Cutoff Period</Label>
                  <p className="text-sm text-muted-foreground">16th - End of month</p>
                  <Input defaultValue="End of month" disabled />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Pay Date</Label>
                  <Input type="number" defaultValue="20" min="1" max="31" />
                  <p className="text-xs text-muted-foreground">Day of month for first cutoff payment</p>
                </div>
                <div className="space-y-2">
                  <Label>Second Pay Date</Label>
                  <Input type="number" defaultValue="5" min="1" max="31" />
                  <p className="text-xs text-muted-foreground">Day of month for second cutoff payment</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Working Days/Month</Label>
                  <Input type="number" defaultValue="22" />
                </div>
                <div className="space-y-2">
                  <Label>Working Hours/Day</Label>
                  <Input type="number" defaultValue="8" />
                </div>
                <div className="space-y-2">
                  <Label>Late Grace Period (min)</Label>
                  <Input type="number" defaultValue="15" />
                </div>
              </div>
              <Button>Save Payroll Settings</Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Leave Types */}
        <AccordionItem value="leave-types" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">Leave Types</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pb-4">
              <div className="flex justify-end">
                <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>Add Leave Type</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Leave Type</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          value={leaveForm.name}
                          onChange={(e) => setLeaveForm({ ...leaveForm, name: e.target.value })}
                          placeholder="e.g., Vacation Leave"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Default Days Per Year</Label>
                        <Input
                          type="number"
                          value={leaveForm.defaultDays}
                          onChange={(e) => setLeaveForm({ ...leaveForm, defaultDays: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Carry Over Unused Days</Label>
                        <Switch
                          checked={leaveForm.carryOver}
                          onCheckedChange={(checked) => setLeaveForm({ ...leaveForm, carryOver: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Paid Leave</Label>
                        <Switch
                          checked={leaveForm.paid}
                          onCheckedChange={(checked) => setLeaveForm({ ...leaveForm, paid: checked })}
                        />
                      </div>
                      <Button onClick={() => createLeaveTypeMutation.mutate()} disabled={!leaveForm.name} className="w-full">
                        Create Leave Type
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Default Days</TableHead>
                    <TableHead>Carry Over</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No leave types configured
                      </TableCell>
                    </TableRow>
                  ) : (
                    leaveTypes.map((lt: any) => (
                      <TableRow key={lt.id}>
                        <TableCell className="font-medium">{lt.name}</TableCell>
                        <TableCell>{lt.defaultDays} days</TableCell>
                        <TableCell>{lt.carryOver ? "Yes" : "No"}</TableCell>
                        <TableCell>
                          <Badge variant={lt.paid ? "default" : "secondary"}>
                            {lt.paid ? "Paid" : "Unpaid"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Holidays */}
        <AccordionItem value="holidays" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">Holidays</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pb-4">
              <div className="flex justify-end">
                <Dialog open={holidayDialogOpen} onOpenChange={setHolidayDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>Add Holiday</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Holiday</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Holiday Name</Label>
                        <Input
                          value={holidayForm.name}
                          onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                          placeholder="e.g., Christmas Day"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={holidayForm.date}
                          onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={holidayForm.type}
                          onValueChange={(value) => setHolidayForm({ ...holidayForm, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="regular">Regular Holiday</SelectItem>
                            <SelectItem value="special">Special Non-Working Holiday</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={() => createHolidayMutation.mutate()}
                        disabled={!holidayForm.name || !holidayForm.date}
                        className="w-full"
                      >
                        Add Holiday
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Holiday</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No holidays configured
                      </TableCell>
                    </TableRow>
                  ) : (
                    holidays.map((h: any) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-medium">{h.name}</TableCell>
                        <TableCell>{new Date(h.date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</TableCell>
                        <TableCell>
                          <Badge variant={h.type === "regular" ? "default" : "secondary"}>
                            {h.type === "regular" ? "Regular" : "Special"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteHolidayMutation.mutate(h.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Company Information */}
        <AccordionItem value="company" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">Company Information</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    placeholder="Scholaris Academy"
                  />
                </div>
                <div className="space-y-2">
                  <Label>TIN</Label>
                  <Input
                    value={companyForm.tin}
                    onChange={(e) => setCompanyForm({ ...companyForm, tin: e.target.value })}
                    placeholder="000-000-000-000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  placeholder="Company address"
                />
              </div>
              <Separator />
              <h4 className="font-medium">Government Employer Numbers</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>SSS Employer No.</Label>
                  <Input
                    value={companyForm.sssEmployerNo}
                    onChange={(e) => setCompanyForm({ ...companyForm, sssEmployerNo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>PhilHealth Employer No.</Label>
                  <Input
                    value={companyForm.philhealthEmployerNo}
                    onChange={(e) => setCompanyForm({ ...companyForm, philhealthEmployerNo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pag-IBIG Employer No.</Label>
                  <Input
                    value={companyForm.pagibigEmployerNo}
                    onChange={(e) => setCompanyForm({ ...companyForm, pagibigEmployerNo: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={() => updateCompanyMutation.mutate()}>Save Company Information</Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
