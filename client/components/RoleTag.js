import { roleInfo } from '@/lib/roles';
import RoleIcon from './RoleIcon';

export default function RoleTag({ role, className = '' }) {
  if (!role) return null;
  const r = roleInfo(role);
  return (
    <span className={`role-tag tone-${r.tone} ${className}`}>
      <RoleIcon role={role} /> {r.label}
    </span>
  );
}
