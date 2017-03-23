const md5 = require('md5');
const {
  extend,
} = require('underscore');
const Promise = require('./promise');
const AVError = require('./error');
const AV = require('./av');
const {
  getSessionToken,
  ajax,
} = require('./utils');

// 计算 X-LC-Sign 的签名方法
const sign = (key, isMasterKey) => {
  const now = new Date().getTime();
  const signature = md5(now + key);
  if (isMasterKey) {
    return `${signature},${now},master`;
  }
  return `${signature},${now}`;
};

const setAppId = (headers, signKey) => {
  if (signKey) {
    headers['X-LC-Sign'] = sign(AV.applicationKey);
  } else {
    headers['X-LC-Key'] = AV.applicationKey;
  }
};

const setHeaders = (authOptions = {}, signKey) => {
  const headers = {
    'X-LC-Id': AV.applicationId,
    'Content-Type': 'application/json;charset=UTF-8',
  };
  let useMasterKey = false;
  if (typeof authOptions.useMasterKey === 'boolean') {
    useMasterKey = authOptions.useMasterKey;
  } else if (typeof AV._config.useMasterKey === 'boolean') {
    useMasterKey = AV._config.useMasterKey;
  }
  if (useMasterKey) {
    if (AV.masterKey) {
      if (signKey) {
        headers['X-LC-Sign'] = sign(AV.masterKey, true);
      } else {
        headers['X-LC-Key'] = `${AV.masterKey},master`;
      }
    } else {
      console.warn('masterKey is not set, fall back to use appKey');
      setAppId(headers, signKey);
    }
  } else {
    setAppId(headers, signKey);
  }
  if (AV.hookKey) {
    headers['X-LC-Hook-Key'] = AV.hookKey;
  }
  if (AV._config.production !== null) {
    headers['X-LC-Prod'] = String(AV._config.production);
  }
  headers[!process.env.CLIENT_PLATFORM ? 'User-Agent' : 'X-LC-UA'] = AV._config.userAgent;

  return Promise.resolve().then(() => {
    // Pass the session token
    const sessionToken = getSessionToken(authOptions);
    if (sessionToken) {
      headers['X-LC-Session'] = sessionToken;
    } else if (!AV._config.disableCurrentUser) {
      return AV.User.currentAsync().then((currentUser) => {
        if (currentUser && currentUser._sessionToken) {
          headers['X-LC-Session'] = currentUser._sessionToken;
        }
        return headers;
      });
    }
    return headers;
  });
};

const createApiUrl = ({
    service = 'api',
    version = '1.1',
    path,
    // query, // don't care
    // method, // don't care
    // data, // don't care
  }) => {
  let apiURL = AV._config.serverURLs[service];

  if (!apiURL) throw new Error(`undefined server URL for ${service}`);

  if (apiURL.charAt(apiURL.length - 1) !== '/') {
    apiURL += '/';
  }
  apiURL += version;
  if (path) {
    apiURL += path;
  }

  return apiURL;
};

// handle AV._request Error
const handleError = (error) =>
  new Promise((resolve, reject) => {
    let errorJSON = {
      code: error.code || -1,
      error: error.message || error.responseText,
    };
    if (error.response && error.response.code) {
      errorJSON = error.response;
    } else if (error.responseText) {
      try {
        errorJSON = JSON.parse(error.responseText);
      } catch (e) {
        // If we fail to parse the error text, that's okay.
      }
    }

    // Transform the error into an instance of AVError by trying to parse
    // the error string as JSON.
    reject(new AVError(errorJSON.code, errorJSON.error));
  });

const request = ({ service, version, method, path, query, data = {}, authOptions }) => {
  if (!(AV.applicationId && (AV.applicationKey || AV.masterKey))) {
    throw new Error('Not initialized');
  }
  AV._appRouter.refresh();
  const url = createApiUrl({ service, path, version });
  return setHeaders(authOptions).then(
    headers => ajax({ method, url, query, data, headers })
      .catch(handleError)
  );
};

// lagecy request
const _request = (route, className, objectId, method, data = {}, authOptions, query) => {
  let path = '';
  if (route) path += `/${route}`;
  if (className) path += `/${className}`;
  if (objectId) path += `/${objectId}`;
  // for migeration
  if (data && data._fetchWhenSave) throw new Error('_fetchWhenSave should be in the query');
  if (data && data._where) throw new Error('_where should be in the query');
  if (method && (method.toLowerCase() === 'get')) {
    query = extend({}, query, data);
    data = null;
  }
  return request({
    method,
    path,
    query,
    data,
    authOptions,
  });
};

AV.request = request;

module.exports = {
  _request,
  request,
};
