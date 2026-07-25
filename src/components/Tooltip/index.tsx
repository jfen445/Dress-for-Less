import * as React from "react";
import { createPortal } from "react-dom";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

type TooltipPosition = "top" | "right" | "bottom" | "left";
// "center" (default) centers the box on the trigger; "start" left-aligns the
// box's edge with the trigger instead. Only affects "top"/"bottom" (which
// are horizontally centered by default) — irrelevant for "left"/"right".
// Regardless of this setting, the final position is always clamped to the
// viewport, so this is just the *preferred* alignment before clamping.
type TooltipAlign = "center" | "start";

interface TooltipProps {
  content: React.ReactNode;
  className?: string;
  position?: TooltipPosition;
  // Position to use below the `sm` (640px) breakpoint; defaults to `position`.
  mobilePosition?: TooltipPosition;
  align?: TooltipAlign;
}

const VIEWPORT_PADDING = 8;
const TRIGGER_GAP = 8;
const SM_BREAKPOINT = 640;
const ARROW_EDGE_INSET = 12;

const arrowBorderClasses: Record<TooltipPosition, string> = {
  top: "border-t-gray-900 border-b-transparent border-l-transparent border-r-transparent",
  bottom:
    "border-b-gray-900 border-t-transparent border-l-transparent border-r-transparent",
  left: "border-l-gray-900 border-r-transparent border-t-transparent border-b-transparent",
  right:
    "border-r-gray-900 border-l-transparent border-t-transparent border-b-transparent",
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

const Tooltip = ({
  content,
  className,
  position = "top",
  mobilePosition = position,
  align = "center",
}: TooltipProps) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const boxRef = React.useRef<HTMLSpanElement>(null);

  const [boxStyle, setBoxStyle] = React.useState<React.CSSProperties>({
    opacity: 0,
  });
  const [arrowStyle, setArrowStyle] = React.useState<React.CSSProperties>({});
  const [effectivePosition, setEffectivePosition] =
    React.useState<TooltipPosition>(position);

  React.useEffect(() => {
    if (!isVisible) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const box = boxRef.current;
      if (!trigger || !box) return;

      const triggerRect = trigger.getBoundingClientRect();
      const boxRect = box.getBoundingClientRect();
      const pos =
        window.innerWidth < SM_BREAKPOINT ? mobilePosition : position;

      let top = 0;
      let left = 0;

      if (pos === "top" || pos === "bottom") {
        top =
          pos === "top"
            ? triggerRect.top - boxRect.height - TRIGGER_GAP
            : triggerRect.bottom + TRIGGER_GAP;
        left =
          align === "start"
            ? triggerRect.left
            : triggerRect.left + triggerRect.width / 2 - boxRect.width / 2;
      } else {
        left =
          pos === "left"
            ? triggerRect.left - boxRect.width - TRIGGER_GAP
            : triggerRect.right + TRIGGER_GAP;
        top =
          triggerRect.top + triggerRect.height / 2 - boxRect.height / 2;
      }

      const clampedLeft = clamp(
        left,
        VIEWPORT_PADDING,
        window.innerWidth - boxRect.width - VIEWPORT_PADDING,
      );
      const clampedTop = clamp(
        top,
        VIEWPORT_PADDING,
        window.innerHeight - boxRect.height - VIEWPORT_PADDING,
      );

      setBoxStyle({
        position: "fixed",
        top: clampedTop,
        left: clampedLeft,
        opacity: 1,
      });
      setEffectivePosition(pos);

      if (pos === "top" || pos === "bottom") {
        const arrowLeft = clamp(
          triggerRect.left + triggerRect.width / 2 - clampedLeft,
          ARROW_EDGE_INSET,
          boxRect.width - ARROW_EDGE_INSET,
        );
        setArrowStyle({ left: arrowLeft, top: undefined });
      } else {
        const arrowTop = clamp(
          triggerRect.top + triggerRect.height / 2 - clampedTop,
          ARROW_EDGE_INSET,
          boxRect.height - ARROW_EDGE_INSET,
        );
        setArrowStyle({ top: arrowTop, left: undefined });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isVisible, position, mobilePosition, align]);

  const arrowPositionStyle: React.CSSProperties =
    effectivePosition === "top"
      ? { top: "100%", left: arrowStyle.left, transform: "translateX(-50%)" }
      : effectivePosition === "bottom"
        ? {
            bottom: "100%",
            left: arrowStyle.left,
            transform: "translateX(-50%)",
          }
        : effectivePosition === "left"
          ? {
              left: "100%",
              top: arrowStyle.top,
              transform: "translateY(-50%)",
            }
          : {
              right: "100%",
              top: arrowStyle.top,
              transform: "translateY(-50%)",
            };

  return (
    <span
      className={`relative inline-flex items-center ${className ?? ""}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      <button
        ref={triggerRef}
        type="button"
        tabIndex={0}
        aria-label="More information"
        className="text-gray-400 hover:text-gray-600 focus:outline-none"
      >
        <InformationCircleIcon className="h-4 w-4" />
      </button>
      {isVisible &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            ref={boxRef}
            role="tooltip"
            style={boxStyle}
            className="z-10 w-80 max-w-[85vw] rounded-md bg-gray-900 px-3 py-2 text-left text-xs text-white shadow-lg"
          >
            {content}
            <span
              style={arrowPositionStyle}
              className={`absolute border-4 border-transparent ${arrowBorderClasses[effectivePosition]}`}
            />
          </span>,
          document.body,
        )}
    </span>
  );
};

export default Tooltip;
