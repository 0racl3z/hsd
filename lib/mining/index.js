/*!
 * mining/index.js - mining infrastructure for hsk
 * Copyright (c) 2017-2018, Christopher Jeffrey (MIT License).
 * https://github.com/handshake-org/hskd
 */

'use strict';

/**
 * @module mining
 */

exports.common = require('./common');
exports.CPUMiner = require('./cpuminer');
exports.mine = require('./mine');
exports.Miner = require('./miner');
exports.BlockTemplate = require('./template');
