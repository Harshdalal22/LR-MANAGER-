# RBAC Implementation - Manual Integration Steps

## Summary
I've implemented a comprehensive Role-Based Access Control (RBAC) system with login-time role selection. Most of the code is in place, but a few manual edits are needed in App.tsx due to file editing conflicts.

## What's Already Done ✅

1. **types.ts** - Added `managerPasskey` field to CompanyDetails
2. **Header.tsx** - Added Manager Passkey input field in settings
3. **RoleSelection.tsx** - NEW beautiful role selection component created
4. **App.tsx** - Partially updated with:
   - RoleSelection import
   - State variables: `showRoleSelection`, `roleSelectionError`
   - useEffect to show role selection on login
   - Updated handleSignOut to clear role selection

## Manual Steps Needed 🔧

### Step 1: Update handleRoleChange function in App.tsx

Find the `handleRoleChange` function (around line 320) and replace it with:

```typescript
const handleRoleChange = (role: 'Admin' | 'Manager', passkey?: string) => {
    if (role === 'Admin' && companyDetails.rbacEnabled) {
        if (companyDetails.adminPasskey && passkey !== companyDetails.adminPasskey) {
            toast.error("Invalid Admin Passkey");
            return false;
        }
    }
    if (role === 'Manager' && companyDetails.rbacEnabled) {
        if (companyDetails.managerPasskey && passkey !== companyDetails.managerPasskey) {
            toast.error("Invalid Manager Passkey");
            return false;
        }
    }
    setCurrentRole(role);
    toast.success(`Switched to ${role} mode`);
    
    // If switching to Manager while in restricted view, go to dashboard
    const restrictedViews: View[] = ['vehicle-hiring', 'booking-register', 'data-management', 'invoices'];
    if (role === 'Manager' && companyDetails.rbacEnabled && restrictedViews.includes(currentView)) {
        setCurrentView('dashboard');
    }
    return true;
};
```

### Step 2: Add New Handler Functions in App.tsx

Add these TWO new functions right after `handleRoleChange`:

```typescript
const handleRoleSelection = (role: 'Admin' | 'Manager', passkey: string) => {
    // Verify passkey
    if (role === 'Admin') {
        if (!companyDetails.adminPasskey || passkey !== companyDetails.adminPasskey) {
            toast.error('Invalid Admin passkey');
            return;
        }
    } else if (role === 'Manager') {
        if (!companyDetails.managerPasskey || passkey !== companyDetails.managerPasskey) {
            toast.error('Invalid Manager passkey');
            return;
        }
    }

    // Set role and mark as selected
    setCurrentRole(role);
    setShowRoleSelection(false);
    sessionStorage.setItem('roleSelected', 'true');
    toast.success(`Logged in as ${role}`);
};

const handleCancelRoleSelection = async () => {
    // Sign out if user cancels role selection
    await handleSignOut();
    setShowRoleSelection(false);
};
```

### Step 3: Add RoleSelection Component to Render

Find the end of the return statement in App.tsx (around line 524), just before the closing `</div>`, and add:

```tsx
{showRoleSelection && (
    <RoleSelection
        onRoleSelect={handleRoleSelection}
        onCancel={handleCancelRoleSelection}
    />
)}
```

It should look like this:
```tsx
            {isPasswordResetting && (
                <PasswordResetModal
                    isOpen={isPasswordResetting}
                    onSubmit={handleUpdatePassword}
                    onCancel={() => setIsPasswordResetting(false)}
                />
            )}
            {showRoleSelection && (
                <RoleSelection
                    onRoleSelect={handleRoleSelection}
                    onCancel={handleCancelRoleSelection}
                />
            )}
        </div>
    );
};
```

## How It Works 🎯

1. **Admin enables RBAC** in Settings and sets both Admin and Manager passkeys
2. **Passkeys are saved** to Supabase in the company_details table
3. **On next login**, if RBAC is enabled, the user sees a beautiful role selection screen
4. **User chooses** either Admin or Manager role
5. **User enters** the corresponding passkey
6. **System verifies** the passkey and grants access with appropriate permissions
7. **Role persists** in sessionStorage until logout

## Features ✨

- Beautiful, modern UI for role selection
- Separate passkeys for Admin and Manager
- Login-time role authentication
- Role switching during session (with passkey verification)
- Automatic navigation guards for restricted views
- Session persistence with sessionStorage

## Testing Steps 📝

1. Login as admin
2. Go to Settings → Role Management (RBAC)
3. Enable Role System
4. Set Admin Passkey (e.g., "admin123")
5. Set Manager Passkey (e.g., "manager123")
6. Save settings
7. Sign out
8. Sign in again
9. You should see the Role Selection screen!
10. Try both roles with their respective passkeys

---

**Note**: The role-handlers-temp.txt file contains a backup of the handler functions for reference.
