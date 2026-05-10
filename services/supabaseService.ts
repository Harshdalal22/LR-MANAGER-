import { createClient, Session, Subscription } from '@supabase/supabase-js';
import { LorryReceipt, CompanyDetails, SavedParty, SavedTruck, VehicleHiring, BookingRecord, LRStatus, LedgerEntry, Voucher, GPSInvoice, LedgerStatement } from '../types';

/* 
================================================================================
 🛠️ DATABASE FIX REQUIRED
================================================================================
 Please open the file 'DATABASE_FIX.sql' in the root directory.
 Copy and run the ENTIRE contents of that file in your Supabase SQL Editor.
 Do NOT copy code from this .ts file into the SQL Editor.
================================================================================
*/

// ⚠️ IMPORTANT: Replace these with YOUR Supabase project details!
// You can find these in your Supabase Dashboard -> Settings -> API
const supabaseUrl = 'https://avqevimedgoogcupnojo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2cWV2aW1lZGdvb2djdXBub2pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjU0MzksImV4cCI6MjA3OTUwMTQzOX0.SWBCoebfu_yHUk6fGFpiy5ZMzbkZeot5jYjaAjF0esM';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Secondary client for creating users without logging out the admin
const supabaseSecondary = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

const getSupabase = () => supabase;

let cachedUserId: string | null = null;

export const getEffectiveUserId = async () => {
    // Return cached ID if available to speed up repeated operations
    if (cachedUserId) {
        // If Operator, check for adminId in session
        const role = sessionStorage.getItem('currentRole');
        if (role === 'Operator') {
            const adminId = sessionStorage.getItem('adminId');
            if (adminId) return adminId;
        }
        return cachedUserId;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    cachedUserId = user.id;

    // If the current role is Operator, use the admin's ID
    const role = sessionStorage.getItem('currentRole');
    if (role === 'Operator') {
        const adminId = sessionStorage.getItem('adminId');
        if (adminId) return adminId;
    }
    return user.id;
};

export const checkOperatorRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check if this user is mapped as an operator
    const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('operator_id', user.id)
        .single();
    
    if (error && error.code !== 'PGRST116') {
        console.error("Error checking operator role:", error);
    }
    
    if (data && data.admin_id) {
        return {
            isAdmin: false,
            role: data.role || 'Operator',
            adminId: data.admin_id
        };
    }
    
    return { isAdmin: true, role: 'Admin', adminId: user.id };
};

export const createOperator = async (email: string, password: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Only an Admin can create an operator");

    // Ensure the current user is an admin
    const roleInfo = await checkOperatorRole();
    if (roleInfo && !roleInfo.isAdmin) {
        throw new Error("Access Denied: Operators cannot create new users.");
    }

    // Create the user using the secondary client to prevent logout
    const { data: newUserData, error: signUpError } = await supabaseSecondary.auth.signUp({
        email,
        password,
    });

    if (signUpError) throw signUpError;
    if (!newUserData.user) throw new Error("Failed to create operator account");

    // Add mapping to app_users table
    const { error: insertError } = await supabase
        .from('app_users')
        .insert([{
            operator_id: newUserData.user.id,
            admin_id: user.id,
            email: email,
            role: 'Operator'
        }]);

    if (insertError) throw insertError;

    return newUserData.user;
};
export const updateOperatorAuth = async (operatorId: string, newEmail: string, newPassword: string) => {
    // Ensure the current user is an admin
    const roleInfo = await checkOperatorRole();
    if (roleInfo && !roleInfo.isAdmin) {
        throw new Error("Access Denied: Operators cannot modify users.");
    }

    const { error } = await supabase.rpc('update_operator_auth', {
        p_operator_id: operatorId,
        p_new_email: newEmail,
        p_new_password: newPassword
    });
    if (error) throw error;
};

// --- Auth ---

export const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
};

export const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
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
    cachedUserId = null;
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

// --- Manager Access Requests ---

export const createManagerAccessRequest = async (companyEmail: string, managerName: string, managerEmail: string) => {
    const { data, error } = await supabase
        .from('manager_access_requests')
        .insert([{
            company_email: companyEmail.toLowerCase().trim(),
            manager_name: managerName,
            manager_email: managerEmail,
            status: 'pending'
        }])
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const listenToAccessRequest = (requestId: string, onApproved: (sessionData: any) => void, onError?: (err: any) => void) => {
    let resolved = false;
    let interval: ReturnType<typeof setInterval>;

    console.log(`[Manager Auth] Starting listener for request: ${requestId}`);

    // 1. Try to use realtime (instant)
    const channel = supabase.channel(`request-${requestId}`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'manager_access_requests',
            filter: `id=eq.${requestId}`
        }, (payload) => {
            console.log("[Manager Auth] Realtime UPDATE received:", payload);
            const row = payload.new;
            if (row.status === 'approved' && row.session_data && !resolved) {
                console.log("[Manager Auth] Request approved via Realtime!");
                resolved = true;
                clearInterval(interval);
                supabase.removeChannel(channel);
                onApproved(row.session_data);
            }
        })
        .subscribe((status, err) => {
            console.log("[Manager Auth] Realtime subscription status:", status, err);
        });

    // 2. Fallback: poll every 3 seconds just in case Realtime fails or isn't enabled
    interval = setInterval(async () => {
        if (resolved) {
            clearInterval(interval);
            return;
        }
        console.log(`[Manager Auth] Polling for request ${requestId}...`);
        const { data, error } = await supabase
            .from('manager_access_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (error) {
            console.error("[Manager Auth] Polling error:", error);
            if (onError) onError(error);
        } else if (data) {
            console.log(`[Manager Auth] Polled status: ${data.status}`);
            if (data.status === 'approved' && data.session_data && !resolved) {
                console.log("[Manager Auth] Request approved via Polling!");
                resolved = true;
                clearInterval(interval);
                supabase.removeChannel(channel);
                onApproved(data.session_data);
            }
        }
    }, 3000);

    // Return a cleanup function
    return () => {
        console.log(`[Manager Auth] Cleaning up listener for ${requestId}`);
        resolved = true;
        clearInterval(interval);
        supabase.removeChannel(channel);
    };
};

export const listenForAdminAccessRequests = (companyEmail: string, onRequestAdded: (request: any) => void) => {
    return supabase.channel(`admin-requests-${companyEmail}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'manager_access_requests',
            filter: `company_email=eq.${companyEmail.toLowerCase().trim()}`
        }, (payload) => {
            onRequestAdded(payload.new);
        })
        .subscribe();
};

export const getPendingAccessRequests = async (companyEmail: string) => {
    const { data, error } = await supabase
        .from('manager_access_requests')
        .select('*')
        .eq('company_email', companyEmail.toLowerCase().trim())
        .eq('status', 'pending');
    if (error && error.code !== 'PGRST116') throw error; // Ignore table missing for now
    return data || [];
};

export const approveAccessRequest = async (requestId: string, sessionData: any) => {
    const { error } = await supabase
        .from('manager_access_requests')
        .update({ status: 'approved', session_data: sessionData })
        .eq('id', requestId);
    if (error) throw error;
};

export const rejectAccessRequest = async (requestId: string) => {
    const { error } = await supabase
        .from('manager_access_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);
    if (error) throw error;
};

export const applySession = async (sessionData: any) => {
    let parsedData = sessionData;

    // Sometimes PostgreSQL JSONB returns as a stringified JSON string instead of an object
    if (typeof sessionData === 'string') {
        try {
            parsedData = JSON.parse(sessionData);
        } catch (e) {
            console.error("[Manager Auth] Failed to parse session data string:", sessionData);
            throw new Error("Invalid session format received from server.");
        }
    }

    if (!parsedData || !parsedData.access_token || !parsedData.refresh_token) {
        console.error("[Manager Auth] Missing tokens in session data:", parsedData);
        throw new Error("Missing access or refresh token in session payload.");
    }

    const { data, error } = await supabase.auth.setSession({
        access_token: parsedData.access_token,
        refresh_token: parsedData.refresh_token
    });

    if (error) {
        console.error("[Manager Auth] supabase.auth.setSession failed:", error);
        throw error;
    }

    return data;
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
    const effectiveUserId = await getEffectiveUserId();

    // Destructure to separate frontend-only fields and 'id' if present
    const {
        isInvoiceGenerated,
        createdBy,
        // @ts-ignore
        id,
        // @ts-ignore
        created_at,
        ...rest
    } = lr;

    const sanitizedRest = { ...rest } as any;
    const dateFields = ['invoiceDate', 'poDate', 'ewayBillDate', 'ewayExDate'];
    const numericFields = ['invoiceAmount', 'chargedWeight', 'freight', 'weight', 'actualWeightMT', 'rate'];

    dateFields.forEach(field => {
        if (sanitizedRest[field] === '') sanitizedRest[field] = null;
    });

    numericFields.forEach(field => {
        if (sanitizedRest[field] === '' || sanitizedRest[field] === undefined || sanitizedRest[field] === null) {
            sanitizedRest[field] = 0;
        } else {
            sanitizedRest[field] = Number(sanitizedRest[field]) || 0;
        }
    });

    const payload = {
        ...sanitizedRest,
        user_id: effectiveUserId,
        is_invoice_generated: !!isInvoiceGenerated
    };

    // Use a timeout to prevent hanging UI
    const savePromise = supabase
        .from('lorry_receipts')
        .upsert(payload, { onConflict: 'lrNo' })
        .select()
        .single();

    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Request timed out. Please check your internet or run the Database Fix.")), 15000)
    );

    const { data, error } = await Promise.race([savePromise, timeoutPromise]) as any;

    if (error) {
        console.error("Supabase Save Error:", error);
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
    const effectiveUserId = await getEffectiveUserId();

    const fileExt = file.name.split('.').pop();
    const filePath = `${effectiveUserId}/${lrNo}_${Date.now()}.${fileExt}`;

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

// --- Company Details & Assets ---

export const uploadCompanyAsset = async (file: File, type: 'logo' | 'signature'): Promise<string> => {
    const effectiveUserId = await getEffectiveUserId();
    const fileExt = file.name.split('.').pop();
    const fileName = `${type}_${Date.now()}.${fileExt}`;
    const filePath = `${effectiveUserId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('company_assets')
        .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('company_assets').getPublicUrl(filePath);
    return data.publicUrl;
};

export const updateCompanyDetails = async (details: CompanyDetails): Promise<CompanyDetails> => {
    const effectiveUserId = await getEffectiveUserId();
    
    // Map frontend camelCase to DB snake_case for specific fields if needed
    // Assuming DB has columns name, logo_url, signature_image_url, etc.
    const payload = {
        ...details,
        user_id: effectiveUserId,
        // Map any mismatches here
        logo_url: details.logoUrl,
        signature_image_url: details.signatureImageUrl
    };

    const { data, error } = await supabase
        .from('company_details')
        .upsert(payload)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const getCompanyDetails = async (): Promise<CompanyDetails | null> => {
    const { data, error } = await supabase.from('company_details').select('*').single();
    // It's possible no details exist yet for new user
    if (error && error.code !== 'PGRST116') throw error;

    if (!data) return null;

    // Map snake_case to camelCase for RBAC fields and Asset URLs
    return {
        ...data,
        rbacEnabled: data.rbac_enabled,
        adminPasskey: data.admin_passkey,
        managerPasskey: data.manager_passkey,
        logoUrl: data.logo_url,
        signatureImageUrl: data.signature_image_url
    };
};

export const saveCompanyDetails = async (details: CompanyDetails): Promise<CompanyDetails> => {
    const effectiveUserId = await getEffectiveUserId();

    // Map camelCase to snake_case for database
    const payload: any = {
        ...details,
        user_id: effectiveUserId,
        rbac_enabled: details.rbacEnabled,
        admin_passkey: details.adminPasskey,
        manager_passkey: details.managerPasskey,
        logo_url: details.logoUrl,
        signature_image_url: details.signatureImageUrl
    };

    // Remove camelCase fields to prevent "Column not found" errors
    delete payload.rbacEnabled;
    delete payload.adminPasskey;
    delete payload.managerPasskey;
    delete payload.logoUrl;
    delete payload.signatureImageUrl;

    console.log('💾 Saving company details with payload:', {
        ...payload,
        admin_passkey: payload.admin_passkey ? '***' : undefined,
        manager_passkey: payload.manager_passkey ? '***' : undefined
    });

    // Use upsert to handle both insert and update scenarios and avoid Primary Key violations
    // We specify onConflict: 'user_id' to ensure we update if the user already has a record
    let result = await supabase
        .from('company_details')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();

    if (result.error) {
        console.error('❌ Supabase error details:', {
            message: result.error.message,
            details: result.error.details,
            hint: result.error.hint,
            code: result.error.code
        });

        // Fallback: Try saving without RBAC fields if schema error (missing columns)
        if (result.error.message?.includes('column') || result.error.code === '42703' || result.error.code === 'PGRST204') {
            console.warn("⚠️ Attempting fallback save without RBAC fields...");

            const fallbackPayload = { ...payload };
            delete (fallbackPayload as any).rbac_enabled;
            delete (fallbackPayload as any).admin_passkey;
            delete (fallbackPayload as any).manager_passkey;

            const fallbackResult = await supabase
                .from('company_details')
                .upsert(fallbackPayload, { onConflict: 'user_id' })
                .select()
                .single();

            if (!fallbackResult.error) {
                // Fallback succeeded!
                console.log('✅ Fallback save successful (Basic details only)');
                throw new Error("Basic settings SAVED ✅. However, RBAC settings failed (Run SQL Script in Supabase to fix).");
            }
        }

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
        managerPasskey: result.data.manager_passkey,
        logoUrl: result.data.logo_url,
        signatureImageUrl: result.data.signature_image_url
    };
};

export const uploadCompanyAsset = async (file: File, assetType: 'logo' | 'signature'): Promise<string> => {
    const effectiveUserId = await getEffectiveUserId();

    const fileExt = file.name.split('.').pop();
    const filePath = `${effectiveUserId}/${assetType}_${Date.now()}.${fileExt}`;

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
    const effectiveUserId = await getEffectiveUserId();
    const payload = { ...party, user_id: effectiveUserId };
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
    const effectiveUserId = await getEffectiveUserId();
    const payload = { ...truck, user_id: effectiveUserId };
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
    const effectiveUserId = await getEffectiveUserId();
    const payload = { ...record, user_id: effectiveUserId };
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
    const effectiveUserId = await getEffectiveUserId();
    const payload = { ...record, user_id: effectiveUserId };
    const { data, error } = await supabase.from('booking_registers').upsert(payload).select().single();
    if (error) throw error;
    return data;
};

export const deleteBookingRecord = async (id: string) => {
    const { error } = await supabase.from('booking_registers').delete().eq('id', id);
    if (error) throw error;
};

// --- Ledger Entries ---

export const getLedgerEntries = async (): Promise<LedgerEntry[]> => {
    const { data, error } = await supabase.from('ledger_entries').select('*').order('date', { ascending: false }).order('created_at', { ascending: false });
    if (error && error.code !== 'PGRST116') throw error;
    return data || [];
};

export const addLedgerEntry = async (entry: Partial<LedgerEntry>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user");

    // For operators, assign to admin's account
    const { data: appUser } = await supabase.from('app_users').select('admin_id').eq('operator_id', user.id).single();
    const finalUserId = appUser?.admin_id || user.id;

    const { data, error } = await supabase.from('ledger_entries').insert([{ ...entry, user_id: finalUserId }]).select();
    if (error) throw error;
    return data[0];
};

export const subscribeToLedgerEntries = (callback: (payload: any) => void) => {
    return supabase.channel('ledger_entries_changes')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'ledger_entries'
        }, callback)
        .subscribe();
};

// --- Vouchers ---

export const getVouchers = async (): Promise<Voucher[]> => {
    const { data, error } = await supabase.from('vouchers').select('*').order('date', { ascending: false }).order('created_at', { ascending: false });
    if (error && error.code !== 'PGRST116') throw error;
    return data || [];
};

export const addVoucher = async (voucher: Partial<Voucher>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user");

    const { data: appUser } = await supabase.from('app_users').select('admin_id').eq('operator_id', user.id).single();
    const finalUserId = appUser?.admin_id || user.id;

    const { data, error } = await supabase.from('vouchers').insert([{ ...voucher, user_id: finalUserId }]).select();
    if (error) throw error;
    return data[0];
};

export const updateVoucher = async (id: string, voucherUpdates: Partial<Voucher>) => {
    const { data, error } = await supabase.from('vouchers').update(voucherUpdates).eq('id', id).select();
    if (error) throw error;
    return data[0];
};

export const subscribeToVouchers = (callback: (payload: any) => void) => {
    return supabase.channel('vouchers_changes')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'vouchers'
        }, callback)
        .subscribe();
};

// --- GPS Invoices ---

export const getGPSInvoices = async (): Promise<GPSInvoice[]> => {
    const { data, error } = await supabase.from('gps_invoices').select('*').order('date', { ascending: false }).order('created_at', { ascending: false });
    if (error && error.code !== 'PGRST116') throw error;
    
    return (data || []).map(inv => ({
        id: inv.id,
        invoiceNo: inv.invoice_no,
        date: inv.date,
        customerName: inv.customer_name,
        customerAddress: inv.customer_address,
        customerGst: inv.customer_gst,
        vehicleNo: inv.vehicle_no,
        gpsImei: inv.gps_imei,
        hsnCode: inv.hsn_code,
        quantity: inv.quantity,
        rate: inv.rate,
        taxRate: inv.tax_rate,
        cgst: inv.cgst,
        sgst: inv.sgst,
        igst: inv.igst,
        amount: inv.amount,
        status: inv.status,
        user_id: inv.user_id,
        created_at: inv.created_at
    }));
};

export const saveGPSInvoice = async (invoice: GPSInvoice): Promise<GPSInvoice> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user");

    const payload = { ...invoice, user_id: user.id };
    
    // Map camelCase to snake_case
    const dbPayload = {
        id: payload.id,
        invoice_no: payload.invoiceNo,
        date: payload.date,
        customer_name: payload.customerName,
        customer_address: payload.customerAddress,
        customer_gst: payload.customerGst,
        vehicle_no: payload.vehicleNo,
        gps_imei: payload.gpsImei,
        hsn_code: payload.hsnCode,
        quantity: payload.quantity,
        rate: payload.rate,
        tax_rate: payload.taxRate,
        cgst: payload.cgst,
        sgst: payload.sgst,
        igst: payload.igst,
        amount: payload.amount,
        status: payload.status,
        user_id: payload.user_id
    };

    const { data, error } = await supabase.from('gps_invoices').upsert(dbPayload).select().single();
    if (error) throw error;
    
    // Map snake_case back to camelCase
    return {
        id: data.id,
        invoiceNo: data.invoice_no,
        date: data.date,
        customerName: data.customer_name,
        customerAddress: data.customer_address,
        customerGst: data.customer_gst,
        vehicleNo: data.vehicle_no,
        gpsImei: data.gps_imei,
        hsnCode: data.hsn_code,
        quantity: data.quantity,
        rate: data.rate,
        taxRate: data.tax_rate,
        cgst: data.cgst,
        sgst: data.sgst,
        igst: data.igst,
        amount: data.amount,
        status: data.status,
        user_id: data.user_id,
        created_at: data.created_at
    };
};

export const deleteGPSInvoice = async (id: string) => {
    const { error } = await supabase.from('gps_invoices').delete().eq('id', id);
    if (error) throw error;
};

// --- Register Entries ---
export const getRegisterEntries = async () => {
    const { data, error } = await supabase.from('register_entries').select('*').order('created_at', { ascending: false });
    if (error && error.code !== 'PGRST116') throw error;
    return data || [];
};

export const saveRegisterEntry = async (entry: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user");

    const { data: appUser } = await supabase.from('app_users').select('admin_id').eq('operator_id', user.id).single();
    const finalUserId = appUser?.admin_id || user.id;

    const payload = { ...entry, admin_id: finalUserId };
    const { data, error } = await supabase.from('register_entries').upsert(payload).select().single();
    if (error) throw error;
    return data;
};

export const deleteRegisterEntry = async (id: string) => {
    const { error } = await supabase.from('register_entries').delete().eq('id', id);
    if (error) throw error;
};

// --- Ledger Statements (PDF Storage) ---

export const saveLedgerStatement = async (statement: Omit<LedgerStatement, 'id' | 'created_at' | 'file_url'>, fileBlob: Blob) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user");

    // 1. Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('statements')
        .upload(statement.file_path, fileBlob, { upsert: true });

    if (uploadError) throw uploadError;

    // 2. Get public URL
    const { data: { publicUrl } } = supabase.storage.from('statements').getPublicUrl(statement.file_path);

    // 3. Save to database
    const { data, error } = await supabase.from('ledger_statements').insert([{
        ...statement,
        file_url: publicUrl
    }]).select().single();

    if (error) throw error;
    return data;
};

export const getLedgerStatements = async (): Promise<LedgerStatement[]> => {
    const { data, error } = await supabase.from('ledger_statements').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const deleteLedgerStatement = async (id: string, filePath: string) => {
    // 1. Delete from storage
    const { error: storageError } = await supabase.storage.from('statements').remove([filePath]);
    if (storageError) console.error("Storage delete error:", storageError);

    // 2. Delete from database
    const { error } = await supabase.from('ledger_statements').delete().eq('id', id);
    if (error) throw error;
};
