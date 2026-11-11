/**
 * Rendering tests for the UI-only receipt components.
 *
 * Native modules (icons, gradients, status bar, and safe area) are mocked so
 * the tests can assert presentation states without a device.
 */

import { act, create } from 'react-test-renderer';
import i18n from '@/i18n';
import { Text } from 'react-native';
import type { ReactElement } from 'react';
import ReceiptActionButtons from '@/components/receipts/ReceiptActionButtons';
import ReceiptAttachmentPreview from '@/components/receipts/ReceiptAttachmentPreview';
import ReceiptRecognitionPanel from '@/components/receipts/ReceiptRecognitionPanel';
import ReceiptScannerModal from '@/components/receipts/ReceiptScannerModal';
import ReceiptScanPreviewModal from '@/components/receipts/ReceiptScanPreviewModal';
import ReceiptUploadModal from '@/components/receipts/ReceiptUploadModal';
import {
    AddTransactionScreen,
} from '@/components/transactions/TransactionsScreens';
import {
    PREVIEW_ATTACHMENT_STATES,
    PREVIEW_RECOGNITION_STATES,
    PREVIEW_SCAN_RESULT,
} from '@/constants/receiptPreviewFixtures';

jest.mock('@expo/vector-icons', () => {
    const Ionicons = () => null;
    Ionicons.displayName = 'Ionicons';
    return { Ionicons };
});

jest.mock('expo-linear-gradient', () => {
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    const LinearGradient = (props: Record<string, unknown>) =>
        React.createElement(View, props);
    LinearGradient.displayName = 'LinearGradient';
    return { LinearGradient };
});

jest.mock('expo-status-bar', () => ({
    StatusBar: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

/**
 * Join every visible string in a rendered tree.
 *
 * @param tree - The mounted test renderer.
 * @returns The concatenated text content.
 */
const allText = (tree: ReturnType<typeof create>): string =>
    tree.root
        .findAllByType(Text)
        .map((node) => node.props.children)
        .flat(Infinity)
        .filter((child): child is string => typeof child === 'string')
        .join('\n');

/**
 * Render a component inside an `act` scope.
 *
 * @param element - The element to mount.
 * @returns The mounted test renderer.
 */
const render = (element: ReactElement): ReturnType<typeof create> => {
    let tree: ReturnType<typeof create>;
    act(() => {
        tree = create(element);
    });
    return tree!;
};

describe('ReceiptActionButtons', () => {
    afterEach(async () => {
        await i18n.changeLanguage('en');
    });

    it('renders both actions and emits press callbacks', () => {
        const onScan = jest.fn();
        const onUpload = jest.fn();
        const tree = render(<ReceiptActionButtons onScan={onScan} onUpload={onUpload} />);

        expect(allText(tree)).toContain('Scan Receipt');
        expect(allText(tree)).toContain('Upload Receipt');

        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'Scan Receipt' }).props.onPress();
            tree.root.findByProps({ accessibilityLabel: 'Upload Receipt' }).props.onPress();
        });

        expect(onScan).toHaveBeenCalled();
        expect(onUpload).toHaveBeenCalled();
    });

    it('renders French receipt actions after switching language', async () => {
        await i18n.changeLanguage('fr');
        const tree = render(
            <ReceiptActionButtons onScan={jest.fn()} onUpload={jest.fn()} />,
        );

        expect(allText(tree)).toContain('Numériser un reçu');
        expect(allText(tree)).toContain('Importer un reçu');
    });
});

describe('ReceiptAttachmentPreview', () => {
    it('renders image and PDF attachment metadata', () => {
        const image = render(
            <ReceiptAttachmentPreview attachment={PREVIEW_ATTACHMENT_STATES.imageReady} />,
        );
        expect(allText(image)).toContain('grocery-receipt.jpg');
        expect(allText(image)).toContain('Image');

        const pdf = render(
            <ReceiptAttachmentPreview attachment={PREVIEW_ATTACHMENT_STATES.pdfSelected} />,
        );
        expect(allText(pdf)).toContain('hotel-bill.pdf');
        expect(allText(pdf)).toContain('PDF');
    });

    it('renders an error state and remove action', () => {
        const tree = render(
            <ReceiptAttachmentPreview attachment={PREVIEW_ATTACHMENT_STATES.error} />,
        );
        expect(allText(tree)).toContain('Unsupported file type');
        expect(tree.root.findByProps({ accessibilityLabel: 'Remove receipt' })).toBeTruthy();
    });
});

describe('ReceiptRecognitionPanel', () => {
    it('renders processing, failed, and unavailable states', () => {
        expect(allText(render(<ReceiptRecognitionPanel state={PREVIEW_RECOGNITION_STATES.processing} />)))
            .toContain('Reading receipt');
        expect(allText(render(<ReceiptRecognitionPanel state={PREVIEW_RECOGNITION_STATES.failed} />)))
            .toContain('We could not read this receipt');
        expect(allText(render(<ReceiptRecognitionPanel state={PREVIEW_RECOGNITION_STATES.unavailable} />)))
            .toContain('not available');
    });

    it('renders suggested values for review', () => {
        const tree = render(<ReceiptRecognitionPanel state={PREVIEW_RECOGNITION_STATES.success} />);
        const text = allText(tree);
        expect(tree.root.findByProps({ value: 'Whole Foods Market' })).toBeTruthy();
        expect(tree.root.findByProps({ value: '42.85' })).toBeTruthy();
        expect(text).toContain('Apply suggested values');
    });
});

describe('Receipt scanner shells', () => {
    it('renders the scanner placeholder and capture controls', () => {
        const tree = render(
            <ReceiptScannerModal
                visible
                onCapture={jest.fn()}
                onCancel={jest.fn()}
            />,
        );
        const text = allText(tree);
        expect(text).toContain('Camera preview placeholder');
        expect(text).toContain('Auto');
        expect(tree.root.findByProps({ accessibilityLabel: 'Capture receipt' })).toBeTruthy();
    });

    it('renders the scan preview with enhancement actions', () => {
        const tree = render(
            <ReceiptScanPreviewModal
                visible
                result={PREVIEW_SCAN_RESULT}
                enhancement="auto"
                onEnhancementChange={jest.fn()}
                onRetake={jest.fn()}
                onCrop={jest.fn()}
                onConfirm={jest.fn()}
                onCancel={jest.fn()}
            />,
        );
        expect(allText(tree)).toContain('Scanned receipt preview');
        expect(allText(tree)).toContain('Use Receipt');
    });

    it('renders upload selection support copy', () => {
        const tree = render(
            <ReceiptUploadModal
                visible
                demoMode
                selectedFile={null}
                onClose={jest.fn()}
                onSelectSample={jest.fn()}
                onReplace={jest.fn()}
                onRemove={jest.fn()}
            />,
        );
        expect(allText(tree)).toContain('JPG, PNG, HEIC, or PDF');
        expect(allText(tree)).toContain('UI preview samples');
    });
});

describe('AddTransactionScreen receipt gating', () => {
    const renderForm = () =>
        render(
            <AddTransactionScreen
                categories={[]}
                budgets={[]}
                onBack={jest.fn()}
                onSave={jest.fn()}
            />,
        );

    it('shows receipt actions and manual divider in expense mode', () => {
        const text = allText(renderForm());
        expect(text).toContain('Scan Receipt');
        expect(text).toContain('Upload Receipt');
        expect(text).toContain('OR ENTER MANUALLY');
    });

    it('hides receipt actions in income mode', () => {
        const tree = renderForm();
        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'Income' }).props.onPress();
        });
        expect(allText(tree)).not.toContain('Scan Receipt');
        expect(allText(tree)).not.toContain('OR ENTER MANUALLY');
    });
});
