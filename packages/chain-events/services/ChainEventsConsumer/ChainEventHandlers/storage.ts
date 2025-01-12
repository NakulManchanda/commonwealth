/**
 * Generic handler that stores the event in the database.
 */
import { addPrefix, factory } from 'common-common/src/logging';
import { AbstractRabbitMQController } from 'common-common/src/rabbitmq/types';
import NodeCache from 'node-cache';
import hash from 'object-hash';
import { StatsDController } from 'common-common/src/statsd';

import type { DB } from '../../database/database';
import type { ChainEventInstance } from '../../database/models/chain_event';

import type { CWEvent, IChainEventKind } from 'chain-events/src';
import { eventToEntity, IEventHandler } from 'chain-events/src';

export interface StorageFilterConfig {
  excludedEvents?: IChainEventKind[];
}

export default class extends IEventHandler {
  public readonly name = 'Storage';

  public readonly eventCache: NodeCache;

  public readonly ttl = 20;

  constructor(
    private readonly _models: DB,
    private readonly _rmqController: AbstractRabbitMQController,
    private readonly _chain?: string,
    private readonly _filterConfig: StorageFilterConfig = {}
  ) {
    super();
    this.eventCache = new NodeCache({
      stdTTL: this.ttl,
      deleteOnExpire: true,
      useClones: false,
    });
  }

  private async _shouldSkip(event: CWEvent): Promise<boolean> {
    if (!event) return true;

    // filter out all events that won't have an associated entity in the db
    const entity = eventToEntity(event.network, event.data?.kind);
    if (!entity) return true;

    return !!this._filterConfig.excludedEvents?.includes(event.data?.kind);
  }

  /**
   * Handles an event by creating a ChainEvent in the database.
   * NOTE: this may modify the event.
   */
  public async handle(event: CWEvent): Promise<ChainEventInstance> {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const log = factory.getLogger(
      addPrefix(__filename, [event.network, event.chain])
    );
    const chain = event.chain || this._chain;

    const shouldSkip = await this._shouldSkip(event);
    if (shouldSkip) {
      log.trace(`Skipping event!`);
      return;
    }

    const eventData = {
      block_number: event.blockNumber,
      event_data: event.data,
      network: event.network,
      chain,
    };

    // duplicate event check
    const eventKey = hash(eventData, {
      respectType: false,
    });
    const cachedEvent = this.eventCache.get(eventKey);

    if (!cachedEvent) {
      const dbEvent = await this._models.ChainEvent.create(eventData);
      // no need to save the entire event data since the key is the hash of the data
      this.eventCache.set(eventKey, true);

      const cacheStats = this.eventCache.getStats();
      StatsDController.get().gauge('ce.num-events-cached', cacheStats.keys);
      StatsDController.get().gauge('ce.event-cache-hits', cacheStats.hits);
      StatsDController.get().gauge('ce.event-cache-misses', cacheStats.misses);

      return dbEvent;
    } else {
      log.warn(`Duplicate event: ${eventKey}: ${JSON.stringify(eventData)}`);
      // refresh ttl for the duplicated event
      this.eventCache.ttl(eventKey, this.ttl);

      StatsDController.get().increment('ce.event-cache-chain-hit', { chain });

      const cacheStats = this.eventCache.getStats();
      StatsDController.get().gauge('ce.num-events-cached', cacheStats.keys);
      StatsDController.get().gauge('ce.event-cache-hits', cacheStats.hits);
      StatsDController.get().gauge('ce.event-cache-misses', cacheStats.misses);

      // return nothing so following handlers ignore this event
      return;
    }
  }
}
