import React, { useState } from 'react';
import { PackageOpen } from 'lucide-react';

interface ProductPackshotProps {
  imageUrl?: string;
  name: string;
  className?: string;
  compact?: boolean;
}

/** Shows a sourced product image when available; never substitutes unrelated stock photography. */
export function ProductPackshot({ imageUrl, name, className = '', compact = false }: ProductPackshotProps) {
  const [failed, setFailed] = useState(false);
  if (imageUrl && !failed) {
    return <img src={imageUrl} alt={name} className={className} loading="lazy" onError={() => setFailed(true)} />;
  }
  return (
    <div className={`chuse-packshot-empty ${compact ? 'chuse-packshot-compact' : ''} ${className}`} role="img" aria-label={`${name}: product image not available`}>
      <span className="chuse-packshot-icon"><PackageOpen className="h-6 w-6" /></span>
      <span className="chuse-packshot-label">Packshot coming soon</span>
    </div>
  );
}
