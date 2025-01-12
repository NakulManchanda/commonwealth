import sgMail from '@sendgrid/mail';

import { SENDGRID_API_KEY } from '../config';
import { DB } from '../models';

import {
  EmitOptions,
  EmitResult,
  __emit,
} from './server_notifications_methods/emit';
sgMail.setApiKey(SENDGRID_API_KEY);

/**
 * Implements methods related to notifications
 *
 */
export class ServerNotificationsController {
  constructor(public models: DB) {}

  async emit(options: EmitOptions): Promise<EmitResult> {
    return __emit.call(this, options);
  }
}
