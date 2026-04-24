import { getStatusTone } from '../../lib/topic';

export default function StatusPill({ status }) {
  const label = status.replace('_', ' ');

  return (
    <span className={`sticker-tag ${getStatusTone(status)}`}>
      {label}
    </span>
  );
}







