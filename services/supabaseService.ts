

import { createClient, Session, Subscription } from '@supabase/supabase-js';
import { LorryReceipt, CompanyDetails, SavedParty, SavedTruck, VehicleHiring, BookingRecord, LRStatus } from '../types';

/* 
================================================================================
 🛠️ COMPLETE DATABASE FIX SCRIPT (FIXES SCHEMA & 403 PERMISSION ERRORS)
================================================================================
 Copy and run this ENTIRE script in your Supabase SQL Editor.
================================================================================

-- === STEP 1: ADD/FIX COLUMNS & CONSTRAINTS ===

ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS "invoiceNo" TEXT;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS "invoiceAmount" NUMERIC;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS "invoiceDate" DATE;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS "poDate" DATE;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS "ewayBillDate" DATE;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS "ewayExDate" DATE;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS is_invoice_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS pod_path TEXT;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS consignor JSONB;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS consignee JSONB;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS "billingTo" JSONB;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS items JSONB;
ALTER TABLE public.lorry_receipts ADD COLUMN IF NOT EXISTS charges JSONB;

-- This might fail if the constraint already exists, which is safe to ignore.
-- ALTER TABLE public.lorry_receipts ADD CONSTRAINT "lorry_receipts_lrNo_key" UNIQUE ("lrNo");

ALTER TABLE public.lorry_receipts ALTER COLUMN "invoiceDate" DROP NOT NULL;
ALTER TABLE public.lorry_receipts ALTER COLUMN "poDate" DROP NOT NULL;
ALTER TABLE public.lorry_receipts ALTER COLUMN "ewayBillDate" DROP NOT NULL;
ALTER TABLE public.lorry_receipts ALTER COLUMN "ewayExDate" DROP NOT NULL;

-- === STEP 2: APPLY ROW LEVEL SECURITY (RLS) POLICIES TO FIX 403 ERRORS ===

-- This ensures you can only access your own data.
-- Apply to ALL tables that store user-specific information.

-- Table: lorry_receipts
ALTER TABLE public.lorry_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own LRs" ON public.lorry_receipts;
CREATE POLICY "Users can manage their own LRs" ON public.lorry_receipts FOR ALL
USING (auth.uid() = user_id);

-- Table: company_details
ALTER TABLE public.company_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own company details" ON public.company_details;
CREATE POLICY "Users can manage their own company details" ON public.company_details FOR ALL
USING (auth.uid() = user_id);

-- Table: saved_parties
ALTER TABLE public.saved_parties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own saved parties" ON public.saved_parties;
CREATE POLICY "Users can manage their own saved parties" ON public.saved_parties FOR ALL
USING (auth.uid() = user_id);

-- Table: saved_trucks
ALTER TABLE public.saved_trucks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own saved trucks" ON public.saved_trucks;
CREATE POLICY "Users can manage their own saved trucks" ON public.saved_trucks FOR ALL
USING (auth.uid() = user_id);

-- Table: vehicle_hirings
ALTER TABLE public.vehicle_hirings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own vehicle hirings" ON public.vehicle_hirings;
CREATE POLICY "Users can manage their own vehicle hirings" ON public.vehicle_hirings FOR ALL
USING (auth.uid() = user_id);

-- Table: booking_registers
ALTER TABLE public.booking_registers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own booking records" ON public.booking_registers;
CREATE POLICY "Users can manage their own booking records" ON public.booking_registers FOR ALL
USING (auth.uid() = user_id);


-- === STEP 3: REFRESH SCHEMA CACHE ===
NOTIFY pgrst, 'reload config';

================================================================================
*/

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
    // Explicitly set redirectTo to ensure correct callback after Google sign-in.
    // You should also add your Site URL (e.g., your Vercel URL, http://localhost:5173) 
    // to Supabase Dashboard -> Authentication -> URL Configuration -> Redirect URLs
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin,
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

    // Destructure to separate frontend-only fields and 'id' if present
    const {
        isInvoiceGenerated,
        createdBy, // Exclude frontend-only field
        // @ts-ignore - 'id' might exist on the object if fetched from DB
        id,
        // @ts-ignore - 'created_at' might exist
        created_at,
        ...rest
    } = lr;

    // Sanitize Payload: Convert empty string dates to NULL to prevent "invalid input syntax for type date"
    const sanitizedRest = { ...rest } as any;
    const dateFields = ['invoiceDate', 'poDate', 'ewayBillDate', 'ewayExDate'];

    dateFields.forEach(field => {
        if (sanitizedRest[field] === '') {
            sanitizedRest[field] = null;
        }
    });

    const payload = {
        ...sanitizedRest,
        user_id: user.id,
        is_invoice_generated: !!isInvoiceGenerated // Ensure boolean
    };

    const { data, error } = await supabase
        .from('lorry_receipts')
        .upsert(payload, { onConflict: 'lrNo' })
        .select()
        .single();

    if (error) {
        console.error("Supabase Save Error:", error);
        // Throw a clean error message to avoid [object Object] in UI
        throw new Error(error.message || "Database error occurred while saving LR.");
    }

    return {
        ...data,
        isInvoiceGenerated: data.is_invoice_generated ?? false
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
            invoiceDate: invoiceDate || null, // Ensure empty string becomes null
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

    if (!data) return null;

    // Map snake_case to camelCase for RBAC fields
    return {
        ...data,
        rbacEnabled: data.rbac_enabled,
        adminPasskey: data.admin_passkey,
        managerPasskey: data.manager_passkey
    };
};

export const saveCompanyDetails = async (details: CompanyDetails): Promise<CompanyDetails> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Map camelCase to snake_case for database
    const payload = {
        ...details,
        user_id: user.id,
        rbac_enabled: details.rbacEnabled,
        admin_passkey: details.adminPasskey,
        manager_passkey: details.managerPasskey
    };

    console.log('💾 Saving company details with payload:', {
        ...payload,
        admin_passkey: payload.admin_passkey ? '***' : undefined,
        manager_passkey: payload.manager_passkey ? '***' : undefined
    });

    // We check if record exists for user
    const { data: existing, error: existingError } = await supabase.from('company_details').select('id').eq('user_id', user.id).single();

    if (existingError && existingError.code !== 'PGRST116') {
        console.error('❌ Error checking existing record:', existingError);
    }

    let query = supabase.from('company_details');
    let result;

    if (existing) {
        console.log('📝 Updating existing record with id:', existing.id);
        result = await query.update(payload).eq('id', existing.id).select().single();
    } else {
        console.log('➕ Inserting new record');
        result = await query.insert(payload).select().single();
    }

    if (result.error) {
        console.error('❌ Supabase error details:', {
            message: result.error.message,
            details: result.error.details,
            hint: result.error.hint,
            code: result.error.code
        });

        // Provide helpful error message
        if (result.error.message?.includes('column') || result.error.code === '42703') {
            throw new Error(`Database schema error: ${result.error.message}. Please run the SQL migration script in Supabase SQL Editor.`);
        }

        throw result.error;
    }

    console.log('✅ Successfully saved company details');

    // Map snake_case back to camelCase for return
    return {
        ...result.data,
        rbacEnabled: result.data.rbac_enabled,
        adminPasskey: result.data.admin_passkey,
        managerPasskey: result.data.manager_passkey
    };
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
