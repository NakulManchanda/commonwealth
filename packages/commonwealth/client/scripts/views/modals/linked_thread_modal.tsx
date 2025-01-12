import React, { useState } from 'react';

import 'modals/linked_thread_modal.scss';

import { notifyError } from 'controllers/app/notifications';
import { getAddedAndDeleted } from 'helpers/threads';
import { LinkSource } from 'models/Thread';
import app from 'state';
import {
  useAddThreadLinksMutation,
  useDeleteThreadLinksMutation,
} from 'state/api/threads';
import { ThreadSelector } from 'views/components/thread_selector';
import type Thread from '../../models/Thread';
import { CWButton } from '../components/component_kit/cw_button';
import { CWIconButton } from '../components/component_kit/cw_icon_button';

type LinkedThreadModalProps = {
  linkedThreads: Thread[];
  thread: Thread;
  onModalClose: () => void;
  onSave?: (links: Thread['links']) => void;
};

export const LinkedThreadModal = ({
  thread,
  linkedThreads: initialLinkedThreads = [],
  onModalClose,
  onSave,
}: LinkedThreadModalProps) => {
  const [tempLinkedThreads, setTempLinkedThreads] =
    useState<Array<Thread>>(initialLinkedThreads);

  const { mutateAsync: addThreadLinks } = useAddThreadLinksMutation({
    chainId: app.activeChainId(),
    threadId: thread.id,
  });

  const { mutateAsync: deleteThreadLinks } = useDeleteThreadLinksMutation({
    chainId: app.activeChainId(),
    threadId: thread.id,
  });

  const handleSaveChanges = async () => {
    const { toAdd, toDelete } = getAddedAndDeleted(
      tempLinkedThreads,
      initialLinkedThreads
    );

    let links: Thread['links'];

    try {
      if (toAdd.length) {
        const updatedThread = await addThreadLinks({
          chainId: app.activeChainId(),
          threadId: thread.id,
          links: toAdd.map((el) => ({
            source: LinkSource.Thread,
            identifier: String(el.id),
            title: el.title,
          })),
        });

        links = updatedThread.links;
      }

      if (toDelete.length) {
        const updatedThread = await deleteThreadLinks({
          chainId: app.activeChainId(),
          threadId: thread.id,
          links: toDelete.map((el) => ({
            source: LinkSource.Thread,
            identifier: String(el.id),
          })),
        });

        links = updatedThread.links;
      }

      onModalClose();

      if (links && onSave) {
        onSave(links);
      }
    } catch (err) {
      console.error(err);
      notifyError('Failed to update linked threads');
      onModalClose();
    }
  };

  const handleSelectThread = (selectedThread: Thread) => {
    const isSelected = tempLinkedThreads.find(
      ({ id }) => selectedThread.id === id
    );

    const updatedLinkedThreads = isSelected
      ? tempLinkedThreads.filter(({ id }) => selectedThread.id !== id)
      : [...tempLinkedThreads, selectedThread];

    setTempLinkedThreads(updatedLinkedThreads);
  };

  return (
    <div className="LinkedThreadModal">
      <div className="compact-modal-title">
        <h3>Link to Existing Threads</h3>
        <CWIconButton iconName="close" onClick={onModalClose} />
      </div>
      <div className="compact-modal-body">
        <ThreadSelector
          linkedThreadsToSet={tempLinkedThreads}
          onSelect={handleSelectThread}
        />

        <div className="buttons-row">
          <CWButton
            label="Cancel"
            buttonType="secondary-blue"
            onClick={onModalClose}
          />
          <CWButton label="Save changes" onClick={handleSaveChanges} />
        </div>
      </div>
    </div>
  );
};
