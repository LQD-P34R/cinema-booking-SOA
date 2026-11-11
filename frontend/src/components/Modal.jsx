import { useEffect } from 'react';

/**
 * Hộp thoại dùng chung. Đóng bằng phím Esc hoặc bấm ra vùng tối bên ngoài.
 * Cách dùng:
 *   {open && (
 *     <Modal title="Thêm phim" onClose={() => setOpen(false)}>
 *       ...nội dung form...
 *     </Modal>
 *   )}
 */
export default function Modal({ title, onClose, children, maxWidth }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      // Chỉ đóng khi bấm đúng vào vùng nền, không đóng khi bấm bên trong hộp thoại
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={maxWidth ? { maxWidth } : undefined}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}