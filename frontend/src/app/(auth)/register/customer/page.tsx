import React from 'react';
import { Metadata } from 'next';
import { CustomerRegisterContainer } from '@/features/authentication/forms/CustomerRegisterContainer';

export const metadata: Metadata = {
  title: 'Organizer Registration — Event Manager',
  description: 'Register as an Individual or Corporate event organizer on Event Manager.',
};

export default function CustomerRegisterPage() {
  return <CustomerRegisterContainer />;
}
