'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useDashboardMotion } from './dashboard-motion-context';
import { TourHost } from './tour-host';
import { useWorkspacePermissions } from './workspace-permissions';
export const cn = (...values: Parameters<typeof clsx>) => twMerge(clsx(values));
export function Button({
  className,
  variant = 'primary',
  permission,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  permission?: 'edit' | 'field';
}) {
  const access = useWorkspacePermissions();
  if ((permission === 'edit' && !access.canEdit) || (permission === 'field' && !access.canField)) return null;
  return <button type="button" {...props} className={cn('btn', `btn-${variant}`, className)} />;
}
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'green' | 'purple' | 'amber';
}) {
  return <span className={cn('badge', `badge-${tone}`)}>{children}</span>;
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
  className,
  onCloseAutoFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
  className?: string;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const dashboardMotion = useDashboardMotion();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" data-dashboard-motion={dashboardMotion ? '' : undefined} />
        <Dialog.Content
          className={cn('modal', wide && 'modal-wide', className)}
          data-guide-dialog=""
          data-dashboard-motion={dashboardMotion ? '' : undefined}
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <Dialog.Title className="modal-title">{title}</Dialog.Title>
          <Dialog.Description className="modal-description">
            {description ?? 'Atur detail sesuai kebutuhan survei Anda.'}
          </Dialog.Description>
          <Dialog.Close className="modal-close" aria-label="Tutup dialog">
            <X size={18} />
          </Dialog.Close>
          <div className="modal-body">{children}</div>
          <TourHost />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function FullscreenDialog({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="presentation" style={{ zIndex: 201 }}>
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <Dialog.Description className="sr-only">
            Hasil survei dalam mode presentasi. Tekan Escape untuk keluar.
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function EmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
