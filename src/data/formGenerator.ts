/**
 * Form generator — wizard logic, form recommendation, field mapping.
 *
 * Each Indian RTO form has its own field-ID convention. The wizard collects a
 * single normalised set of answers (`WizardAnswers`) and the `mapToForm{N}`
 * helpers translate that into the field IDs each template expects. The HTML
 * templates auto-prefill via `public/forms/prefill.js` from a base64-JSON hash.
 */

export type Intent =
  | 'buyer'
  | 'seller'
  | 'loan-closure'
  | 'auction'
  | 'financier-default';

export type FormId = 'form28' | 'form29' | 'form30' | 'form32' | 'form35' | 'form36';

export interface WizardAnswers {
  intent: Intent | null;

  hasLoan: boolean;
  isOutOfState: boolean; // car coming from another state (buyer's perspective)
  takingOutOfState: boolean; // buyer is taking the car to another state (seller's perspective)

  // Vehicle
  regNo: string;
  chassisNo: string;
  engineNo: string;
  make: string;
  model: string;
  vehicleClass: string; // e.g. Motor Car, Two-wheeler
  ownerRTO: string; // original/parent RTO (e.g. "RTO, Pune")
  buyerRTO: string; // buyer's RTO jurisdiction
  buyerState: string; // buyer's state (Form 28)

  // Owner / "You" (depends on intent)
  ownerName: string;
  ownerParent: string; // father's / husband's name
  ownerAddress: string;
  ownerMobile: string;

  // Other party (seller for buyer; buyer for seller; etc.)
  otherPartyName: string;
  otherPartyParent: string;
  otherPartyAddress: string;
  otherPartyMobile: string;
  otherPartyAge: string;

  // Bank / Financier
  bankName: string;
  bankAddress: string;

  // Dates
  saleDate: string; // dd/mm/yyyy
  applicationDate: string;
}

export const emptyAnswers = (): WizardAnswers => ({
  intent: null,
  hasLoan: false,
  isOutOfState: false,
  takingOutOfState: false,
  regNo: '',
  chassisNo: '',
  engineNo: '',
  make: '',
  model: '',
  vehicleClass: 'Motor Car',
  ownerRTO: '',
  buyerRTO: '',
  buyerState: 'Maharashtra',
  ownerName: '',
  ownerParent: '',
  ownerAddress: '',
  ownerMobile: '',
  otherPartyName: '',
  otherPartyParent: '',
  otherPartyAddress: '',
  otherPartyMobile: '',
  otherPartyAge: '',
  bankName: '',
  bankAddress: '',
  saleDate: '',
  applicationDate: new Date().toLocaleDateString('en-GB'),
});

export interface FormMeta {
  id: FormId;
  title: string;
  subtitle: string;
  filePath: string; // relative to /forms/
}

export const FORM_META: Record<FormId, FormMeta> = {
  form28: {
    id: 'form28',
    title: 'Form 28',
    subtitle: 'NOC from original-state RTO',
    filePath: '/forms/form28.html',
  },
  form29: {
    id: 'form29',
    title: 'Form 29',
    subtitle: 'Notice of Transfer of Ownership',
    filePath: '/forms/form29.html',
  },
  form30: {
    id: 'form30',
    title: 'Form 30',
    subtitle: 'Application for Transfer of Ownership',
    filePath: '/forms/form30.html',
  },
  form32: {
    id: 'form32',
    title: 'Form 32',
    subtitle: 'Transfer via Auction',
    filePath: '/forms/form32.html',
  },
  form35: {
    id: 'form35',
    title: 'Form 35',
    subtitle: 'Termination of Hypothecation',
    filePath: '/forms/form35.html',
  },
  form36: {
    id: 'form36',
    title: 'Form 36',
    subtitle: 'Fresh RC for Financier (default)',
    filePath: '/forms/form36.html',
  },
};

export interface FormRecommendation {
  id: FormId;
  why: string;
  whoFiles: string;
  copies: string;
}

/** Recommend the right forms based on intent + situational flags. */
export function recommendForms(a: WizardAnswers): FormRecommendation[] {
  const out: FormRecommendation[] = [];

  switch (a.intent) {
    case 'buyer':
      if (a.isOutOfState) {
        out.push({
          id: 'form28',
          why: 'NOC from the seller’s original-state RTO. Required to re-register the vehicle in Maharashtra.',
          whoFiles: 'Seller (you keep a copy)',
          copies: '1',
        });
      }
      out.push({
        id: 'form29',
        why: 'Notice of transfer — both you and the seller sign. Seller submits 1 copy at their RTO; you keep 1.',
        whoFiles: 'Seller submits, both sign',
        copies: '2',
      });
      out.push({
        id: 'form30',
        why: 'Your formal application to record the new ownership in your name at your local RTO. File within 30 days of purchase.',
        whoFiles: 'Buyer (you)',
        copies: '1',
      });
      break;

    case 'seller':
      out.push({
        id: 'form29',
        why: 'Notice of transfer — file at your RTO within 14 days of sale. Your legal indemnification.',
        whoFiles: 'You (seller)',
        copies: '2',
      });
      if (a.takingOutOfState) {
        out.push({
          id: 'form28',
          why: 'No-Objection Certificate so the buyer can re-register the vehicle in another state.',
          whoFiles: 'You (seller)',
          copies: '1',
        });
      }
      if (a.hasLoan) {
        out.push({
          id: 'form35',
          why: 'Hypothecation termination — required because the vehicle had/has an active loan. Bank must co-sign.',
          whoFiles: 'You + Bank',
          copies: '2 sets',
        });
      }
      break;

    case 'loan-closure':
      out.push({
        id: 'form35',
        why: 'Termination of hypothecation / lease / hire-purchase agreement after loan closure.',
        whoFiles: 'You + Bank',
        copies: '2 sets',
      });
      break;

    case 'auction':
      out.push({
        id: 'form32',
        why: 'Transfer of ownership via public auction.',
        whoFiles: 'Buyer (auction winner)',
        copies: '1',
      });
      out.push({
        id: 'form30',
        why: 'Application for transfer of ownership filed alongside Form 32.',
        whoFiles: 'Buyer',
        copies: '1',
      });
      break;

    case 'financier-default':
      out.push({
        id: 'form36',
        why: 'Issue of a fresh RC in the financier’s name after the borrower defaulted / refused to surrender the RC.',
        whoFiles: 'Financier',
        copies: '1',
      });
      break;
  }

  return out;
}

/* ─────────────────────────────────────────────
   Field mapping per form
   Keys are the exact `id` attributes in each
   public/forms/*.html template.
   ───────────────────────────────────────────── */

const nameAddress = (name: string, addr: string) => [name, addr].filter(Boolean).join(', ');

export function mapToForm28(a: WizardAnswers): Record<string, string> {
  return {
    f_reg_authority: a.ownerRTO,
    f_buyer_name: a.otherPartyName,
    f_buyer_jurisdiction: a.buyerRTO,
    f_buyer_state: a.buyerState,
    f_name_address: nameAddress(a.ownerName, a.ownerAddress),
    f_son_of: a.ownerParent,
    f_mobile: a.ownerMobile,
    f_reg_no: a.regNo,
    f_class: a.vehicleClass,
    f_orig_ra: a.ownerRTO,
    f_engine_no: a.engineNo,
    f_chassis_no: a.chassisNo,
    f_period_stay: '',
    f_tax_paid_upto: '',
    f_tax_pending: 'NIL',
    f_theft_cases: 'NIL',
    f_sec_action: 'NIL',
    f_prohibited_goods: 'NIL',
    f_financier: a.hasLoan ? nameAddress(a.bankName, a.bankAddress) : 'NA',
    f_date_p1: a.applicationDate,
    f_sig_owner: '',
    f_to_owner: nameAddress(a.ownerName, a.ownerAddress),
    f_to_financier: a.hasLoan ? nameAddress(a.bankName, a.bankAddress) : '',
    f_to_ra: a.buyerRTO,
  };
}

export function mapToForm29(a: WizardAnswers): Record<string, string> {
  const [day, month, year] = (a.saleDate || '').split('/');
  return {
    f_reg_authority: a.ownerRTO,
    f_transferor_name: a.ownerName,
    f_resident_of: a.ownerAddress,
    f_date_of_transfer: a.saleDate,
    f_year: year || '',
    f_vehicle_no: a.regNo,
    f_make: [a.make, a.model].filter(Boolean).join(' '),
    f_chassis_no: a.chassisNo,
    f_engine_no: a.engineNo,
    f_transferee_name: a.otherPartyName,
    f_transferee_parent: a.otherPartyParent,
    f_transferee_address: a.otherPartyAddress,
    f_financier: a.hasLoan ? a.bankName : 'NA',
    f_date_transferor: a.applicationDate,
    f_sig_transferor: '',
    f_date_right: a.applicationDate,
    f_transferee_sig_name: a.otherPartyName,
    f_transferor_address: a.ownerAddress,
    // unused but reserved
    _unused_day: day || '',
    _unused_month: month || '',
  };
}

export function mapToForm30(a: WizardAnswers): Record<string, string> {
  // For Form 30, "transferor" = seller, "transferee" = buyer.
  // If user is a buyer, ownerName fields hold buyer details, otherParty holds seller.
  const isBuyer = a.intent === 'buyer' || a.intent === 'auction';
  const sellerName = isBuyer ? a.otherPartyName : a.ownerName;
  const sellerParent = isBuyer ? a.otherPartyParent : a.ownerParent;
  const sellerAddress = isBuyer ? a.otherPartyAddress : a.ownerAddress;
  const buyerName = isBuyer ? a.ownerName : a.otherPartyName;
  const buyerParent = isBuyer ? a.ownerParent : a.otherPartyParent;
  const buyerAddress = isBuyer ? a.ownerAddress : a.otherPartyAddress;
  const buyerAge = isBuyer ? a.otherPartyAge || a.otherPartyAge : a.otherPartyAge;
  const buyerMobile = isBuyer ? a.ownerMobile : a.otherPartyMobile;

  const [day, , year] = (a.saleDate || '').split('/');

  return {
    f_reg_authority: a.buyerRTO || a.ownerRTO,
    f_transferor_name: sellerName,
    f_transferor_parent: sellerParent,
    f_transferor_address: sellerAddress,
    f_sale_day: day || '',
    f_sale_year: year || '',
    f_reg_mark: a.regNo,
    f_transferee_name: buyerName,
    f_transferee_parent: buyerParent,
    f_transferee_address: buyerAddress,
    f_date_transferor: a.applicationDate,
    f_sig_transferor: '',
    f_tee_name: buyerName,
    f_tee_parent: buyerParent,
    f_tee_age: buyerAge,
    f_tee_mobile: buyerMobile,
    f_tee_address: buyerAddress,
    f_nominee_declare: '',
    f_nominee_relation: '',
    f_purch_day: day || '',
    f_purch_year: year || '',
    f_purch_reg_no: a.regNo,
    f_purch_from: sellerName,
    f_date_transferee: a.applicationDate,
    f_sig_transferee: '',
    f_financier_name_addr: a.hasLoan ? nameAddress(a.bankName, a.bankAddress) : 'NA',
    f_to_owner: nameAddress(buyerName, buyerAddress),
    f_to_financier: a.hasLoan ? nameAddress(a.bankName, a.bankAddress) : '',
    f_vehicle_reg: a.regNo,
  };
}

export function mapToForm32(a: WizardAnswers): Record<string, string> {
  return {
    f_reg_authority: a.buyerRTO,
    f_applicant_name: a.ownerName,
    f_parent_name: a.ownerParent,
    f_vehicle_no: a.regNo,
    f_chassis_no: a.chassisNo,
    f_engine_no: a.engineNo,
    f_make: a.make,
    f_model: a.model,
    f_type: a.vehicleClass,
    f_nominee_name: '',
    f_nominee_relation: '',
    f_mobile: a.ownerMobile,
    f_date: a.applicationDate,
    f_sig_applicant: '',
  };
}

export function mapToForm35(a: WizardAnswers): Record<string, string> {
  return {
    f_reg_authority: a.ownerRTO,
    f_vehicle_no: a.regNo,
    f_mobile: a.ownerMobile,
    f_date_owner: a.applicationDate,
    f_sig_owner: '',
    f_date_financier: a.applicationDate,
    f_sig_financier: '',
    f_to_financier: nameAddress(a.bankName, a.bankAddress),
    f_to_ra: a.ownerRTO,
    f_spec_fin_1: a.bankName,
    f_spec_fin_2: a.bankAddress,
  };
}

export function mapToForm36(a: WizardAnswers): Record<string, string> {
  return {
    f_financier_name_title: a.ownerName,
    f_reg_authority: a.ownerRTO,
    f_financier_name: nameAddress(a.ownerName, a.ownerAddress),
    f_vehicle_no: a.regNo,
    f_make: a.make,
    f_model: a.model,
    f_owner_name_addr: nameAddress(a.otherPartyName, a.otherPartyAddress),
    f_fee: '',
    f_date: a.applicationDate,
    f_sig_financier: '',
    f_spec_fin_1: a.ownerName,
    f_spec_fin_2: a.ownerAddress,
    f_mobile: a.ownerMobile,
  };
}

export function mapForForm(formId: FormId, a: WizardAnswers): Record<string, string> {
  switch (formId) {
    case 'form28': return mapToForm28(a);
    case 'form29': return mapToForm29(a);
    case 'form30': return mapToForm30(a);
    case 'form32': return mapToForm32(a);
    case 'form35': return mapToForm35(a);
    case 'form36': return mapToForm36(a);
  }
}

/** Strip empty / unused keys before sending to the form template. */
function cleanData(data: Record<string, string>): Record<string, string> {
  const clean: Record<string, string> = {};
  Object.entries(data).forEach(([k, v]) => {
    if (v != null && String(v).trim() !== '' && !k.startsWith('_unused_')) clean[k] = String(v);
  });
  return clean;
}

/** Build a URL that opens the form template pre-filled with the user's answers. */
export function buildFormUrl(formId: FormId, a: WizardAnswers): string {
  const data = cleanData(mapForForm(formId, a));
  const json = JSON.stringify(data);
  return `${FORM_META[formId].filePath}#data=${encodeURIComponent(json)}`;
}

