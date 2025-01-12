import React, { FC } from 'react';
import { CheckCircle, Warning } from '@phosphor-icons/react';

import { ValidationStatus } from '../../cw_validation_text';
import { getClasses } from '../../helpers';
import { CWLabel } from '../../cw_label';
import { CWText } from '../../cw_text';

import './MessageRow.scss';

interface MessageRowProps {
  hasFeedback?: boolean;
  label?: string | React.ReactNode;
  statusMessage?: string;
  validationStatus?: ValidationStatus;
  instructionalMessage?: string;
}

export const MessageRow: FC<MessageRowProps> = ({
  hasFeedback,
  label,
  statusMessage,
  validationStatus,
  instructionalMessage,
}) => (
  <div className={getClasses({}, 'MessageRow')}>
    {label && <CWLabel label={label} />}
    {instructionalMessage && <CWLabel label={instructionalMessage} />}
    {hasFeedback && (
      <>
        <div className={getClasses({ validationStatus }, 'icon')}>
          {validationStatus === 'success' && <CheckCircle weight="fill" />}
          {validationStatus === 'failure' && <Warning weight="fill" />}
        </div>
        <CWText
          type="caption"
          className={getClasses<{ status: ValidationStatus }>(
            { status: validationStatus },
            'feedback-message-text'
          )}
        >
          {statusMessage}
        </CWText>
      </>
    )}
  </div>
);
