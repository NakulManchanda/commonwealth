// Cosmos cannot sign arbitrary blobs, but they can sign transactions. So, as a hack around that,
// we insert our account registration token into a proposal message, and then verify against the
// generated signature. But first we need the message to insert.
import type { AminoMsg, StdFee, StdSignDoc } from '@cosmjs/amino';

export const validationTokenToSignDoc = async (
  token: Uint8Array,
  address: string
): Promise<StdSignDoc> => {
  const accountNumber = 0;
  const sequence = 0;
  const chainId = '';
  const fee: StdFee = {
    gas: '0',
    amount: [],
  };
  const memo = '';
  const cosmEnc = await import('@cosmjs/encoding');
  const cosmAmino = await import('@cosmjs/amino');

  const jsonTx: AminoMsg = {
    type: 'sign/MsgSignData',
    value: {
      signer: address,
      data: cosmEnc.toBase64(token),
    },
  };
  const signDoc = cosmAmino.makeSignDoc(
    [jsonTx],
    fee,
    chainId,
    memo,
    accountNumber,
    sequence
  );
  return signDoc;
};
