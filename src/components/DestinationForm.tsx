import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Destination, DestinationInput } from '../types';
import { Modal } from './Modal';

interface DestinationFormProps {
  open: boolean;
  initial?: Destination | null;
  onClose: () => void;
  onSubmit: (input: DestinationInput) => Promise<void>;
}

const emptyForm = {
  name: '',
  flag: '',
  description: '',
};

export function DestinationForm({
  open,
  initial,
  onClose,
  onSubmit,
}: DestinationFormProps) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        flag: initial.flag ?? '',
        description: initial.description ?? '',
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [open, initial]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Please enter a destination name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: form.name,
        flag: form.flag,
        description: form.description,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save destination.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={initial ? 'Edit destination' : 'Add a new destination'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btnSecondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="destination-form"
            className="btn btnPrimary"
            disabled={saving}
          >
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Create destination'}
          </button>
        </>
      }
    >
      <form id="destination-form" className="formGrid" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="dest-name">Country or destination name</label>
          <input
            id="dest-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="dest-flag">Flag emoji (optional)</label>
          <input
            id="dest-flag"
            value={form.flag}
            onChange={(e) => setForm((f) => ({ ...f, flag: e.target.value }))}
            placeholder="🇮🇹"
          />
        </div>
        <div className="field">
          <label htmlFor="dest-description">Short description</label>
          <textarea
            id="dest-description"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </div>
        {error ? (
          <p role="alert" style={{ color: '#9c3f3f', margin: 0 }}>
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
