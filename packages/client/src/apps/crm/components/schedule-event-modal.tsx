import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../components/ui/modal';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Button } from '../../../components/ui/button';
import { useCreateEvent } from '../hooks';

interface ScheduleEventModalProps {
  open: boolean;
  onClose: () => void;
  defaultAttendee?: string;
  contactId?: string;
  dealId?: string;
}

export function ScheduleEventModal({ open, onClose, defaultAttendee, contactId, dealId }: ScheduleEventModalProps) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [attendees, setAttendees] = useState(defaultAttendee ?? '');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const createEvent = useCreateEvent();

  const handleCreate = () => {
    if (!summary.trim()) {
      setError(t('crm.calendar.titleRequired'));
      return;
    }
    if (!date) {
      setError(t('crm.calendar.dateRequired'));
      return;
    }
    setError('');

    const startIso = `${date}T${startTime}:00`;
    const endIso = `${date}T${endTime}:00`;

    const attendeeList = attendees
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    createEvent.mutate(
      {
        summary: summary.trim(),
        startTime: startIso,
        endTime: endIso,
        attendees: attendeeList,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        contactId,
        dealId,
      },
      {
        onSuccess: () => {
          setSummary('');
          setDate('');
          setStartTime('09:00');
          setEndTime('10:00');
          setAttendees(defaultAttendee ?? '');
          setLocation('');
          setDescription('');
          setError('');
          onClose();
        },
        onError: () => {
          setError(t('crm.calendar.createFailed'));
        },
      },
    );
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setError('');
      onClose();
    }
  };

  return (
    <Modal open={open} onOpenChange={handleOpenChange} width={520}>
      <Modal.Header title={t('crm.calendar.schedule')} />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <Input
            label={t('crm.calendar.eventTitle')}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={t('crm.calendar.titlePlaceholder')}
            size="sm"
          />
          <Input
            label={t('crm.calendar.date')}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            size="sm"
          />
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <div style={{ flex: 1 }}>
              <Input
                label={t('crm.calendar.startTime')}
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                size="sm"
              />
            </div>
            <div style={{ flex: 1 }}>
              <Input
                label={t('crm.calendar.endTime')}
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                size="sm"
              />
            </div>
          </div>
          <Input
            label={t('crm.calendar.attendees')}
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            placeholder={t('crm.calendar.attendeesPlaceholder')}
            size="sm"
          />
          <Input
            label={t('crm.calendar.location')}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('crm.calendar.optionalPlaceholder')}
            size="sm"
          />
          <Textarea
            label={t('crm.calendar.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('crm.calendar.optionalNotes')}
            rows={3}
          />
          {error && (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-error)', fontFamily: 'var(--font-family)' }}>
              {error}
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" size="sm" onClick={handleCreate} disabled={createEvent.isPending}>
          {createEvent.isPending ? t('crm.calendar.creating') : t('crm.calendar.create')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
