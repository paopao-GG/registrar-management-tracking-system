import { useRef, forwardRef, useImperativeHandle } from 'react';
import ReactSignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';

// Handle CJS/ESM interop - the module may expose the component as .default
const SignatureCanvas = (ReactSignatureCanvas as any).default || ReactSignatureCanvas;

export interface SignaturePadRef {
  getDataURL: () => string;
  isEmpty: () => boolean;
}

export const SignaturePadComponent = forwardRef<SignaturePadRef>((_props, ref) => {
  const sigRef = useRef<ReactSignatureCanvas>(null);

  useImperativeHandle(ref, () => ({
    getDataURL: () => sigRef.current?.toDataURL() || '',
    isEmpty: () => sigRef.current?.isEmpty() ?? true,
  }));

  return (
    <div className="space-y-2">
      <div className="border rounded-md bg-white">
        <SignatureCanvas
          ref={sigRef}
          canvasProps={{
            className: 'w-full',
            style: { width: '100%', height: 150 },
          }}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => sigRef.current?.clear()}
      >
        Clear Signature
      </Button>
    </div>
  );
});
SignaturePadComponent.displayName = 'SignaturePadComponent';
