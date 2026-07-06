import { useState } from "react";

// Chống mất data khi user đóng form đang edit dở.
// Dùng chung cho mọi dialog form: Cancel button, X close, ESC, click overlay đều đi qua requestClose().
export const useDirtyGuard = (isDirty: boolean, onClose: () => void) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const requestClose = () => {
    if (isDirty) setShowConfirm(true);
    else onClose();
  };

  const confirmClose = () => {
    setShowConfirm(false);
    onClose();
  };

  return { showConfirm, setShowConfirm, requestClose, confirmClose };
};
