import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "tertiary" | "ghost";
}

const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant,
  ...props
}) => {
  const disabledClass = props.disabled ? "opacity-50" : "";

  const variantClasses =
    variant === "ghost"
      ? ""
      : `rounded-md ${
          variant == "tertiary"
            ? "bg-white border border-primary-pink text-primary-pink enabled:hover:bg-primary-pink enabled:hover:text-white"
            : `${
                variant == "primary" || !variant
                  ? "bg-primary-pink"
                  : "bg-secondary-pink"
              } bg-primary-pink text-white enabled:hover:bg-secondary-pink`
        } px-3.5 py-2.5 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600`;

  return (
    <button
      className={`${variantClasses} ${disabledClass} ${className ?? ""}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
