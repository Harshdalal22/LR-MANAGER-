
/* 
  ### DATABASE FIX REQUIRED ###
  If you encounter the error: "Could not find column isInvoiceGenerated in the schema cache"
  
  Run this SQL query in your Supabase SQL Editor:
  -----------------------------------------------------------------------------------------
  ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS is_invoice_generated BOOLEAN DEFAULT FALSE;
  ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE;
  ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS pod_path TEXT;
  
  -- CRITICAL: This reloads the API cache so it sees the new columns
  NOTIFY pgrst, 'reload config';
  -----------------------------------------------------------------------------------------
*/

import { createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { LorryReceipt, CompanyDetails, LRStatus, SavedParty, SavedTruck, VehicleHiring, BookingRecord } from '../types';

const supabaseUrl = 'https://avqevimedgoogcupnojo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2cWV2aW1lZGdvb2djdXBub2pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjU0MzksImV4cCI6MjA3OTUwMTQzOX0.SWBCoebfu_yHUk6fGFpiy5ZMzbkZeot5jYjaAjF0esM';

let supabase: SupabaseClient | null = null;

const getSupabase = (): SupabaseClient => {
    if (!supabase) {
        try {
            supabase = createClient(supabaseUrl, supabaseAnonKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            });
        } catch (error) {
            console.error("Error creating Supabase client:", error);
            throw new Error("Invalid Supabase credentials provided.");
        }
    }
    return supabase;
};

// --- Authentication ---
export const signUp = (email: string, password: string) => getSupabase().auth.signUp({ email, password }).then(({ error }) => { if (error) throw error; });
export const signIn = (email: string, password: string) => getSupabase().auth.signInWithPassword({ email, password }).then(({ error }) => { if (error) throw error; });
export const signOut = () => getSupabase().auth.signOut().then(({ error }) => { if (error) throw error; });
export const getSession = async (): Promise<Session | null> => (await getSupabase().auth.getSession()).data.session;
export const subscribeToAuthState = (callback: (event: string, session: Session | null) => void) => getSupabase().auth.onAuthStateChange(callback);
export const sendPasswordReset = (email: string) => getSupabase().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }).then(({ error }) => { if (error) throw error; });

const getCurrentUser = async (): Promise<User> => {
    const session = await getSession();
    if (!session?.user) throw new Error('User not authenticated. Please sign in again.');
    return session.user;
};

// Helper to map DB record to LorryReceipt type
const mapLR = (item: any): LorryReceipt => ({
    ...item,
    // Safely handle the snake_case to camelCase conversion
    isInvoiceGenerated: item.is_invoice_generated || false
});

// --- Lorry Receipt Functions ---

export const getLorryReceipts = async (): Promise<LorryReceipt[]> => {
    const user = await getCurrentUser();
    const { data, error } = await getSupabase()
        .from('lorry_receipts')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapLR);
};

export const saveLorryReceipt = async (lr: LorryReceipt): Promise<LorryReceipt> => {
    const user = await getCurrentUser();
    
    // Explicitly separate the camelCase field
    const { 
        user_id, 
        createdBy, 
        isInvoiceGenerated, 
        ...restOfLr 
    } = lr; 

    // Construct the payload with the correct snake_case column name
    const dataToSave: any = {
      ...restOfLr,
      is_invoice_generated: isInvoiceGenerated || false, // Map to DB column
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    // Ensure strictly no camelCase keys are sent to Supabase to prevent "Column not found" errors
    delete dataToSave.isInvoiceGenerated;
    delete dataToSave.createdBy;

    const { data, error } = await getSupabase()
        .from('lorry_receipts')
        .upsert(dataToSave, { onConflict: 'lrNo, user_id' })
        .select()
        .single();
        
    if (error) {
        console.error("Supabase Save Error:", error.message);
        throw new Error(`Database Error: ${error.message}`);
    }
    return mapLR(data);
};

export const deleteLorryReceipt = async (lrNo: string): Promise<void> => {
    const user = await getCurrentUser();
    const { error } = await getSupabase().from('lorry_receipts').delete().eq('user_id', user.id).eq('lrNo', lrNo);
    if (error) throw error;
};

export const updateLorryReceiptStatus = async (lrNo: string, status: LRStatus): Promise<LorryReceipt> => {
    const user = await getCurrentUser();
    const { data, error } = await getSupabase()
        .from('lorry_receipts')
        .update({ status: status, status_updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('lrNo', lrNo)
        .select()
        .single();
    if (error) throw error;
    return mapLR(data);
};

export const updateLorryReceiptInvoiceDetails = async (lrNos: string[], invoiceNo: string, invoiceDate: string | null): Promise<void> => {
    const user = await getCurrentUser();
    const { error } = await getSupabase()
        .from('lorry_receipts')
        .update({ 
            invoiceNo, 
            invoiceDate, 
            is_invoice_generated: true, 
            updated_at: new Date().toISOString() 
        })
        .eq('user_id', user.id)
        .in('lrNo', lrNos);
    
    if (error) throw error;
};

export const deleteInvoice = async (invoiceNo: string): Promise<void> => {
    const user = await getCurrentUser();
    const { error } = await getSupabase()
        .from('lorry_receipts')
        .update({ 
            invoiceNo: null, 
            invoiceDate: null, 
            is_invoice_generated: false, 
            updated_at: new Date().toISOString() 
        })
        .eq('user_id', user.id)
        .eq('invoiceNo', invoiceNo);
    
    if (error) throw error;
};

// --- Company Details Functions ---
export const getCompanyDetails = async (defaultDetails: CompanyDetails): Promise<CompanyDetails> => {
    const user = await getCurrentUser();
    const { data, error } = await getSupabase().from('company_details').select('*').eq('user_id', user.id).single();
    if (error && error.code !== 'PGRST116') throw error; 
    if (!data) {
        const newUserDetails = { ...defaultDetails, user_id: user.id };
        return saveCompanyDetails(newUserDetails);
    }
    return data as CompanyDetails;
};

export const saveCompanyDetails = async (details: CompanyDetails): Promise<CompanyDetails> => {
    const user = await getCurrentUser();
    const { user_id, ...restOfDetails } = details;
    const dataToSave = { 
        ...restOfDetails, 
        user_id: user.id,
        updated_at: new Date().toISOString(),
    };
    const { data, error } = await getSupabase().from('company_details').upsert(dataToSave).select().single();
    if (error) throw new Error(`Database Error: ${error.message}`);
    return data as CompanyDetails;
};

// --- Saved Parties Functions ---
export const getSavedParties = async (): Promise<SavedParty[]> => {
    const user = await getCurrentUser();
    const { data, error } = await getSupabase().from('saved_parties').select('*').eq('user_id', user.id).order('name', { ascending: true });
    if (error) throw error;
    return data || [];
};

export const saveSavedParty = async (party: SavedParty): Promise<SavedParty> => {
    const user = await getCurrentUser();
    const { id, user_id, ...rest } = party;
    
    // LOGIC TO PREVENT DUPLICATES: Check if name exists
    // If we don't have an ID (it's a new entry), check if the name already exists
    let targetId = id;
    if (!targetId && rest.name) {
        const { data: existing } = await getSupabase()
            .from('saved_parties')
            .select('id')
            .eq('user_id', user.id)
            .ilike('name', rest.name.trim()) // Case-insensitive matching
            .maybeSingle();
        
        if (existing) {
            targetId = existing.id;
        }
    }

    const dataToSave = { ...rest, user_id: user.id };
    // If targetId exists (either passed in or found by name), use it to update
    const payload = targetId ? { ...dataToSave, id: targetId } : dataToSave;

    const { data, error } = await getSupabase().from('saved_parties').upsert(payload).select().single();
    if (error) throw error;
    return data;
};

export const deleteSavedParty = async (id: string): Promise<void> => {
    const user = await getCurrentUser();
    const { error } = await getSupabase().from('saved_parties').delete().eq('user_id', user.id).eq('id', id);
    if (error) throw error;
};

// --- Saved Trucks Functions ---
export const getSavedTrucks = async (): Promise<SavedTruck[]> => {
    const user = await getCurrentUser();
    const { data, error } = await getSupabase().from('saved_trucks').select('*').eq('user_id', user.id).order('truckNo', { ascending: true });
    if (error) throw error;
    return data || [];
};

export const saveSavedTruck = async (truck: SavedTruck): Promise<SavedTruck> => {
    const user = await getCurrentUser();
    const { id, user_id, ...rest } = truck;

    // LOGIC TO PREVENT DUPLICATES: Check if truck number exists
    let targetId = id;
    if (!targetId && rest.truckNo) {
        const { data: existing } = await getSupabase()
            .from('saved_trucks')
            .select('id')
            .eq('user_id', user.id)
            .ilike('truckNo', rest.truckNo.trim())
            .maybeSingle();

        if (existing) {
            targetId = existing.id;
        }
    }

    const dataToSave = { ...rest, user_id: user.id };
    const payload = targetId ? { ...dataToSave, id: targetId } : dataToSave;
    
    const { data, error } = await getSupabase().from('saved_trucks').upsert(payload).select().single();
    if (error) throw error;
    return data;
};

export const deleteSavedTruck = async (id: string): Promise<void> => {
    const user = await getCurrentUser();
    const { error } = await getSupabase().from('saved_trucks').delete().eq('user_id', user.id).eq('id', id);
    if (error) throw error;
};

// --- Vehicle Hiring Functions ---
export const getVehicleHirings = async (): Promise<VehicleHiring[]> => {
    const user = await getCurrentUser();
    const { data, error } = await getSupabase().from('vehicle_hirings').select('*').eq('user_id', user.id).order('date', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const saveVehicleHiring = async (record: VehicleHiring): Promise<VehicleHiring> => {
    const user = await getCurrentUser();
    const { id, user_id, ...rest } = record;
    const dataToSave = { ...rest, user_id: user.id };
    const payload = id ? { ...dataToSave, id } : dataToSave;
    const { data, error } = await getSupabase().from('vehicle_hirings').upsert(payload).select().single();
    if (error) throw error;
    return data;
};

export const deleteVehicleHiring = async (id: string): Promise<void> => {
    const user = await getCurrentUser();
    const { error } = await getSupabase().from('vehicle_hirings').delete().eq('user_id', user.id).eq('id', id);
    if (error) throw error;
};

// --- Booking Register Functions ---
export const getBookingRecords = async (): Promise<BookingRecord[]> => {
    const user = await getCurrentUser();
    const { data, error } = await getSupabase().from('booking_registers').select('*').eq('user_id', user.id).order('date', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const saveBookingRecord = async (record: BookingRecord): Promise<BookingRecord> => {
    const user = await getCurrentUser();
    const { id, user_id, ...rest } = record;
    const dataToSave = { ...rest, user_id: user.id };
    const payload = id ? { ...dataToSave, id } : dataToSave;
    const { data, error } = await getSupabase().from('booking_registers').upsert(payload).select().single();
    if (error) throw error;
    return data;
};

export const deleteBookingRecord = async (id: string): Promise<void> => {
    const user = await getCurrentUser();
    const { error } = await getSupabase().from('booking_registers').delete().eq('user_id', user.id).eq('id', id);
    if (error) throw error;
};

// --- Storage Functions ---
export const uploadPOD = async (file: File, lrNo: string): Promise<LorryReceipt> => {
    const user = await getCurrentUser();
    const filePath = `${user.id}/${lrNo}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error: uploadError } = await getSupabase().storage.from('pods').upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data, error: dbError } = await getSupabase()
        .from('lorry_receipts')
        .update({ pod_path: filePath })
        .eq('user_id', user.id)
        .eq('lrNo', lrNo)
        .select()
        .single();
    if (dbError) throw dbError;
    return mapLR(data);
};

export const getPodSignedUrl = async (podPath: string): Promise<string> => {
    const { data, error } = await getSupabase().storage.from('pods').createSignedUrl(podPath, 3600);
    if (error) throw error;
    return data.signedUrl;
};

export const deletePOD = async (podPath: string): Promise<void> => {
    if (!podPath) return;
    await getSupabase().storage.from('pods').remove([podPath]);
};

export const uploadCompanyAsset = async (file: File, assetType: 'logo' | 'signature'): Promise<string> => {
    const user = await getCurrentUser();
    const filePath = `${user.id}/${assetType}.${file.name.split('.').pop()}`;
    const { error } = await getSupabase().storage.from('company-assets').upload(filePath, file, { upsert: true });
    if (error) throw error;
    const { data } = getSupabase().storage.from('company-assets').getPublicUrl(`${filePath}?t=${new Date().getTime()}`);
    return data.publicUrl;
};

export const getRecentLorryReceiptsForAI = async (limit: number = 10): Promise<Partial<LorryReceipt>[]> => {
    const user = await getCurrentUser();
    const { data, error } = await getSupabase()
        .from('lorry_receipts')
        .select('lrNo, truckNo, fromPlace, toPlace, consignor, consignee, invoiceNo, remark')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(limit);
    if (error) throw error;
    return (data || []).map(lr => ({ ...lr }));
};
