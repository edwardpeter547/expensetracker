/**
 * UI-only view models for the future receipt scanning, upload, and recognition
 * workflows. These types describe presentation state; they do not invoke
 * device hardware, file access, OCR, or backend APIs.
 */

/** Where a receipt attachment came from. */
export type ReceiptSource = 'scanner' | 'upload';

/** Supported receipt file families for presentation. */
export type ReceiptFileKind = 'image' | 'pdf';

/** Metadata needed to render a receipt attachment. */
export interface ReceiptFileInfo {
    id: string;
    source: ReceiptSource;
    name: string;
    kind: ReceiptFileKind;
    mimeType: string;
    sizeBytes?: number;
    thumbnailUri?: string | null;
}

/** Lifecycle state for a selected receipt attachment. */
export type ReceiptAttachmentStatus =
    | 'idle'
    | 'selected'
    | 'processing'
    | 'ready'
    | 'error';

/** Current receipt attachment presentation state. */
export interface ReceiptAttachmentState {
    status: ReceiptAttachmentStatus;
    file: ReceiptFileInfo | null;
    errorMessage?: string | null;
}

/** Recognition lifecycle states. */
export type ReceiptRecognitionStatus =
    | 'idle'
    | 'processing'
    | 'success'
    | 'partial'
    | 'failed'
    | 'unavailable';

/** One recognized receipt line item. */
export interface ReceiptLineItem {
    description: string;
    amount: string;
}

/** Fields a future recognition service may suggest for review. */
export interface ReceiptRecognitionResult {
    merchant?: string;
    total?: string;
    date?: string;
    currency?: string;
    categoryId?: string;
    categoryName?: string;
    tax?: string;
    lineItems?: ReceiptLineItem[];
    confidence?: number;
}

/** Complete recognition presentation state. */
export interface ReceiptRecognitionState {
    status: ReceiptRecognitionStatus;
    message?: string | null;
    result?: ReceiptRecognitionResult | null;
    missingFields?: string[];
}

/** Document scanner capture mode. */
export type ReceiptScannerMode = 'auto' | 'manual';

/** Scanner phases exposed by the UI-only scanner shell. */
export type ReceiptScannerPhase = 'ready' | 'processing';

/** A UI-only scanned result produced for preview purposes. */
export interface ReceiptScanResult {
    id: string;
    name: string;
    mimeType: string;
    sizeBytes?: number;
    thumbnailUri?: string | null;
}

/** Upload validation errors shown without real file access. */
export type ReceiptUploadErrorKind = 'unsupported' | 'oversized' | 'cancelled' | 'none';
