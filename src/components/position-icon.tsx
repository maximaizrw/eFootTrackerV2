import type { LucideProps } from 'lucide-react';
import { Target, Users, Shield, HandMetal } from 'lucide-react';
import type { Position } from '@/lib/types';

export const PositionIcon = ({ position, ...props }: { position: Position } & LucideProps) => {
  switch (position) {
    case 'PT':
      return <HandMetal {...props} />;
    case 'DFC':
    case 'LI':
    case 'LD':
      return <Shield {...props} />;
    case 'MCD':
    case 'MC':
    case 'MDI':
    case 'MDD':
    case 'MO':
      return <Users {...props} />;
    case 'EXI':
    case 'EXD':
    case 'SD':
    case 'DC':
      return <Target {...props} />;
    default:
      return null;
  }
};
