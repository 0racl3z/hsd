/*!
 * chainentry.js - chainentry object for hsk
 * Copyright (c) 2017-2018, Christopher Jeffrey (MIT License).
 * https://github.com/handshake-org/hskd
 */

'use strict';

const assert = require('assert');
const bio = require('bufio');
const BN = require('bn.js');
const {Solution} = require('bcuckoo');
const consensus = require('../protocol/consensus');
const Headers = require('../primitives/headers');
const InvItem = require('../primitives/invitem');

/*
 * Constants
 */

const ZERO = new BN(0);

/**
 * Chain Entry
 * Represents an entry in the chain. Unlike
 * other bitcoin fullnodes, we store the
 * chainwork _with_ the entry in order to
 * avoid reading the entire chain index on
 * boot and recalculating the chainworks.
 * @alias module:blockchain.ChainEntry
 * @property {Hash} hash
 * @property {Number} version
 * @property {Hash} prevBlock
 * @property {Hash} merkleRoot
 * @property {Hash} witnessRoot
 * @property {Hash} treeRoot
 * @property {Number} time
 * @property {Number} bits
 * @property {Buffer} nonce
 * @property {Solution} solution
 * @property {Number} height
 * @property {BN} chainwork
 */

class ChainEntry {
  /**
   * Create a chain entry.
   * @constructor
   * @param {Object?} options
   */

  constructor(options) {
    this.hash = consensus.NULL_HASH;
    this.version = 0;
    this.prevBlock = consensus.NULL_HASH;
    this.merkleRoot = consensus.NULL_HASH;
    this.witnessRoot = consensus.NULL_HASH;
    this.treeRoot = consensus.NULL_HASH;
    this.time = 0;
    this.bits = 0;
    this.nonce = consensus.ZERO_NONCE;
    this.solution = consensus.ZERO_SOL;
    this.height = 0;
    this.chainwork = ZERO;

    if (options)
      this.fromOptions(options);
  }

  /**
   * Inject properties from options.
   * @private
   * @param {Object} options
   */

  fromOptions(options) {
    assert(options, 'Block data is required.');
    assert(typeof options.hash === 'string');
    assert((options.version >>> 0) === options.version);
    assert(typeof options.prevBlock === 'string');
    assert(typeof options.merkleRoot === 'string');
    assert(typeof options.witnessRoot === 'string');
    assert(typeof options.treeRoot === 'string');
    assert(Number.isSafeInteger(options.time) && options.time >= 0);
    assert((options.bits >>> 0) === options.bits);
    assert(Buffer.isBuffer(options.nonce));
    assert((options.height >>> 0) === options.height);
    assert(!options.chainwork || BN.isBN(options.chainwork));

    this.hash = options.hash;
    this.version = options.version;
    this.prevBlock = options.prevBlock;
    this.merkleRoot = options.merkleRoot;
    this.witnessRoot = options.witnessRoot;
    this.treeRoot = options.treeRoot;
    this.time = options.time;
    this.bits = options.bits;
    this.nonce = options.nonce;
    this.solution = Solution.fromOptions(options.solution);

    this.height = options.height;
    this.chainwork = options.chainwork || ZERO;

    return this;
  }

  /**
   * Instantiate chainentry from options.
   * @param {Object} options
   * @param {ChainEntry} prev - Previous entry.
   * @returns {ChainEntry}
   */

  static fromOptions(options, prev) {
    return new this().fromOptions(options, prev);
  }

  /**
   * Calculate the proof: (1 << 256) / (target + 1)
   * @returns {BN} proof
   */

  getProof() {
    const target = consensus.fromCompact(this.bits);

    if (target.isNeg() || target.isZero())
      return new BN(0);

    return ChainEntry.MAX_CHAINWORK.div(target.iaddn(1));
  }

  /**
   * Calculate the chainwork by
   * adding proof to previous chainwork.
   * @returns {BN} chainwork
   */

  getChainwork(prev) {
    const proof = this.getProof();

    if (!prev)
      return proof;

    return proof.iadd(prev.chainwork);
  }

  /**
   * Test against the genesis block.
   * @returns {Boolean}
   */

  isGenesis() {
    return this.height === 0;
  }

  /**
   * Test whether the entry contains an unknown version bit.
   * @param {Network} network
   * @returns {Boolean}
   */

  hasUnknown(network) {
    return (this.version & network.unknownBits) !== 0;
  }

  /**
   * Test whether the entry contains a version bit.
   * @param {Number} bit
   * @returns {Boolean}
   */

  hasBit(bit) {
    return consensus.hasBit(this.version, bit);
  }

  /**
   * Inject properties from block.
   * @private
   * @param {Block|MerkleBlock} block
   * @param {ChainEntry} prev - Previous entry.
   */

  fromBlock(block, prev) {
    this.hash = block.hash('hex');
    this.version = block.version;
    this.prevBlock = block.prevBlock;
    this.merkleRoot = block.merkleRoot;
    this.witnessRoot = block.witnessRoot;
    this.treeRoot = block.treeRoot;
    this.time = block.time;
    this.bits = block.bits;
    this.nonce = block.nonce;
    this.solution = block.solution;
    this.height = prev ? prev.height + 1 : 0;
    this.chainwork = this.getChainwork(prev);
    return this;
  }

  /**
   * Instantiate chainentry from block.
   * @param {Block|MerkleBlock} block
   * @param {ChainEntry} prev - Previous entry.
   * @returns {ChainEntry}
   */

  static fromBlock(block, prev) {
    return new this().fromBlock(block, prev);
  }

  /**
   * Get serialization size.
   * @returns {Number}
   */

  getSize() {
    return 36 + consensus.HEADER_SIZE + this.solution.getSize() + 32;
  }

  /**
   * Serialize the entry to internal database format.
   * @returns {Buffer}
   */

  toRaw() {
    const bw = bio.write(this.getSize());

    bw.writeHash(this.hash);
    bw.writeU32(this.height);
    bw.writeU32(this.version);
    bw.writeHash(this.prevBlock);
    bw.writeHash(this.merkleRoot);
    bw.writeHash(this.witnessRoot);
    bw.writeHash(this.treeRoot);
    bw.writeU64(this.time);
    bw.writeU32(this.bits);
    bw.writeBytes(this.nonce);
    this.solution.toWriter(bw);
    bw.writeBytes(this.chainwork.toArrayLike(Buffer, 'be', 32));

    return bw.render();
  }

  /**
   * Inject properties from serialized data.
   * @private
   * @param {Buffer} data
   */

  fromRaw(data) {
    const br = bio.read(data);

    this.hash = br.readHash('hex');
    this.height = br.readU32();
    this.version = br.readU32();
    this.prevBlock = br.readHash('hex');
    this.merkleRoot = br.readHash('hex');
    this.witnessRoot = br.readHash('hex');
    this.treeRoot = br.readHash('hex');
    this.time = br.readU64();
    this.bits = br.readU32();
    this.nonce = br.readBytes(consensus.NONCE_SIZE);
    this.solution = Solution.fromReader(br);
    this.chainwork = new BN(br.readBytes(32), 'be');

    return this;
  }

  /**
   * Deserialize the entry.
   * @param {Buffer} data
   * @returns {ChainEntry}
   */

  static fromRaw(data) {
    return new this().fromRaw(data);
  }

  /**
   * Serialize the entry to an object more
   * suitable for JSON serialization.
   * @returns {Object}
   */

  toJSON() {
    return {
      hash: this.hash,
      height: this.height,
      version: this.version,
      prevBlock: this.prevBlock,
      merkleRoot: this.merkleRoot,
      witnessRoot: this.witnessRoot,
      treeRoot: this.treeRoot,
      time: this.time,
      bits: this.bits,
      nonce: this.nonce.toString('hex'),
      solution: this.solution.toJSON(),
      chainwork: this.chainwork.toString('hex', 64)
    };
  }

  /**
   * Inject properties from json object.
   * @private
   * @param {Object} json
   */

  fromJSON(json) {
    assert(json, 'Block data is required.');
    assert(typeof json.hash === 'string'
      && json.hash.length === 64);
    assert((json.height >>> 0) === json.height);
    assert((json.version >>> 0) === json.version);
    assert(typeof json.prevBlock === 'string'
      && json.prevBlock.length === 64);
    assert(typeof json.merkleRoot === 'string'
      && json.merkleRoot.length === 64);
    assert(typeof json.witnessRoot === 'string'
      && json.witnessRoot.length === 64);
    assert(typeof json.treeRoot === 'string'
      && json.treeRoot.length === 64);
    assert(Number.isSafeInteger(json.time) && json.time >= 0);
    assert((json.bits >>> 0) === json.bits);
    assert(typeof json.nonce === 'string' && json.nonce.length === 32);
    assert(typeof json.chainwork === 'string' && json.chainwork.length === 64);

    const nonce = Buffer.from(json.nonce, 'hex');
    assert(nonce.length === consensus.NONCE_SIZE);

    const chainwork = Buffer.from(json.chainwork, 'hex');
    assert(chainwork.length === 32);

    this.hash = json.hash;
    this.height = json.height;
    this.version = json.version;
    this.prevBlock = json.prevBlock;
    this.merkleRoot = json.merkleRoot;
    this.witnessRoot = json.witnessRoot;
    this.treeRoot = json.treeRoot;
    this.time = json.time;
    this.bits = json.bits;
    this.nonce = nonce;
    this.solution = Solution.fromJSON(json.solution);
    this.chainwork = new BN(chainwork, 'be');

    return this;
  }

  /**
   * Instantiate block from jsonified object.
   * @param {Object} json
   * @returns {ChainEntry}
   */

  static fromJSON(json) {
    return new this().fromJSON(json);
  }

  /**
   * Convert the entry to a headers object.
   * @returns {Headers}
   */

  toHeaders() {
    return Headers.fromEntry(this);
  }

  /**
   * Convert the entry to an inv item.
   * @returns {InvItem}
   */

  toInv() {
    return new InvItem(InvItem.types.BLOCK, this.hash);
  }

  /**
   * Return a more user-friendly object.
   * @returns {Object}
   */

  inspect() {
    const json = this.toJSON();
    json.version = json.version.toString(16);
    return json;
  }

  /**
   * Test whether an object is a {@link ChainEntry}.
   * @param {Object} obj
   * @returns {Boolean}
   */

  static isChainEntry(obj) {
    return obj instanceof ChainEntry;
  }
}

/**
 * The max chainwork (1 << 256).
 * @const {BN}
 */

ChainEntry.MAX_CHAINWORK = new BN(1).ushln(256);

/*
 * Expose
 */

module.exports = ChainEntry;
