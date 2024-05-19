interface IInput extends React.HTMLAttributes<HTMLInputElement> {
  type: string;
  name: string;
  id: string;
}

const Input = (props: IInput) => {
  return (
    <input
      type={props.type}
      name={props.name}
      id={props.id}
      autoComplete="given-name"
      className="border border-rose-900 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
    />
  );
};

export default Input;
