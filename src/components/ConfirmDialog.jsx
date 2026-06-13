import Modal from './Modal'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, danger }) {
  return (
    <Modal open={open} onClose={onClose} title={title || 'Confirmation'} size="sm">
      <div className="flex gap-4 items-start mb-6">
        <AlertTriangle size={24} className={danger ? 'text-red-500 shrink-0' : 'text-yellow-500 shrink-0'} />
        <p className="text-gray-700">{message || 'Voulez-vous vraiment continuer ?'}</p>
      </div>
      <div className="flex justify-end gap-3">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button
          className={danger ? 'btn-danger' : 'btn-primary'}
          onClick={() => { onConfirm(); onClose() }}
        >
          Confirmer
        </button>
      </div>
    </Modal>
  )
}
