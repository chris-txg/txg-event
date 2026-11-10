import { FieldValues, UseFormSetError, Path } from 'react-hook-form';

export function handleFormApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  setGeneralError: (msg: string | null) => void
): void {
  if (!error) {
    setGeneralError('An unexpected error occurred. Please try again.');
    return;
  }

  if (typeof error === 'string') {
    setGeneralError(error);
    return;
  }

  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>;
    let genericMessage: string | null = null;

    for (const [key, val] of Object.entries(errObj)) {
      if (key === 'detail' && typeof val === 'string') {
        genericMessage = val;
      } else if (key === 'non_field_errors' && Array.isArray(val)) {
        genericMessage = val.join(' ');
      } else if (Array.isArray(val) && val.length > 0) {
        // Direct field error (e.g. username, email, password)
        setError(key as Path<T>, {
          type: 'server',
          message: String(val[0]),
        });
      } else if (typeof val === 'string') {
        setError(key as Path<T>, {
          type: 'server',
          message: val,
        });
      } else if (typeof val === 'object' && val !== null) {
        // Nested serializer error (e.g. customer_profile or vendor_profile)
        for (const [nestedKey, nestedVal] of Object.entries(val as Record<string, unknown>)) {
          const message = Array.isArray(nestedVal) ? String(nestedVal[0]) : String(nestedVal);
          // Try to set on top-level form field (e.g. company_name, gst_number, city)
          try {
            setError(nestedKey as Path<T>, {
              type: 'server',
              message,
            });
          } catch {
            genericMessage = `${nestedKey}: ${message}`;
          }
        }
      }
    }

    if (genericMessage) {
      setGeneralError(genericMessage);
    }
  }
}
