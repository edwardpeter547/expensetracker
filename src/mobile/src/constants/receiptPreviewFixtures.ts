/**
 * Clearly labeled UI-only fixture states for receipt components.
 *
 * These exist purely for visual development and component tests. They are not
 * demo transaction data, do not represent captured files, and are never used
 * as production fallback values.
 */

import type {
    ReceiptAttachmentState,
    ReceiptFileInfo,
    ReceiptRecognitionState,
    ReceiptScanResult,
} from '@/types/receipt';

/** A sample image receipt for UI preview. */
export const PREVIEW_IMAGE_RECEIPT: ReceiptFileInfo = {
    id: 'preview-image-receipt',
    source: 'upload',
    name: 'grocery-receipt.jpg',
    kind: 'image',
    mimeType: 'image/jpeg',
    sizeBytes: 204_800,
    thumbnailUri: null,
};

/** A sample PDF receipt for UI preview. */
export const PREVIEW_PDF_RECEIPT: ReceiptFileInfo = {
    id: 'preview-pdf-receipt',
    source: 'upload',
    name: 'hotel-bill.pdf',
    kind: 'pdf',
    mimeType: 'application/pdf',
    sizeBytes: 512_000,
    thumbnailUri: null,
};

/** A sample scanned result for the scan-preview shell. */
export const PREVIEW_SCAN_RESULT: ReceiptScanResult = {
    id: 'preview-scan-result',
    name: 'scanned-receipt.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 180_000,
    thumbnailUri: null,
};

/** Representative attachment states for preview. */
export const PREVIEW_ATTACHMENT_STATES: Record<string, ReceiptAttachmentState> = {
    imageSelected: { status: 'selected', file: PREVIEW_IMAGE_RECEIPT },
    imageProcessing: { status: 'processing', file: PREVIEW_IMAGE_RECEIPT },
    imageReady: { status: 'ready', file: PREVIEW_IMAGE_RECEIPT },
    pdfSelected: { status: 'selected', file: PREVIEW_PDF_RECEIPT },
    error: {
        status: 'error',
        file: null,
        errorMessage: 'Unsupported file type. Use JPG, PNG, HEIC, or PDF.',
    },
    removed: { status: 'idle', file: null },
};

/** Representative recognition states for preview. */
export const PREVIEW_RECOGNITION_STATES: Record<string, ReceiptRecognitionState> = {
    idle: { status: 'idle' },
    processing: { status: 'processing', message: 'Reading receipt…' },
    success: {
        status: 'success',
        result: {
            merchant: 'Whole Foods Market',
            total: '42.85',
            date: '2026-10-27',
            currency: 'USD',
            categoryId: 'sys.food',
            categoryName: 'Food',
            tax: '2.35',
            confidence: 0.94,
            lineItems: [
                { description: 'Produce', amount: '18.50' },
                { description: 'Bakery', amount: '22.00' },
            ],
        },
    },
    partial: {
        status: 'partial',
        message: 'Some fields need review.',
        missingFields: ['merchant', 'categoryName'],
        result: {
            total: '42.85',
            date: '2026-10-27',
            currency: 'USD',
            confidence: 0.58,
        },
    },
    failed: {
        status: 'failed',
        message: 'We could not read this receipt. Please enter the details manually.',
    },
    unavailable: {
        status: 'unavailable',
        message: 'Receipt recognition is not available yet.',
    },
};
