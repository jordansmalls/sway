import { Button } from '../ui/button';
import { Download } from 'lucide-react';
import React, { useRef } from 'react';

interface RoomQrCodeProps {
  qrDataUrl: string;
  size?: number;
  filename?: string;
}

const RoomQrCodeAdmin: React.FC<RoomQrCodeProps> = ({
  qrDataUrl,
  size = 200,
  filename = 'qr-code',
}) => {
  const plainQrRef = useRef<HTMLImageElement | null>(null);

  const downloadPlainQr = () => {
    if (!plainQrRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = qrDataUrl;

    img.onload = () => {
      ctx.fillStyle = 'white';
      // White background
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);

      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `${filename}.png`;
      link.click();
    };
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          position: 'relative',
          width: `${size}px`,
          height: `${size}px`,
          margin: '0 auto 1rem',
        }}
        className="rounded-lg border"
      >
        {/* this image is used both for display and for downloading (only clean version is used for download) */}
        <img
          ref={plainQrRef}
          src={qrDataUrl}
          alt="Room QR Code"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Download button */}
      <Button
        onClick={downloadPlainQr}
        className="transition ease-in"
        variant={'default'}
      >
        <Download /> Download Room QR
      </Button>
    </div>
  );
};

export default RoomQrCodeAdmin;
