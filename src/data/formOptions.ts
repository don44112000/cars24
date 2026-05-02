/* Dropdown option lists used by the Form Generator wizard. */

/**
 * Vehicle classes as recorded on RC books / VAHAN portal.
 * Common spoken names appear first; abbreviations in parentheses match
 * the RTO code so users can find them either way.
 */
export const VEHICLE_CLASSES = [
  // ─ Private 4-wheelers ─
  'Motor Car',
  'Light Motor Vehicle (LMV)',
  'Light Motor Vehicle - Non-Transport (LMV-NT)',
  'Light Motor Vehicle - Transport (LMV-T)',
  'Jeep',
  'Camper Van',
  'Adapted Vehicle (modified)',

  // ─ Two-wheelers ─
  'Motor Cycle - With Gear (MCWG)',
  'Motor Cycle - Without Gear / Scooter (MCWOG)',
  'Moped (≤ 50 cc)',
  'Invalid Carriage',

  // ─ Three-wheelers ─
  'Auto Rickshaw (Passenger)',
  'Three-wheeler - Goods Carrier',
  'E-Rickshaw (Passenger)',
  'E-Cart (Goods)',
  'Quadricycle',

  // ─ Commercial - Passenger ─
  'Motor Cab / Taxi',
  'Maxi Cab',
  'Light Passenger Vehicle (Mini-bus)',
  'Medium Passenger Motor Vehicle (MPMV)',
  'Heavy Passenger Motor Vehicle (Bus / HPMV)',
  'Stage Carriage',
  'Contract Carriage',

  // ─ Commercial - Goods ─
  'Light Goods Vehicle (LGV)',
  'Medium Goods Motor Vehicle (MGMV)',
  'Heavy Goods Motor Vehicle (Truck / HGMV)',
  'Articulated Vehicle / Trailer Tractor',

  // ─ Tractors / Trailers ─
  'Tractor (Agricultural)',
  'Tractor Trailer',
  'Trailer',
  'Power Tiller',

  // ─ Construction / Industrial ─
  'Construction Equipment Vehicle (CEV)',
  'Excavator',
  'Mobile Crane',
  'Forklift',
  'Road Roller',
  'Industrial Equipment',
  'Mobile Canteen / Workshop',

  // ─ Other ─
  'Animal-drawn Vehicle / Hand Cart',
] as const;

export const POPULAR_MAKES = [
  'Maruti Suzuki',
  'Hyundai',
  'Tata',
  'Mahindra',
  'Honda',
  'Toyota',
  'Kia',
  'Volkswagen',
  'Skoda',
  'MG',
  'Renault',
  'Nissan',
  'Ford',
  'Chevrolet',
  'Fiat',
  'BMW',
  'Mercedes-Benz',
  'Audi',
  'Jaguar',
  'Volvo',
  'Land Rover',
  'Porsche',
  'Mini',
  'Jeep',
  'Lexus',
  // 2-wheelers
  'Bajaj',
  'TVS',
  'Hero',
  'Yamaha',
  'Royal Enfield',
  'KTM',
  'Suzuki',
  'Vespa',
  'Ather',
  'Ola Electric',
] as const;

export const POPULAR_BANKS = [
  'HDFC Bank',
  'ICICI Bank',
  'State Bank of India',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Bank of Baroda',
  'Punjab National Bank',
  'IndusInd Bank',
  'Canara Bank',
  'Yes Bank',
  'Federal Bank',
  'IDFC First Bank',
  'IDBI Bank',
  'Union Bank of India',
  'Bank of India',
  'Central Bank of India',
  'Indian Bank',
  'Indian Overseas Bank',
  'RBL Bank',
  'AU Small Finance Bank',
  // NBFCs / OEM finance
  'Mahindra Finance',
  'Tata Capital',
  'Bajaj Finance',
  'Cholamandalam Finance',
  'Sundaram Finance',
  'Shriram Finance',
  'Toyota Financial Services',
  'Volkswagen Finance',
  'Mercedes-Benz Financial Services',
  'BMW Financial Services',
  'Hero FinCorp',
] as const;

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // UTs
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

export interface RTOOption {
  code: string;
  name: string;
  display: string; // value stored & sent to forms
}

const mhRtos: Array<[string, string]> = [
  ['MH-01', 'Mumbai Central (Tardeo)'],
  ['MH-02', 'Mumbai West (Andheri)'],
  ['MH-03', 'Mumbai East (Wadala)'],
  ['MH-04', 'Thane'],
  ['MH-05', 'Kalyan'],
  ['MH-06', 'Pen (Raigad)'],
  ['MH-07', 'Sindhudurg'],
  ['MH-08', 'Ratnagiri'],
  ['MH-09', 'Kolhapur'],
  ['MH-10', 'Sangli'],
  ['MH-11', 'Satara'],
  ['MH-12', 'Pune'],
  ['MH-13', 'Solapur'],
  ['MH-14', 'Pimpri-Chinchwad'],
  ['MH-15', 'Nashik'],
  ['MH-16', 'Ahmednagar'],
  ['MH-17', 'Shrirampur'],
  ['MH-18', 'Dhule'],
  ['MH-19', 'Jalgaon'],
  ['MH-20', 'Aurangabad (Sambhajinagar)'],
  ['MH-21', 'Jalna'],
  ['MH-22', 'Parbhani'],
  ['MH-23', 'Beed'],
  ['MH-24', 'Latur'],
  ['MH-25', 'Osmanabad (Dharashiv)'],
  ['MH-26', 'Nanded'],
  ['MH-27', 'Amravati'],
  ['MH-28', 'Buldhana'],
  ['MH-29', 'Yavatmal'],
  ['MH-30', 'Akola'],
  ['MH-31', 'Nagpur'],
  ['MH-32', 'Wardha'],
  ['MH-33', 'Gadchiroli'],
  ['MH-34', 'Chandrapur'],
  ['MH-35', 'Gondia'],
  ['MH-36', 'Bhandara'],
  ['MH-37', 'Washim'],
  ['MH-38', 'Hingoli'],
  ['MH-39', 'Nandurbar'],
  ['MH-40', 'Nagpur (East)'],
  ['MH-41', 'Malegaon'],
  ['MH-42', 'Baramati'],
  ['MH-43', 'Vashi (Navi Mumbai)'],
  ['MH-44', 'Ambejogai'],
  ['MH-45', 'Akluj'],
  ['MH-46', 'Panvel'],
  ['MH-47', 'Borivali'],
  ['MH-48', 'Vasai'],
  ['MH-49', 'Nagpur (Rural)'],
  ['MH-50', 'Karad'],
];

export const MAHARASHTRA_RTOS: RTOOption[] = mhRtos.map(([code, name]) => ({
  code,
  name,
  display: `Registering Authority, ${name} (${code})`,
}));
