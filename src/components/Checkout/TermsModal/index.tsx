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
  return (
    <Modal isOpen={isOpen} setOpen={setOpen}>
      <div className="max-h-[65vh] overflow-y-auto pr-1">
        <PoliciesContent />
      </div>
      <div className="mt-4 flex justify-end border-t border-gray-200 pt-4">
        <Button
          type="button"
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
