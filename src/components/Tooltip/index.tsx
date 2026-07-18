import * as React from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

type TooltipPosition = "top" | "right" | "bottom" | "left";

interface TooltipProps {
  content: React.ReactNode;
  className?: string;
  position?: TooltipPosition;
}

const positionClasses: Record<TooltipPosition, string> = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
};

const arrowPositionClasses: Record<TooltipPosition, string> = {
  top: "left-1/2 top-full -translate-x-1/2 border-t-gray-900",
  bottom: "left-1/2 bottom-full -translate-x-1/2 border-b-gray-900",
  left: "top-1/2 left-full -translate-y-1/2 border-l-gray-900",
  right: "top-1/2 right-full -translate-y-1/2 border-r-gray-900",
};

const Tooltip = ({ content, className, position = "top" }: TooltipProps) => {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <span
      className={`relative inline-flex items-center ${className ?? ""}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      <button
        type="button"
        tabIndex={0}
        aria-label="More information"
        className="text-gray-400 hover:text-gray-600 focus:outline-none"
      >
        <InformationCircleIcon className="h-4 w-4" />
      </button>
      {isVisible && (
        <span
          role="tooltip"
          className={`absolute z-10 w-80 max-w-[85vw] rounded-md bg-gray-900 px-3 py-2 text-left text-xs text-white shadow-lg ${positionClasses[position]}`}
        >
          {content}
          <span
            className={`absolute border-4 border-transparent ${arrowPositionClasses[position]}`}
          />
        </span>
      )}
    </span>
  );
};

export default Tooltip;
