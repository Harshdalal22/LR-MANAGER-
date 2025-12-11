
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
    balance: number;
    otherExpenses: number;
    totalBalance: number;
    podStatus: 'Pending' | 'Completed';
    paymentStatus: 'Pending' | 'Completed';
    user_id?: string;
}

export interface PaymentRecord {
    amount: number;
    date: string;
    notes?: string;
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

export type View = 'dashboard' | 'list' | 'form' | 'vehicle-hiring' | 'booking-register' | 'data-management' | 'parties' | 'trucks';
