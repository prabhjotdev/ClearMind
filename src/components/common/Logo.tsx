import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 32, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Blue rounded square background */}
      <rect width="40" height="40" rx="9" fill="#3B82F6" />

      {/* Brain — left hemisphere */}
      <path
        d="M20 11 C14 11, 9.5 14.5, 9.5 19.5 C9.5 24, 12 27, 16 27.5 L16 30 L20 30"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Brain — right hemisphere */}
      <path
        d="M20 11 C26 11, 30.5 14.5, 30.5 19.5 C30.5 24, 28 27, 24 27.5 L24 30 L20 30"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
