import React from 'react';
import { Metadata } from 'next';
import { RoleSelector } from '@/features/authentication/components/RoleSelector';

export const metadata: Metadata = {
  title: 'Choose Account Type — Event Manager',
  description: 'Join Event Manager as an Event Organizer or Verified Vendor.',
};

export default function RegisterRolePage() {
  return <RoleSelector />;
}
