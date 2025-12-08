
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

export type View = 'dashboard' | 'list' | 'form' | 'vehicle-hiring' | 'booking-register' | 'data-management' | 'parties' | 'trucks';
