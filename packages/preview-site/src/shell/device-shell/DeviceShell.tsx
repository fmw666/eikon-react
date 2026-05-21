import type { DeviceShellProps } from './types';
import { MobileShell } from './MobileShell';
import { DesktopShell } from './DesktopShell';
import { WebShell } from './WebShell';

// =================================================================================================
// Public component
// =================================================================================================

export function DeviceShell({
  platform,
  size,
  title = 'Eikon Preview',
  domain = 'eikon-react.preview',
  children,
}: DeviceShellProps) {
  if (platform === 'mobile') {
    return <MobileShell size={size}>{children}</MobileShell>;
  }
  if (platform === 'desktop') {
    return (
      <DesktopShell size={size} title={title}>
        {children}
      </DesktopShell>
    );
  }
  return (
    <WebShell size={size} title={title} domain={domain}>
      {children}
    </WebShell>
  );
}
