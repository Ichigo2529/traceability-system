import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className = '', ...props }) => {
  const baseStyle = "px-4 py-2 rounded-md font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    primary: "bg-[#1134A6] text-white hover:bg-[#0D2A84] focus:ring-[#1134A6]",
    secondary: "bg-[#E8EEFC] text-[#0D2A84] border border-[#C3D2F7] hover:bg-[#D8E2FA] focus:ring-[#1134A6]",
    danger: "bg-[#B42318] text-white hover:bg-[#912018] focus:ring-[#B42318]",
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props} 
    />
  );
};
