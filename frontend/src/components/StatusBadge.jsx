const STATUS_STYLES = {
  rascunho: 'bg-gray-100 text-gray-700',
  enviado: 'bg-blue-100 text-blue-700',
  visualizado: 'bg-yellow-100 text-yellow-700',
  assinado: 'bg-green-100 text-green-700',
  recusado: 'bg-red-100 text-red-700',
  cancelado: 'bg-gray-100 text-gray-400 line-through',
};

const STATUS_LABELS = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  visualizado: 'Visualizado',
  assinado: 'Assinado',
  recusado: 'Recusado',
  cancelado: 'Cancelado',
};

export default function StatusBadge({ status, size = 'sm' }) {
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-700';
  const label = STATUS_LABELS[status] || status;

  const sizeClass = size === 'lg'
    ? 'px-4 py-1.5 text-sm font-semibold'
    : 'px-2.5 py-0.5 text-xs font-medium';

  return (
    <span className={`inline-flex items-center rounded-full ${sizeClass} ${style}`}>
      {label}
    </span>
  );
}
