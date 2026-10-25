import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import ReactSignatureCanvas from 'react-signature-canvas';
import { cn } from '@/lib/utils';

// Handle CJS/ESM interop - the module may expose the component as .default
const SignatureCanvas = (ReactSignatureCanvas as any).default || ReactSignatureCanvas;

export interface SignaturePadRef {
  getDataURL: () => string;
  isEmpty: () => boolean;
  clear: () => void;
}

export const SignaturePadComponent = forwardRef<SignaturePadRef, { className?: string }>(
  ({ className }, ref) => {
    const sigRef = useRef<ReactSignatureCanvas>(null);

    useImperativeHandle(ref, () => ({
      getDataURL: () => sigRef.current?.toDataURL() || '',
      isEmpty: () => sigRef.current?.isEmpty() ?? true,
      clear: () => sigRef.current?.clear(),
    }));

    /*
     * The pad fills its parent, which changes size when a phone is turned
     * or its address bar slides away. The library would wipe the drawing
     * on every resize, so resize the canvas here and redraw the strokes.
     */
    useEffect(() => {
      const pad = sigRef.current;
      if (!pad) return;

      const canvas = pad.getCanvas();
      let width = canvas.offsetWidth;
      let height = canvas.offsetHeight;

      const observer = new ResizeObserver(() => {
        if (canvas.offsetWidth === width && canvas.offsetHeight === height) return;
        width = canvas.offsetWidth;
        height = canvas.offsetHeight;

        const strokes = pad.toData();
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        canvas.getContext('2d')?.scale(ratio, ratio);
        pad.clear();
        pad.fromData(strokes);
      });

      observer.observe(canvas);
      return () => observer.disconnect();
    }, []);

    return (
      <SignatureCanvas
        ref={sigRef}
        clearOnResize={false}
        canvasProps={{
          className: cn('block h-full w-full touch-none', className),
        }}
      />
    );
  }
);
SignaturePadComponent.displayName = 'SignaturePadComponent';
