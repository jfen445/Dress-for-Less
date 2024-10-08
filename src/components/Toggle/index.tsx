"use client";

import React from "react";
import { Description, Field, Label, Switch } from "@headlessui/react";

interface IToggle {
  title: String;
  description: String;
  enabled: boolean;
  setEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}

const Toggle = ({ title, description, enabled, setEnabled }: IToggle) => {
  return (
    <Field className="flex items-center justify-between">
      <span className="flex flex-grow flex-col">
        <Label
          as="span"
          passive
          className="text-sm font-medium leading-6 text-gray-900"
        >
          {title}
        </Label>
        <Description as="span" className="text-sm text-gray-500">
          {description}
        </Description>
      </span>
      <Switch
        checked={enabled}
        onChange={setEnabled}
        className="group relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:secondary-pink focus:ring-offset-2 data-[checked]:bg-secondary-pink"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out group-data-[checked]:translate-x-5"
        />
      </Switch>
    </Field>
  );
};

export default Toggle;
