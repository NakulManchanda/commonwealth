/* eslint-disable no-unused-expressions */
import { signTypedData, SignTypedDataVersion } from '@metamask/eth-sig-util';
import chai from 'chai';
import chaiHttp from 'chai-http';
import 'chai/register-should';
import wallet from 'ethereumjs-wallet';
import { ethers } from 'ethers';
import { constructCanvasMessage } from 'shared/adapters/shared';
import app, { resetDatabase } from '../../../server-test';
import {
  constructTypedCanvasMessage,
  TEST_BLOCK_INFO_STRING,
  TEST_BLOCK_INFO_BLOCKHASH,
} from '../../../shared/adapters/chain/ethereum/keys';
import * as modelUtils from '../../util/modelUtils';

chai.use(chaiHttp);
const { expect } = chai;

describe('API Tests', () => {
  before('reset database', async () => {
    await resetDatabase();
  });

  describe('address tests', () => {
    it('should call the /api/status route', async () => {
      const res = await chai
        .request(app)
        .get('/api/status')
        .set('Accept', 'application/json');
      expect(res.body).to.not.be.null;
    });

    it('should create an address', async () => {
      const keypair = wallet.generate();
      const address = `0x${keypair.getAddress().toString('hex')}`;
      const chain = 'ethereum';
      const wallet_id = 'metamask';
      const res = await chai
        .request(app)
        .post('/api/createAddress')
        .set('Accept', 'application/json')
        .send({
          address,
          chain,
          wallet_id,
          block_info: TEST_BLOCK_INFO_STRING,
        });
      expect(res.body).to.not.be.null;
      expect(res.body.status).to.equal('Success');
      expect(res.body.result).to.be.not.null;
      expect(res.body.result.address).to.be.equal(address);
      expect(res.body.result.chain).to.equal(chain);
      expect(res.body.result.verification_token).to.be.not.null;
    });

    it('should verify an address', async () => {
      const { keypair, address } = modelUtils.generateEthAddress();
      const chain = 'ethereum';
      const wallet_id = 'metamask';
      let res = await chai
        .request(app)
        .post('/api/createAddress')
        .set('Accept', 'application/json')
        .send({
          address,
          chain,
          wallet_id,
          block_info: TEST_BLOCK_INFO_STRING,
        });
      const token = res.body.result.verification_token;
      const chain_id = '1'; // use ETH mainnet for testing
      const sessionWallet = ethers.Wallet.createRandom();
      const timestamp = 1665083987891;
      const message = constructCanvasMessage(
        'ethereum',
        chain_id,
        address,
        sessionWallet.address,
        timestamp,
        TEST_BLOCK_INFO_BLOCKHASH
      );
      const data = constructTypedCanvasMessage(message);
      const privateKey = keypair.getPrivateKey();
      const signature = signTypedData({
        privateKey,
        data,
        version: SignTypedDataVersion.V4,
      });
      res = await chai
        .request(app)
        .post('/api/verifyAddress')
        .set('Accept', 'application/json')
        .send({
          address,
          chain,
          chain_id,
          signature,
          wallet_id,
          session_public_address: sessionWallet.address,
          session_timestamp: timestamp,
          session_block_data: TEST_BLOCK_INFO_STRING,
        });
      expect(res.body).to.not.be.null;
      expect(res.body.status).to.equal('Success');
      expect(res.body.result).to.be.not.null;
      expect(res.body.result.user).to.be.not.null;
      expect(res.body.result.message).to.be.equal('Logged in');
    });
  });
});
