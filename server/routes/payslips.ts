import { Router } from "express";
import { isAuthenticated } from "../email-auth";
import { asyncHandler, NotFoundError } from "../middleware/error-handler";
import { storage } from "../storage";
import { idParamSchema } from "../utils/validation";

export const payslipRoutes = Router();

// GET /api/payslips/:id
payslipRoutes.get(
  "/:id",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const payslip = await storage.getPayslip(id);
    if (!payslip) throw new NotFoundError("Payslip");
    res.json(payslip);
  })
);

// POST /api/payslips/:id/email
payslipRoutes.post(
  "/:id/email",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    // Email sending logic would go here
    res.json({ message: "Payslip email sent (implement email integration)" });
  })
);
