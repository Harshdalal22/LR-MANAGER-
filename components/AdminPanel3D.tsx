import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import {
    supabase,
    createOperator,
    updateOperatorAuth,
    deleteOperator,
    updateOperatorRole,
    adminSetUserPassword,
    adminDeleteUser,
    getAllSystemUsers,
    getLorryReceipts,
    saveLorryReceipt,
    deleteLorryReceipt,
    updateLorryReceiptStatus,
    getSavedParties,
    saveSavedParty,
    deleteSavedParty,
    getSavedTrucks,
    saveSavedTruck,
    deleteSavedTruck,
    getVouchers,
    saveVoucher,
    updateVoucher,
    deleteVoucher,
    getLedgerEntries,
    addLedgerEntry,
    updateLedgerEntry,
    deleteLedgerEntry,
    subscribeToLedgerEntries,
    getCompanyDetails,
    saveCompanyDetails,
    saveLedgerStatement,
    getLedgerStatements,
    deleteLedgerStatement,
    approveAccessRequest,
    rejectAccessRequest,
} from '../services/supabaseService';
import {
    LedgerEntry,
    LorryReceipt,
    SavedParty,
    SavedTruck,
    Voucher,
    CompanyDetails,
    LedgerStatement,
    LRStatus,
} from '../types';
import {
    UsersIcon,
    CogIcon,
    ShieldCheckIcon,
    TruckIcon,
    DocumentTextIcon,
    ChartBarIcon,
    BellIcon,
    KeyIcon,
    DatabaseIcon,
    CloudIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    CurrencyRupeeIcon,
    ExclamationTriangleIcon,
    UploadIcon,
    DownloadIcon,
    RefreshIcon,
    EyeIcon,
    PencilIcon,
    TrashIcon,
    PlusIcon,
    SearchIcon,
    FilterIcon,
    SettingsIcon,
    UserGroupIcon,
    ServerIcon,
    ActivityIcon,
    TrendingUpIcon,
    TrendingDownIcon,
    CalendarIcon,
    MailIcon,
    PhoneIcon,
    StarIcon,
    HeartIcon,
    BoltIcon,
    RocketIcon,
    TargetIcon,
    AwardIcon,
    InfoIcon,
    ArrowRightIcon,
    CloseIcon,
    DashboardIcon,
    ListIcon,
    GridIcon,
    SendIcon,
    UserIcon,
} from './icons';

interface AdminPanel3DProps {
    onClose?: () => void;
    currentRole: 'Admin' | 'Manager' | 'Operator';
    isOpen?: boolean;
    companyDetails?: CompanyDetails;
    onUpdateDetails?: (details: CompanyDetails) => Promise<boolean>;
    onUploadAsset?: (file: File, type: 'logo' | 'signature') => Promise<string | null>;
    managerRequests?: any[];
    onApproveManagerRequest?: (request: any) => void;
    onRejectManagerRequest?: (requestId: string) => void;
    onSignOut?: () => void;
    isSuperAdmin?: boolean;
    onSwitchToAppMode?: () => void;
}

type AdminTab = 'overview' | 'users' | 'lrs' | 'trucks' | 'parties' | 'vouchers' | 'ledger' | 'system';

const AdminPanel3D: React.FC<AdminPanel3DProps> = ({
    onClose,
    currentRole,
    companyDetails: propCompanyDetails,
    onUpdateDetails,
    onUploadAsset,
    managerRequests = [],
    onApproveManagerRequest,
    onRejectManagerRequest,
    onSignOut,
    isSuperAdmin: propIsSuperAdmin,
    onSwitchToAppMode,
}) => {
    // Top Tabs
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('ALL');

    // Global Power Search
    const [globalSearch, setGlobalSearch] = useState('');

    // Master Datasets State
    const [allLRs, setAllLRs] = useState<LorryReceipt[]>([]);
    const [allParties, setAllParties] = useState<SavedParty[]>([]);
    const [allTrucks, setAllTrucks] = useState<SavedTruck[]>([]);
    const [allVouchers, setAllVouchers] = useState<Voucher[]>([]);
    const [allLedgerEntries, setAllLedgerEntries] = useState<LedgerEntry[]>([]);
    const [operators, setOperators] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [companyDetails, setCompanyDetails] = useState<CompanyDetails>(
        propCompanyDetails || {
            name: '',
            logoUrl: '',
            signatureImageUrl: '',
            tagline: '',
            address: '',
            email: '',
            web: '',
            contact: [],
            pan: '',
            gstn: '',
            bankDetails: { name: '', branch: '', accountNo: '', ifscCode: '' },
            jurisdictionCity: '',
            branchLocations: [],
        }
    );

    // Filter States
    const [lrFilterStatus, setLrFilterStatus] = useState<string>('ALL');
    const [lrSearchQuery, setLrSearchQuery] = useState('');
    const [truckSearchQuery, setTruckSearchQuery] = useState('');
    const [partySearchQuery, setPartySearchQuery] = useState('');
    const [voucherSearchQuery, setVoucherSearchQuery] = useState('');

    // Modals & Editing States
    // 1. Account / Operator Modals
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState<'Operator' | 'Manager' | 'Admin'>('Operator');
    const [isCreatingUser, setIsCreatingUser] = useState(false);

    const [editingOperator, setEditingOperator] = useState<any>(null);
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editRole, setEditRole] = useState<string>('Operator');
    const [isUpdatingOperator, setIsUpdatingOperator] = useState(false);

    // Direct User Password Update Modal
    const [passwordModalUser, setPasswordModalUser] = useState<any | null>(null);
    const [newPasswordValue, setNewPasswordValue] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [companyEmailMap, setCompanyEmailMap] = useState<Record<string, string>>({});

    // 2. Passkey & RBAC state
    const [adminPasskeyInput, setAdminPasskeyInput] = useState(companyDetails.adminPasskey || '');
    const [managerPasskeyInput, setManagerPasskeyInput] = useState(companyDetails.managerPasskey || '');
    const [rbacEnabled, setRbacEnabled] = useState(companyDetails.rbacEnabled || false);
    const [showAdminPasskey, setShowAdminPasskey] = useState(false);
    const [showManagerPasskey, setShowManagerPasskey] = useState(false);

    // 3. LR Modals
    const [viewingLR, setViewingLR] = useState<LorryReceipt | null>(null);
    const [editingLR, setEditingLR] = useState<LorryReceipt | null>(null);
    const [showCreateLRModal, setShowCreateLRModal] = useState(false);
    const [newLRData, setNewLRData] = useState<Partial<LorryReceipt>>({
        lrNo: '',
        date: new Date().toISOString().split('T')[0],
        truckNo: '',
        fromPlace: '',
        toPlace: '',
        weight: 0,
        freight: 0,
        status: 'Booked',
        consignor: { name: '', address: '', city: '', contact: '', pan: '', gst: '' },
        consignee: { name: '', address: '', city: '', contact: '', pan: '', gst: '' },
        billingTo: { name: '', address: '', city: '', contact: '', pan: '', gst: '' },
        charges: { hamail: 0, surCharge: 0, stCharge: 0, collectionCharge: 0, ddCharge: 0, otherCharge: 0, riskCharge: 0 },
        items: [{ description: 'Goods Consignment', pcs: 1, weight: 0 }],
        rate: 0,
        rateOn: 'Fixed',
        remark: '',
        lrType: 'Original',
        invoiceNo: '',
        invoiceAmount: 0,
        invoiceDate: null,
        poNo: '',
        poDate: null,
        ewayBillNo: '',
        ewayBillDate: null,
        ewayExDate: null,
        addressOfDelivery: '',
        chargedWeight: 0,
        gstPaidBy: 'Consignor',
        actualWeightMT: 0,
    });

    // 4. Truck Modals
    const [showAddTruckModal, setShowAddTruckModal] = useState(false);
    const [editingTruck, setEditingTruck] = useState<SavedTruck | null>(null);
    const [newTruckData, setNewTruckData] = useState<Partial<SavedTruck>>({
        truckNo: '',
        ownerName: '',
        contactNumber: '',
        make: 'Tata Motors',
        model: '',
        truckType: 'Open Body',
        capacity: '20 Ton',
        fuelType: 'Diesel',
        mileage: 4.5,
        driverName: '',
        driverContact: '',
        fastagBalance: 0,
        status: 'Active',
    });

    // 5. Party Modals
    const [showAddPartyModal, setShowAddPartyModal] = useState(false);
    const [editingParty, setEditingParty] = useState<SavedParty | null>(null);
    const [newPartyData, setNewPartyData] = useState<Partial<SavedParty>>({
        name: '',
        type: 'Both',
        contact: '',
        city: '',
        address: '',
        gst: '',
        pan: '',
    });

    // 6. Voucher Modals
    const [showAddVoucherModal, setShowAddVoucherModal] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
    const [newVoucherData, setNewVoucherData] = useState<Partial<Voucher>>({
        voucher_no: `VCH-${Date.now().toString().slice(-5)}`,
        date: new Date().toISOString().split('T')[0],
        party_name: '',
        amount: 0,
        payment_mode: 'Cash',
        description: '',
    });

    // 7. Ledger Statement state
    const [partyList, setPartyList] = useState<string[]>([]);
    const [selectedPartyLedger, setSelectedPartyLedger] = useState<string>('');
    const [ledgerFromDate, setLedgerFromDate] = useState<string>('');
    const [ledgerToDate, setLedgerToDate] = useState<string>('');
    const [ledgerStatements, setLedgerStatements] = useState<LedgerStatement[]>([]);
    const [ledgerSubTab, setLedgerSubTab] = useState<'view' | 'saved' | 'entries'>('view');

    // 8. Raw Ledger entry modal
    const [showAddLedgerEntryModal, setShowAddLedgerEntryModal] = useState(false);
    const [editingLedgerEntry, setEditingLedgerEntry] = useState<LedgerEntry | null>(null);
    const [newLedgerEntryData, setNewLedgerEntryData] = useState<Partial<LedgerEntry>>({
        date: new Date().toISOString().split('T')[0],
        party_name: '',
        description: '',
        credit: 0,
        debit: 0,
        payment_mode: 'Bank Transfer',
        category: 'Freight / Invoice',
    });

    // Live clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Sync companyDetails prop
    useEffect(() => {
        if (propCompanyDetails) {
            setCompanyDetails(propCompanyDetails);
            setAdminPasskeyInput(propCompanyDetails.adminPasskey || '');
            setManagerPasskeyInput(propCompanyDetails.managerPasskey || '');
            setRbacEnabled(propCompanyDetails.rbacEnabled || false);
        }
    }, [propCompanyDetails]);

    // Master Fetch Data
    const fetchAllMasterData = async () => {
        setIsRefreshing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);

            const [lrs, parties, trucks, vouchers, ledger, company, statements] = await Promise.all([
                getLorryReceipts().catch(() => []),
                getSavedParties().catch(() => []),
                getSavedTrucks().catch(() => []),
                getVouchers().catch(() => []),
                getLedgerEntries().catch(() => []),
                getCompanyDetails().catch(() => null),
                getLedgerStatements().catch(() => []),
            ]);

            setAllLRs(lrs);
            setAllParties(parties);
            setAllTrucks(trucks);
            setAllVouchers(vouchers);
            setAllLedgerEntries(ledger);
            if (company) {
                setCompanyDetails(company);
                setAdminPasskeyInput(company.adminPasskey || '');
                setManagerPasskeyInput(company.managerPasskey || '');
                setRbacEnabled(company.rbacEnabled || false);
            }
            setLedgerStatements(statements);

            // Fetch all users across the system for Super Admin
            const systemUsers = await getAllSystemUsers().catch(() => []);
            if (systemUsers && systemUsers.length > 0) {
                setOperators(systemUsers);
            } else if (user) {
                const { data: opsData } = await supabase.from('app_users').select('*');
                if (opsData) setOperators(opsData);
            }

            // Fetch company profiles to resolve real emails for every user_id in the system
            try {
                const { data: companies } = await supabase.from('company_details').select('user_id, email, name');
                if (companies) {
                    const cMap: Record<string, string> = {};
                    companies.forEach((c: any) => {
                        if (c.user_id && c.email) cMap[c.user_id] = c.email;
                    });
                    setCompanyEmailMap(cMap);
                }
            } catch (cErr) {
                console.warn('Could not fetch company email mapping:', cErr);
            }

            // Build unique party list
            const lrNames = lrs.flatMap((l) => [l.consignor?.name, l.consignee?.name, l.billingTo?.name].filter(Boolean) as string[]);
            const vchNames = vouchers.map((v) => v.party_name).filter(Boolean) as string[];
            const pNames = parties.map((p) => p.name).filter(Boolean) as string[];
            const unique = Array.from(new Set([...pNames, ...lrNames, ...vchNames])).sort();
            setPartyList(unique);
            if (!selectedPartyLedger && unique.length > 0) {
                setSelectedPartyLedger(unique[0]);
            }
        } catch (error: any) {
            console.error('Error fetching master data in admin panel:', error);
            toast.error('Could not refresh some master data: ' + (error?.message || 'Error'));
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAllMasterData();
    }, []);

    // Subscribe to ledger entries
    useEffect(() => {
        const sub = subscribeToLedgerEntries(() => {
            getLedgerEntries().then(setAllLedgerEntries).catch(console.error);
        });
        return () => sub.unsubscribe();
    }, []);

    // Summary calculations (reacts dynamically to selectedAccountFilter)
    const stats = useMemo(() => {
        const targetLRs = selectedAccountFilter === 'ALL' ? allLRs : allLRs.filter((l) => l.user_id === selectedAccountFilter);
        const targetVouchers = selectedAccountFilter === 'ALL' ? allVouchers : allVouchers.filter((v) => v.user_id === selectedAccountFilter);
        const targetTrucks = selectedAccountFilter === 'ALL' ? allTrucks : allTrucks.filter((t) => t.user_id === selectedAccountFilter);
        const targetParties = selectedAccountFilter === 'ALL' ? allParties : allParties.filter((p) => p.user_id === selectedAccountFilter);

        const totalRevenue = targetLRs.reduce((sum, lr) => sum + (lr.freight || lr.invoiceAmount || 0), 0);
        const totalExpenses = targetVouchers.reduce((sum, v) => sum + (Number(v.amount) || 0), 0);
        const netProfit = totalRevenue - totalExpenses;
        const totalAccounts = userAccounts.length;
        return {
            totalRevenue,
            totalExpenses,
            netProfit,
            totalAccounts,
            totalLRs: targetLRs.length,
            totalTrucks: targetTrucks.length,
            totalParties: targetParties.length,
            totalVouchers: targetVouchers.length,
        };
    }, [allLRs, allVouchers, allTrucks, allParties, userAccounts.length, selectedAccountFilter]);

    // Global Power Search matches
    const searchResults = useMemo(() => {
        const q = globalSearch.trim().toLowerCase();
        if (!q) return null;

        const matchedLRs = allLRs.filter(
            (l) =>
                l.lrNo?.toLowerCase().includes(q) ||
                l.truckNo?.toLowerCase().includes(q) ||
                l.consignor?.name?.toLowerCase().includes(q) ||
                l.consignee?.name?.toLowerCase().includes(q) ||
                l.invoiceNo?.toLowerCase().includes(q) ||
                l.fromPlace?.toLowerCase().includes(q) ||
                l.toPlace?.toLowerCase().includes(q)
        ).slice(0, 5);

        const matchedTrucks = allTrucks.filter(
            (t) =>
                t.truckNo?.toLowerCase().includes(q) ||
                t.driverName?.toLowerCase().includes(q) ||
                t.make?.toLowerCase().includes(q) ||
                t.model?.toLowerCase().includes(q)
        ).slice(0, 5);

        const matchedParties = allParties.filter(
            (p) =>
                p.name?.toLowerCase().includes(q) ||
                p.city?.toLowerCase().includes(q) ||
                p.gst?.toLowerCase().includes(q) ||
                p.contact?.toLowerCase().includes(q)
        ).slice(0, 5);

        const matchedVouchers = allVouchers.filter(
            (v) =>
                v.voucher_no?.toLowerCase().includes(q) ||
                v.party_name?.toLowerCase().includes(q) ||
                v.description?.toLowerCase().includes(q)
        ).slice(0, 5);

        const matchedUsers = operators.filter(
            (u) =>
                u.email?.toLowerCase().includes(q) ||
                u.role?.toLowerCase().includes(q)
        );

        return { matchedLRs, matchedTrucks, matchedParties, matchedVouchers, matchedUsers };
    }, [globalSearch, allLRs, allTrucks, allParties, allVouchers, operators]);

    // Accounts list & mapping for multi-tenant / multi-account management
    const userAccounts = useMemo(() => {
        const list: {
            id: string;
            email: string;
            role: string;
            label: string;
            total_lrs: number;
            total_trucks: number;
            total_parties: number;
            total_vouchers: number;
            created_at?: string;
        }[] = [];

        const addedIds = new Set<string>();

        // 1. Current user account
        if (currentUser) {
            const isSuper = currentUser.email === 'admin@ssk.com' || propIsSuperAdmin;
            addedIds.add(currentUser.id);
            list.push({
                id: currentUser.id,
                email: currentUser.email || 'admin@ssk.com',
                role: isSuper ? 'Super Admin' : 'Admin',
                label: `${currentUser.email || 'admin@ssk.com'} (${isSuper ? 'Super Admin' : 'Admin'})`,
                total_lrs: allLRs.filter(l => l.user_id === currentUser.id).length,
                total_trucks: allTrucks.filter(t => t.user_id === currentUser.id).length,
                total_parties: allParties.filter(p => p.user_id === currentUser.id).length,
                total_vouchers: allVouchers.filter(v => v.user_id === currentUser.id).length,
                created_at: currentUser.created_at,
            });
        }

        // 2. Operators / System Users
        operators.forEach((op) => {
            const opId = op.operator_id || op.id;
            if (opId && !addedIds.has(opId)) {
                addedIds.add(opId);
                const email = op.email || companyEmailMap[opId] || `user_${opId.slice(0, 6)}@ssk.com`;
                list.push({
                    id: opId,
                    email,
                    role: op.role || 'Operator',
                    label: `${email} (${op.role || 'Operator'})`,
                    total_lrs: op.total_lrs !== undefined ? op.total_lrs : allLRs.filter(l => l.user_id === opId).length,
                    total_trucks: op.total_trucks !== undefined ? op.total_trucks : allTrucks.filter(t => t.user_id === opId).length,
                    total_parties: op.total_parties !== undefined ? op.total_parties : allParties.filter(p => p.user_id === opId).length,
                    total_vouchers: op.total_vouchers !== undefined ? op.total_vouchers : allVouchers.filter(v => v.user_id === opId).length,
                    created_at: op.created_at,
                });
            }
        });

        // 3. Any additional accounts found in allLRs, allTrucks, allParties, or companyEmailMap
        const checkAndAdd = (userId?: string) => {
            if (!userId || addedIds.has(userId)) return;
            addedIds.add(userId);
            const resolvedEmail = companyEmailMap[userId] || `user_${userId.slice(0, 6)}@ssk.com`;
            list.push({
                id: userId,
                email: resolvedEmail,
                role: 'User',
                label: `${resolvedEmail} (User)`,
                total_lrs: allLRs.filter(l => l.user_id === userId).length,
                total_trucks: allTrucks.filter(t => t.user_id === userId).length,
                total_parties: allParties.filter(p => p.user_id === userId).length,
                total_vouchers: allVouchers.filter(v => v.user_id === userId).length,
            });
        };

        allLRs.forEach(lr => checkAndAdd(lr.user_id));
        allTrucks.forEach(t => checkAndAdd(t.user_id));
        allParties.forEach(p => checkAndAdd(p.user_id));
        allVouchers.forEach(v => checkAndAdd(v.user_id));
        Object.keys(companyEmailMap).forEach(uid => checkAndAdd(uid));

        return list;
    }, [currentUser, operators, allLRs, allTrucks, allParties, allVouchers, companyEmailMap, propIsSuperAdmin]);

    const filteredUserAccounts = useMemo(() => {
        return userAccounts.filter((u) => {
            if (!userSearchQuery.trim()) return true;
            const q = userSearchQuery.toLowerCase();
            return u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q) || u.id.toLowerCase().includes(q);
        });
    }, [userAccounts, userSearchQuery]);

    const getUserEmailById = (uid?: string) => {
        if (!uid) return currentUser?.email || 'admin@ssk.com';
        const match = userAccounts.find((u) => u.id === uid);
        if (match) return match.email;
        if (companyEmailMap[uid]) return companyEmailMap[uid];
        return `user_${uid.slice(0, 6)}@ssk.com`;
    };

    // Filtered LRs
    const filteredLRs = useMemo(() => {
        return allLRs.filter((lr) => {
            if (selectedAccountFilter !== 'ALL' && lr.user_id !== selectedAccountFilter) return false;
            if (lrFilterStatus !== 'ALL' && lr.status !== lrFilterStatus) return false;
            if (lrSearchQuery.trim()) {
                const q = lrSearchQuery.toLowerCase();
                const match =
                    lr.lrNo?.toLowerCase().includes(q) ||
                    lr.truckNo?.toLowerCase().includes(q) ||
                    lr.consignor?.name?.toLowerCase().includes(q) ||
                    lr.consignee?.name?.toLowerCase().includes(q) ||
                    lr.invoiceNo?.toLowerCase().includes(q) ||
                    lr.fromPlace?.toLowerCase().includes(q) ||
                    lr.toPlace?.toLowerCase().includes(q);
                if (!match) return false;
            }
            return true;
        });
    }, [allLRs, lrFilterStatus, lrSearchQuery, selectedAccountFilter]);

    // Filtered Trucks
    const filteredTrucks = useMemo(() => {
        return allTrucks.filter((t) => {
            if (selectedAccountFilter !== 'ALL' && t.user_id !== selectedAccountFilter) return false;
            if (!truckSearchQuery.trim()) return true;
            const q = truckSearchQuery.toLowerCase();
            return (
                t.truckNo?.toLowerCase().includes(q) ||
                t.driverName?.toLowerCase().includes(q) ||
                t.make?.toLowerCase().includes(q) ||
                t.model?.toLowerCase().includes(q) ||
                t.truckType?.toLowerCase().includes(q)
            );
        });
    }, [allTrucks, truckSearchQuery, selectedAccountFilter]);

    // Filtered Parties
    const filteredParties = useMemo(() => {
        return allParties.filter((p) => {
            if (selectedAccountFilter !== 'ALL' && p.user_id !== selectedAccountFilter) return false;
            if (!partySearchQuery.trim()) return true;
            const q = partySearchQuery.toLowerCase();
            return (
                p.name?.toLowerCase().includes(q) ||
                p.city?.toLowerCase().includes(q) ||
                p.gst?.toLowerCase().includes(q) ||
                p.contact?.toLowerCase().includes(q)
            );
        });
    }, [allParties, partySearchQuery, selectedAccountFilter]);

    // Filtered Vouchers
    const filteredVouchers = useMemo(() => {
        return allVouchers.filter((v) => {
            if (selectedAccountFilter !== 'ALL' && v.user_id !== selectedAccountFilter) return false;
            if (!voucherSearchQuery.trim()) return true;
            const q = voucherSearchQuery.toLowerCase();
            return (
                v.voucher_no?.toLowerCase().includes(q) ||
                v.party_name?.toLowerCase().includes(q) ||
                v.description?.toLowerCase().includes(q) ||
                v.payment_mode?.toLowerCase().includes(q)
            );
        });
    }, [allVouchers, voucherSearchQuery, selectedAccountFilter]);

    // ==========================================
    // CRUD Handlers for Accounts & Users
    // ==========================================
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserEmail || !newUserPassword) {
            toast.error('Email and password required');
            return;
        }
        setIsCreatingUser(true);
        const toastId = toast.loading('Creating account...');
        try {
            await createOperator(newUserEmail, newUserPassword, newUserRole);
            toast.success(`Account created with role: ${newUserRole}!`, { id: toastId });
            setShowAddUserModal(false);
            setNewUserEmail('');
            setNewUserPassword('');
            fetchAllMasterData();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to create user', { id: toastId });
        } finally {
            setIsCreatingUser(false);
        }
    };

    const handleUpdateOperator = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingOperator) return;
        setIsUpdatingOperator(true);
        const toastId = toast.loading('Updating user credentials...');
        try {
            await updateOperatorAuth(editingOperator.operator_id, editEmail, editPassword);
            if (editRole !== editingOperator.role) {
                await updateOperatorRole(editingOperator.operator_id, editRole);
            }
            toast.success('Account updated successfully!', { id: toastId });
            setEditingOperator(null);
            fetchAllMasterData();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to update account', { id: toastId });
        } finally {
            setIsUpdatingOperator(false);
        }
    };

    const handleDirectPasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordModalUser || !newPasswordValue) {
            toast.error('Please enter a new password');
            return;
        }
        if (newPasswordValue.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        setIsUpdatingPassword(true);
        const toastId = toast.loading(`Updating password for ${passwordModalUser.email}...`);
        try {
            await adminSetUserPassword(passwordModalUser.id || passwordModalUser.operator_id, newPasswordValue);
            toast.success(`Password updated successfully for ${passwordModalUser.email}!`, { id: toastId });
            setPasswordModalUser(null);
            setNewPasswordValue('');
            fetchAllMasterData();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to update password. Please run SUPER_ADMIN_SETUP.sql in Supabase.', { id: toastId });
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    const handleDeleteUser = async (userItem: any) => {
        const email = userItem.email || 'this user';
        const targetId = userItem.id || userItem.operator_id;
        if (!targetId) return;
        if (email === 'admin@ssk.com') {
            toast.error('Cannot delete Root Super Admin account!');
            return;
        }
        if (!confirm(`Are you sure you want to permanently delete account ${email}? This user will no longer be able to sign in.`)) return;
        const toastId = toast.loading(`Deleting account ${email}...`);
        try {
            await adminDeleteUser(targetId);
            toast.success(`Account ${email} deleted successfully!`, { id: toastId });
            if (selectedAccountFilter === targetId) {
                setSelectedAccountFilter('ALL');
            }
            fetchAllMasterData();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to delete account', { id: toastId });
        }
    };

    const handleSavePasskeys = async () => {
        const toastId = toast.loading('Saving Passkeys & RBAC configuration...');
        try {
            const updated: CompanyDetails = {
                ...companyDetails,
                adminPasskey: adminPasskeyInput.trim(),
                managerPasskey: managerPasskeyInput.trim(),
                rbacEnabled: rbacEnabled,
            };
            if (onUpdateDetails) {
                await onUpdateDetails(updated);
            } else {
                await saveCompanyDetails(updated);
            }
            setCompanyDetails(updated);
            toast.success('Security & Passkey settings updated!', { id: toastId });
        } catch (error: any) {
            toast.error('Failed to update passkeys: ' + (error?.message || 'Error'), { id: toastId });
        }
    };

    // ==========================================
    // CRUD Handlers for Lorry Receipts (LRs)
    // ==========================================
    const handleQuickStatusChange = async (lrNo: string, newStatus: LRStatus) => {
        const toastId = toast.loading(`Updating LR #${lrNo} status to ${newStatus}...`);
        try {
            await updateLorryReceiptStatus(lrNo, newStatus);
            setAllLRs((prev) =>
                prev.map((lr) =>
                    lr.lrNo === lrNo ? { ...lr, status: newStatus, status_updated_at: new Date().toISOString() } : lr
                )
            );
            toast.success(`LR #${lrNo} is now ${newStatus}!`, { id: toastId });
        } catch (error: any) {
            toast.error('Failed to update status: ' + (error?.message || 'Error'), { id: toastId });
        }
    };

    const handleDeleteLRRecord = async (lrNo: string) => {
        if (!confirm(`Are you sure you want to delete LR #${lrNo}? This cannot be undone.`)) return;
        const toastId = toast.loading(`Deleting LR #${lrNo}...`);
        try {
            await deleteLorryReceipt(lrNo);
            setAllLRs((prev) => prev.filter((lr) => lr.lrNo !== lrNo));
            toast.success(`LR #${lrNo} permanently deleted.`, { id: toastId });
            if (viewingLR?.lrNo === lrNo) setViewingLR(null);
            if (editingLR?.lrNo === lrNo) setEditingLR(null);
        } catch (error: any) {
            toast.error('Failed to delete LR: ' + (error?.message || 'Error'), { id: toastId });
        }
    };

    const handleSaveEditedLR = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLR) return;
        const toastId = toast.loading(`Saving changes to LR #${editingLR.lrNo}...`);
        try {
            await saveLorryReceipt(editingLR);
            setAllLRs((prev) => prev.map((lr) => (lr.lrNo === editingLR.lrNo ? editingLR : lr)));
            toast.success(`LR #${editingLR.lrNo} updated successfully!`, { id: toastId });
            setEditingLR(null);
        } catch (error: any) {
            toast.error('Failed to save LR: ' + (error?.message || 'Error'), { id: toastId });
        }
    };

    const handleCreateNewLR = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLRData.lrNo || !newLRData.truckNo) {
            toast.error('LR Number and Truck Number are required!');
            return;
        }
        const toastId = toast.loading(`Creating LR #${newLRData.lrNo}...`);
        try {
            const lrToSave = newLRData as LorryReceipt;
            await saveLorryReceipt(lrToSave);
            setAllLRs((prev) => [lrToSave, ...prev]);
            toast.success(`LR #${lrToSave.lrNo} created successfully!`, { id: toastId });
            setShowCreateLRModal(false);
            setNewLRData({
                lrNo: '',
                date: new Date().toISOString().split('T')[0],
                truckNo: '',
                fromPlace: '',
                toPlace: '',
                weight: 0,
                freight: 0,
                status: 'Booked',
                consignor: { name: '', address: '', city: '', contact: '', pan: '', gst: '' },
                consignee: { name: '', address: '', city: '', contact: '', pan: '', gst: '' },
                billingTo: { name: '', address: '', city: '', contact: '', pan: '', gst: '' },
                charges: { hamail: 0, surCharge: 0, stCharge: 0, collectionCharge: 0, ddCharge: 0, otherCharge: 0, riskCharge: 0 },
                items: [{ description: 'Goods Consignment', pcs: 1, weight: 0 }],
                rate: 0,
                rateOn: 'Fixed',
                remark: '',
                lrType: 'Original',
            });
        } catch (error: any) {
            toast.error('Failed to create LR: ' + (error?.message || 'Error'), { id: toastId });
        }
    };

    // ==========================================
    // CRUD Handlers for Trucks / Garage
    // ==========================================
    const handleSaveNewTruck = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTruckData.truckNo) {
            toast.error('Truck Number is required');
            return;
        }
        const toastId = toast.loading('Adding truck to garage...');
        try {
            await saveSavedTruck(newTruckData as SavedTruck);
            const freshTrucks = await getSavedTrucks();
            setAllTrucks(freshTrucks);
            toast.success(`Truck ${newTruckData.truckNo} saved to Garage!`, { id: toastId });
            setShowAddTruckModal(false);
            setNewTruckData({
                truckNo: '',
                ownerName: '',
                contactNumber: '',
                make: 'Tata Motors',
                model: '',
                truckType: 'Open Body',
                capacity: '20 Ton',
                fuelType: 'Diesel',
                mileage: 4.5,
                driverName: '',
                driverContact: '',
                fastagBalance: 0,
                status: 'Active',
            });
        } catch (error: any) {
            toast.error('Failed to save truck: ' + (error?.message || 'Error'), { id: toastId });
        }
    };

    const handleUpdateTruck = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTruck) return;
        const toastId = toast.loading(`Updating Truck ${editingTruck.truckNo}...`);
        try {
            await saveSavedTruck(editingTruck);
            const fresh = await getSavedTrucks();
            setAllTrucks(fresh);
            toast.success(`Truck ${editingTruck.truckNo} updated!`, { id: toastId });
            setEditingTruck(null);
        } catch (error: any) {
            toast.error('Failed to update truck: ' + (error?.message || 'Error'), { id: toastId });
        }
    };

    const handleDeleteTruckRecord = async (t: SavedTruck) => {
        if (!confirm(`Are you sure you want to delete truck ${t.truckNo}?`)) return;
        const toastId = toast.loading(`Deleting truck ${t.truckNo}...`);
        try {
            await deleteSavedTruck(t.id || '', t.truckNo);
            setAllTrucks((prev) => prev.filter((x) => x.id !== t.id && x.truckNo !== t.truckNo));
            toast.success(`Truck ${t.truckNo} deleted.`, { id: toastId });
        } catch (error: any) {
            toast.error('Failed to delete truck: ' + (error?.message || 'Error'), { id: toastId });
        }
    };

    // ==========================================
    // CRUD Handlers for Parties
    // ==========================================
    const handleSaveNewParty = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPartyData.name) {
            toast.error('Party name is required');
            return;
        }
        const toastId = toast.loading('Saving new party...');
        try {
            await saveSavedParty(newPartyData as SavedParty);
            const fresh = await getSavedParties();
            setAllParties(fresh);
            toast.success(`Party ${newPartyData.name} saved!`, { id: toastId });
            setShowAddPartyModal(false);
            setNewPartyData({ name: '', type: 'Both', contact: '', city: '', address: '', gst: '', pan: '' });
        } catch (error: any) {
            toast.error('Failed to save party: ' + (error?.message || 'Error'), { id: toastId });
        }
    };

    const handleUpdateParty = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingParty) return;
        const toastId = toast.loading(`Updating ${editingParty.name}...`);
        try {
            await saveSavedParty(editingParty);
            const fresh = await getSavedParties();
            setAllParties(fresh);
            toast.success(`Party ${editingParty.name} updated!`, { id: toastId });
            setEditingParty(null);
        } catch (error: any) {
            toast.error('Failed to update party: ' + (error?.message || 'Error'), { id: toastId });
        }
    };

    const handleDeletePartyRecord = async (party: SavedParty) => {
        if (!confirm(`Are you sure you want to delete party ${party.name}?`)) return;
        const toastId = toast.loading(`Deleting ${party.name}...`);
        try {
            await deleteSavedParty(party.id || '');
            setAllParties((prev) => prev.filter((p) => p.id !== party.id));
            toast.success(`Party ${party.name} deleted.`, { id: toastId });
        } catch (error: any) {
            toast.error('Failed to delete party: ' + (error?.message || 'Error'), { id: toastId });
        }
    };

    // ==========================================
    // CRUD Handlers for Vouchers & Expenses
    // ==========================================
    const handleSaveNewVoucher = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newVoucherData.voucher_no || !newVoucherData.amount) {
            toast.error('Voucher No and Amount are required');
            return;
        }
        const toastId = toast.loading('Recording voucher...');
        try {
            await saveVoucher(newVoucherData as Voucher);
            const fresh = await getVouchers();
            setAllVouchers(fresh);
            toast.success(`Voucher #${newVoucherData.voucher_no} recorded!`, { id: toastId });
            setShowAddVoucherModal(false);
            setNewVoucherData({
                voucher_no: `VCH-${Date.now().toString().slice(-5)}`,
                date: new Date().toISOString().split('T')[0],
                party_name: '',
                amount: 0,
                payment_mode: 'Cash',
                description: '',
            });
        } catch (error: any) {
            toast.error('Failed to record voucher: ' + (error?.message || 'Error'), { id: toastId });
        }
    };

    const handleUpdateVoucher = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingVoucher || !editingVoucher.id) return;
        const toastId = toast.loading(`Updating voucher #${editingVoucher.voucher_no}...`);
        try {
            await updateVoucher(editingVoucher.id, editingVoucher);
            const fresh = await getVouchers();
            setAllVouchers(fresh);
            toast.success(`Voucher #${editingVoucher.voucher_no} updated!`, { id: toastId });
            setEditingVoucher(null);
        } catch (error: any) {
            toast.error('Failed to update voucher: ' + (error?.message || 'Error'), { id: toastId });
        }
    };

    const handleDeleteVoucherRecord = async (voucher: Voucher) => {
        if (!confirm(`Are you sure you want to delete voucher #${voucher.voucher_no}?`)) return;
        const toastId = toast.loading(`Deleting voucher #${voucher.voucher_no}...`);
        try {
            await deleteVoucher(voucher.id || '');
            setAllVouchers((prev) => prev.filter((v) => v.id !== voucher.id));
            toast.success(`Voucher #${voucher.voucher_no} deleted.`, { id: toastId });
        } catch (error: any) {
            toast.error('Failed to delete voucher: ' + (error?.message || 'Error'), { id: toastId });
        }
    };

    // ==========================================
    // CRUD Handlers for Raw Ledger Entries
    // ==========================================
    const handleSaveNewLedgerEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        const toastId = toast.loading('Adding ledger entry...');
        try {
            await addLedgerEntry(newLedgerEntryData);
            const fresh = await getLedgerEntries();
            setAllLedgerEntries(fresh);
            toast.success('Ledger transaction added!', { id: toastId });
            setShowAddLedgerEntryModal(false);
            setNewLedgerEntryData({
                date: new Date().toISOString().split('T')[0],
                party_name: '',
                description: '',
                credit: 0,
                debit: 0,
                payment_mode: 'Bank Transfer',
                category: 'Freight / Invoice',
            });
        } catch (error: any) {
            toast.error('Failed to add entry: ' + (error?.message || 'Error'), { id: toastId });
        }
    };

    const handleUpdateLedgerEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLedgerEntry || !editingLedgerEntry.id) return;
        const toastId = toast.loading('Updating ledger transaction...');
        try {
            await updateLedgerEntry(editingLedgerEntry.id, editingLedgerEntry);
            const fresh = await getLedgerEntries();
            setAllLedgerEntries(fresh);
            toast.success('Ledger transaction updated!', { id: toastId });
            setEditingLedgerEntry(null);
        } catch (error: any) {
            toast.error('Failed to update entry: ' + (error?.message || 'Error'), { id: toastId });
        }
    };

    const handleDeleteLedgerEntryRecord = async (id?: string) => {
        if (!id) return;
        if (!confirm('Are you sure you want to delete this ledger transaction?')) return;
        const toastId = toast.loading('Deleting transaction...');
        try {
            await deleteLedgerEntry(id);
            setAllLedgerEntries((prev) => prev.filter((e) => e.id !== id));
            toast.success('Transaction deleted.', { id: toastId });
        } catch (error: any) {
            toast.error('Failed to delete entry: ' + (error?.message || 'Error'), { id: toastId });
        }
    };

    // ==========================================
    // Full System Database Backup & Export
    // ==========================================
    const handleExportFullDatabaseJSON = () => {
        const fullBackup = {
            exportTimestamp: new Date().toISOString(),
            app: 'SSK Bilty Book / LR Manager',
            companyDetails,
            stats,
            accounts: operators.map((o) => ({ id: o.operator_id, email: o.email, role: o.role, created_at: o.created_at })),
            lorryReceipts: allLRs,
            trucks: allTrucks,
            parties: allParties,
            vouchers: allVouchers,
            ledgerEntries: allLedgerEntries,
        };

        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(fullBackup, null, 2))}`;
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', jsonString);
        downloadAnchor.setAttribute('download', `FULL_SYSTEM_BACKUP_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        toast.success('Complete Database JSON exported successfully!');
    };

    const handleClearLocalStorageCache = () => {
        try {
            localStorage.removeItem('bilty_cached_lrs');
            localStorage.removeItem('bilty_cached_parties');
            localStorage.removeItem('bilty_cached_trucks');
            localStorage.removeItem('bilty_lr_draft_new');
            toast.success('Local cache cleared! Re-syncing from cloud...');
            fetchAllMasterData();
        } catch (e: any) {
            toast.error('Failed to clear cache: ' + e?.message);
        }
    };

    // PDF Statement Export for Ledger
    const handleExportLedgerPDF = () => {
        import('jspdf').then(({ default: jsPDF }) => {
            import('jspdf-autotable').then(({ default: autoTable }) => {
                const doc = new jsPDF('p', 'mm', 'a4');
                const pageWidth = doc.internal.pageSize.getWidth();

                // 1. Company Header
                doc.setFontSize(20);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(41, 128, 185);
                doc.text((companyDetails.name || 'SSK CARGO SERVICES').toUpperCase(), pageWidth / 2, 18, { align: 'center' });

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(70, 70, 70);
                doc.text(companyDetails.address || '', pageWidth / 2, 24, { align: 'center', maxWidth: pageWidth - 30 });

                const contacts = (companyDetails.contact || []).join(' | ');
                const headerLine = [contacts ? `Mob: ${contacts}` : '', companyDetails.email ? `Email: ${companyDetails.email}` : '', companyDetails.gstn ? `GST: ${companyDetails.gstn}` : ''].filter(Boolean).join('  •  ');
                doc.text(headerLine, pageWidth / 2, 30, { align: 'center' });

                doc.setDrawColor(41, 128, 185);
                doc.setLineWidth(0.5);
                doc.line(14, 34, pageWidth - 14, 34);

                // 2. Party & Statement Title
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(20, 20, 20);
                doc.text('STATEMENT OF ACCOUNT', 14, 42);

                doc.setFontSize(10);
                doc.text(`Party: ${selectedPartyLedger || 'All Parties'}`, 14, 48);

                const partyObj = allParties.find((p) => p.name === selectedPartyLedger);
                let curY = 53;
                if (partyObj) {
                    doc.setFont('helvetica', 'normal');
                    if (partyObj.city) doc.text(`City: ${partyObj.city}`, 14, curY);
                    if (partyObj.gst) doc.text(`GSTN: ${partyObj.gst}`, pageWidth / 2, curY);
                    curY += 6;
                }

                // 3. Ledger Rows Computation
                type RowItem = { date: string; desc: string; type: string; ref: string; cr: number; dr: number; bal: number };
                const rows: RowItem[] = [];

                // Filter LRs for this party
                allLRs
                    .filter((lr) => {
                        if (selectedPartyLedger && selectedPartyLedger !== 'ALL') {
                            const isP = lr.consignor?.name === selectedPartyLedger || lr.consignee?.name === selectedPartyLedger || lr.billingTo?.name === selectedPartyLedger;
                            if (!isP) return false;
                        }
                        if (ledgerFromDate && new Date(lr.date) < new Date(ledgerFromDate)) return false;
                        if (ledgerToDate && new Date(lr.date) > new Date(ledgerToDate)) return false;
                        return true;
                    })
                    .forEach((lr) => {
                        rows.push({
                            date: lr.date,
                            desc: `Freight Bill: ${lr.fromPlace} -> ${lr.toPlace} (${lr.truckNo})`,
                            type: 'Invoice (Credit)',
                            ref: lr.lrNo,
                            cr: Number(lr.freight || lr.invoiceAmount) || 0,
                            dr: 0,
                            bal: 0,
                        });
                    });

                // Filter Vouchers
                allVouchers
                    .filter((v) => {
                        if (selectedPartyLedger && selectedPartyLedger !== 'ALL' && v.party_name !== selectedPartyLedger) return false;
                        if (ledgerFromDate && new Date(v.date) < new Date(ledgerFromDate)) return false;
                        if (ledgerToDate && new Date(v.date) > new Date(ledgerToDate)) return false;
                        return true;
                    })
                    .forEach((v) => {
                        rows.push({
                            date: v.date,
                            desc: v.description || 'Voucher Payment / Expense',
                            type: 'Voucher (Debit)',
                            ref: v.voucher_no,
                            cr: 0,
                            dr: Number(v.amount) || 0,
                            bal: 0,
                        });
                    });

                // Sort by date
                rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                let runBal = 0;
                rows.forEach((r) => {
                    runBal += r.cr - r.dr;
                    r.bal = runBal;
                });

                const totalCr = rows.reduce((s, r) => s + r.cr, 0);
                const totalDr = rows.reduce((s, r) => s + r.dr, 0);
                const netBal = totalCr - totalDr;

                // Summary Box
                doc.setDrawColor(210, 210, 210);
                doc.setFillColor(248, 250, 252);
                doc.roundedRect(14, curY, pageWidth - 28, 14, 2, 2, 'FD');

                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(100, 116, 139);
                doc.text('TOTAL BILLED (CR)', 20, curY + 5);
                doc.text('TOTAL PAID (DR)', pageWidth / 2, curY + 5, { align: 'center' });
                doc.text('OUTSTANDING BALANCE', pageWidth - 20, curY + 5, { align: 'right' });

                doc.setFontSize(10);
                doc.setTextColor(16, 185, 129); // emerald
                doc.text(`Rs. ${totalCr.toLocaleString('en-IN')}`, 20, curY + 11);

                doc.setTextColor(239, 68, 68); // rose
                doc.text(`Rs. ${totalDr.toLocaleString('en-IN')}`, pageWidth / 2, curY + 11, { align: 'center' });

                doc.setTextColor(netBal >= 0 ? 37 : 239, netBal >= 0 ? 99 : 68, netBal >= 0 ? 235 : 68);
                doc.text(`Rs. ${Math.abs(netBal).toLocaleString('en-IN')} ${netBal >= 0 ? '(Receivable)' : '(Payable)'}`, pageWidth - 20, curY + 11, { align: 'right' });

                // Table
                const tableData = rows.map((r) => [
                    r.date,
                    r.type,
                    r.ref,
                    r.desc,
                    r.cr ? `Rs. ${r.cr.toLocaleString('en-IN')}` : '-',
                    r.dr ? `Rs. ${r.dr.toLocaleString('en-IN')}` : '-',
                    `Rs. ${r.bal.toLocaleString('en-IN')}`,
                ]);

                autoTable(doc, {
                    head: [['Date', 'Type', 'Ref No', 'Particulars', 'Credit (Cr)', 'Debit (Dr)', 'Balance']],
                    body: tableData,
                    startY: curY + 18,
                    theme: 'grid',
                    styles: { fontSize: 8, cellPadding: 2 },
                    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    columnStyles: {
                        4: { halign: 'right' },
                        5: { halign: 'right' },
                        6: { halign: 'right', fontStyle: 'bold' },
                    },
                });

                const fileName = `Ledger_${(selectedPartyLedger || 'All').replace(/[^a-z0-9]/gi, '_')}.pdf`;
                doc.save(fileName);
                toast.success('Ledger Statement PDF downloaded!');

                // Save to cloud storage
                const pdfBlob = doc.output('blob');
                const filePath = `statements/statement_${Date.now()}.pdf`;
                saveLedgerStatement(
                    {
                        admin_id: (currentUser?.id as any) || 'admin',
                        party_name: selectedPartyLedger || 'All Parties',
                        from_date: ledgerFromDate || '2024-01-01',
                        to_date: ledgerToDate || new Date().toISOString().split('T')[0],
                        file_path: filePath,
                    },
                    pdfBlob
                )
                    .then(() => {
                        getLedgerStatements().then(setLedgerStatements).catch(console.error);
                    })
                    .catch((err) => console.error('Cloud save statement error:', err));
            });
        });
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
            {/* Top Super Bar */}
            <div className="bg-slate-900/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40 shadow-2xl">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-2 ring-white/20 animate-pulse">
                        <BoltIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base sm:text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-white to-indigo-300 uppercase">
                                Super Admin Powerhouse
                            </h1>
                            <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-rose-500 text-white uppercase tracking-widest shadow-xs">
                                Root Control
                            </span>
                            {(currentUser?.email === 'admin@ssk.com' || propIsSuperAdmin) && (
                                <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-amber-500 text-slate-950 uppercase tracking-wider font-mono shadow-xs">
                                    👑 admin@ssk.com
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 font-mono">
                            {companyDetails.name || 'Logistics Fleet'} • {currentUser?.email || 'admin@ssk.com'} •{' '}
                            {currentTime.toLocaleTimeString()}
                        </p>
                    </div>
                </div>

                {/* Center / Account Scope Filter */}
                <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-indigo-500/30 shadow-inner">
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                        <span>👁️ Filter User:</span>
                    </span>
                    <select
                        value={selectedAccountFilter}
                        onChange={(e) => setSelectedAccountFilter(e.target.value)}
                        className="bg-transparent text-xs font-semibold text-slate-100 focus:outline-none cursor-pointer max-w-[210px] truncate"
                        title="Filter entire powerhouse by specific user account"
                    >
                        <option value="ALL" className="bg-slate-900 text-amber-400 font-bold">
                            👑 ALL USERS & ACCOUNTS ({userAccounts.length})
                        </option>
                        {userAccounts.map((acc) => (
                            <option key={acc.id} value={acc.id} className="bg-slate-900 text-slate-200">
                                {acc.email} {acc.role ? `[${acc.role}]` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Right Global Actions */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {onSwitchToAppMode && (
                        <button
                            onClick={onSwitchToAppMode}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-md shadow-emerald-600/30 cursor-pointer"
                            title="Open standard Fleet & Logistics App interface while retaining root access"
                        >
                            <TruckIcon className="w-4 h-4 text-white" />
                            <span>Fleet App View</span>
                        </button>
                    )}

                    <button
                        onClick={handleExportFullDatabaseJSON}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/30 text-indigo-200 text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                        title="Download entire database as JSON backup"
                    >
                        <DownloadIcon className="w-4 h-4 text-indigo-400" />
                        <span>Export All Data</span>
                    </button>

                    <button
                        onClick={fetchAllMasterData}
                        disabled={isRefreshing}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-bold transition-all active:scale-95 text-slate-200 cursor-pointer ${
                            isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title="Refresh all data directly from Supabase Cloud"
                    >
                        <RefreshIcon className={`w-4 h-4 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>{isRefreshing ? 'Syncing...' : 'Sync Cloud'}</span>
                    </button>

                    {onClose && (
                        <button
                            onClick={onClose}
                            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 rounded-xl text-white text-xs font-black shadow-lg shadow-rose-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        >
                            Exit Powerhouse
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="bg-slate-900/60 border-b border-white/10 px-4 sm:px-8 py-2 overflow-x-auto custom-scrollbar flex items-center gap-2">
                {[
                    { id: 'overview', label: 'Command Hub', icon: <DashboardIcon className="w-4 h-4" /> },
                    { id: 'users', label: `Accounts & Roles (${1 + operators.length})`, icon: <UsersIcon className="w-4 h-4" />, badge: operators.length },
                    { id: 'lrs', label: `Lorry Receipts (${allLRs.length})`, icon: <DocumentTextIcon className="w-4 h-4" /> },
                    { id: 'trucks', label: `Fleet Garage (${allTrucks.length})`, icon: <TruckIcon className="w-4 h-4" /> },
                    { id: 'parties', label: `Parties & Clients (${allParties.length})`, icon: <UserGroupIcon className="w-4 h-4" /> },
                    { id: 'vouchers', label: `Vouchers & Cash (${allVouchers.length})`, icon: <CurrencyRupeeIcon className="w-4 h-4" /> },
                    { id: 'ledger', label: 'Ledger & Statements', icon: <ChartBarIcon className="w-4 h-4" /> },
                    { id: 'system', label: 'Master Config & System', icon: <CogIcon className="w-4 h-4" /> },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as AdminTab)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                            activeTab === tab.id
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/40 scale-105'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Main Content Viewport */}
            <div className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
                {/* Global Search Bar */}
                <div className="relative">
                    <SearchIcon className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
                    <input
                        type="text"
                        value={globalSearch}
                        onChange={(e) => setGlobalSearch(e.target.value)}
                        placeholder="Power Search across EVERYTHING (LR No, Truck No, Party Name, Voucher ID, Account Email)..."
                        className="w-full pl-12 pr-10 py-3 bg-slate-900/80 border border-white/10 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 shadow-xl"
                    />
                    {globalSearch && (
                        <button
                            onClick={() => setGlobalSearch('')}
                            className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
                        >
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Global Search Results Popup / Drawer */}
                {searchResults && (
                    <div className="p-5 rounded-2xl bg-slate-900 border border-indigo-500/40 shadow-2xl space-y-4 animate-fadeIn">
                        <div className="flex justify-between items-center border-b border-white/10 pb-2">
                            <span className="text-xs font-black uppercase text-indigo-400 tracking-wider">
                                Global Power Search Matches for "{globalSearch}"
                            </span>
                            <button
                                onClick={() => setGlobalSearch('')}
                                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                            >
                                Clear Results
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                            {/* Matched LRs */}
                            {searchResults.matchedLRs.length > 0 && (
                                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                                    <div className="font-bold text-amber-300 mb-2 flex items-center gap-1.5">
                                        <DocumentTextIcon className="w-4 h-4" /> Matched LRs ({searchResults.matchedLRs.length})
                                    </div>
                                    <div className="space-y-1.5">
                                        {searchResults.matchedLRs.map((lr) => (
                                            <div
                                                key={lr.lrNo}
                                                onClick={() => {
                                                    setActiveTab('lrs');
                                                    setViewingLR(lr);
                                                    setGlobalSearch('');
                                                }}
                                                className="p-2 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 flex justify-between"
                                            >
                                                <span className="font-bold text-white">#{lr.lrNo}</span>
                                                <span className="text-slate-400">{lr.truckNo}</span>
                                                <span className="text-emerald-400 font-mono">₹{lr.freight}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Matched Trucks */}
                            {searchResults.matchedTrucks.length > 0 && (
                                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                                    <div className="font-bold text-blue-300 mb-2 flex items-center gap-1.5">
                                        <TruckIcon className="w-4 h-4" /> Matched Trucks ({searchResults.matchedTrucks.length})
                                    </div>
                                    <div className="space-y-1.5">
                                        {searchResults.matchedTrucks.map((t) => (
                                            <div
                                                key={t.truckNo}
                                                onClick={() => {
                                                    setActiveTab('trucks');
                                                    setEditingTruck(t);
                                                    setGlobalSearch('');
                                                }}
                                                className="p-2 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 flex justify-between"
                                            >
                                                <span className="font-bold text-white">{t.truckNo}</span>
                                                <span className="text-slate-400">{t.make}</span>
                                                <span className="text-indigo-300">{t.driverName || 'No Driver'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Matched Parties */}
                            {searchResults.matchedParties.length > 0 && (
                                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                                    <div className="font-bold text-emerald-300 mb-2 flex items-center gap-1.5">
                                        <UserGroupIcon className="w-4 h-4" /> Matched Parties ({searchResults.matchedParties.length})
                                    </div>
                                    <div className="space-y-1.5">
                                        {searchResults.matchedParties.map((p) => (
                                            <div
                                                key={p.name}
                                                onClick={() => {
                                                    setActiveTab('parties');
                                                    setEditingParty(p);
                                                    setGlobalSearch('');
                                                }}
                                                className="p-2 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 flex justify-between"
                                            >
                                                <span className="font-bold text-white">{p.name}</span>
                                                <span className="text-slate-400">{p.city || p.gst || ''}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Matched Vouchers */}
                            {searchResults.matchedVouchers.length > 0 && (
                                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                                    <div className="font-bold text-rose-300 mb-2 flex items-center gap-1.5">
                                        <CurrencyRupeeIcon className="w-4 h-4" /> Matched Vouchers ({searchResults.matchedVouchers.length})
                                    </div>
                                    <div className="space-y-1.5">
                                        {searchResults.matchedVouchers.map((v) => (
                                            <div
                                                key={v.voucher_no}
                                                onClick={() => {
                                                    setActiveTab('vouchers');
                                                    setEditingVoucher(v);
                                                    setGlobalSearch('');
                                                }}
                                                className="p-2 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 flex justify-between"
                                            >
                                                <span className="font-bold text-white">#{v.voucher_no}</span>
                                                <span className="text-slate-400">{v.party_name}</span>
                                                <span className="text-rose-400 font-mono">₹{v.amount}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Matched Accounts */}
                            {searchResults.matchedUsers.length > 0 && (
                                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                                    <div className="font-bold text-purple-300 mb-2 flex items-center gap-1.5">
                                        <UsersIcon className="w-4 h-4" /> Matched Accounts ({searchResults.matchedUsers.length})
                                    </div>
                                    <div className="space-y-1.5">
                                        {searchResults.matchedUsers.map((u) => (
                                            <div
                                                key={u.operator_id}
                                                onClick={() => {
                                                    setActiveTab('users');
                                                    setEditingOperator(u);
                                                    setEditEmail(u.email);
                                                    setEditRole(u.role || 'Operator');
                                                    setGlobalSearch('');
                                                }}
                                                className="p-2 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 flex justify-between"
                                            >
                                                <span className="font-bold text-white">{u.email}</span>
                                                <span className="text-purple-400 uppercase font-black">{u.role}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ============================================================== */}
                {/* TAB 1: OVERVIEW & COMMAND HUB */}
                {/* ============================================================== */}
                {activeTab === 'overview' && (
                    <div className="space-y-6 animate-fadeIn">
                        {/* KPI Metric Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-900/40 via-slate-900 to-indigo-950/60 border border-blue-500/20 shadow-xl">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-bold text-blue-300 uppercase tracking-wider">Total Revenue</p>
                                        <h3 className="text-2xl font-black text-white mt-1 font-mono">
                                            ₹{(stats.totalRevenue / 100000).toFixed(2)}L
                                        </h3>
                                        <p className="text-[11px] text-slate-400 mt-1">From {stats.totalLRs} Lorry Receipts</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
                                        <TrendingUpIcon className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-900/40 via-slate-900 to-rose-950/60 border border-rose-500/20 shadow-xl">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-bold text-rose-300 uppercase tracking-wider">Total Expenses</p>
                                        <h3 className="text-2xl font-black text-white mt-1 font-mono">
                                            ₹{(stats.totalExpenses / 100000).toFixed(2)}L
                                        </h3>
                                        <p className="text-[11px] text-slate-400 mt-1">Across {stats.totalVouchers} Vouchers</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400">
                                        <CurrencyRupeeIcon className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-900/40 via-slate-900 to-emerald-950/60 border border-emerald-500/20 shadow-xl">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Net Margin</p>
                                        <h3 className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                                            ₹{(stats.netProfit / 100000).toFixed(2)}L
                                        </h3>
                                        <p className="text-[11px] text-slate-400 mt-1">Operating Cashflow</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
                                        <ActivityIcon className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-900/40 via-slate-900 to-purple-950/60 border border-purple-500/20 shadow-xl">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-bold text-purple-300 uppercase tracking-wider">System Accounts</p>
                                        <h3 className="text-2xl font-black text-white mt-1 font-mono">
                                            {stats.totalAccounts}
                                        </h3>
                                        <p className="text-[11px] text-slate-400 mt-1">1 Admin + {operators.length} Operators</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
                                        <UsersIcon className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Creation Dock */}
                        <div>
                            <h2 className="text-sm font-black text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <BoltIcon className="w-5 h-5 text-amber-400" /> Powerhouse Quick Launch Dock
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                <button
                                    onClick={() => {
                                        setActiveTab('users');
                                        setShowAddUserModal(true);
                                    }}
                                    className="p-4 rounded-xl bg-slate-900/80 border border-purple-500/30 hover:border-purple-500 hover:bg-purple-950/40 transition-all text-left group cursor-pointer"
                                >
                                    <UsersIcon className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                                    <p className="font-bold text-xs text-white">+ Add Account</p>
                                    <p className="text-[10px] text-slate-400">Create operator</p>
                                </button>

                                <button
                                    onClick={() => {
                                        setActiveTab('lrs');
                                        setShowCreateLRModal(true);
                                    }}
                                    className="p-4 rounded-xl bg-slate-900/80 border border-blue-500/30 hover:border-blue-500 hover:bg-blue-950/40 transition-all text-left group cursor-pointer"
                                >
                                    <DocumentTextIcon className="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                                    <p className="font-bold text-xs text-white">+ Create LR</p>
                                    <p className="text-[10px] text-slate-400">Issue Bilty</p>
                                </button>

                                <button
                                    onClick={() => {
                                        setActiveTab('trucks');
                                        setShowAddTruckModal(true);
                                    }}
                                    className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-950/40 transition-all text-left group cursor-pointer"
                                >
                                    <TruckIcon className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                                    <p className="font-bold text-xs text-white">+ Add Truck</p>
                                    <p className="text-[10px] text-slate-400">Register in garage</p>
                                </button>

                                <button
                                    onClick={() => {
                                        setActiveTab('parties');
                                        setShowAddPartyModal(true);
                                    }}
                                    className="p-4 rounded-xl bg-slate-900/80 border border-amber-500/30 hover:border-amber-500 hover:bg-amber-950/40 transition-all text-left group cursor-pointer"
                                >
                                    <UserGroupIcon className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                                    <p className="font-bold text-xs text-white">+ Add Party</p>
                                    <p className="text-[10px] text-slate-400">Client / Consignor</p>
                                </button>

                                <button
                                    onClick={() => {
                                        setActiveTab('vouchers');
                                        setShowAddVoucherModal(true);
                                    }}
                                    className="p-4 rounded-xl bg-slate-900/80 border border-rose-500/30 hover:border-rose-500 hover:bg-rose-950/40 transition-all text-left group cursor-pointer"
                                >
                                    <CurrencyRupeeIcon className="w-5 h-5 text-rose-400 mb-2 group-hover:scale-110 transition-transform" />
                                    <p className="font-bold text-xs text-white">+ Add Voucher</p>
                                    <p className="text-[10px] text-slate-400">Record cash/expense</p>
                                </button>

                                <button
                                    onClick={handleExportFullDatabaseJSON}
                                    className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/30 hover:border-cyan-500 hover:bg-cyan-950/40 transition-all text-left group cursor-pointer"
                                >
                                    <DownloadIcon className="w-5 h-5 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                                    <p className="font-bold text-xs text-white">Full Backup</p>
                                    <p className="text-[10px] text-slate-400">Export JSON file</p>
                                </button>
                            </div>
                        </div>

                        {/* Pending Approvals (if any) */}
                        {managerRequests.length > 0 && (
                            <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/30 shadow-xl">
                                <h3 className="font-black text-amber-400 text-sm uppercase flex items-center gap-2 mb-3">
                                    <BellIcon className="w-5 h-5" /> Pending Access Requests ({managerRequests.length})
                                </h3>
                                <div className="space-y-2">
                                    {managerRequests.map((req) => (
                                        <div key={req.id} className="p-3 bg-slate-900/80 rounded-xl flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-white">{req.user_email || 'User'}</p>
                                                <p className="text-xs text-slate-400">Requested Role: <span className="text-amber-400 font-bold">{req.requested_role}</span></p>
                                            </div>
                                            <div className="flex gap-2">
                                                {onApproveManagerRequest && (
                                                    <button
                                                        onClick={() => onApproveManagerRequest(req)}
                                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                                                    >
                                                        Approve
                                                    </button>
                                                )}
                                                {onRejectManagerRequest && (
                                                    <button
                                                        onClick={() => onRejectManagerRequest(req.id)}
                                                        className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
                                                    >
                                                        Reject
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* System Diagnostics & Cloud Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl">
                                <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                                    <ServerIcon className="w-5 h-5 text-blue-400" /> Database & Cloud Status
                                </h3>
                                <div className="space-y-2.5 text-xs text-slate-300">
                                    <div className="flex justify-between py-1 border-b border-white/5">
                                        <span className="text-slate-400">Connected Supabase Project</span>
                                        <span className="font-mono text-emerald-400 font-bold">LIVE & SECURED</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-white/5">
                                        <span className="text-slate-400">Lorry Receipts in DB</span>
                                        <span className="font-mono text-white font-bold">{allLRs.length} records</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-white/5">
                                        <span className="text-slate-400">Parties in DB</span>
                                        <span className="font-mono text-white font-bold">{allParties.length} records</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-white/5">
                                        <span className="text-slate-400">Trucks in DB</span>
                                        <span className="font-mono text-white font-bold">{allTrucks.length} records</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-slate-400">Vouchers in DB</span>
                                        <span className="font-mono text-white font-bold">{allVouchers.length} records</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                                        <DatabaseIcon className="w-5 h-5 text-purple-400" /> Cache & Recovery Tools
                                    </h3>
                                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                                        Offline cache ensures snappy UI loading. If any record shows outdated values, flush the local cache to re-pull all fresh entities from Supabase.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleClearLocalStorageCache}
                                        className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-bold text-slate-200 transition-all cursor-pointer"
                                    >
                                        Flush Local Cache
                                    </button>
                                    <button
                                        onClick={handleExportFullDatabaseJSON}
                                        className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer"
                                    >
                                        Download JSON
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================================== */}
                {/* TAB 2: ACCOUNTS & USER ROLES POWERHOUSE */}
                {/* ============================================================== */}
                {activeTab === 'users' && (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Master Passkeys & RBAC Security Card */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-2xl space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                                <div>
                                    <h3 className="text-base font-black text-white flex items-center gap-2">
                                        <ShieldCheckIcon className="w-6 h-6 text-indigo-400" />
                                        Master Passkeys & Role Access Control (RBAC)
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        Configure passkeys required to enter Admin or Manager modes.
                                    </p>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer bg-slate-800/80 px-3 py-1.5 rounded-xl border border-white/10">
                                    <input
                                        type="checkbox"
                                        checked={rbacEnabled}
                                        onChange={(e) => setRbacEnabled(e.target.checked)}
                                        className="rounded text-indigo-600 focus:ring-0"
                                    />
                                    <span className="text-xs font-bold text-white">Enable RBAC Passkeys</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1">
                                        Super Admin Passkey
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showAdminPasskey ? 'text' : 'password'}
                                            value={adminPasskeyInput}
                                            onChange={(e) => setAdminPasskeyInput(e.target.value)}
                                            placeholder="Enter Admin passkey (e.g. 1234)"
                                            className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowAdminPasskey(!showAdminPasskey)}
                                            className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
                                        >
                                            {showAdminPasskey ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1">
                                        Manager Passkey
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showManagerPasskey ? 'text' : 'password'}
                                            value={managerPasskeyInput}
                                            onChange={(e) => setManagerPasskeyInput(e.target.value)}
                                            placeholder="Enter Manager passkey"
                                            className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowManagerPasskey(!showManagerPasskey)}
                                            className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
                                        >
                                            {showManagerPasskey ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={handleSavePasskeys}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                    Save Security & Passkeys
                                </button>
                            </div>
                        </div>

                        {/* Active Account Filter Notification */}
                        {selectedAccountFilter !== 'ALL' && (
                            <div className="bg-gradient-to-r from-amber-500/20 via-indigo-500/20 to-purple-500/20 border border-amber-500/40 p-4 rounded-2xl flex items-center justify-between flex-wrap gap-3 shadow-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl">
                                        🎯
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-amber-300 uppercase tracking-wider">Account Data Isolation Active</p>
                                        <p className="text-sm font-bold text-white">
                                            Viewing records specifically for: <span className="text-amber-400 font-mono underline font-black">{getUserEmailById(selectedAccountFilter)}</span>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedAccountFilter('ALL');
                                        toast.success('Filter cleared: Showing all system data consolidated');
                                    }}
                                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                                >
                                    ✕ Reset & Show All Accounts
                                </button>
                            </div>
                        )}

                        {/* Top Header & Search / Add User Bar */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl flex items-center justify-between flex-wrap gap-4">
                            <div>
                                <h3 className="font-bold text-white text-base flex items-center gap-2">
                                    <UsersIcon className="w-5 h-5 text-indigo-400" />
                                    All System Users & Accounts ({filteredUserAccounts.length})
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Click any user to isolate and view only their data, or update their password and permissions.
                                </p>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="relative">
                                    <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                    <input
                                        type="text"
                                        value={userSearchQuery}
                                        onChange={(e) => setUserSearchQuery(e.target.value)}
                                        placeholder="Search by email or role..."
                                        className="pl-9 pr-3 py-1.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-56"
                                    />
                                </div>
                                <button
                                    onClick={() => setShowAddUserModal(true)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    <span>+ Add New User</span>
                                </button>
                            </div>
                        </div>

                        {/* System Accounts Directory Table */}
                        <div className="bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                                        <tr>
                                            <th className="px-5 py-3.5">Account Email & ID</th>
                                            <th className="px-5 py-3.5">Role</th>
                                            <th className="px-5 py-3.5">Created Date</th>
                                            <th className="px-5 py-3.5">System Activity (Owned Data)</th>
                                            <th className="px-5 py-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredUserAccounts.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="text-center py-12 text-slate-400 text-sm">
                                                    No user accounts found matching "{userSearchQuery}".
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredUserAccounts.map((u) => {
                                                const isCurrent = u.id === currentUser?.id;
                                                const isSelected = selectedAccountFilter === u.id;
                                                const isSuper = u.email === 'admin@ssk.com' || u.role === 'Super Admin';
                                                return (
                                                    <tr
                                                        key={u.id}
                                                        className={`transition-colors cursor-pointer ${
                                                            isSelected
                                                                ? 'bg-indigo-950/40 border-l-4 border-amber-400'
                                                                : 'hover:bg-white/5'
                                                        }`}
                                                        onClick={() => {
                                                            setSelectedAccountFilter(u.id);
                                                            setActiveTab('lrs');
                                                            toast.success(`Viewing data for ${u.email}`);
                                                        }}
                                                    >
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-md ${
                                                                    isSuper ? 'bg-gradient-to-tr from-amber-500 to-rose-600' : 'bg-gradient-to-tr from-indigo-600 to-blue-500'
                                                                }`}>
                                                                    {u.email.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold text-white text-sm">{u.email}</span>
                                                                        {isSuper && (
                                                                            <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-amber-500 text-slate-950 uppercase">
                                                                                👑 Super Admin
                                                                            </span>
                                                                        )}
                                                                        {isCurrent && !isSuper && (
                                                                            <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                                                                You
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                                        UID: {u.id}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <span
                                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                                                                    isSuper
                                                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                                                        : u.role === 'Admin'
                                                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                                                        : u.role === 'Manager'
                                                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                                }`}
                                                            >
                                                                {u.role || 'Operator'}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-4 text-slate-400 font-mono">
                                                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Active'}
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono text-[11px] font-bold" title="Lorry Receipts">
                                                                    📄 {u.total_lrs} LRs
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono text-[11px] font-bold" title="Trucks">
                                                                    🚛 {u.total_trucks} Trucks
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono text-[11px] font-bold" title="Parties">
                                                                    👥 {u.total_parties} Parties
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20 font-mono text-[11px] font-bold" title="Vouchers">
                                                                    💰 {u.total_vouchers} Vouchers
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedAccountFilter(u.id);
                                                                    setActiveTab('lrs');
                                                                    toast.success(`Showing only data for: ${u.email}`);
                                                                }}
                                                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
                                                                title="View and manage all records created by this account"
                                                            >
                                                                👁️ View Data
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setPasswordModalUser(u);
                                                                    setNewPasswordValue('');
                                                                }}
                                                                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                                                                title="Update password for this user"
                                                            >
                                                                🔑 Password
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingOperator({ operator_id: u.id, email: u.email, role: u.role });
                                                                    setEditEmail(u.email);
                                                                    setEditRole(u.role || 'Operator');
                                                                    setEditPassword('');
                                                                }}
                                                                className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                                                                title="Edit role / email"
                                                            >
                                                                Edit
                                                            </button>
                                                            {!isSuper && (
                                                                <button
                                                                    onClick={() => handleDeleteUser(u)}
                                                                    className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                                                                    title="Delete this user account"
                                                                >
                                                                    Delete
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================================== */}
                {/* TAB 3: LORRY RECEIPTS (LR / BILTY) POWERHOUSE */}
                {/* ============================================================== */}
                {activeTab === 'lrs' && (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Filter Bar & Create Button */}
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-white/10 shadow-xl">
                            <div className="flex items-center gap-2 flex-wrap">
                                {['ALL', 'Booked', 'In Transit', 'Out for Delivery', 'Delivered', 'Cancelled'].map((st) => (
                                    <button
                                        key={st}
                                        onClick={() => setLrFilterStatus(st)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                            lrFilterStatus === st
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        {st}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={lrSearchQuery}
                                    onChange={(e) => setLrSearchQuery(e.target.value)}
                                    placeholder="Search LR, truck, party..."
                                    className="px-3 py-1.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                                <button
                                    onClick={() => setShowCreateLRModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    <span>+ Create LR</span>
                                </button>
                            </div>
                        </div>

                        {/* LRs Master Table */}
                        <div className="bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                                        <tr>
                                            <th className="px-4 py-3.5">LR No</th>
                                            <th className="px-4 py-3.5">Date</th>
                                            <th className="px-4 py-3.5">Truck No</th>
                                            <th className="px-4 py-3.5">Route</th>
                                            <th className="px-4 py-3.5">Consignor & Consignee</th>
                                            <th className="px-4 py-3.5">Freight</th>
                                            <th className="px-4 py-3.5">Status</th>
                                            <th className="px-4 py-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredLRs.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                                                    No Lorry Receipts found matching current criteria.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredLRs.map((lr) => (
                                                <tr key={lr.lrNo} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3 font-mono font-bold text-white">
                                                        <div>#{lr.lrNo}</div>
                                                        {selectedAccountFilter === 'ALL' && (
                                                            <div className="text-[10px] text-indigo-400 font-sans font-medium flex items-center gap-1 mt-0.5">
                                                                <span>👤</span> <span className="truncate max-w-[120px]">{getUserEmailById(lr.user_id)}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{lr.date}</td>
                                                    <td className="px-4 py-3 font-bold text-amber-300 font-mono whitespace-nowrap">
                                                        {lr.truckNo}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-300">
                                                        {lr.fromPlace} <span className="text-slate-500">→</span> {lr.toPlace}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-white truncate max-w-[180px]">
                                                            {lr.consignor?.name || 'Consignor'}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                                                            {lr.consignee?.name || 'Consignee'}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                                                        ₹{lr.freight?.toLocaleString('en-IN') || 0}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <select
                                                            value={lr.status}
                                                            onChange={(e) => handleQuickStatusChange(lr.lrNo, e.target.value as LRStatus)}
                                                            className="bg-slate-950 border border-white/20 rounded-lg px-2 py-1 text-[11px] font-bold text-white focus:outline-none cursor-pointer"
                                                        >
                                                            <option value="Booked">Booked</option>
                                                            <option value="In Transit">In Transit</option>
                                                            <option value="Out for Delivery">Out for Delivery</option>
                                                            <option value="Delivered">Delivered</option>
                                                            <option value="Cancelled">Cancelled</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                                                        <button
                                                            onClick={() => setViewingLR(lr)}
                                                            className="p-1.5 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 rounded-lg transition-colors cursor-pointer"
                                                            title="View Details"
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingLR({ ...lr })}
                                                            className="p-1.5 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 rounded-lg transition-colors cursor-pointer"
                                                            title="Edit LR"
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteLRRecord(lr.lrNo)}
                                                            className="p-1.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 rounded-lg transition-colors cursor-pointer"
                                                            title="Delete LR"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================================== */}
                {/* TAB 4: FLEET & GARAGE POWERHOUSE */}
                {/* ============================================================== */}
                {activeTab === 'trucks' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-white/10 shadow-xl">
                            <div>
                                <h3 className="font-bold text-white text-sm">Registered Fleet Vehicles ({allTrucks.length})</h3>
                                <p className="text-xs text-slate-400">Manage specifications, compliance, and drivers</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={truckSearchQuery}
                                    onChange={(e) => setTruckSearchQuery(e.target.value)}
                                    placeholder="Search truck no, driver..."
                                    className="px-3 py-1.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                                <button
                                    onClick={() => setShowAddTruckModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    <span>+ Register Truck</span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                                        <tr>
                                            <th className="px-4 py-3.5">Truck No</th>
                                            <th className="px-4 py-3.5">Make & Model</th>
                                            <th className="px-4 py-3.5">Type & Capacity</th>
                                            <th className="px-4 py-3.5">Driver & Contact</th>
                                            <th className="px-4 py-3.5">FASTag Balance</th>
                                            <th className="px-4 py-3.5">Status</th>
                                            <th className="px-4 py-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredTrucks.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                                    No trucks registered in Garage.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredTrucks.map((truck) => (
                                                <tr key={truck.truckNo} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3 font-mono font-black text-amber-300 text-sm">
                                                        <div>{truck.truckNo}</div>
                                                        {selectedAccountFilter === 'ALL' && (
                                                            <div className="text-[10px] text-indigo-400 font-sans font-medium flex items-center gap-1 mt-0.5">
                                                                <span>👤</span> <span className="truncate max-w-[120px]">{getUserEmailById(truck.user_id)}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-white">
                                                        {truck.make || 'Tata'} {truck.model || ''}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-300">
                                                        {truck.truckType || 'Open Body'} • {truck.capacity || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-white">{truck.driverName || 'No Driver'}</div>
                                                        <div className="text-[11px] text-slate-400">{truck.driverContact || ''}</div>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-emerald-400 font-bold">
                                                        ₹{truck.fastagBalance?.toLocaleString('en-IN') || 0}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                            {truck.status || 'Active'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right space-x-2">
                                                        <button
                                                            onClick={() => setEditingTruck({ ...truck })}
                                                            className="p-1.5 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 rounded-lg transition-colors cursor-pointer"
                                                            title="Edit Truck"
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteTruckRecord(truck)}
                                                            className="p-1.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 rounded-lg transition-colors cursor-pointer"
                                                            title="Delete Truck"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================================== */}
                {/* TAB 5: PARTIES & CLIENTS POWERHOUSE */}
                {/* ============================================================== */}
                {activeTab === 'parties' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-white/10 shadow-xl">
                            <div>
                                <h3 className="font-bold text-white text-sm">Master Parties Directory ({allParties.length})</h3>
                                <p className="text-xs text-slate-400">Consignors, Consignees & Transporters</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={partySearchQuery}
                                    onChange={(e) => setPartySearchQuery(e.target.value)}
                                    placeholder="Search party, city, GST..."
                                    className="px-3 py-1.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                                />
                                <button
                                    onClick={() => setShowAddPartyModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs font-bold rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    <span>+ Add Party</span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                                        <tr>
                                            <th className="px-4 py-3.5">Party Name</th>
                                            <th className="px-4 py-3.5">Type</th>
                                            <th className="px-4 py-3.5">City & Address</th>
                                            <th className="px-4 py-3.5">GSTN & PAN</th>
                                            <th className="px-4 py-3.5">Contact Phone</th>
                                            <th className="px-4 py-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredParties.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                                    No parties found.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredParties.map((p) => (
                                                <tr key={p.id || p.name} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3 font-bold text-white">
                                                        <div>{p.name}</div>
                                                        {selectedAccountFilter === 'ALL' && (
                                                            <div className="text-[10px] text-indigo-400 font-sans font-medium flex items-center gap-1 mt-0.5">
                                                                <span>👤</span> <span className="truncate max-w-[120px]">{getUserEmailById(p.user_id)}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                            {p.type || 'Both'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-300">
                                                        <div>{p.city || '-'}</div>
                                                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{p.address}</div>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-slate-300">
                                                        <div>{p.gst || '-'}</div>
                                                        <div className="text-[11px] text-slate-400">{p.pan || ''}</div>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-slate-300">{p.contact || '-'}</td>
                                                    <td className="px-4 py-3 text-right space-x-2">
                                                        <button
                                                            onClick={() => setEditingParty({ ...p })}
                                                            className="p-1.5 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 rounded-lg transition-colors cursor-pointer"
                                                            title="Edit Party"
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletePartyRecord(p)}
                                                            className="p-1.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 rounded-lg transition-colors cursor-pointer"
                                                            title="Delete Party"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================================== */}
                {/* TAB 6: VOUCHERS & EXPENSES POWERHOUSE */}
                {/* ============================================================== */}
                {activeTab === 'vouchers' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-white/10 shadow-xl">
                            <div>
                                <h3 className="font-bold text-white text-sm">Vouchers & Cash Book ({allVouchers.length})</h3>
                                <p className="text-xs text-slate-400">Total Recorded: ₹{stats.totalExpenses.toLocaleString('en-IN')}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={voucherSearchQuery}
                                    onChange={(e) => setVoucherSearchQuery(e.target.value)}
                                    placeholder="Search voucher, party..."
                                    className="px-3 py-1.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                                />
                                <button
                                    onClick={() => setShowAddVoucherModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-bold rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    <span>+ Add Voucher</span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                                        <tr>
                                            <th className="px-4 py-3.5">Voucher No</th>
                                            <th className="px-4 py-3.5">Date</th>
                                            <th className="px-4 py-3.5">Party / Beneficiary</th>
                                            <th className="px-4 py-3.5">Amount</th>
                                            <th className="px-4 py-3.5">Mode</th>
                                            <th className="px-4 py-3.5">Description</th>
                                            <th className="px-4 py-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredVouchers.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                                    No vouchers recorded.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredVouchers.map((v) => (
                                                <tr key={v.id || v.voucher_no} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3 font-mono font-bold text-rose-300">
                                                        <div>#{v.voucher_no}</div>
                                                        {selectedAccountFilter === 'ALL' && (
                                                            <div className="text-[10px] text-indigo-400 font-sans font-medium flex items-center gap-1 mt-0.5">
                                                                <span>👤</span> <span className="truncate max-w-[120px]">{getUserEmailById(v.user_id)}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-400">{v.date}</td>
                                                    <td className="px-4 py-3 font-bold text-white">{v.party_name || 'N/A'}</td>
                                                    <td className="px-4 py-3 font-mono font-black text-rose-400">
                                                        ₹{Number(v.amount)?.toLocaleString('en-IN') || 0}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-300">{v.payment_mode || 'Cash'}</td>
                                                    <td className="px-4 py-3 text-slate-400 truncate max-w-[200px]">
                                                        {v.description}
                                                    </td>
                                                    <td className="px-4 py-3 text-right space-x-2">
                                                        <button
                                                            onClick={() => setEditingVoucher({ ...v })}
                                                            className="p-1.5 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 rounded-lg transition-colors cursor-pointer"
                                                            title="Edit Voucher"
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteVoucherRecord(v)}
                                                            className="p-1.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 rounded-lg transition-colors cursor-pointer"
                                                            title="Delete Voucher"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================================== */}
                {/* TAB 7: LEDGER & STATEMENTS */}
                {/* ============================================================== */}
                {activeTab === 'ledger' && (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Sub-tabs */}
                        <div className="flex gap-2 p-1 bg-slate-900 border border-white/10 rounded-xl w-fit">
                            <button
                                onClick={() => setLedgerSubTab('view')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    ledgerSubTab === 'view' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Party Statement & PDF
                            </button>
                            <button
                                onClick={() => setLedgerSubTab('entries')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    ledgerSubTab === 'entries' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Raw Ledger Entries ({allLedgerEntries.length})
                            </button>
                            <button
                                onClick={() => setLedgerSubTab('saved')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    ledgerSubTab === 'saved' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Saved Statements ({ledgerStatements.length})
                            </button>
                        </div>

                        {ledgerSubTab === 'view' && (
                            <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl space-y-4">
                                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                    <DocumentTextIcon className="w-5 h-5 text-blue-400" /> Generate Official Ledger Statement
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1">Select Party</label>
                                        <select
                                            value={selectedPartyLedger}
                                            onChange={(e) => setSelectedPartyLedger(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="ALL">All Parties Consolidated</option>
                                            {partyList.map((p) => (
                                                <option key={p} value={p}>
                                                    {p}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1">From Date</label>
                                        <input
                                            type="date"
                                            value={ledgerFromDate}
                                            onChange={(e) => setLedgerFromDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1">To Date</label>
                                        <input
                                            type="date"
                                            value={ledgerToDate}
                                            onChange={(e) => setLedgerToDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 flex justify-end">
                                    <button
                                        onClick={handleExportLedgerPDF}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                    >
                                        <DownloadIcon className="w-4 h-4" />
                                        <span>Download & Save PDF Statement</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {ledgerSubTab === 'entries' && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-slate-900/80 p-4 rounded-2xl border border-white/10">
                                    <span className="text-xs font-bold text-white">Manual & System Ledger Journal</span>
                                    <button
                                        onClick={() => setShowAddLedgerEntryModal(true)}
                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                                    >
                                        + Add Transaction
                                    </button>
                                </div>

                                <div className="bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                                            <tr>
                                                <th className="px-4 py-3.5">Date</th>
                                                <th className="px-4 py-3.5">Party</th>
                                                <th className="px-4 py-3.5">Description</th>
                                                <th className="px-4 py-3.5">Credit</th>
                                                <th className="px-4 py-3.5">Debit</th>
                                                <th className="px-4 py-3.5">Mode</th>
                                                <th className="px-4 py-3.5 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {allLedgerEntries.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                                                        No ledger entries recorded.
                                                    </td>
                                                </tr>
                                            ) : (
                                                allLedgerEntries.map((e) => (
                                                    <tr key={e.id} className="hover:bg-white/5">
                                                        <td className="px-4 py-3 text-slate-400">{e.date}</td>
                                                        <td className="px-4 py-3 font-bold text-white">{e.party_name || '-'}</td>
                                                        <td className="px-4 py-3 text-slate-300">{e.description}</td>
                                                        <td className="px-4 py-3 text-emerald-400 font-mono font-bold">
                                                            {e.credit ? `₹${e.credit}` : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-rose-400 font-mono font-bold">
                                                            {e.debit ? `₹${e.debit}` : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-400">{e.payment_mode || '-'}</td>
                                                        <td className="px-4 py-3 text-right space-x-2">
                                                            <button
                                                                onClick={() => setEditingLedgerEntry(e)}
                                                                className="p-1.5 bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/40"
                                                            >
                                                                <PencilIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteLedgerEntryRecord(e.id)}
                                                                className="p-1.5 bg-rose-500/20 text-rose-300 rounded hover:bg-rose-500/40"
                                                            >
                                                                <TrashIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {ledgerSubTab === 'saved' && (
                            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 shadow-xl">
                                <h3 className="text-sm font-bold text-white mb-3">Saved Statements in Cloud</h3>
                                {ledgerStatements.length === 0 ? (
                                    <p className="text-xs text-slate-400 py-6 text-center">No statements saved yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {ledgerStatements.map((stmt) => (
                                            <div key={stmt.id} className="p-3 bg-slate-950 rounded-xl flex items-center justify-between text-xs">
                                                <div>
                                                    <p className="font-bold text-white">{stmt.party_name}</p>
                                                    <p className="text-slate-400">
                                                        Period: {stmt.from_date} to {stmt.to_date}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm('Delete saved statement?')) return;
                                                        await deleteLedgerStatement(stmt.id, stmt.file_path);
                                                        setLedgerStatements((prev) => prev.filter((s) => s.id !== stmt.id));
                                                        toast.success('Deleted statement.');
                                                    }}
                                                    className="p-2 bg-rose-500/20 text-rose-300 rounded-lg hover:bg-rose-500/40"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ============================================================== */}
                {/* TAB 8: MASTER SETTINGS & COMPANY PROFILE */}
                {/* ============================================================== */}
                {activeTab === 'system' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 shadow-2xl space-y-4">
                            <h3 className="font-bold text-white text-base flex items-center gap-2">
                                <CogIcon className="w-5 h-5 text-indigo-400" /> Company Master Profile & Billing Information
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Company / Transporter Name</label>
                                    <input
                                        type="text"
                                        value={companyDetails.name || ''}
                                        onChange={(e) => setCompanyDetails({ ...companyDetails, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Tagline</label>
                                    <input
                                        type="text"
                                        value={companyDetails.tagline || ''}
                                        onChange={(e) => setCompanyDetails({ ...companyDetails, tagline: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-slate-300 font-bold mb-1">Head Office Address</label>
                                    <input
                                        type="text"
                                        value={companyDetails.address || ''}
                                        onChange={(e) => setCompanyDetails({ ...companyDetails, address: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">GSTN</label>
                                    <input
                                        type="text"
                                        value={companyDetails.gstn || ''}
                                        onChange={(e) => setCompanyDetails({ ...companyDetails, gstn: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">PAN Number</label>
                                    <input
                                        type="text"
                                        value={companyDetails.pan || ''}
                                        onChange={(e) => setCompanyDetails({ ...companyDetails, pan: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={companyDetails.email || ''}
                                        onChange={(e) => setCompanyDetails({ ...companyDetails, email: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Website URL</label>
                                    <input
                                        type="text"
                                        value={companyDetails.web || ''}
                                        onChange={(e) => setCompanyDetails({ ...companyDetails, web: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Jurisdiction City</label>
                                    <input
                                        type="text"
                                        value={companyDetails.jurisdictionCity || ''}
                                        onChange={(e) => setCompanyDetails({ ...companyDetails, jurisdictionCity: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">SAC / HSN Code</label>
                                    <input
                                        type="text"
                                        value={companyDetails.sacCode || ''}
                                        onChange={(e) => setCompanyDetails({ ...companyDetails, sacCode: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Bank Details */}
                            <div className="pt-4 border-t border-white/10">
                                <h4 className="font-bold text-white text-xs mb-3">Bank Account Information</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                    <input
                                        type="text"
                                        placeholder="Bank Name"
                                        value={companyDetails.bankDetails?.name || ''}
                                        onChange={(e) =>
                                            setCompanyDetails({
                                                ...companyDetails,
                                                bankDetails: { ...companyDetails.bankDetails, name: e.target.value },
                                            })
                                        }
                                        className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Branch"
                                        value={companyDetails.bankDetails?.branch || ''}
                                        onChange={(e) =>
                                            setCompanyDetails({
                                                ...companyDetails,
                                                bankDetails: { ...companyDetails.bankDetails, branch: e.target.value },
                                            })
                                        }
                                        className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Account Number"
                                        value={companyDetails.bankDetails?.accountNo || ''}
                                        onChange={(e) =>
                                            setCompanyDetails({
                                                ...companyDetails,
                                                bankDetails: { ...companyDetails.bankDetails, accountNo: e.target.value },
                                            })
                                        }
                                        className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none font-mono"
                                    />
                                    <input
                                        type="text"
                                        placeholder="IFSC Code"
                                        value={companyDetails.bankDetails?.ifscCode || ''}
                                        onChange={(e) =>
                                            setCompanyDetails({
                                                ...companyDetails,
                                                bankDetails: { ...companyDetails.bankDetails, ifscCode: e.target.value },
                                            })
                                        }
                                        className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none font-mono"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    onClick={async () => {
                                        const toastId = toast.loading('Saving company details...');
                                        try {
                                            if (onUpdateDetails) {
                                                await onUpdateDetails(companyDetails);
                                            } else {
                                                await saveCompanyDetails(companyDetails);
                                            }
                                            toast.success('Company profile updated successfully!', { id: toastId });
                                        } catch (e: any) {
                                            toast.error('Failed to save profile: ' + e?.message, { id: toastId });
                                        }
                                    }}
                                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                    Save Company Details
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ============================================================== */}
            {/* MODALS */}
            {/* ============================================================== */}

            {/* Modal 1: Create User / Operator */}
            {showAddUserModal && (
                <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fadeIn">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-white text-base flex items-center gap-2">
                                <UsersIcon className="w-5 h-5 text-indigo-400" /> Create System Account
                            </h3>
                            <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-white">
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-slate-300 font-bold mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    placeholder="operator@company.com"
                                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-300 font-bold mb-1">Temporary Password</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={newUserPassword}
                                    onChange={(e) => setNewUserPassword(e.target.value)}
                                    placeholder="Minimum 6 characters"
                                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-300 font-bold mb-1">Assigned Role</label>
                                <select
                                    value={newUserRole}
                                    onChange={(e) => setNewUserRole(e.target.value as any)}
                                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                >
                                    <option value="Operator">Operator (Standard LR & Master Data Entry)</option>
                                    <option value="Manager">Manager (Supervisory role)</option>
                                    <option value="Admin">Admin (Full administrative control)</option>
                                </select>
                            </div>
                            <div className="pt-2 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddUserModal(false)}
                                    className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingUser}
                                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold disabled:opacity-50"
                                >
                                    {isCreatingUser ? 'Creating...' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 2: Edit User / Operator */}
            {editingOperator && (
                <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fadeIn">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-white text-base flex items-center gap-2">
                                <PencilIcon className="w-5 h-5 text-blue-400" /> Edit Account
                            </h3>
                            <button onClick={() => setEditingOperator(null)} className="text-slate-400 hover:text-white">
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateOperator} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-slate-300 font-bold mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-300 font-bold mb-1">New Password (leave empty to keep current)</label>
                                <input
                                    type="password"
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-300 font-bold mb-1">Role</label>
                                <select
                                    value={editRole}
                                    onChange={(e) => setEditRole(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                >
                                    <option value="Operator">Operator</option>
                                    <option value="Manager">Manager</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                            <div className="pt-2 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingOperator(null)}
                                    className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdatingOperator}
                                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold disabled:opacity-50"
                                >
                                    {isUpdatingOperator ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 3: View Full LR Details */}
            {viewingLR && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl animate-fadeIn space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <h3 className="font-black text-white text-base">
                                Lorry Receipt #{viewingLR.lrNo}
                            </h3>
                            <button onClick={() => setViewingLR(null)} className="text-slate-400 hover:text-white">
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                            <div className="p-3 bg-slate-950 rounded-xl">
                                <span className="text-slate-400 block">Date</span>
                                <span className="font-bold text-white">{viewingLR.date}</span>
                            </div>
                            <div className="p-3 bg-slate-950 rounded-xl">
                                <span className="text-slate-400 block">Truck No</span>
                                <span className="font-bold text-amber-300 font-mono">{viewingLR.truckNo}</span>
                            </div>
                            <div className="p-3 bg-slate-950 rounded-xl">
                                <span className="text-slate-400 block">Status</span>
                                <span className="font-bold text-emerald-400">{viewingLR.status}</span>
                            </div>
                            <div className="p-3 bg-slate-950 rounded-xl">
                                <span className="text-slate-400 block">From Place</span>
                                <span className="font-bold text-white">{viewingLR.fromPlace}</span>
                            </div>
                            <div className="p-3 bg-slate-950 rounded-xl">
                                <span className="text-slate-400 block">To Place</span>
                                <span className="font-bold text-white">{viewingLR.toPlace}</span>
                            </div>
                            <div className="p-3 bg-slate-950 rounded-xl">
                                <span className="text-slate-400 block">Freight</span>
                                <span className="font-mono font-bold text-emerald-400">₹{viewingLR.freight}</span>
                            </div>
                            <div className="p-3 bg-slate-950 rounded-xl col-span-2 sm:col-span-3">
                                <span className="text-slate-400 block">Consignor</span>
                                <span className="font-bold text-white">{viewingLR.consignor?.name}</span>
                                <span className="text-slate-400 block text-[11px]">{viewingLR.consignor?.address}</span>
                            </div>
                            <div className="p-3 bg-slate-950 rounded-xl col-span-2 sm:col-span-3">
                                <span className="text-slate-400 block">Consignee</span>
                                <span className="font-bold text-white">{viewingLR.consignee?.name}</span>
                                <span className="text-slate-400 block text-[11px]">{viewingLR.consignee?.address}</span>
                            </div>
                        </div>
                        <div className="pt-2 flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setEditingLR({ ...viewingLR });
                                    setViewingLR(null);
                                }}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold"
                            >
                                Edit this LR
                            </button>
                            <button
                                onClick={() => setViewingLR(null)}
                                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 4: Edit LR Record */}
            {editingLR && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl animate-fadeIn space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <h3 className="font-black text-white text-base">Edit LR #{editingLR.lrNo}</h3>
                            <button onClick={() => setEditingLR(null)} className="text-slate-400 hover:text-white">
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveEditedLR} className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={editingLR.date}
                                        onChange={(e) => setEditingLR({ ...editingLR, date: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Truck No</label>
                                    <input
                                        type="text"
                                        value={editingLR.truckNo}
                                        onChange={(e) => setEditingLR({ ...editingLR, truckNo: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Status</label>
                                    <select
                                        value={editingLR.status}
                                        onChange={(e) => setEditingLR({ ...editingLR, status: e.target.value as LRStatus })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    >
                                        <option value="Booked">Booked</option>
                                        <option value="In Transit">In Transit</option>
                                        <option value="Out for Delivery">Out for Delivery</option>
                                        <option value="Delivered">Delivered</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">From Place</label>
                                    <input
                                        type="text"
                                        value={editingLR.fromPlace}
                                        onChange={(e) => setEditingLR({ ...editingLR, fromPlace: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">To Place</label>
                                    <input
                                        type="text"
                                        value={editingLR.toPlace}
                                        onChange={(e) => setEditingLR({ ...editingLR, toPlace: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Freight Amount</label>
                                    <input
                                        type="number"
                                        value={editingLR.freight}
                                        onChange={(e) => setEditingLR({ ...editingLR, freight: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono focus:outline-none"
                                    />
                                </div>
                                <div className="sm:col-span-3">
                                    <label className="block text-slate-300 font-bold mb-1">Consignor Name</label>
                                    <input
                                        type="text"
                                        value={editingLR.consignor?.name || ''}
                                        onChange={(e) =>
                                            setEditingLR({
                                                ...editingLR,
                                                consignor: { ...editingLR.consignor, name: e.target.value },
                                            })
                                        }
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                </div>
                                <div className="sm:col-span-3">
                                    <label className="block text-slate-300 font-bold mb-1">Consignee Name</label>
                                    <input
                                        type="text"
                                        value={editingLR.consignee?.name || ''}
                                        onChange={(e) =>
                                            setEditingLR({
                                                ...editingLR,
                                                consignee: { ...editingLR.consignee, name: e.target.value },
                                            })
                                        }
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingLR(null)}
                                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 5: Create New LR */}
            {showCreateLRModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl animate-fadeIn space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <h3 className="font-black text-white text-base">+ Create New Lorry Receipt (Bilty)</h3>
                            <button onClick={() => setShowCreateLRModal(false)} className="text-slate-400 hover:text-white">
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateNewLR} className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">LR Number *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newLRData.lrNo || ''}
                                        onChange={(e) => setNewLRData({ ...newLRData, lrNo: e.target.value })}
                                        placeholder="e.g. 1001"
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={newLRData.date}
                                        onChange={(e) => setNewLRData({ ...newLRData, date: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Truck Number *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newLRData.truckNo || ''}
                                        onChange={(e) => setNewLRData({ ...newLRData, truckNo: e.target.value.toUpperCase() })}
                                        placeholder="MH12AB1234"
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">From Place</label>
                                    <input
                                        type="text"
                                        value={newLRData.fromPlace || ''}
                                        onChange={(e) => setNewLRData({ ...newLRData, fromPlace: e.target.value })}
                                        placeholder="Origin"
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">To Place</label>
                                    <input
                                        type="text"
                                        value={newLRData.toPlace || ''}
                                        onChange={(e) => setNewLRData({ ...newLRData, toPlace: e.target.value })}
                                        placeholder="Destination"
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Freight (₹)</label>
                                    <input
                                        type="number"
                                        value={newLRData.freight || 0}
                                        onChange={(e) => setNewLRData({ ...newLRData, freight: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono focus:outline-none"
                                    />
                                </div>
                                <div className="sm:col-span-3">
                                    <label className="block text-slate-300 font-bold mb-1">Consignor Name</label>
                                    <input
                                        type="text"
                                        value={newLRData.consignor?.name || ''}
                                        onChange={(e) =>
                                            setNewLRData({
                                                ...newLRData,
                                                consignor: { ...newLRData.consignor!, name: e.target.value },
                                            })
                                        }
                                        placeholder="Sender party name"
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                </div>
                                <div className="sm:col-span-3">
                                    <label className="block text-slate-300 font-bold mb-1">Consignee Name</label>
                                    <input
                                        type="text"
                                        value={newLRData.consignee?.name || ''}
                                        onChange={(e) =>
                                            setNewLRData({
                                                ...newLRData,
                                                consignee: { ...newLRData.consignee!, name: e.target.value },
                                            })
                                        }
                                        placeholder="Receiver party name"
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateLRModal(false)}
                                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
                                >
                                    Create LR
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 6: Add / Edit Truck */}
            {(showAddTruckModal || editingTruck) && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-fadeIn space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <h3 className="font-black text-white text-base flex items-center gap-2">
                                <TruckIcon className="w-5 h-5 text-emerald-400" />
                                {editingTruck ? `Edit Truck ${editingTruck.truckNo}` : 'Register New Truck'}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowAddTruckModal(false);
                                    setEditingTruck(null);
                                }}
                                className="text-slate-400 hover:text-white"
                            >
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form
                            onSubmit={editingTruck ? handleUpdateTruck : handleSaveNewTruck}
                            className="space-y-4 text-xs"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Truck Number *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingTruck ? editingTruck.truckNo : newTruckData.truckNo || ''}
                                        onChange={(e) => {
                                            const val = e.target.value.toUpperCase();
                                            if (editingTruck) setEditingTruck({ ...editingTruck, truckNo: val });
                                            else setNewTruckData({ ...newTruckData, truckNo: val });
                                        }}
                                        placeholder="MH12AB1234"
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Make / Brand</label>
                                    <input
                                        type="text"
                                        value={editingTruck ? editingTruck.make || '' : newTruckData.make || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (editingTruck) setEditingTruck({ ...editingTruck, make: val });
                                            else setNewTruckData({ ...newTruckData, make: val });
                                        }}
                                        placeholder="Tata Motors, Ashok Leyland"
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Truck Type</label>
                                    <input
                                        type="text"
                                        value={editingTruck ? editingTruck.truckType || '' : newTruckData.truckType || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (editingTruck) setEditingTruck({ ...editingTruck, truckType: val });
                                            else setNewTruckData({ ...newTruckData, truckType: val });
                                        }}
                                        placeholder="Open Body, Container, Trailer"
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Capacity</label>
                                    <input
                                        type="text"
                                        value={editingTruck ? editingTruck.capacity || '' : newTruckData.capacity || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (editingTruck) setEditingTruck({ ...editingTruck, capacity: val });
                                            else setNewTruckData({ ...newTruckData, capacity: val });
                                        }}
                                        placeholder="20 Ton, 40 Ton"
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Driver Name</label>
                                    <input
                                        type="text"
                                        value={editingTruck ? editingTruck.driverName || '' : newTruckData.driverName || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (editingTruck) setEditingTruck({ ...editingTruck, driverName: val });
                                            else setNewTruckData({ ...newTruckData, driverName: val });
                                        }}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Driver Contact</label>
                                    <input
                                        type="text"
                                        value={editingTruck ? editingTruck.driverContact || '' : newTruckData.driverContact || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (editingTruck) setEditingTruck({ ...editingTruck, driverContact: val });
                                            else setNewTruckData({ ...newTruckData, driverContact: val });
                                        }}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddTruckModal(false);
                                        setEditingTruck(null);
                                    }}
                                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold"
                                >
                                    {editingTruck ? 'Save Changes' : 'Register Truck'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 7: Add / Edit Party */}
            {(showAddPartyModal || editingParty) && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-fadeIn space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <h3 className="font-black text-white text-base flex items-center gap-2">
                                <UserGroupIcon className="w-5 h-5 text-amber-400" />
                                {editingParty ? `Edit Party: ${editingParty.name}` : 'Add Master Party'}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowAddPartyModal(false);
                                    setEditingParty(null);
                                }}
                                className="text-slate-400 hover:text-white"
                            >
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form
                            onSubmit={editingParty ? handleUpdateParty : handleSaveNewParty}
                            className="space-y-4 text-xs"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="block text-slate-300 font-bold mb-1">Party Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingParty ? editingParty.name : newPartyData.name || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (editingParty) setEditingParty({ ...editingParty, name: val });
                                            else setNewPartyData({ ...newPartyData, name: val });
                                        }}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Type</label>
                                    <select
                                        value={editingParty ? editingParty.type : newPartyData.type || 'Both'}
                                        onChange={(e) => {
                                            const val = e.target.value as any;
                                            if (editingParty) setEditingParty({ ...editingParty, type: val });
                                            else setNewPartyData({ ...newPartyData, type: val });
                                        }}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    >
                                        <option value="Consignor">Consignor</option>
                                        <option value="Consignee">Consignee</option>
                                        <option value="Both">Both (Consignor & Consignee)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">City</label>
                                    <input
                                        type="text"
                                        value={editingParty ? editingParty.city || '' : newPartyData.city || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (editingParty) setEditingParty({ ...editingParty, city: val });
                                            else setNewPartyData({ ...newPartyData, city: val });
                                        }}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">GSTN</label>
                                    <input
                                        type="text"
                                        value={editingParty ? editingParty.gst || '' : newPartyData.gst || ''}
                                        onChange={(e) => {
                                            const val = e.target.value.toUpperCase();
                                            if (editingParty) setEditingParty({ ...editingParty, gst: val });
                                            else setNewPartyData({ ...newPartyData, gst: val });
                                        }}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Contact Phone</label>
                                    <input
                                        type="text"
                                        value={editingParty ? editingParty.contact || '' : newPartyData.contact || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (editingParty) setEditingParty({ ...editingParty, contact: val });
                                            else setNewPartyData({ ...newPartyData, contact: val });
                                        }}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-slate-300 font-bold mb-1">Address</label>
                                    <input
                                        type="text"
                                        value={editingParty ? editingParty.address || '' : newPartyData.address || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (editingParty) setEditingParty({ ...editingParty, address: val });
                                            else setNewPartyData({ ...newPartyData, address: val });
                                        }}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddPartyModal(false);
                                        setEditingParty(null);
                                    }}
                                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold"
                                >
                                    {editingParty ? 'Save Changes' : 'Add Party'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 8: Add / Edit Voucher */}
            {(showAddVoucherModal || editingVoucher) && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-fadeIn space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <h3 className="font-black text-white text-base flex items-center gap-2">
                                <CurrencyRupeeIcon className="w-5 h-5 text-rose-400" />
                                {editingVoucher ? `Edit Voucher #${editingVoucher.voucher_no}` : 'Record New Voucher'}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowAddVoucherModal(false);
                                    setEditingVoucher(null);
                                }}
                                className="text-slate-400 hover:text-white"
                            >
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form
                            onSubmit={editingVoucher ? handleUpdateVoucher : handleSaveNewVoucher}
                            className="space-y-4 text-xs"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Voucher Number *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingVoucher ? editingVoucher.voucher_no : newVoucherData.voucher_no || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (editingVoucher) setEditingVoucher({ ...editingVoucher, voucher_no: val });
                                            else setNewVoucherData({ ...newVoucherData, voucher_no: val });
                                        }}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={editingVoucher ? editingVoucher.date : newVoucherData.date}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (editingVoucher) setEditingVoucher({ ...editingVoucher, date: val });
                                            else setNewVoucherData({ ...newVoucherData, date: val });
                                        }}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Party / Payee Name</label>
                                    <input
                                        type="text"
                                        value={editingVoucher ? editingVoucher.party_name || '' : newVoucherData.party_name || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (editingVoucher) setEditingVoucher({ ...editingVoucher, party_name: val });
                                            else setNewVoucherData({ ...newVoucherData, party_name: val });
                                        }}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Amount (₹) *</label>
                                    <input
                                        type="number"
                                        required
                                        value={editingVoucher ? editingVoucher.amount : newVoucherData.amount || 0}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            if (editingVoucher) setEditingVoucher({ ...editingVoucher, amount: val });
                                            else setNewVoucherData({ ...newVoucherData, amount: val });
                                        }}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Payment Mode</label>
                                    <select
                                        value={editingVoucher ? editingVoucher.payment_mode : newVoucherData.payment_mode || 'Cash'}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (editingVoucher) setEditingVoucher({ ...editingVoucher, payment_mode: val });
                                            else setNewVoucherData({ ...newVoucherData, payment_mode: val });
                                        }}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Cheque">Cheque</option>
                                        <option value="UPI">UPI / GPay / PhonePe</option>
                                        <option value="NEFT">NEFT / RTGS</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Description / Remarks</label>
                                    <input
                                        type="text"
                                        value={editingVoucher ? editingVoucher.description || '' : newVoucherData.description || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (editingVoucher) setEditingVoucher({ ...editingVoucher, description: val });
                                            else setNewVoucherData({ ...newVoucherData, description: val });
                                        }}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddVoucherModal(false);
                                        setEditingVoucher(null);
                                    }}
                                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold"
                                >
                                    {editingVoucher ? 'Save Changes' : 'Record Voucher'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 9: Add / Edit Raw Ledger Entry */}
            {(showAddLedgerEntryModal || editingLedgerEntry) && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fadeIn space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <h3 className="font-black text-white text-base">
                                {editingLedgerEntry ? 'Edit Ledger Entry' : 'Add Ledger Entry'}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowAddLedgerEntryModal(false);
                                    setEditingLedgerEntry(null);
                                }}
                                className="text-slate-400 hover:text-white"
                            >
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form
                            onSubmit={editingLedgerEntry ? handleUpdateLedgerEntry : handleSaveNewLedgerEntry}
                            className="space-y-4 text-xs"
                        >
                            <div>
                                <label className="block text-slate-300 font-bold mb-1">Date</label>
                                <input
                                    type="date"
                                    value={editingLedgerEntry ? editingLedgerEntry.date : newLedgerEntryData.date}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (editingLedgerEntry) setEditingLedgerEntry({ ...editingLedgerEntry, date: val });
                                        else setNewLedgerEntryData({ ...newLedgerEntryData, date: val });
                                    }}
                                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-300 font-bold mb-1">Party Name</label>
                                <input
                                    type="text"
                                    value={editingLedgerEntry ? editingLedgerEntry.party_name || '' : newLedgerEntryData.party_name || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (editingLedgerEntry) setEditingLedgerEntry({ ...editingLedgerEntry, party_name: val });
                                        else setNewLedgerEntryData({ ...newLedgerEntryData, party_name: val });
                                    }}
                                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Credit (Cr)</label>
                                    <input
                                        type="number"
                                        value={editingLedgerEntry ? editingLedgerEntry.credit : newLedgerEntryData.credit || 0}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            if (editingLedgerEntry) setEditingLedgerEntry({ ...editingLedgerEntry, credit: val });
                                            else setNewLedgerEntryData({ ...newLedgerEntryData, credit: val });
                                        }}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Debit (Dr)</label>
                                    <input
                                        type="number"
                                        value={editingLedgerEntry ? editingLedgerEntry.debit : newLedgerEntryData.debit || 0}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            if (editingLedgerEntry) setEditingLedgerEntry({ ...editingLedgerEntry, debit: val });
                                            else setNewLedgerEntryData({ ...newLedgerEntryData, debit: val });
                                        }}
                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-slate-300 font-bold mb-1">Description</label>
                                <input
                                    type="text"
                                    value={editingLedgerEntry ? editingLedgerEntry.description : newLedgerEntryData.description || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (editingLedgerEntry) setEditingLedgerEntry({ ...editingLedgerEntry, description: val });
                                        else setNewLedgerEntryData({ ...newLedgerEntryData, description: val });
                                    }}
                                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none"
                                />
                            </div>
                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddLedgerEntryModal(false);
                                        setEditingLedgerEntry(null);
                                    }}
                                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold"
                                >
                                    {editingLedgerEntry ? 'Save Changes' : 'Add Entry'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 10: Direct User Password Update */}
            {passwordModalUser && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fadeIn space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <h3 className="font-black text-white text-base flex items-center gap-2">
                                <KeyIcon className="w-5 h-5 text-amber-400" /> Update User Password
                            </h3>
                            <button
                                onClick={() => {
                                    setPasswordModalUser(null);
                                    setNewPasswordValue('');
                                }}
                                className="text-slate-400 hover:text-white"
                            >
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleDirectPasswordUpdate} className="space-y-4 text-xs">
                            <div className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1">
                                <div className="text-[11px] text-slate-400">Target User Account:</div>
                                <div className="font-bold text-white text-sm font-mono">{passwordModalUser.email}</div>
                                <div className="text-[10px] text-indigo-400 uppercase font-black">Role: {passwordModalUser.role}</div>
                            </div>
                            <div>
                                <label className="block text-slate-300 font-bold mb-1">New Password *</label>
                                <input
                                    type="password"
                                    required
                                    value={newPasswordValue}
                                    onChange={(e) => setNewPasswordValue(e.target.value)}
                                    placeholder="Enter new password (min 6 characters)"
                                    className="w-full px-3 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                                    minLength={6}
                                />
                            </div>
                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPasswordModalUser(null);
                                        setNewPasswordValue('');
                                    }}
                                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdatingPassword}
                                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-600/30 transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    {isUpdatingPassword ? 'Updating...' : 'Set New Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel3D;
