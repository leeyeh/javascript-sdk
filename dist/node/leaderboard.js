'use strict';

var _ = require('underscore');
var Promise = require('./promise');

var _require = require('./request'),
    request = _require.request;

var _require2 = require('./utils'),
    ensureArray = _require2.ensureArray,
    parseDate = _require2.parseDate;

var AV = require('./av');

/**
 * The version change interval for Leaderboard
 * @enum
 */
AV.LeaderboardVersionChangeInterval = {
  NEVER: 'never',
  HOUR: 'hour',
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month'
};

/**
 * The order of the leaderboard results
 * @enum
 */
AV.LeaderboardOrder = {
  ASCENDING: 'ascending',
  DESCENDING: 'descending'
};

/**
 * The update strategy for Leaderboard
 * @enum
 */
AV.LeaderboardUpdateStrategy = {
  /** Only keep the best statistic. If the leaderboard is in descending order, the best statistic is the highest one. */
  BETTER: 'better',
  /** Keep the last updated statistic */
  LAST: 'last'
};

/**
 * @class
 */
function Statistic(_ref) {
  var user = _ref.user,
      name = _ref.name,
      value = _ref.value,
      position = _ref.position,
      version = _ref.version;

  /**
   * @type {string}
   */
  this.name = name;
  /**
   * @type {number}
   */
  this.value = value;
  /**
   * @type {AV.User}
   */
  this.user = user;
  /**
   * The position of the leandboard. Only occurs in leaderboard results.
   * @type {number?}
   */
  this.position = position;
  /**
   * @type {number?}
   */
  this.version = version;
}

/**
 * @class
 */
AV.Leaderboard = function (statisticName) {
  /**
   * @type {string}
   */
  this.statisticName = statisticName;
  /**
   * @type {AV.LeaderboardOrder}
   */
  this.order = undefined;
  /**
   * @type {AV.LeaderboardUpdateStrategy}
   */
  this.updateStrategy = undefined;
  /**
   * @type {AV.LeaderboardVersionChangeInterval}
   */
  this.versionChangeInterval = undefined;
  /**
   * @type {number}
   */
  this.version = undefined;
  /**
   * @type {Date?}
   */
  this.nextResetAt = undefined;
  /**
   * @type {Date?}
   */
  this.createdAt = undefined;
};
var Leaderboard = AV.Leaderboard;

/**
 * Create an instance of Leaderboard for the give statistic name.
 * @param {string} statisticName
 * @return {AV.Leaderboard}
 */
AV.Leaderboard.createWithoutData = function (statisticName) {
  return new Leaderboard(statisticName);
};
/**
 * (masterKey required) Create a new Leaderboard.
 * @param {Object} options
 * @param {string} options.statisticName
 * @param {AV.LeaderboardOrder} options.order
 * @param {AV.LeaderboardVersionChangeInterval} [options.versionChangeInterval] default to WEEK
 * @param {AV.LeaderboardUpdateStrategy} [options.updateStrategy] default to BETTER
 * @param {AuthOptions} [authOptions]
 * @return {Promise<AV.Leaderboard>}
 */
AV.Leaderboard.createLeaderboard = function (_ref2, authOptions) {
  var statisticName = _ref2.statisticName,
      order = _ref2.order,
      versionChangeInterval = _ref2.versionChangeInterval,
      updateStrategy = _ref2.updateStrategy;
  return request({
    method: 'POST',
    path: '/leaderboard/leaderboards',
    data: {
      statisticName: statisticName,
      order: order,
      versionChangeInterval: versionChangeInterval,
      updateStrategy: updateStrategy
    },
    authOptions: authOptions
  }).then(function (data) {
    var leaderboard = new Leaderboard(statisticName);
    return leaderboard._finishFetch(data);
  });
};
/**
 * Get the Leaderboard with the specified statistic name.
 * @param {string} statisticName
 * @param {AuthOptions} [authOptions]
 * @return {Promise<AV.Leaderboard>}
 */
AV.Leaderboard.getLeaderboard = function (statisticName, authOptions) {
  return Leaderboard.createWithoutData(statisticName).fetch(authOptions);
};
/**
 * Get Statistics for the specified user.
 * @param {AV.User} user The specified AV.User pointer.
 * @param {Object} [options]
 * @param {string[]} [options.statisticNames] Specify the statisticNames. If not set, all statistics of the user will be fetched.
 * @param {AuthOptions} [authOptions]
 * @return {Promise<Statistic[]>}
 */
AV.Leaderboard.getStatistics = function (user) {
  var _ref3 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      statisticNames = _ref3.statisticNames;

  var authOptions = arguments[2];
  return Promise.resolve().then(function () {
    if (!(user && user.id)) throw new Error('user must be an AV.User');
    return request({
      method: 'GET',
      path: '/leaderboard/users/' + user.id + '/statistics',
      query: {
        statistics: statisticNames ? ensureArray(statisticNames) : undefined
      },
      authOptions: authOptions
    }).then(function (_ref4) {
      var results = _ref4.results;
      return results.map(function (statisticData) {
        var _AV$_decode = AV._decode(statisticData),
            name = _AV$_decode.statisticName,
            value = _AV$_decode.statisticValue,
            version = _AV$_decode.version;

        return new Statistic({ user: user, name: name, value: value, version: version });
      });
    });
  });
};
/**
 * Update Statistics for the specified user.
 * @param {AV.User} user The specified AV.User pointer.
 * @param {Object} statistics A name-value pair representing the statistics to update.
 * @param {AuthOptions} [authOptions]
 * @return {Promise<Statistic[]>}
 */
AV.Leaderboard.updateStatistics = function (user, statistics, authOptions) {
  return Promise.resolve().then(function () {
    if (!(user && user.id)) throw new Error('user must be an AV.User');
    var data = _.map(statistics, function (value, key) {
      return {
        statisticName: key,
        statisticValue: value
      };
    });
    return request({
      method: 'POST',
      path: '/leaderboard/users/' + user.id + '/statistics',
      data: data,
      authOptions: authOptions
    }).then(function (_ref5) {
      var results = _ref5.results;
      return results.map(function (statisticData) {
        var _AV$_decode2 = AV._decode(statisticData),
            name = _AV$_decode2.statisticName,
            value = _AV$_decode2.statisticValue,
            version = _AV$_decode2.version;

        return new Statistic({ user: user, name: name, value: value, version: version });
      });
    });
  });
};

_.extend(Leaderboard.prototype,
/** @lends AV.Leaderboard.prototype */{
  _finishFetch: function _finishFetch(data) {
    var _this = this;

    _.forEach(data, function (value, key) {
      if (key === 'updatedAt' || key === 'objectId') return;
      if (key === 'expiredAt') {
        key = 'nextResetAt';
      }
      if (key === 'createdAt') {
        value = parseDate(value);
      }
      if (value.__type === 'Date') {
        value = parseDate(value.iso);
      }
      _this[key] = value;
    });
    return this;
  },

  /**
   * Fetch data from the srever.
   * @param {AuthOptions} [authOptions]
   * @return {Promise<AV.Leaderboard>}
   */
  fetch: function fetch(authOptions) {
    var _this2 = this;

    return request({
      method: 'GET',
      path: '/leaderboard/leaderboards/' + this.statisticName,
      authOptions: authOptions
    }).then(function (data) {
      return _this2._finishFetch(data);
    });
  },
  _getResults: function _getResults(_ref6, authOptions, self) {
    var skip = _ref6.skip,
        limit = _ref6.limit,
        includeUserKeys = _ref6.includeUserKeys;

    return request({
      method: 'GET',
      path: '/leaderboard/leaderboards/' + this.statisticName + '/positions' + (self ? '/self' : ''),
      query: {
        skip: skip,
        limit: limit,
        includeUser: includeUserKeys ? ensureArray(includeUserKeys).join(',') : undefined
      },
      authOptions: authOptions
    }).then(function (_ref7) {
      var results = _ref7.results;
      return results.map(function (statisticData) {
        var _AV$_decode3 = AV._decode(statisticData),
            user = _AV$_decode3.user,
            name = _AV$_decode3.statisticName,
            value = _AV$_decode3.statisticValue,
            position = _AV$_decode3.position;

        return new Statistic({ user: user, name: name, value: value, position: position });
      });
    });
  },

  /**
   * Retrieve a list of ranked users for this Leaderboard.
   * @param {Object} [options]
   * @param {number} [options.skip] The number of results to skip. This is useful for pagination.
   * @param {number} [options.limit] The limit of the number of results.
   * @param {string[]} [options.includeUserKeys] Specify keys of the users to include
   * @param {AuthOptions} [authOptions]
   * @return {Promise<Statistic[]>}
   */
  getResults: function getResults() {
    var _ref8 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        skip = _ref8.skip,
        limit = _ref8.limit,
        includeUserKeys = _ref8.includeUserKeys;

    var authOptions = arguments[1];

    return this._getResults({ skip: skip, limit: limit, includeUserKeys: includeUserKeys }, authOptions);
  },

  /**
   * Retrieve a list of ranked users for this Leaderboard, centered on the specified user.
   * @param {Object} [options]
   * @param {number} [options.limit] The limit of the number of results.
   * @param {string[]} [options.includeUserKeys] Specify keys of the users to include
   * @param {AuthOptions} [authOptions]
   * @return {Promise<Statistic[]>}
   */
  getResultsAroundUser: function getResultsAroundUser() {
    var _ref9 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        limit = _ref9.limit,
        includeUserKeys = _ref9.includeUserKeys;

    var authOptions = arguments[1];

    return this._getResults({ limit: limit, includeUserKeys: includeUserKeys }, authOptions, true);
  },
  _update: function _update(data, authOptions) {
    var _this3 = this;

    return request({
      method: 'PUT',
      path: '/leaderboard/leaderboards/' + this.statisticName,
      data: data,
      authOptions: authOptions
    }).then(function (result) {
      return _this3._finishFetch(result);
    });
  },

  /**
   * (masterKey required) Update the version change interval of the Leaderboard.
   * @param {AV.LeaderboardVersionChangeInterval} versionChangeInterval
   * @param {AuthOptions} [authOptions]
   * @return {Promise<AV.Leaderboard>}
   */
  updateVersionChangeInterval: function updateVersionChangeInterval(versionChangeInterval, authOptions) {
    return this._update({ versionChangeInterval: versionChangeInterval }, authOptions);
  },

  /**
   * (masterKey required) Update the version change interval of the Leaderboard.
   * @param {AV.LeaderboardUpdateStrategy} updateStrategy
   * @param {AuthOptions} [authOptions]
   * @return {Promise<AV.Leaderboard>}
   */
  updateUpdateStrategy: function updateUpdateStrategy(updateStrategy, authOptions) {
    return this._update({ updateStrategy: updateStrategy }, authOptions);
  },

  /**
   * (masterKey required) Reset the Leaderboard. The version of the Leaderboard will be incremented by 1.
   * @param {AuthOptions} [authOptions]
   * @return {Promise<AV.Leaderboard>}
   */
  reset: function reset(authOptions) {
    var _this4 = this;

    return request({
      method: 'PUT',
      path: '/leaderboard/leaderboards/' + this.statisticName + '/incrementVersion',
      authOptions: authOptions
    }).then(function (data) {
      return _this4._finishFetch(data);
    });
  },

  /**
   * (masterKey required) Delete the Leaderboard and its all archived versions.
   * @param {AuthOptions} [authOptions]
   * @return {void}
   */
  destroy: function destroy(authOptions) {
    return AV.request({
      method: 'DELETE',
      path: '/leaderboard/leaderboards/' + this.statisticName,
      authOptions: authOptions
    }).then(function () {
      return undefined;
    });
  }
});