/*!
 * nodeclient.js - node client for hsk
 * Copyright (c) 2017-2018, Christopher Jeffrey (MIT License).
 * https://github.com/handshake-org/hskd
 */

'use strict';

const assert = require('assert');
const AsyncEmitter = require('bevent');

/**
 * Node Client
 * @alias module:node.NodeClient
 */

class NodeClient extends AsyncEmitter {
  /**
   * Create a node client.
   * @constructor
   */

  constructor(node) {
    super();

    this.node = node;
    this.network = node.network;
    this.filter = null;
    this.opened = false;

    this.init();
  }

  /**
   * Initialize the client.
   */

  init() {
    this.node.on('connect', (entry, block) => {
      if (!this.opened)
        return;

      this.emit('block connect', entry, block.txs);
    });

    this.node.on('disconnect', (entry, block) => {
      if (!this.opened)
        return;

      this.emit('block disconnect', entry);
    });

    this.node.on('tx', (tx) => {
      if (!this.opened)
        return;

      this.emit('tx', tx);
    });

    this.node.on('reset', (tip) => {
      if (!this.opened)
        return;

      this.emit('chain reset', tip);
    });
  }

  /**
   * Open the client.
   * @returns {Promise}
   */

  async open(options) {
    assert(!this.opened, 'NodeClient is already open.');
    this.opened = true;
    setImmediate(() => this.emit('connect'));
  }

  /**
   * Close the client.
   * @returns {Promise}
   */

  async close() {
    assert(this.opened, 'NodeClient is not open.');
    this.opened = false;
    setImmediate(() => this.emit('disconnect'));
  }

  /**
   * Add a listener.
   * @param {String} type
   * @param {Function} handler
   */

  bind(type, handler) {
    return this.on(type, handler);
  }

  /**
   * Add a listener.
   * @param {String} type
   * @param {Function} handler
   */

  hook(type, handler) {
    return this.on(type, handler);
  }

  /**
   * Get chain tip.
   * @returns {Promise}
   */

  async getTip() {
    return this.node.chain.tip;
  }

  /**
   * Get chain entry.
   * @param {Hash} hash
   * @returns {Promise}
   */

  async getEntry(hash) {
    const entry = await this.node.chain.getEntry(hash);

    if (!entry)
      return null;

    if (!await this.node.chain.isMainChain(entry))
      return null;

    return entry;
  }

  /**
   * Send a transaction. Do not wait for promise.
   * @param {TX} tx
   * @returns {Promise}
   */

  async send(tx) {
    this.node.relay(tx);
  }

  /**
   * Send a claim. Do not wait for promise.
   * @param {Claim} claim
   * @returns {Promise}
   */

  async sendClaim(claim) {
    this.node.relayClaim(claim);
  }

  /**
   * Set bloom filter.
   * @param {Bloom} filter
   * @returns {Promise}
   */

  async setFilter(filter) {
    this.filter = filter;
    this.node.pool.setFilter(filter);
  }

  /**
   * Add data to filter.
   * @param {Buffer} data
   * @returns {Promise}
   */

  async addFilter(data) {
    this.node.pool.queueFilterLoad();
  }

  /**
   * Reset filter.
   * @returns {Promise}
   */

  async resetFilter() {
    this.node.pool.queueFilterLoad();
  }

  /**
   * Esimate smart fee.
   * @param {Number?} blocks
   * @returns {Promise}
   */

  async estimateFee(blocks) {
    if (!this.node.fees)
      return this.network.feeRate;

    return this.node.fees.estimateFee(blocks);
  }

  /**
   * Get hash range.
   * @param {Number} start
   * @param {Number} end
   * @returns {Promise}
   */

  async getHashes(start = -1, end = -1) {
    return this.node.chain.getHashes(start, end);
  }

  /**
   * Rescan for any missed transactions.
   * @param {Number|Hash} start - Start block.
   * @param {Bloom} filter
   * @param {Function} iter - Iterator.
   * @returns {Promise}
   */

  async rescan(start) {
    return this.node.chain.scan(start, this.filter, (entry, txs) => {
      return this.emitAsync('block rescan', entry, txs);
    });
  }

  /**
   * Get auction state.
   * @param {Buffer} nameHash
   * @returns {Object}
   */

  async getAuctionState(nameHash, height) {
    // In SPV mode, we guess.
    if (this.node.spv)
      return { height, highest: -1, value: -1 };

    const cdb = this.node.chain.cdb;
    const auction = await cdb.getAuction(nameHash);

    if (!auction || auction.isNull())
      throw new Error('Auction not found.');

    // Can happen during a rescan. Should
    // not be an issue as we are already
    // tracking everything.
    if (height < auction.height) {
      return {
        height,
        highest: -1,
        value: -1
      };
    }

    // Happens if the node and wallet are
    // out of sync. i.e. if the node is
    // behind the wallet (impossible).
    if (auction.isExpired(height, this.network))
      throw new Error('Auction synchronization failure.');

    return {
      height: auction.height,
      highest: auction.highest,
      value: auction.value
    };
  }

  /**
   * Test whether a name is biddable.
   * @param {Buffer} nameHash
   * @returns {Promise}
   */

  async isBiddable(nameHash) {
    if (this.node.spv)
      return true;

    const height = this.node.chain.height + 1;
    const cdb = this.node.chain.db.cdb;

    return cdb.isBiddable(nameHash, height);
  }
}

/*
 * Expose
 */

module.exports = NodeClient;
