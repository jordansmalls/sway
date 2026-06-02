import React from 'react';

interface RoomQrCodeProps {
  qrDataUrl: string;
  size?: number;
}

const RoomQrCode: React.FC<RoomQrCodeProps> = ({ qrDataUrl, size = 200 }) => {
  return (
    <div
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        margin: '1rem auto',
      }}
    >
      {/* QR Code Image */}
      <img
        src={qrDataUrl}
        alt="Room QR Code"
        style={{
          width: '100%',
          height: '100%',
        }}
      />

      {/* White background "gap" in the middle */}
      {/* <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: `${whiteBgSize}px`,
          height: `${whiteBgSize}px`,
          backgroundColor: 'white',
          borderRadius: '12px',
          transform: 'translate(-50%, -50%)',
          zIndex: 1,
        }}
      /> */}

      {/* SVG Logo Overlay */}
      {/* <svg
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: `${logoSize}px`,
          height: `${logoSize}px`,
          transform: 'translate(-50%, -50%)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        <g clipPath="url(#clip0_325_1001)">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M120 0H80V51.7157L43.4315 15.1472L15.1472 43.4314L51.7158 80H0V120H51.7157L15.1472 156.568L43.4315 184.853L80 148.284V200H120V148.284L156.569 184.853L184.853 156.569L148.284 120H200V80H148.284L184.853 43.4314L156.569 15.1471L120 51.7157V0Z"
            fill="#6A81FB"
          />
        </g>
        <defs>
          <clipPath id="clip0_325_1001">
            <rect width="200" height="200" fill="white" />
          </clipPath>
        </defs>
      </svg> */}
    </div>
  );
};

export default RoomQrCode;
