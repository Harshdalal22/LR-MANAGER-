
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LorryReceipt, CompanyDetails, LRStatus } from '../types';
import { PencilIcon, TrashIcon, DownloadIcon, SearchIcon, PrintIcon, FilterIcon, DotsVerticalIcon, DashboardIcon, CheckCircleIcon, ClockIcon, TruckIcon, XIcon, UploadIcon, DocumentTextIcon, InvoiceIcon } from './icons';
import LRPreviewModal, { LRContent } from './LRPreviewModal';
import InvoiceModal from './InvoiceModal';

interface LRListProps {
    lorryReceipts: LorryReceipt[];
    onEdit: (lrNo: string) => void;
    onDelete: (lrNo: string) => void;
    onAddNew: () => void;
    companyDetails: CompanyDetails;
    onBackToDashboard: () => void;
    onUpdateStatus: (lrNo: string, status: LRStatus) => void;
    onOpenPODUploader: (lr: LorryReceipt) => void;
    onViewPOD: (podPath: string) => void;
    onUpdateInvoiceDetails?: (lrNos: string[], invoiceNo: string, invoiceDate: string) => Promise<void>;
}

const statusColors: { [key in LRStatus]: string } = {
    Booked: 'bg-blue-100 text-blue-800',
    'In Transit': 'bg-yellow-100 text-yellow-8