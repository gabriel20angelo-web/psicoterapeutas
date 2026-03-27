import { type KeyboardEvent } from "react";

interface Props {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  glass?: boolean;
}

export default function Card({ children, className = "", onClick, hover, glass }: Props) {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      onClick={onClick}
      {...(hover ? { tabIndex: 0, role: "button", onKeyDown: handleKeyDown } : {})}
      className={`
        card-base p-6
        ${glass ? 'glass' : ''}
        ${hover ? 'cursor-pointer lift' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
