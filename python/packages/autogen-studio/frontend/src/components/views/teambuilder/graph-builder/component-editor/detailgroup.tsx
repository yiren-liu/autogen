import React from "react";

interface DetailGroupProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const DetailGroup: React.FC<DetailGroupProps> = ({
  title,
  children,
  className = "",
}) => {
  return (
    <div className={`mb-6 p-4 bg-secondary rounded-lg ${className}`}>
      <h3 className="text-sm font-semibold text-primary mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
};

export default DetailGroup; 