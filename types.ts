
export interface PartyDetails {
    name: string;
    address: string;
    city: string;
    contact: string;
    pan: string;
    gst: string;
}

export interface Item {
    description: string;
    pcs: number;
    weight: number;
}

export interface BankDetails {
    name: string;
    branch: string;
    accountNo: string;
    ifscCode: string;
}

export interface DetailedCharges {
    hamail: number;
    surCharge: number;
    stCharge: number;
    collectionCharge: number;
    ddCharge: number;
    otherCharge: number;
    riskCharge: number;
}

export type LRStatus = 'Booked' | 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
export type UserRole = 'Admin' | 'Manager';


export interface LorryReceipt {
    lrType: 'Original' | 'Dummy';
    truckNo: string;
    lrNo: string;
    date: string;
    fromPlace: string;
    toPlace: string;

    invoiceNo: string;
    invoiceAmount: number;
    invoiceDate: string | null;
    poNo: string;
    poDate: string | null;

    ewayBillNo: string;
    ewayBillDate: string | null;
    ewayExDate: string | null;

    addressOfDelivery: string;
    chargedWeight: number;

    billingTo: PartyDetails;
    gstPaidBy: string;

    consignor: PartyDetails;
    consignee: PartyDetails;

    items: Item[];

    weight: number;
    actualWeightMT: number;

    freight: number;
    charges: DetailedCharges;
    rate: number;
    rateOn: string;

    remark: string;

    status: LRStatus;
    status_updated_at?: string;
    pod_path?: string;

    // Added for list view consistency
    createdBy?: string;
    user_id?: string;
    // Fix: Added missing property to satisfy TypeScript in service functions
    isInvoiceGenerated?: boolean;
}

export interface CompanyDetails {
    name: string;
    logoUrl: string;
    signatureImageUrl: string;
    tagline: string;
    address: string;

    email: string;
    web: string;
    contact: string[];
    pan: string;
    gstn: string;
    sacCode?: string; // Added SAC/HSN Code
    bankDetails: BankDetails;
    user_id?: string;
    jurisdictionCity: string;
    branchLocations: string[];
    rbacEnabled?: boolean;
    adminPasskey?: string;
    managerPasskey?: string;
}

export interface SavedParty extends PartyDetails {
    id?: string;
    type: 'Consignor' | 'Consignee' | 'Both';
    user_id?: string;
}

export interface SavedTruck {
    id?: string;
    truckNo: string;
    ownerName?: string;
    contactNumber?: string;
    user_id?: string;
}

export interface PaymentRecord {
    amount: number;
    date: string;
    notes?: string;
}

export interface VehicleHiring {
    id?: string;
    bookingId?: string;
    date: string;
    grNo: string;
    billNo: string;
    lorryNo: string;
    driverNo: string;
    ownerName: 'Self' | 'Third Party';
    fromPlace: string;
    toPlace: string;
    freight: number;
    advance: number;
    advances?: PaymentRecord[];
    balance: number;
    otherExpenses: number;
    totalBalance: number;
    podStatus: 'Pending' | 'Completed';
    paymentStatus: 'Pending' | 'Completed';
    user_id?: string;
}

export interface BookingRecord {
    id?: string;
    bookingId?: string;
    partyName: string;
    date: string;
    grNo: string;
    billNo: string;
    lorryNo: string;
    lorryType: 'Open' | 'Closed';
    weight: number;
    fromPlace: string;
    toPlace: string;
    freight: number;
    advance: number;
    advances?: PaymentRecord[];
    balance: number;
    otherExpenses: number;
    totalBalance: number;
    paymentStatus: 'Pending' | 'Completed';
    user_id?: string;
}

export interface LedgerEntry {
    id?: string;
    date: string;
    description: string;
    invoice_no?: string;
    voucher_no?: string;
    credit: number;
    debit: number;
    payment_mode?: string;
    user_id?: string;
    created_at?: string;
}

export interface Voucher {
    id?: string;
    date: string;
    description: string;
    voucher_no: string;
    amount: number;
    payment_mode: string;
    party_name?: string;
    user_id?: string;
    created_at?: string;
}

export interface GPSInvoice {
    id?: string;
    invoiceNo: string;
    date: string;
    customerName: string;
    customerAddress?: string;
    customerGst?: string;
    vehicleNo: string;
    gpsImei: string;
    hsnCode?: string;
    quantity?: number;
    rate?: number;
    amount: number;
    taxRate?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    status: 'Paid' | 'Unpaid';
    user_id?: string;
    created_at?: string;
}

export interface RegisterEntry {
    id?: string;
    admin_id?: string;
    month: string;
    gr_no: string;
    lrc_no: string;
    bill_no: string;
    date: string;
    vehicle_no: string;
    contact_no: string;
    owner_name: string;
    ref_tpt: string;
    from_loc: string;
    to_loc: string;
    driver_fare: number;
    driver_advance: number;
    pod_status: string;
    driver_payment_status: string;
    note: string;
    driver_balance: number;
    actual_balance: number;
    party_tpt: string;
    party_fare: number;
    party_advance: number;
    party_balance: number;
    other_exp: number;
    party_total_balance: number;
    party_payment_status: string;
    commission: number;
    difference: number;
    total: number;
    status: string;
    created_at?: string;
}

export interface LedgerStatement {
    id: string;
    admin_id: string;
    party_name: string;
    from_date: string;
    to_date: string;
    file_path: string;
    file_url?: string;
    created_at: string;
}

export type View = 'dashboard' | 'list' | 'form' | 'vehicle-hiring' | 'booking-register' | 'data-management' | 'parties' | 'trucks' | 'invoices' | 'vouchers' | 'gps-panel' | 'register-manager';
