
import { createClient, Session, Subscription } from '@supabase/supabase-js';
import { LorryReceipt, CompanyDetails, SavedParty, SavedTruck, VehicleHiring, BookingRecord, LRStatus } from '../types';

// ⚠️ IMPORTANT: Replace these with YOUR Supabase project details!
// You can find these in your Supabase Dashboard -> Settings -> API
const supabaseUrl = 'https://avqevimedgoogcupnojo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2cWV2aW1lZGdvb2djdXBub2pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjU0MzksImV4cCI6MjA3OTUwMTQzOX0.SWBCoebfu_yHUk6fGFpiy5ZMzbkZeot5jYjaAjF0esM';

export const supabase = createClient(supabaseUrl, supabaseKey);

const getSupabase = () => supabase;

// --- Auth ---

export const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
};

export const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
};

export const signInWithGoogle = async () => {
    // We removed the explicit 'redirectTo' option here.
    // Ensure you have added your Site URL (e.g., https://bolt.new or localhost:5173) 
    // to Supabase Dashboard -> Authentication -> URL Configuration -> Redirect URLs
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        }
    });
    if (error) throw error;
    return data;
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const getSession = async (): Promise<Session | null> => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
};

export const subscribeToAuthState = (callback: (event: string, session: Session | null) => void) => {
    return supabase.auth.onAuthStateChange(callback);
};

export const sendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) throw error;
};

export const updateUserPassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
};

// --- Lorry Receipts ---

export const getLorryReceipts = async (): Promise<LorryReceipt[]> => {
    const { data, error } = await supabase
        .from('lorry_receipts')
        .select('*')
        .order('date', { ascending: false });
    if (error) throw error;
    
    // Map snake_case is_invoice_generated to camelCase isInvoiceGenerated for frontend
    return (data || []).map((item: any) => ({
        ...item,
        isInvoiceGenerated: item.isInvoiceGenerated ?? item.is_invoice_generated ?? false
    }));
};

export const getRecentLorryReceiptsForAI = async (limit: number): Promise<LorryReceipt[]> => {
    const { data, error } = await supabase
        .from('lorry_receipts')
        .select('*')
        .order('created_at', { ascending: false }) // Assuming created_at exists, or use date
        .limit(limit);
    if (error) throw error;
    return data || [];
}

export const saveLorryReceipt = async (lr: LorryReceipt): Promise<LorryReceipt> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Handle payload key mapping: remove frontend-only camelCase keys
    const { isInvoiceGenerated, ...rest } = lr;

    const payload = { 
        ...rest, 
        user_id: user.id,
        is_invoice_generated: isInvoiceGenerated
    };
    
    const { data, error } = await supabase
        .from('lorry_receipts')
        .upsert(payload, { onConflict: 'lrNo' })
        .select()
        .single();
    
    if (error) throw error;
    
    return {
        ...data,
        isInvoiceGenerated: data.isInvoiceGenerated ?? data.is_invoice_generated ?? false
    };
};

export const deleteLorryReceipt = async (lrNo: string) => {
    const { error } = await supabase.from('lorry_receipts').delete().eq('lrNo', lrNo);
    if (error) throw error;
};

export const updateLorryReceiptStatus = async (lrNo: string, status: LRStatus) => {
    const { error } = await supabase
        .from('lorry_receipts')
        .update({ status, status_updated_at: new Date().toISOString() })
        .eq('lrNo', lrNo);
    if (error) throw error;
};

export const updateLorryReceiptInvoiceDetails = async (lrNos: string[], invoiceNo: string, invoiceDate: string) => {
    const { error } = await supabase
        .from('lorry_receipts')
        .update({ 
            invoiceNo, 
            invoiceDate, 
            is_invoice_generated: true // Must be snake_case based on DB fix script
        })
        .in('lrNo', lrNos);
    if (error) throw error;
}

// --- PODs ---

export const uploadPOD = async (file: File, lrNo: string): Promise<LorryReceipt> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${lrNo}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('pods')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Update LR record
    const { data, error: updateError } = await supabase
        .from('lorry_receipts')
        .update({ pod_path: filePath })
        .eq('lrNo', lrNo)
        .select()
        .single();

    if (updateError) throw updateError;
    
    return {
        ...data,
        isInvoiceGenerated: data.isInvoiceGenerated ?? data.is_invoice_generated ?? false
    };
};

export const getPodSignedUrl = async (path: string): Promise<string> => {
    const { data, error } = await supabase.storage
        .from('pods')
        .createSignedUrl(path, 3600); // 1 hour
    if (error) throw error;
    return data.signedUrl;
};

export const deletePOD = async (path: string) => {
    const { error } = await supabase.storage.from('pods').remove([path]);
    if (error) throw error;
};

// --- Company Details ---

export const getCompanyDetails = async (): Promise<CompanyDetails | null> => {
    const { data, error } = await supabase.from('company_details').select('*').single();
    // It's possible no details exist yet for new user
    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

export const saveCompanyDetails = async (details: CompanyDetails): Promise<CompanyDetails> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const payload = { ...details, user_id: user.id };
    
    // We assume one company detail per user, so maybe we use upsert on user_id if table PK allows.
    // Or we fetch id first. Let's assume the table has a unique constraint on user_id or similar logic.
    // If details has an ID, use it. If not, insert.
    // Actually `CompanyDetails` type doesn't have an ID in `types.ts`. 
    // We should rely on `user_id` being unique or just upsert.
    
    // We will check if record exists for user
    const { data: existing } = await supabase.from('company_details').select('id').eq('user_id', user.id).single();

    let query = supabase.from('company_details');
    let result;
    
    if (existing) {
        result = await query.update(payload).eq('id', existing.id).select().single();
    } else {
        result = await query.insert(payload).select().single();
    }

    if (result.error) throw result.error;
    return result.data;
};

export const uploadCompanyAsset = async (file: File, assetType: 'logo' | 'signature'): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${assetType}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('company_assets')
        .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('company_assets').getPublicUrl(filePath);
    return publicUrl;
};


// --- Saved Parties & Trucks ---

export const getSavedParties = async (): Promise<SavedParty[]> => {
    const { data, error } = await supabase.from('saved_parties').select('*');
    if (error) throw error;
    return data || [];
};

export const saveSavedParty = async (party: SavedParty): Promise<SavedParty> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    const payload = { ...party, user_id: user.id };
    const { data, error } = await supabase.from('saved_parties').upsert(payload).select().single();
    if (error) throw error;
    return data;
};

export const deleteSavedParty = async (id: string) => {
    const { error } = await supabase.from('saved_parties').delete().eq('id', id);
    if (error) throw error;
};

export const getSavedTrucks = async (): Promise<SavedTruck[]> => {
    const { data, error } = await supabase.from('saved_trucks').select('*');
    if (error) throw error;
    return data || [];
};

export const saveSavedTruck = async (truck: SavedTruck): Promise<SavedTruck> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    const payload = { ...truck, user_id: user.id };
    const { data, error } = await supabase.from('saved_trucks').upsert(payload).select().single();
    if (error) throw error;
    return data;
};

export const deleteSavedTruck = async (id: string) => {
    const { error } = await supabase.from('saved_trucks').delete().eq('id', id);
    if (error) throw error;
};

// --- Vehicle Hiring ---

export const getVehicleHirings = async (): Promise<VehicleHiring[]> => {
    const { data, error } = await supabase.from('vehicle_hirings').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const saveVehicleHiring = async (record: VehicleHiring): Promise<VehicleHiring> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    const payload = { ...record, user_id: user.id };
    const { data, error } = await supabase.from('vehicle_hirings').upsert(payload).select().single();
    if (error) throw error;
    return data;
};

export const deleteVehicleHiring = async (id: string) => {
    const { error } = await supabase.from('vehicle_hirings').delete().eq('id', id);
    if (error) throw error;
};

// --- Booking Register ---

export const getBookingRecords = async (): Promise<BookingRecord[]> => {
    const { data, error } = await supabase.from('booking_registers').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const saveBookingRecord = async (record: BookingRecord): Promise<BookingRecord> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    const payload = { ...record, user_id: user.id };
    const { data, error } = await supabase.from('booking_registers').upsert(payload).select().single();
    if (error) throw error;
    return data;
};

export const deleteBookingRecord = async (id: string) => {
    const { error } = await supabase.from('booking_registers').delete().eq('id', id);
    if (error) throw error;
};
