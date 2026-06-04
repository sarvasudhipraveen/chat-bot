/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import * as Icons from 'lucide-react';

interface IconProps extends React.ComponentPropsWithoutRef<'svg'> {
  name: string;
  className?: string;
  size?: number;
}

export const Icon: React.FC<IconProps> = ({ name, className = '', size = 18, ...props }) => {
  // Safe lookup for dynamic icons
  const LucideIcon = (Icons as any)[name];

  if (!LucideIcon) {
    // Fallback to sparkles if not found
    const Fallback = Icons.Sparkles;
    return <Fallback className={className} size={size} {...props} />;
  }

  return <LucideIcon className={className} size={size} {...props} />;
};
