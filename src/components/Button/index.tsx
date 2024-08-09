import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: string;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, className, ...props }) => {
  return (
    <button
      className={
        "rounded-md bg-primary-pink px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm enabled:hover:bg-secondary-pink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 " +
        className
      }
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
