import React from "react";

interface InputProps extends React.HTMLAttributes<HTMLInputElement> {
  type: string;
  name: string;
  id: string;
  pattern?: string;
  required?: boolean;
  value?: string;
  readonly?: boolean;
  className?: string;
  disabled?: boolean;
}

const Input: React.FC<InputProps> = ({
  type,
  name,
  id,
  pattern,
  required,
  value,
  readonly,
  className,
  disabled,
  ...props
}) => {
  return (
    <input
      {...props}
      value={value}
      type={type}
      name={name}
      id={id}
      pattern={pattern ?? "(.*?)"}
      required={required ?? false}
      readOnly={readonly ?? false}
      disabled={disabled ?? false}
      className={`${className} border border-rose-900 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500`}
    />
  );
};

export default Input;
