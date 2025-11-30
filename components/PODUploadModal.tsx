import React, { useState, useCallback } from 'react';
import { LorryReceipt } from '../types';
import { XIcon, UploadIcon, DocumentTextIcon } from './icons';
import { toast } from 'react-hot-toast';

interface PODUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    lr: LorryReceipt;
    onUpload: (lr: LorryReceipt, file: File) => void;
}

const PODUploadModal: React.FC<PODUploadModalProps> = ({ isOpen, onClose, lr, onUpload }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
                toast.error('Invalid file type. Please select a JPG, PNG, or PDF.');
                return;
            }
            // Validate file size (e.g., 5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                toast.error('File is too large. Maximum size is 5MB.');
                return;
            }

            setSelectedFile(file);

            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreviewUrl(reader.result as string);
                };
                reader.readAsDataURL(file);
            } else {
                setPreviewUrl(null); // No preview for PDF, but we can show an icon
            }
        }
    };

    const handleUpload = () => {
        if (!selectedFile) {
            toast.error('Please select a file to upload.');
            return;
        }
        setIsLoading(true);
        onUpload(lr, selectedFile);
        // The modal will be closed by the parent component on success.
    };
    
    const handleClose = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setIsLoading(false);
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Upload Proof of Delivery (POD)</h2>
                    <button onClick={handleClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                    For Lorry Receipt: <span className="font-bold text-ssk-blue">{lr.lrNo}</span>
                </p>

                <div className="mt-4">
                    <label htmlFor="pod-upload" className="block text-sm font-medium text-gray-700 mb-2">Select a file (JPG, PNG, PDF - max 5MB)</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div className="flex text-sm text-gray-600">
                                <label htmlFor="pod-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-ssk-blue hover:text-blue-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-ssk-blue">
                                    <span>Upload a file</span>
                                    <input id="pod-upload" name="pod-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".jpg,.jpeg,.png,.pdf" />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500">PNG, JPG, PDF up to 5MB</p>
                        </div>
                    </div>
                </div>

                {selectedFile && (
                    <div className="mt-4 border-t pt-4">
                        <h3 className="text-md font-medium text-gray-900">Preview:</h3>
                        <div className="mt-2 p-2 border rounded-md bg-gray-50 flex items-center justify-center">
                            {previewUrl ? (
                                <img src={previewUrl} alt="File preview" className="max-h-60 object-contain rounded" />
                            ) : (
                                <div className="text-center text-gray-500 py-10">
                                    <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-400" />
                                    <p className="mt-2 font-semibold">{selectedFile.name}</p>
                                    <p className="text-sm">PDF file (no preview available)</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}


                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={handleClose} className="bg-white text-gray-700 px-4 py-2 rounded-md hover:bg-gray-100 font-semibold border shadow-sm">
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        onClick={handleUpload}
                        disabled={!selectedFile || isLoading}
                        className="flex items-center bg-ssk-blue text-white px-4 py-2 rounded-md hover:bg-blue-800 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm"
                    >
                        <UploadIcon className="w-5 h-5 mr-2" />
                        {isLoading ? 'Uploading...' : 'Upload & Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PODUploadModal;
