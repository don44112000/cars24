/**
 * Document descriptors used for image extraction via Gemini.
 *
 * Each descriptor carries:
 *   - a tight extraction prompt asking ONLY for the fields needed for
 *     cross-checks defined in docs/docCheckList.md
 *   - a JSON Schema (Gemini `responseSchema`) that forces structured output
 *   - a TS type describing the resulting object
 *   - the list of fields we treat as REQUIRED (image must show them clearly)
 *   - the canonical `documentTypeDetected` value the model should return for
 *     this slot — mismatch ⇒ user uploaded the wrong document into this slot.
 *
 * Physical-authenticity checks (raised ink, lamination tamper, hologram
 * shimmer, etc.) are intentionally NOT requested from the model — they
 * cannot be done reliably from a single uploaded photo.
 */

export type DocId =
  | 'rc'
  | 'aadhaar'
  | 'pan'
  | 'insurance'
  | 'puc'
  | 'bankNoc'
  | 'form35'
  | 'invoice'
  | 'serviceBook';

/**
 * Enum of values the model can return in `documentTypeDetected`.
 * `other` covers anything that doesn't look like one of the 9 documents.
 */
export const DETECTED_VALUES = [
  'rc',
  'aadhaar',
  'pan',
  'insurance',
  'puc',
  'bankNoc',
  'form35',
  'invoice',
  'serviceBook',
  'other',
] as const;
export type DetectedValue = (typeof DETECTED_VALUES)[number];

/* ---------- Per-document field types ---------- */

interface BaseFields {
  /** What the model thinks this document actually is. */
  documentTypeDetected: DetectedValue | null;
  /**
   * Yes/No answer to: "Does the image you see match the document I told you
   * I am looking at?" — this is the primary confirmation signal.
   */
  matchesExpectedDocument: boolean | null;
  /** Short human-readable reason supporting the yes/no above. */
  matchReason: string | null;
}

export interface RcFields extends BaseFields {
  ownerName: string | null;
  registrationNumber: string | null;
  chassisNumber: string | null;
  engineNumber: string | null;
  hypothecationBank: string | null;
  makeModel: string | null;
  fuelType: string | null;
  colour: string | null;
  registrationValidUpto: string | null;
  ownerSerialNumber: number | null;
  yearOfManufacture: string | null;
}

export interface AadhaarFields extends BaseFields {
  name: string | null;
  last4: string | null;
  hasPhoto: boolean | null;
}

export interface PanFields extends BaseFields {
  name: string | null;
  panNumber: string | null;
  fourthCharacter: string | null;
}

export interface InsuranceFields extends BaseFields {
  insuredName: string | null;
  registrationNumber: string | null;
  chassisNumber: string | null;
  validFrom: string | null;
  validTo: string | null;
  hypothecationBank: string | null;
  idv: number | null;
  makeModel: string | null;
}

export interface PucFields extends BaseFields {
  registrationNumber: string | null;
  fuelType: string | null;
  validUpto: string | null;
}

export interface BankNocFields extends BaseFields {
  bankName: string | null;
  ownerName: string | null;
  registrationNumber: string | null;
  chassisNumber: string | null;
  issueDate: string | null;
}

export interface Form35Fields extends BaseFields {
  financierName: string | null;
  registrationNumber: string | null;
  ownerName: string | null;
  sellerSignaturePresent: boolean | null;
  bankSignaturePresent: boolean | null;
}

export interface InvoiceFields extends BaseFields {
  chassisNumber: string | null;
  engineNumber: string | null;
  buyerName: string | null;
  exShowroomPrice: number | null;
  makeModelVariant: string | null;
  colour: string | null;
}

export interface ServiceEntry {
  date: string | null;
  odometerKm: number | null;
  serviceCentre: string | null;
}

export interface ServiceBookFields extends BaseFields {
  chassisNumber: string | null;
  entries: ServiceEntry[];
}

export interface ExtractedByDoc {
  rc: RcFields;
  aadhaar: AadhaarFields;
  pan: PanFields;
  insurance: InsuranceFields;
  puc: PucFields;
  bankNoc: BankNocFields;
  form35: Form35Fields;
  invoice: InvoiceFields;
  serviceBook: ServiceBookFields;
}

/* ---------- Gemini responseSchema (OpenAPI subset) ---------- */

type SchemaType = 'OBJECT' | 'STRING' | 'NUMBER' | 'INTEGER' | 'BOOLEAN' | 'ARRAY';

interface SchemaNode {
  type: SchemaType;
  description?: string;
  nullable?: boolean;
  enum?: string[];
  properties?: Record<string, SchemaNode>;
  required?: string[];
  items?: SchemaNode;
}

const STR_NULLABLE = (description: string): SchemaNode => ({
  type: 'STRING',
  description,
  nullable: true,
});
const NUM_NULLABLE = (description: string): SchemaNode => ({
  type: 'NUMBER',
  description,
  nullable: true,
});
const INT_NULLABLE = (description: string): SchemaNode => ({
  type: 'INTEGER',
  description,
  nullable: true,
});
const BOOL_NULLABLE = (description: string): SchemaNode => ({
  type: 'BOOLEAN',
  description,
  nullable: true,
});

const DETECTED_FIELD: SchemaNode = {
  type: 'STRING',
  description:
    'What document this image actually is. Return one of the listed enum values; "other" if it does not look like any of them.',
  nullable: true,
  enum: [...DETECTED_VALUES],
};

const MATCHES_EXPECTED_FIELD: SchemaNode = {
  type: 'BOOLEAN',
  description:
    'Yes/No: does the image you see match the document I described above? Use false for blurry/cropped/wrong-document images.',
  nullable: true,
};

const MATCH_REASON_FIELD: SchemaNode = {
  type: 'STRING',
  description:
    'One short sentence supporting the yes/no above. e.g. "matches RC smart card front", "this is a PAN card not an RC", "image too blurry to confirm".',
  nullable: true,
};

/**
 * Builds the classifier instruction with the slot's expected document name
 * baked in, so the model can give an informed yes/no.
 */
function buildClassifierInstruction(expectedLabel: string): string {
  return `

Then answer two questions about the image itself:

1. Set "matchesExpectedDocument" to TRUE or FALSE — does the image actually look like a ${expectedLabel}? Set FALSE if the image is too blurry/cropped to be sure, or if it is clearly a different document.
2. Set "matchReason" to one short sentence explaining your answer (e.g. "matches ${expectedLabel} front", "this is actually a PAN card", "image too blurry to read").
3. Set "documentTypeDetected" to the canonical type you actually see, one of:
   - "rc" — Indian RC book or RC smart card
   - "aadhaar" — Indian Aadhaar card
   - "pan" — Indian PAN card
   - "insurance" — motor insurance policy / Certificate of Insurance
   - "puc" — Pollution Under Control certificate slip
   - "bankNoc" — bank No-Objection Certificate for vehicle loan closure
   - "form35" — RTO Form 35 (HP termination form)
   - "invoice" — original new-vehicle dealer purchase invoice
   - "serviceBook" — vehicle service history booklet
   - "other" — anything that does not match the above

Be honest. If the image does not match what I described, say so — do not try to make the extracted fields fit.`;
}

/**
 * Builds an OBJECT schema by appending the universal classifier fields and
 * marking them as required. Keeps every per-doc schema definition focused on
 * the doc-specific fields.
 */
function buildSchema(docFields: SchemaNode): SchemaNode {
  const properties = {
    ...(docFields.properties ?? {}),
    documentTypeDetected: DETECTED_FIELD,
    matchesExpectedDocument: MATCHES_EXPECTED_FIELD,
    matchReason: MATCH_REASON_FIELD,
  };
  const required = [
    ...(docFields.required ?? []),
    'documentTypeDetected',
    'matchesExpectedDocument',
    'matchReason',
  ];
  return { ...docFields, properties, required };
}

/* ---------- Per-document descriptors ---------- */

export interface DocDescriptor<T extends BaseFields> {
  id: DocId;
  label: string;
  helper: string;
  prompt: string;
  responseSchema: SchemaNode;
  empty: T;
  /** Field keys (excluding `documentTypeDetected`) that MUST be non-null. */
  requiredFields: (keyof T)[];
  /** The value the model should return for `documentTypeDetected`. */
  canonicalDetectedValue: DetectedValue;
}

const RC_PROMPT = `You are reading the front and (if visible) inside of an Indian Maharashtra-issued RC book or RC smart card.
Extract ONLY these fields. Output JSON conforming to the schema. Use null when a field is not visible or cannot be read with confidence — do not guess.

Rules:
- Names: copy exactly as printed (preserve case, spaces, full middle names). Do NOT abbreviate.
- registrationNumber: full Indian registration number, e.g. "MH12AB1234". Strip spaces.
- chassisNumber: 17-character VIN, uppercase, no spaces.
- engineNumber: full alphanumeric, uppercase, no spaces.
- hypothecationBank: bank/financier name if a "Hypothecation in favour of" / "HP" / "Financer" entry is present and non-blank. If blank/NA/NIL/none → null.
- fuelType: one of "PETROL","DIESEL","CNG","LPG","ELECTRIC","HYBRID","PETROL+CNG", or null.
- registrationValidUpto: ISO date YYYY-MM-DD if a "Registration valid upto" date is shown.
- ownerSerialNumber: integer (1, 2, 3...) from the "Owner Sl. No." / "Owner S.No." field.
- yearOfManufacture: 4-digit year as string.${buildClassifierInstruction('RC book or RC smart card')}`;

const RC_SCHEMA: SchemaNode = buildSchema({
  type: 'OBJECT',
  properties: {
    ownerName: STR_NULLABLE('Registered owner name, exactly as printed.'),
    registrationNumber: STR_NULLABLE('Registration number, no spaces, uppercase.'),
    chassisNumber: STR_NULLABLE('17-character chassis/VIN, uppercase.'),
    engineNumber: STR_NULLABLE('Engine number, uppercase.'),
    hypothecationBank: STR_NULLABLE('Bank/financier name if hypothecation present, else null.'),
    makeModel: STR_NULLABLE('Make and model combined as printed.'),
    fuelType: STR_NULLABLE('Fuel type as printed.'),
    colour: STR_NULLABLE('Colour as printed.'),
    registrationValidUpto: STR_NULLABLE('Registration valid upto, ISO date.'),
    ownerSerialNumber: INT_NULLABLE('Owner serial number (integer).'),
    yearOfManufacture: STR_NULLABLE('4-digit year of manufacture.'),
  },
  required: [
    'ownerName',
    'registrationNumber',
    'chassisNumber',
    'engineNumber',
    'hypothecationBank',
    'makeModel',
    'fuelType',
    'colour',
    'registrationValidUpto',
    'ownerSerialNumber',
    'yearOfManufacture',
  ],
});

const AADHAAR_PROMPT = `You are reading the front of an Indian Aadhaar card. Extract ONLY:
- name: exactly as printed below the photo.
- last4: the last 4 digits of the 12-digit Aadhaar number (string, exactly 4 chars).
- hasPhoto: true if a photo is visible on the card.
Use null if you cannot read a field with confidence. Do not guess.${buildClassifierInstruction('Aadhaar card')}`;

const AADHAAR_SCHEMA: SchemaNode = buildSchema({
  type: 'OBJECT',
  properties: {
    name: STR_NULLABLE('Name printed on Aadhaar.'),
    last4: STR_NULLABLE('Last 4 digits of Aadhaar number.'),
    hasPhoto: BOOL_NULLABLE('True if a photo is visible.'),
  },
  required: ['name', 'last4', 'hasPhoto'],
});

const PAN_PROMPT = `You are reading the front of an Indian PAN card. Extract ONLY:
- name: exactly as printed.
- panNumber: 10-character alphanumeric (format AAAAA9999A), uppercase.
- fourthCharacter: the 4th character of panNumber (P=Individual, C=Company, H=HUF, F=Firm, A=AOP, T=Trust, B=BOI, L=Local, J=Artificial Juridical, G=Government).
Use null if you cannot read with confidence. Do not guess.${buildClassifierInstruction('PAN card')}`;

const PAN_SCHEMA: SchemaNode = buildSchema({
  type: 'OBJECT',
  properties: {
    name: STR_NULLABLE('Name printed on PAN.'),
    panNumber: STR_NULLABLE('10-character PAN number, uppercase.'),
    fourthCharacter: STR_NULLABLE('Single uppercase letter at position 4.'),
  },
  required: ['name', 'panNumber', 'fourthCharacter'],
});

const INSURANCE_PROMPT = `You are reading an Indian motor insurance Certificate of Insurance / policy schedule.
Extract ONLY the listed fields. Use null when a field is not visible or unreadable.
- insuredName: "Name of insured" / "Proposer".
- registrationNumber: vehicle registration number, no spaces, uppercase.
- chassisNumber: if printed; else null.
- validFrom / validTo: ISO YYYY-MM-DD.
- hypothecationBank: bank named under endorsement/hypothecation if any; else null.
- idv: "Insured Declared Value" / "Sum insured" as integer INR (no commas/symbols).
- makeModel: as printed.${buildClassifierInstruction('motor insurance policy or Certificate of Insurance')}`;

const INSURANCE_SCHEMA: SchemaNode = buildSchema({
  type: 'OBJECT',
  properties: {
    insuredName: STR_NULLABLE('Insured / proposer name.'),
    registrationNumber: STR_NULLABLE('Registration number on policy.'),
    chassisNumber: STR_NULLABLE('Chassis number if printed.'),
    validFrom: STR_NULLABLE('Policy start, ISO date.'),
    validTo: STR_NULLABLE('Policy end, ISO date.'),
    hypothecationBank: STR_NULLABLE('Endorsed bank name, else null.'),
    idv: NUM_NULLABLE('IDV in INR, integer if possible.'),
    makeModel: STR_NULLABLE('Make and model.'),
  },
  required: [
    'insuredName',
    'registrationNumber',
    'chassisNumber',
    'validFrom',
    'validTo',
    'hypothecationBank',
    'idv',
    'makeModel',
  ],
});

const PUC_PROMPT = `You are reading an Indian PUC (Pollution Under Control) certificate slip. Extract ONLY:
- registrationNumber: vehicle reg no, no spaces, uppercase.
- fuelType: PETROL/DIESEL/CNG/LPG.
- validUpto: ISO YYYY-MM-DD.
Use null if unreadable. Do not guess.${buildClassifierInstruction('PUC (Pollution Under Control) certificate slip')}`;

const PUC_SCHEMA: SchemaNode = buildSchema({
  type: 'OBJECT',
  properties: {
    registrationNumber: STR_NULLABLE('Registration number on PUC.'),
    fuelType: STR_NULLABLE('Fuel type on PUC.'),
    validUpto: STR_NULLABLE('Valid upto, ISO date.'),
  },
  required: ['registrationNumber', 'fuelType', 'validUpto'],
});

const BANK_NOC_PROMPT = `You are reading a Bank NOC (No Objection Certificate) issued for a vehicle loan closure.
Extract ONLY:
- bankName: bank name as shown on the letterhead or rubber stamp.
- ownerName: borrower / vehicle owner name.
- registrationNumber: vehicle reg no, no spaces, uppercase.
- chassisNumber: if printed.
- issueDate: ISO YYYY-MM-DD.
Use null if unreadable. Do not guess. Do NOT attempt to judge signature/stamp authenticity.${buildClassifierInstruction('Bank NOC (No-Objection Certificate) for vehicle loan closure')}`;

const BANK_NOC_SCHEMA: SchemaNode = buildSchema({
  type: 'OBJECT',
  properties: {
    bankName: STR_NULLABLE('Bank name on NOC.'),
    ownerName: STR_NULLABLE('Borrower / vehicle owner name.'),
    registrationNumber: STR_NULLABLE('Registration number.'),
    chassisNumber: STR_NULLABLE('Chassis number if printed.'),
    issueDate: STR_NULLABLE('NOC issue date, ISO date.'),
  },
  required: ['bankName', 'ownerName', 'registrationNumber', 'chassisNumber', 'issueDate'],
});

const FORM35_PROMPT = `You are reading Form 35 (Notice of termination of an agreement of hire-purchase / lease / hypothecation).
Extract ONLY:
- financierName: "Name of financier".
- registrationNumber: vehicle reg no, no spaces, uppercase.
- ownerName: "Name of registered owner".
- sellerSignaturePresent: true if a signature is visible in the owner/transferor signature box.
- bankSignaturePresent: true if a signature is visible in the financier's authorised signatory box.
Use null when unreadable. Do not guess.${buildClassifierInstruction('RTO Form 35 (Notice of termination of hire-purchase agreement)')}`;

const FORM35_SCHEMA: SchemaNode = buildSchema({
  type: 'OBJECT',
  properties: {
    financierName: STR_NULLABLE('Financier name on Form 35.'),
    registrationNumber: STR_NULLABLE('Registration number.'),
    ownerName: STR_NULLABLE('Registered owner name.'),
    sellerSignaturePresent: BOOL_NULLABLE('Owner signature visible.'),
    bankSignaturePresent: BOOL_NULLABLE('Bank/financier signature visible.'),
  },
  required: [
    'financierName',
    'registrationNumber',
    'ownerName',
    'sellerSignaturePresent',
    'bankSignaturePresent',
  ],
});

const INVOICE_PROMPT = `You are reading an original new-vehicle dealer purchase invoice. Extract ONLY:
- chassisNumber: 17-character VIN, uppercase.
- engineNumber: full alphanumeric, uppercase.
- buyerName: "Buyer / Customer" name as printed.
- exShowroomPrice: integer INR ex-showroom price (no commas/symbols).
- makeModelVariant: combined description / variant text.
- colour: as printed.
Use null when unreadable. Do not guess.${buildClassifierInstruction('original new-vehicle dealer purchase invoice')}`;

const INVOICE_SCHEMA: SchemaNode = buildSchema({
  type: 'OBJECT',
  properties: {
    chassisNumber: STR_NULLABLE('17-character VIN.'),
    engineNumber: STR_NULLABLE('Engine number.'),
    buyerName: STR_NULLABLE('Buyer/customer name.'),
    exShowroomPrice: NUM_NULLABLE('Ex-showroom price in INR.'),
    makeModelVariant: STR_NULLABLE('Make/model/variant.'),
    colour: STR_NULLABLE('Colour.'),
  },
  required: [
    'chassisNumber',
    'engineNumber',
    'buyerName',
    'exShowroomPrice',
    'makeModelVariant',
    'colour',
  ],
});

const SERVICE_BOOK_PROMPT = `You are reading pages of a vehicle service history booklet (manufacturer-issued).
Extract:
- chassisNumber (if printed on the cover/inside cover).
- entries: every visible service stamp on the page, each with:
    - date (ISO YYYY-MM-DD)
    - odometerKm (integer km, e.g. parse "45,000 km" as 45000)
    - serviceCentre (dealer/service centre name from the stamp; null if not legible)
Order entries top-to-bottom as they appear. Use null for unreadable individual fields. Do not guess values.${buildClassifierInstruction('vehicle service history booklet')}`;

const SERVICE_BOOK_SCHEMA: SchemaNode = buildSchema({
  type: 'OBJECT',
  properties: {
    chassisNumber: STR_NULLABLE('Chassis number on service book cover.'),
    entries: {
      type: 'ARRAY',
      description: 'Service entries visible on the page.',
      items: {
        type: 'OBJECT',
        properties: {
          date: STR_NULLABLE('Service date, ISO.'),
          odometerKm: INT_NULLABLE('Odometer in km.'),
          serviceCentre: STR_NULLABLE('Service centre / dealer name.'),
        },
        required: ['date', 'odometerKm', 'serviceCentre'],
      },
    },
  },
  required: ['chassisNumber', 'entries'],
});

/* ---------- Empty placeholders ---------- */

const emptyRc: RcFields = {
  documentTypeDetected: null,
  matchesExpectedDocument: null,
  matchReason: null,
  ownerName: null,
  registrationNumber: null,
  chassisNumber: null,
  engineNumber: null,
  hypothecationBank: null,
  makeModel: null,
  fuelType: null,
  colour: null,
  registrationValidUpto: null,
  ownerSerialNumber: null,
  yearOfManufacture: null,
};
const emptyAadhaar: AadhaarFields = {
  documentTypeDetected: null,
  matchesExpectedDocument: null,
  matchReason: null,
  name: null,
  last4: null,
  hasPhoto: null,
};
const emptyPan: PanFields = {
  documentTypeDetected: null,
  matchesExpectedDocument: null,
  matchReason: null,
  name: null,
  panNumber: null,
  fourthCharacter: null,
};
const emptyInsurance: InsuranceFields = {
  documentTypeDetected: null,
  matchesExpectedDocument: null,
  matchReason: null,
  insuredName: null,
  registrationNumber: null,
  chassisNumber: null,
  validFrom: null,
  validTo: null,
  hypothecationBank: null,
  idv: null,
  makeModel: null,
};
const emptyPuc: PucFields = {
  documentTypeDetected: null,
  matchesExpectedDocument: null,
  matchReason: null,
  registrationNumber: null,
  fuelType: null,
  validUpto: null,
};
const emptyBankNoc: BankNocFields = {
  documentTypeDetected: null,
  matchesExpectedDocument: null,
  matchReason: null,
  bankName: null,
  ownerName: null,
  registrationNumber: null,
  chassisNumber: null,
  issueDate: null,
};
const emptyForm35: Form35Fields = {
  documentTypeDetected: null,
  matchesExpectedDocument: null,
  matchReason: null,
  financierName: null,
  registrationNumber: null,
  ownerName: null,
  sellerSignaturePresent: null,
  bankSignaturePresent: null,
};
const emptyInvoice: InvoiceFields = {
  documentTypeDetected: null,
  matchesExpectedDocument: null,
  matchReason: null,
  chassisNumber: null,
  engineNumber: null,
  buyerName: null,
  exShowroomPrice: null,
  makeModelVariant: null,
  colour: null,
};
const emptyServiceBook: ServiceBookFields = {
  documentTypeDetected: null,
  matchesExpectedDocument: null,
  matchReason: null,
  chassisNumber: null,
  entries: [],
};

/* ---------- Public registry ---------- */

export const DOC_DESCRIPTORS: {
  [K in DocId]: DocDescriptor<ExtractedByDoc[K]>;
} = {
  rc: {
    id: 'rc',
    label: 'RC Book / Smart Card',
    helper: 'Front + inside pages of the original physical RC.',
    prompt: RC_PROMPT,
    responseSchema: RC_SCHEMA,
    empty: emptyRc,
    canonicalDetectedValue: 'rc',
    requiredFields: ['ownerName', 'registrationNumber', 'chassisNumber', 'engineNumber'],
  },
  aadhaar: {
    id: 'aadhaar',
    label: "Seller's Aadhaar",
    helper: 'Front face of the seller\u2019s Aadhaar card.',
    prompt: AADHAAR_PROMPT,
    responseSchema: AADHAAR_SCHEMA,
    empty: emptyAadhaar,
    canonicalDetectedValue: 'aadhaar',
    requiredFields: ['name'],
  },
  pan: {
    id: 'pan',
    label: "Seller's PAN",
    helper: 'Front face of the seller\u2019s PAN card.',
    prompt: PAN_PROMPT,
    responseSchema: PAN_SCHEMA,
    empty: emptyPan,
    canonicalDetectedValue: 'pan',
    requiredFields: ['name', 'panNumber'],
  },
  insurance: {
    id: 'insurance',
    label: 'Insurance / Certificate of Insurance',
    helper: 'Policy schedule or 1-page COI.',
    prompt: INSURANCE_PROMPT,
    responseSchema: INSURANCE_SCHEMA,
    empty: emptyInsurance,
    canonicalDetectedValue: 'insurance',
    requiredFields: ['insuredName', 'registrationNumber', 'validTo'],
  },
  puc: {
    id: 'puc',
    label: 'PUC Certificate',
    helper: 'PUC slip from authorised testing centre.',
    prompt: PUC_PROMPT,
    responseSchema: PUC_SCHEMA,
    empty: emptyPuc,
    canonicalDetectedValue: 'puc',
    requiredFields: ['registrationNumber', 'validUpto'],
  },
  bankNoc: {
    id: 'bankNoc',
    label: 'Bank NOC',
    helper: 'Required only if the vehicle had a loan.',
    prompt: BANK_NOC_PROMPT,
    responseSchema: BANK_NOC_SCHEMA,
    empty: emptyBankNoc,
    canonicalDetectedValue: 'bankNoc',
    requiredFields: ['bankName', 'ownerName', 'registrationNumber', 'issueDate'],
  },
  form35: {
    id: 'form35',
    label: 'Form 35',
    helper: 'Hypothecation termination form (with loan only).',
    prompt: FORM35_PROMPT,
    responseSchema: FORM35_SCHEMA,
    empty: emptyForm35,
    canonicalDetectedValue: 'form35',
    requiredFields: ['financierName', 'registrationNumber'],
  },
  invoice: {
    id: 'invoice',
    label: 'Original Purchase Invoice',
    helper: 'Original dealer invoice from the new-vehicle purchase.',
    prompt: INVOICE_PROMPT,
    responseSchema: INVOICE_SCHEMA,
    empty: emptyInvoice,
    canonicalDetectedValue: 'invoice',
    requiredFields: ['chassisNumber', 'engineNumber'],
  },
  serviceBook: {
    id: 'serviceBook',
    label: 'Service History Book',
    helper: 'Pages with dated service stamps & odometer entries.',
    prompt: SERVICE_BOOK_PROMPT,
    responseSchema: SERVICE_BOOK_SCHEMA,
    empty: emptyServiceBook,
    canonicalDetectedValue: 'serviceBook',
    requiredFields: ['entries'],
  },
};

export const DOC_ORDER: DocId[] = [
  'rc',
  'aadhaar',
  'pan',
  'insurance',
  'puc',
  'bankNoc',
  'form35',
  'invoice',
  'serviceBook',
];

export type ExtractedSet = Partial<{
  [K in DocId]: ExtractedByDoc[K];
}>;

/**
 * Returns the list of required fields that came back null/empty.
 * For array fields (e.g. `entries`), an empty array counts as missing.
 */
export function findMissingRequiredFields<K extends DocId>(
  docId: K,
  data: ExtractedByDoc[K],
): string[] {
  const descriptor = DOC_DESCRIPTORS[docId];
  const missing: string[] = [];
  const record = data as unknown as Record<string, unknown>;
  for (const key of descriptor.requiredFields) {
    const value = record[key as string];
    if (value === null || value === undefined) {
      missing.push(key as string);
    } else if (Array.isArray(value) && value.length === 0) {
      missing.push(key as string);
    } else if (typeof value === 'string' && value.trim() === '') {
      missing.push(key as string);
    }
  }
  return missing;
}

/** Friendly labels for required-field error messages. */
export const FIELD_LABELS: Record<string, string> = {
  ownerName: 'Owner name',
  registrationNumber: 'Registration number',
  chassisNumber: 'Chassis number',
  engineNumber: 'Engine number',
  name: 'Name',
  panNumber: 'PAN number',
  insuredName: 'Insured name',
  validTo: 'Policy expiry date',
  validUpto: 'Valid upto date',
  bankName: 'Bank name',
  issueDate: 'Issue date',
  financierName: 'Financier name',
  entries: 'Service entries',
};

export const DOC_LABEL_BY_DETECTED: Record<DetectedValue, string> = {
  rc: 'RC Book',
  aadhaar: 'Aadhaar card',
  pan: 'PAN card',
  insurance: 'Insurance policy',
  puc: 'PUC certificate',
  bankNoc: 'Bank NOC',
  form35: 'Form 35',
  invoice: 'Purchase invoice',
  serviceBook: 'Service book',
  other: 'something else',
};

/* ---------- Prompt-based JSON: render a schema as a shape description ---------- */

/**
 * Renders a SchemaNode as an indented JSON-shape description suitable for
 * pasting into a prompt. Used in prompt-based JSON mode (no `response_schema`
 * sent to the API). Each field is shown as `"key": <type-spec>, // description`.
 *
 * Example output:
 *   {
 *     "ownerName": string|null,                  // Registered owner name...
 *     "ownerSerialNumber": integer|null,         // Owner serial number (integer).
 *     "documentTypeDetected": "rc"|"aadhaar"|... // ...
 *   }
 */
export function describeSchemaForPrompt(node: SchemaNode, indentLevel = 0): string {
  const pad = '  '.repeat(indentLevel);
  const innerPad = '  '.repeat(indentLevel + 1);

  if (node.type === 'OBJECT') {
    const entries = Object.entries(node.properties ?? {});
    const lines = ['{'];
    entries.forEach(([key, prop], i) => {
      const isLast = i === entries.length - 1;
      const typeStr = describeType(prop, indentLevel + 1);
      const desc = prop.description ? `  // ${prop.description}` : '';
      lines.push(`${innerPad}"${key}": ${typeStr}${isLast ? '' : ','}${desc}`);
    });
    lines.push(`${pad}}`);
    return lines.join('\n');
  }

  return describeType(node, indentLevel);
}

function describeType(node: SchemaNode, indentLevel: number): string {
  const nullSuffix = node.nullable ? '|null' : '';
  switch (node.type) {
    case 'STRING':
      if (node.enum && node.enum.length > 0) {
        return `${node.enum.map(v => `"${v}"`).join('|')}${nullSuffix}`;
      }
      return `string${nullSuffix}`;
    case 'NUMBER':
      return `number${nullSuffix}`;
    case 'INTEGER':
      return `integer${nullSuffix}`;
    case 'BOOLEAN':
      return `boolean${nullSuffix}`;
    case 'ARRAY':
      return node.items
        ? `[ ${describeType(node.items, indentLevel)}, ... ]`
        : '[ unknown, ... ]';
    case 'OBJECT':
      return describeSchemaForPrompt(node, indentLevel);
    default:
      return 'unknown';
  }
}
