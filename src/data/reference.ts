import type { FormReference, FeeItem, TimelineItem, LegalReference } from '../types/checklist';

export const formsReference: FormReference[] = [
  { formNumber: 'Form 28', fullName: 'Application for NOC', whoUsesIt: 'Seller (for different RTO / interstate transfers)', copies: '1', filedAt: 'Original RTO' },
  { formNumber: 'Form 29', fullName: 'Notice of Transfer of Ownership', whoUsesIt: 'Seller (both sign)', copies: '2', filedAt: 'Original RTO (1 copy); Buyer keeps 1' },
  { formNumber: 'Form 30', fullName: 'Application for Transfer of Ownership', whoUsesIt: 'Buyer', copies: '1', filedAt: 'Buyer\'s local RTO' },
  { formNumber: 'Form 32', fullName: 'Transfer via Auction', whoUsesIt: 'Buyer (auction scenario)', copies: '1', filedAt: 'RTO' },
  { formNumber: 'Form 35', fullName: 'Termination of Hypothecation', whoUsesIt: 'Seller + Bank (both sign)', copies: '2 sets', filedAt: 'Original (Parent) RTO' },
  { formNumber: 'Form 36', fullName: 'Fresh RC for Financier', whoUsesIt: 'Financier (default scenario)', copies: '1', filedAt: 'Original RTO' },
];

export const feesReference: FeeItem[] = [
  { item: 'RC Transfer fee — two-wheeler', amount: '₹150' },
  { item: 'RC Transfer fee — four-wheeler (car)', amount: '₹300' },
  { item: 'Smart card fee (RC reissuance)', amount: '₹200 – ₹300' },
  { item: 'Total estimate — two-wheeler', amount: '₹500 – ₹900' },
  { item: 'Total estimate — four-wheeler', amount: '₹1,000 – ₹1,800' },
  { item: 'NOC application (Form 28)', amount: '₹100' },
  { item: 'Hypothecation termination', amount: '₹100 – ₹500' },
  { item: 'Duplicate RC fee', amount: '50% of original registration fee' },
  { item: 'Late filing penalty (buyer, after 30 days)', amount: '₹500' },
  { item: 'Penalty under Section 177 MV Act', amount: '₹500 – ₹1,000' },
  { item: 'Road tax — Maharashtra (interstate)', amount: '2% – 12% of depreciated/invoice value' },
  { item: 'Transfer on death of owner', amount: '₹500 – ₹1,000' },
  { item: 'Transfer via auction', amount: '₹500 – ₹2,000' },
];

export const timelinesReference: TimelineItem[] = [
  { activity: 'Seller reports to RTO (same-state vehicle)', timeline: 'Within 14 days of sale' },
  { activity: 'Seller reports to RTO (out-of-state vehicle)', timeline: 'Within 45 days of sale' },
  { activity: 'Buyer applies for RC transfer', timeline: 'Within 30 days of purchase' },
  { activity: 'Clearance Certificate (CC) issuance', timeline: 'Up to 30 days' },
  { activity: 'HP termination (RTO processing)', timeline: '7–30 working days' },
  { activity: 'RC transfer — online (same state)', timeline: '7–10 working days' },
  { activity: 'RC transfer — offline (same state)', timeline: 'Up to 30 days' },
  { activity: 'RC transfer — interstate', timeline: '30+ days' },
  { activity: 'Duplicate RC issuance', timeline: 'A few weeks' },
  { activity: 'Out-of-state re-registration (full process)', timeline: '30–60+ days' },
  { activity: 'Bank NOC validity window', timeline: '90 days from issue' },
];

export const legalReferences: LegalReference[] = [
  { section: 'Section 50, MV Act 1988', covers: 'Transfer of ownership — timelines, forms, obligations for seller and buyer' },
  { section: 'Section 51, MV Act 1988', covers: 'Vehicles under hypothecation / lease / hire-purchase — lien, repossession rights, HP termination' },
  { section: 'Section 177, MV Act 1988', covers: 'Penalty for general violations including failure to report transfer' },
  { section: 'Rule 81, Central MV Rules 1989', covers: 'Fees applicable for RC transfer and related RTO services' },
  { section: 'Maharashtra MV Rules 1989', covers: 'State-specific rules including mandatory Form 28 even for intra-state transfers' },
  { section: 'MV (Amendment) Act 2019', covers: 'Strengthened penalties for non-compliance; ₹500–₹1,000 for delayed transfers' },
];

export const topPitfalls: string[] = [
  'Buying without VAHAN check — never skip this; stolen vehicles and vehicles with heavy challans are commonly sold privately.',
  'Accepting DigiLocker RC — explicitly not valid for Maharashtra RTO transfer; original RC only.',
  'Purchasing with active hypothecation — you cannot transfer an RC that has an active bank lien; HP termination is mandatory.',
  'Skipping the notarised sale agreement — your only legal protection in a dispute.',
  'Missing the 30-day buyer deadline — ₹500 late fee + ongoing legal liability.',
  'Seller missing the 14-day RTO notification — seller remains legally liable for all post-sale incidents.',
  'Using an expired Bank NOC — NOC is valid for 90 days only; if expired, request a fresh one.',
  'Filing HP termination at the wrong RTO — must always be the parent / original RTO.',
  'Ignoring traffic challans — RTO will block transfer; buyer should verify and seller must clear.',
  'Not obtaining RTO acknowledgement — seller\'s receipt / RPAD acknowledgement is the legal indemnification.',
];
