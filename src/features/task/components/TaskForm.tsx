import React from 'react';

import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/components/Button';

interface TaskFormProps {
  title: string;
  description: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: () => void;
  submitText?: string;
  isSubmitting?: boolean;
}

const TaskForm: React.FC<TaskFormProps> = ({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  onSubmit,
  submitText,
  isSubmitting = false,
}) => {
  const { t } = useTranslation();
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <div>
        <label className="block mb-1 text-sm text-foreground">{t('task.new.form.title')}</label>
        <input
          className="w-full border border-border bg-input text-foreground placeholder:text-muted-foreground p-2 rounded focus:outline-none focus:ring-2 focus:ring-ring transition-colors transition-shadow duration-200"
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>
      <div>
        <label className="block mb-1 text-sm text-foreground">{t('task.new.form.description')}</label>
        <textarea
          className="w-full border border-border bg-input text-foreground placeholder:text-muted-foreground p-2 rounded focus:outline-none focus:ring-2 focus:ring-ring transition-colors transition-shadow duration-200"
          value={description}
          onChange={e => onDescriptionChange(e.target.value)}
          rows={4}
          disabled={isSubmitting}
        />
      </div>
      <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
        {submitText || t('task.new.form.submit')}
      </Button>
    </form>
  );
};

export default TaskForm;
