-- ============================================================================
-- Module 05: 201 Files
-- File: tables.sql
-- ============================================================================
-- The 201 Files module manages employee documents and government ID records.
-- It reads from the employees table (Module 02) and disciplinary_records
-- (Module 09) but owns the employee_documents and employee_government_ids
-- tables for document storage and government ID tracking.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: employee_documents
-- Description: Employee file attachments with type, verification, and expiry
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    document_type       VARCHAR(100) NOT NULL
                        CHECK (document_type IN (
                            'Pre-Employment', 'Contract', 'Government_ID',
                            'Certification', 'Medical', 'Clearance', 'Others'
                        )),
    document_url        TEXT NOT NULL,
    file_name           VARCHAR(255) NOT NULL,
    file_size           INTEGER,
    mime_type           VARCHAR(100),
    description         TEXT,

    -- Verification tracking
    verified            BOOLEAN NOT NULL DEFAULT false,
    verified_by         UUID REFERENCES users(id),
    verified_at         TIMESTAMP WITH TIME ZONE,

    -- Expiry tracking
    expiry_date         DATE,

    -- Soft delete
    is_active           BOOLEAN NOT NULL DEFAULT true,

    -- Notes
    notes               TEXT,

    -- Timestamps
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_employee_documents_employee_id ON employee_documents(employee_id);
CREATE INDEX idx_employee_documents_type ON employee_documents(document_type);
CREATE INDEX idx_employee_documents_verified ON employee_documents(verified);
CREATE INDEX idx_employee_documents_expiry ON employee_documents(expiry_date);
CREATE INDEX idx_employee_documents_active ON employee_documents(is_active);

COMMENT ON TABLE employee_documents IS 'Employee 201 file document attachments with verification and expiry tracking';
COMMENT ON COLUMN employee_documents.document_type IS 'Category: Pre-Employment, Contract, Government_ID, Certification, Medical, Clearance, Others';
COMMENT ON COLUMN employee_documents.document_url IS 'Storage URL or file path for the uploaded document';
COMMENT ON COLUMN employee_documents.verified IS 'Whether HR/Admin has verified the document authenticity';
COMMENT ON COLUMN employee_documents.expiry_date IS 'Document expiration date for time-limited certificates/licenses';

-- ---------------------------------------------------------------------------
-- Table: employee_government_ids
-- Description: Philippine government ID records with scanned image tracking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_government_ids (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    id_type             VARCHAR(50) NOT NULL
                        CHECK (id_type IN (
                            'SSS', 'TIN', 'PhilHealth', 'PagIBIG',
                            'PRC', 'Passport', 'Drivers_License',
                            'Voters_ID', 'Postal_ID'
                        )),
    id_number           VARCHAR(100) NOT NULL,

    -- Validity period
    issue_date          DATE,
    expiry_date         DATE,

    -- Scanned copies
    front_image_url     TEXT,
    back_image_url      TEXT,

    -- Verification
    verified            BOOLEAN NOT NULL DEFAULT false,
    verified_by         UUID REFERENCES users(id),
    verified_at         TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Prevent duplicate ID type per employee
    UNIQUE(employee_id, id_type)
);

-- Indexes for common query patterns
CREATE INDEX idx_employee_gov_ids_employee_id ON employee_government_ids(employee_id);
CREATE INDEX idx_employee_gov_ids_type ON employee_government_ids(id_type);
CREATE INDEX idx_employee_gov_ids_expiry ON employee_government_ids(expiry_date);

COMMENT ON TABLE employee_government_ids IS 'Philippine government ID records per employee with scanned images';
COMMENT ON COLUMN employee_government_ids.id_type IS 'Government ID type: SSS, TIN, PhilHealth, PagIBIG, PRC, Passport, Drivers_License, Voters_ID, Postal_ID';
COMMENT ON COLUMN employee_government_ids.id_number IS 'The actual ID number (stored as string to preserve leading zeros and dashes)';
COMMENT ON COLUMN employee_government_ids.front_image_url IS 'URL to scanned front image of the ID card';
COMMENT ON COLUMN employee_government_ids.back_image_url IS 'URL to scanned back image of the ID card';
