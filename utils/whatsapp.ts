import { LorryReceipt, CompanyDetails } from '../types';

/**
 * Clean and format phone numbers for WhatsApp
 */
export const sanitizeWhatsAppPhone = (phone?: string): string => {
    if (!phone) return '';
    let digits = phone.replace(/[^0-9]/g, '');
    if (digits.length === 11 && digits.startsWith('0')) {
        digits = '91' + digits.slice(1);
    } else if (digits.length === 10) {
        digits = '91' + digits;
    } else if (digits.length < 10) {
        return '';
    }
    return digits;
};

/**
 * Formats a comprehensive LR / Bilty dispatch summary for WhatsApp sharing
 */
export const formatLRWhatsAppText = (lr: LorryReceipt, companyDetails?: Partial<CompanyDetails>): string => {
    const pkgs = (lr.items || []).reduce((sum, it) => sum + (Number(it.pcs) || 0), 0);
    const weightVal = Number(lr.weight) || 0;
    const actualWtMt = Number(lr.actualWeightMT) || 0;
    const weightStr = actualWtMt > 0
        ? `${actualWtMt} MT (${weightVal.toLocaleString('en-IN')} Kg)`
        : (weightVal > 0 ? `${weightVal.toLocaleString('en-IN')} Kg` : (pkgs > 0 ? `${pkgs} Pkgs` : 'As per invoice'));
    
    const freightAmount = Number(lr.freight) || 0;
    const freightStr = `₹ ${freightAmount.toLocaleString('en-IN')} (${lr.freightBasis || (lr.gstPaidBy === 'Consignor' ? 'PAID' : 'TO PAY')})`;
    
    const companyName = companyDetails?.name || 'BiltyBook Logistics';
    const helpline = companyDetails?.contact?.[0] ? `\n📞 Helpline: ${companyDetails.contact[0]}` : '';

    return `🚚 *LORRY RECEIPT / BILTY DISPATCH*
━━━━━━━━━━━━━━━━━━━━
📄 *LR No:* ${lr.lrNo || 'Draft'}
📅 *Date:* ${lr.date || new Date().toISOString().split('T')[0]}
🚛 *Vehicle:* ${lr.truckNo || 'N/A'}
📍 *Route:* ${lr.fromPlace || 'Origin'} ➔ ${lr.toPlace || 'Destination'}
🏢 *Consignor:* ${lr.consignor?.name || 'N/A'}
🏬 *Consignee:* ${lr.consignee?.name || 'N/A'}
📦 *Packages:* ${pkgs > 0 ? `${pkgs} Pkgs` : 'As per invoice'}
⚖️ *Weight:* ${weightStr}
💰 *Freight:* ${freightStr}
${lr.ewayBillNo ? `📑 *E-Way Bill:* ${lr.ewayBillNo}\n` : ''}${lr.invoiceNo ? `🧾 *Invoice No:* ${lr.invoiceNo}\n` : ''}━━━━━━━━━━━━━━━━━━━━
Carrier: *${companyName}*${helpline}`;
};

/**
 * Reliably opens WhatsApp on Desktop Web, Mobile Browser, or Native Android App
 */
export const openWhatsAppDirect = (text: string, rawPhone?: string): void => {
    const phone = sanitizeWhatsAppPhone(rawPhone);
    const encoded = encodeURIComponent(text);

    // Universal WhatsApp URL
    const url = phone 
        ? `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`
        : `https://api.whatsapp.com/send?text=${encoded}`;

    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isCapacitor = typeof window !== 'undefined' && Boolean((window as any).Capacitor);

    if (isMobile || isCapacitor) {
        // Direct location change triggers native Android/iOS WhatsApp app without popup-blocker
        try {
            window.location.href = url;
        } catch {
            window.open(url, '_blank');
        }
    } else {
        // On desktop, click a synthetic anchor tag with target="_blank"
        try {
            const a = document.createElement('a');
            a.href = url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                if (document.body.contains(a)) {
                    document.body.removeChild(a);
                }
            }, 300);
        } catch {
            window.open(url, '_blank');
        }
    }
};

