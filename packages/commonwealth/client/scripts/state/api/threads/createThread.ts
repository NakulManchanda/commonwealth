import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import MinimumProfile from 'models/MinimumProfile';
import Thread from 'models/Thread';
import Topic from 'models/Topic';
import { ThreadStage } from 'models/types';
import app from 'state';
import { EXCEPTION_CASE_threadCountersStore } from '../../ui/thread';
import { addThreadInAllCaches } from './helpers/cache';

interface CreateThreadProps {
  address: string;
  kind: 'discussion' | 'link';
  stage: string;
  chainId: string;
  title: string;
  topic: Topic;
  body?: string;
  url?: string;
  readOnly?: boolean;
  authorProfile: MinimumProfile;
}

const createThread = async ({
  address,
  kind,
  stage,
  chainId,
  title,
  topic,
  body,
  url,
  readOnly,
  authorProfile,
}: CreateThreadProps) => {
  const {
    action = null,
    session = null,
    hash = null,
  } = await app.sessions.signThread({
    community: chainId,
    title,
    body,
    link: url,
    topic: topic.id,
  });

  const response = await axios.post(`${app.serverUrl()}/threads`, {
    author_chain: chainId,
    chain: chainId,
    address,
    author: JSON.stringify(authorProfile),
    title: encodeURIComponent(title),
    body: encodeURIComponent(body),
    kind,
    stage,
    topic_name: topic.name,
    topic_id: topic.id,
    url,
    readOnly,
    jwt: app.user.jwt,
    canvas_action: action,
    canvas_session: session,
    canvas_hash: hash,
  });

  return new Thread(response.data.result);
};

const useCreateThreadMutation = ({ chainId }: Partial<CreateThreadProps>) => {
  return useMutation({
    mutationFn: createThread,
    onSuccess: async (newThread) => {
      addThreadInAllCaches(chainId, newThread);
      // Update community level thread counters variables
      EXCEPTION_CASE_threadCountersStore.setState(
        ({ totalThreadsInCommunity, totalThreadsInCommunityForVoting }) => ({
          totalThreadsInCommunity: totalThreadsInCommunity + 1,
          totalThreadsInCommunityForVoting:
            newThread.stage === ThreadStage.Voting
              ? totalThreadsInCommunityForVoting + 1
              : totalThreadsInCommunityForVoting,
        })
      );
      return newThread;
    },
  });
};

export default useCreateThreadMutation;
