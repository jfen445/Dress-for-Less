interface IButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  children?: string;
  className?: string;
}

const Button = ({ children, className }: IButtonProps) => {
  return (
    <button
      className={
        "rounded-md bg-primary-pink px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 " +
        className
      }
    >
      {children}
    </button>
  );
};

export default Button;
