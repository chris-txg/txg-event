import React from 'react';
import { Metadata } from 'next';
import { VendorRegisterForm } from '@/features/authentication/forms/VendorRegisterForm';

export const metadata: Metadata = {
  title: 'Vendor Registration — Event Manager',
  description: 'Join Event Manager as a verified service vendor.',
};

export default function VendorRegisterPage() {
  return <VendorRegisterForm />;
}
