import type { ComponentType } from 'react';
import { EmailOutboxPanel } from './email-outbox-panel';

// Admin panels owned by channels (design F7): one entry per channel that has one.
export const channelAdminPanels: ComponentType[] = [EmailOutboxPanel];
