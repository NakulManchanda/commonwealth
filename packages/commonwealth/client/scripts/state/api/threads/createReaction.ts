import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import app from 'state';
import { updateThreadInAllCaches } from './helpers/cache';

interface IuseCreateThreadReactionMutation {
  threadId: number;
  chainId: string;
}
interface CreateReactionProps extends IuseCreateThreadReactionMutation {
  address: string;
  reactionType?: 'like';
}

const createReaction = async ({
  chainId,
  address,
  reactionType = 'like',
  threadId,
}: CreateReactionProps) => {
  const {
    session = null,
    action = null,
    hash = null,
  } = await app.sessions.signThreadReaction({
    thread_id: threadId,
    like: reactionType === 'like',
  });

  return await axios.post(`${app.serverUrl()}/threads/${threadId}/reactions`, {
    author_chain: app.user.activeAccount.chain.id,
    thread_id: threadId,
    chain: app.chain.id,
    address,
    reaction: reactionType,
    jwt: app.user.jwt,
    canvas_action: action,
    canvas_session: session,
    canvas_hash: hash,
  });
};

const useCreateThreadReactionMutation = ({
  chainId,
  threadId,
}: IuseCreateThreadReactionMutation) => {
  return useMutation({
    mutationFn: createReaction,
    onSuccess: async (response) => {
      const reaction: any = {
        id: response.data.result.id,
        address: response.data.result.Address.address,
        type: 'like',
      };
      updateThreadInAllCaches(
        chainId,
        threadId,
        { associatedReactions: [reaction] },
        'combineAndRemoveDups'
      );
    },
  });
};

export default useCreateThreadReactionMutation;
