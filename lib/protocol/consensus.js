/*!
 * consensus.js - consensus constants and helpers for hsk
 * Copyright (c) 2017-2018, Christopher Jeffrey (MIT License).
 * https://github.com/handshake-org/hskd
 */

'use strict';

/**
 * @module protocol/consensus
 */

const assert = require('assert');
const BN = require('bn.js');
const {Cuckoo, Solution, codes} = require('bcuckoo');

/**
 * Coin exponent.
 * @const {Number}
 * @default
 */

exports.EXP = 6;

/**
 * One handshake in dollarydoos.
 * @const {Amount}
 * @default
 */

exports.COIN = Math.pow(10, exports.EXP);

/**
 * Maximum investors amount in dollarydoos (consensus).
 * @const {Amount}
 * @default
 */

exports.MAX_INVESTORS = 102e6 * exports.COIN;

/**
 * Maximum foundation amount in dollarydoos (consensus).
 * @const {Amount}
 * @default
 */

exports.MAX_FOUNDATION = 102e6 * exports.COIN;

/**
 * Maximum creators amount in dollarydoos (consensus).
 * @const {Amount}
 * @default
 */

exports.MAX_CREATORS = 102e6 * exports.COIN;

/**
 * Maximum airdrop amount in dollarydoos (consensus).
 * @const {Amount}
 * @default
 */

exports.MAX_AIRDROP = 1.054e9 * exports.COIN;

/**
 * Maximum amount of premine in dollarydoos (consensus).
 * @const {Amount}
 * @default
 */

// MAX_INVESTORS + MAX_FOUNDATION + MAX_CREATORS + MAX_AIRDROP
exports.MAX_PREMINE = 1.36e9 * exports.COIN;

/**
 * Maximum amount of subsidies in dollarydoos (consensus).
 * @const {Amount}
 * @default
 */

// MAX_PREMINE / 2
exports.MAX_SUBSIDY = 0.68e9 * exports.COIN;

/**
 * Maximum amount of money in dollarydoos (consensus).
 * @const {Amount}
 * @default
 */

// MAX_PREMINE + MAX_SUBSIDY
exports.MAX_MONEY = 2.04e9 * exports.COIN;

/**
 * Base block subsidy (consensus).
 * @const {Amount}
 * @default
 */

exports.BASE_REWARD = 1000 * exports.COIN;

/**
 * Block subsidy specifically for the genesis block.
 *
 * Explanation:
 * The max miner subsidy is 680000000, but due
 * to the halving interval it actually ends up
 * as 679999991.16, so add 8.84 coins to the
 * genesis reward output to make MAX_MONEY a
 * thoroughly true value.
 *
 * This, combined with the 3.25 year halving
 * interval, causes the supply to run dry
 * after about 94 years (around the year 2112,
 * or height=10,200,000).
 *
 * @const {Amount}
 * @default
 */

exports.GENESIS_REWARD = exports.BASE_REWARD + ((4.42 * exports.COIN) | 0);

/**
 * Genesis key.
 * @const {Buffer}
 */

exports.GENESIS_KEY =
  Buffer.from('f0237ae2e8f860f7d79124fc513f012e5aaa8d23', 'hex');

/**
 * Maximum block base size (consensus).
 * @const {Number}
 * @default
 */

exports.MAX_BLOCK_SIZE = 1000000;

/**
 * Maximum block serialization size (protocol).
 * @const {Number}
 * @default
 */

exports.MAX_RAW_BLOCK_SIZE = 4000000;

/**
 * Maximum block weight (consensus).
 * @const {Number}
 * @default
 */

exports.MAX_BLOCK_WEIGHT = 4000000;

/**
 * Maximum block sigops cost (consensus).
 * @const {Number}
 * @default
 */

exports.MAX_BLOCK_SIGOPS = 80000;

/**
 * Maximum block tree updates.
 * @const {Number}
 * @default
 */

exports.MAX_BLOCK_UPDATES = 500;

/**
 * Size of set to pick median time from.
 * @const {Number}
 * @default
 */

exports.MEDIAN_TIMESPAN = 11; // XXX 22?

/**
 * Amount to multiply base/non-witness sizes by.
 * @const {Number}
 * @default
 */

exports.WITNESS_SCALE_FACTOR = 4;

/**
 * nLockTime threshold for differentiating
 * between height and time (consensus).
 * Tue Nov 5 00:53:20 1985 UTC
 * @const {Number}
 * @default
 */

exports.LOCKTIME_THRESHOLD = 500000000;

/**
 * Highest nSequence bit -- disables
 * sequence locktimes (consensus).
 * @const {Number}
 */

exports.SEQUENCE_DISABLE_FLAG = (1 << 31) >>> 0;

/**
 * Sequence time: height or time (consensus).
 * @const {Number}
 * @default
 */

exports.SEQUENCE_TYPE_FLAG = 1 << 22;

/**
 * Sequence granularity for time (consensus).
 * @const {Number}
 * @default
 */

exports.SEQUENCE_GRANULARITY = 9;

/**
 * Sequence mask (consensus).
 * @const {Number}
 * @default
 */

exports.SEQUENCE_MASK = 0x0000ffff;

/**
 * Max serialized script size (consensus).
 * @const {Number}
 * @default
 */

exports.MAX_SCRIPT_SIZE = 10000;

/**
 * Max stack size during execution (consensus).
 * @const {Number}
 * @default
 */

exports.MAX_SCRIPT_STACK = 1000;

/**
 * Max script element size (consensus).
 * @const {Number}
 * @default
 */

exports.MAX_SCRIPT_PUSH = 520;

/**
 * Max opcodes executed (consensus).
 * @const {Number}
 * @default
 */

exports.MAX_SCRIPT_OPS = 201;

/**
 * Max `n` value for multisig (consensus).
 * @const {Number}
 * @default
 */

exports.MAX_MULTISIG_PUBKEYS = 20;

/**
 * A hash of all zeroes.
 * @const {Buffer}
 * @default
 */

exports.ZERO_HASH = Buffer.alloc(32, 0x00);

/**
 * A hash of all zeroes.
 * @const {String}
 * @default
 */

exports.NULL_HASH =
  '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Block header size.
 * @const {Number}
 * @default
 */

exports.HEADER_SIZE = 196;

/**
 * Block header nonce position.
 * @const {Number}
 * @default
 */

exports.NONCE_POS = 176;

/**
 * Block header nonce size.
 * @const {Number}
 * @default
 */

exports.NONCE_SIZE = 20;

/**
 * Block header of all zeroes.
 * @const {Buffer}
 * @default
 */

exports.ZERO_HEADER = Buffer.alloc(exports.HEADER_SIZE, 0x00);

/**
 * Block header nonce of all zeroes.
 * @const {Buffer}
 * @default
 */

exports.ZERO_NONCE = Buffer.alloc(exports.NONCE_SIZE, 0x00);

/**
 * Block header solution of all zeroes.
 * @const {Solution}
 * @default
 */

exports.ZERO_SOL = new Solution();

/**
 * Convert a compact number to a big number.
 * Used for `block.bits` -> `target` conversion.
 * @param {Number} compact
 * @returns {BN}
 */

exports.fromCompact = function fromCompact(compact) {
  if (compact === 0)
    return new BN(0);

  const exponent = compact >>> 24;
  const negative = (compact >>> 23) & 1;

  let mantissa = compact & 0x7fffff;
  let num;

  if (exponent <= 3) {
    mantissa >>>= 8 * (3 - exponent);
    num = new BN(mantissa);
  } else {
    num = new BN(mantissa);
    num.iushln(8 * (exponent - 3));
  }

  if (negative)
    num.ineg();

  return num;
};

/**
 * Convert a big number to a compact number.
 * Used for `target` -> `block.bits` conversion.
 * @param {BN} num
 * @returns {Number}
 */

exports.toCompact = function toCompact(num) {
  if (num.isZero())
    return 0;

  let exponent = num.byteLength();
  let mantissa;

  if (exponent <= 3) {
    mantissa = num.toNumber();
    mantissa <<= 8 * (3 - exponent);
  } else {
    mantissa = num.ushrn(8 * (exponent - 3)).toNumber();
  }

  if (mantissa & 0x800000) {
    mantissa >>>= 8;
    exponent += 1;
  }

  let compact = (exponent << 24) | mantissa;

  if (num.isNeg())
    compact |= 0x800000;

  compact >>>= 0;

  return compact;
};

/**
 * Verify proof-of-work.
 * @param {Hash} hash
 * @param {Number} bits
 * @returns {Boolean}
 */

exports.verifyPOW = function verifyPOW(hash, bits) {
  const target = exports.fromCompact(bits);

  if (target.isNeg() || target.isZero())
    return false;

  if (target.bitLength() > 256)
    return false;

  const num = new BN(hash, 'be');

  if (num.gt(target))
    return false;

  return true;
};

/**
 * Verify cuckoo cycle solution.
 * @param {Buffer} hdr
 * @param {Solution} sol
 * @param {Object} params
 * @returns {Boolean}
 */

exports.verifySolution = function verifySolution(hdr, sol, params) {
  const {bits, size, ease} = params;
  const cuckoo = new Cuckoo(bits, size, ease);
  const code = cuckoo.verifyHeader(hdr, sol);
  return code === codes.POW_OK;
};

/**
 * Calculate block subsidy.
 * @param {Number} height - Reward era by height.
 * @returns {Amount}
 */

exports.getReward = function getReward(height, interval) {
  assert((height >>> 0) === height, 'Bad height for reward.');
  assert((interval >>> 0) === interval);

  const halvings = Math.floor(height / interval);

  if (halvings >= 52)
    return 0;

  return Math.floor(exports.BASE_REWARD / Math.pow(2, halvings));
};

/**
 * Test version bit.
 * @param {Number} version
 * @param {Number} bit
 * @returns {Boolean}
 */

exports.hasBit = function hasBit(version, bit) {
  return (version & (1 << bit)) !== 0;
};
