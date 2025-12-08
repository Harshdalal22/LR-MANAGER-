
import { createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { LorryReceipt, CompanyDetails, LRStatus, SavedParty, SavedTruck } from '../types';

const supabaseUrl = 'https://avqevimedgoogcupnojo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2cWV2aW1lZGdvb2djdXBub2pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjU0MzksImV4cCI6MjA3OTUwMTQzOX0.SWBCoebfu_yHUk6fGFpiy5ZMzbkZeot5jYjaAjF0esM';

let supabase: SupabaseClient | null = null;

// Lazy initializes and returns the Supabase client, preventing startup crashes.
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

// --- Core Data Helpers ---

// A robust helper to get the current authenticated user or throw an error.
const getCurrentUser = async (): Promise<User> => {
    const session = await getSession();
    if (!session?.user) throw new Error('User not authenticated. Please sign in again.');
    return session.user;
};

// --- Lorry Receipt Functions ---

export const getLorryReceipts = async (): Promise<LorryReceipt[]> => {
    const user = await getCurrentUser();
    const { data, error } = await getSupabase()
        .from('lorry_receipts')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const saveLorryReceipt = async (lr: LorryReceipt): Promise<LorryReceipt> => {
    const user = await getCurrentUser();
    
    const { user_id, createdBy, ...restOfLr } = lr; 

    const dataToSave = {
      ...restOfLr,
      user_id: user.id, // Authoritatively set the user_id for upserts.
      updated_at: new Date().toISOString(), // Explicitly set updated_at
    };

    const { data, error } = await getSupabase()
        .from('lorry_receipts')
        .upsert(dataToSave, { onConflict: 'lrNo' })
        .select()
        .single();
    if (error) {
        console.error("Supabase save error details:", JSON.stringify(error, null, 2));
        throw new Error(`Database Error: ${error.message}`);
    }
    return data;
};


export const deleteLorryReceipt = async (lrNo: string): Promise<void> => {
    const user = await getCurrentUser();
    // Note: Deleting the associated POD file is handled in App.tsx before calling this.
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
    return data;
};

export const updateLorryReceiptInvoiceDetails = async (lrNos: string[], invoiceNo: string, invoiceDate: string | null): Promise<void> => {
    const user = await getCurrentUser();
    const { error } = await getSupabase()
        .from('lorry_receipts')
        .update({ invoiceNo, invoiceDate, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('lrNo', lrNos);
    
    if (error) throw error;
};

// --- Company Details Functions ---

export const getCompanyDetails = async (defaultDetails: CompanyDetails): Promise<CompanyDetails> => {
    const user = await getCurrentUser();
    const { data, error } = await getSupabase().from('company_details').select('*').eq('user_id', user.id).single();
    if (error && error.code !== 'PGRST116') throw error; // Ignore "0 rows" error
    
    // If no details found, return default details associated with the current user.
    if (!data) {
        const newUserDetails = { ...defaultDetails, user_id: user.id };
        // We can optionally save these default details for the new user right away.
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
        updated_at: new Date().toISOString(), // Explicitly set updated_at
    };
    
    const { data, error } = await getSupabase().from('company_details').upsert(dataToSave).select().single();
    if (error) {
        console.error("Supabase save company details error:", JSON.stringify(error, null, 2));
        throw new Error(`Database Error: ${error.message}`);
    }
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
    const dataToSave = { ...rest, user_id: user.id };
    
    // If id exists, include it for upsert to work as update. If not, it's a new insert.
    const payload = id ? { ...dataToSave, id } : dataToSave;

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
    const dataToSave = { ...rest, user_id: user.id };
    
     const payload = id ? { ...dataToSave, id } : dataToSave;

    const { data, error } = await getSupabase().from('saved_trucks').upsert(payload).select().single();
    if (error) throw error;
    return data;
};

export const deleteSavedTruck = async (id: string): Promise<void> => {
    const user = await getCurrentUser();
    const { error } = await getSupabase().from('saved_trucks').delete().eq('user_id', user.id).eq('id', id);
    if (error) throw error;
};


// --- Storage Functions (PODs & Company Assets) ---

const POD_BUCKET = 'pods';
const ASSET_BUCKET = 'company-assets';

export const uploadPOD = async (file: File, lrNo: string): Promise<LorryReceipt> => {
    const user = await getCurrentUser();
    const filePath = `${user.id}/${lrNo}-${Date.now()}.${file.name.split('.').pop()}`;

    const { error: uploadError } = await getSupabase().storage.from(POD_BUCKET).upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;

    // Save the file path to the database, not a public URL.
    const { data, error: dbError } = await getSupabase()
        .from('lorry_receipts')
        .update({ pod_path: filePath })
        .eq('user_id', user.id)
        .eq('lrNo', lrNo)
        .select()
        .single();
    if (dbError) throw dbError;
    return data;
};

export const getPodSignedUrl = async (podPath: string): Promise<string> => {
    const { data, error } = await getSupabase()
        .storage
        .from(POD_BUCKET)
        .createSignedUrl(podPath, 3600); // URL is valid for 1 hour
    if (error) throw error;
    return data.signedUrl;
};

export const deletePOD = async (podPath: string): Promise<void> => {
    if (!podPath) return;
    const { error } = await getSupabase().storage.from(POD_BUCKET).remove([podPath]);
    if (error) {
        // Log the error but don't throw, so the LR can still be deleted if the file is already gone.
        console.error("Failed to delete POD file from storage:", error.message);
    }
};

export const uploadCompanyAsset = async (file: File, assetType: 'logo' | 'signature'): Promise<string> => {
    const user = await getCurrentUser();
    const filePath = `${user.id}/${assetType}.${file.name.split('.').pop()}`;

    const { error } = await getSupabase().storage.from(ASSET_BUCKET).upload(filePath, file, { upsert: true });
    if (error) throw error;

    const { data } = getSupabase().storage.from(ASSET_BUCKET).getPublicUrl(`${filePath}?t=${new Date().getTime()}`);
    if (!data.publicUrl) throw new Error(`Could not get public URL for ${assetType}.`);
    return data.publicUrl;
};

// --- AI Service Helper ---

export const getRecentLorryReceiptsForAI = async (limit: number = 10): Promise<Partial<LorryReceipt>[]> => {
    const user = await getCurrentUser();
    const { data, error } = await getSupabase()
        .from('lorry_receipts')
        .select('lrNo, truckNo, fromPlace, toPlace, consignor, consignee, invoiceNo, remark')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return (data || []).map(lr => ({ ...lr })); // Return a simplified version for context
};
