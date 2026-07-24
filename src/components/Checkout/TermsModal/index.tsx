import React from "react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import PoliciesContent from "@/components/PoliciesContent";

interface ITermsModal {
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onConfirm: () => void;
}

const TermsModal = ({ isOpen, setOpen, onConfirm }: ITermsModal) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) setHasScrolledToBottom(false);
  }, [isOpen]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 8) {
      setHasScrolledToBottom(true);
    }
  };

  return (
    <Modal isOpen={isOpen} setOpen={setOpen}>
      <div
        className="max-h-[65vh] overflow-y-auto pr-1"
        onScroll={handleScroll}
      >
        <PoliciesContent />
      </div>
      <div className="mt-4 flex flex-col items-end gap-2 border-t border-gray-200 pt-4">
        {!hasScrolledToBottom && (
          <p className="text-xs text-gray-500">
            Please scroll to the bottom to continue.
          </p>
        )}
        <Button
          type="button"
          disabled={!hasScrolledToBottom}
          onClick={() => {
            onConfirm();
            setOpen(false);
          }}
        >
          I have read and agree
        </Button>
      </div>
    </Modal>
  );
};

export default TermsModal;
