'use strict';

var fetch = require('isomorphic-fetch');

class FetchAdapter {

  constructor(options) {
    this._base = (options && options.base) || '';
    this._additionalHeaders =  (options && options.additionalHeaders) || {};
  }

  _fetch(method, url, body) {
    var statusCode;
    return fetch(url, {
      headers: Object.assign({}, this._additionalHeaders, {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      }),
      method,
      body: body ? JSON.stringify(body) : undefined,
    })
    .then(res => {
      statusCode = res.status;
      return res.text()
      .then(( msg ) => {
        try {
          return JSON.parse(msg);
        } catch( err ) {
          throw new Error(msg);
        }
      });
    })
    .then(res => {
      if ( statusCode >= 400 ) {
        throw new Error(`${ statusCode }: ${ res.errors[0].title } - ${ res.errors[0].detail }`);
      }
      if ( !res.data ) {
        throw new Error(`Invalid response (No Data)`);
      }
      return res;
    });
  }

  create(store, type, partial, options) {

    return this._fetch('POST', this._getUrl(store, type, null, options), {
      data: store.convert(type, partial)
    })
    .then(res => {
      store.push(res);
      return store.find(res.data.type, res.data.id)
    });

  }

  destroy(store, type, id, options) {

    return this._fetch('DELETE', this._getUrl(store, type, id, options), {
      data: store.convert(type, partial)
    })
    .then(res => {
      store.remove(res);
    });

  }

  load(store, type, id, options) {

    const split = type.split('/');
    const trueType = split[split.length - 1];

    if (id && typeof id === 'object') {
      return this.load(store, type, null, id);
    }

    return this._fetch('GET', this._getUrl(store, type, id, options))
    .then(res => {
      store.push(res);
      return id ? store.find(trueType, id) : store.findAll(trueType);
    });

  }

  update(store, type, id, partial, options) {

    let data = store.convert(type, id, partial);

    return this._fetch('PATCH', this._getUrl(store, type, id, options), {
      data,
    })
    .then(res => {
      store.add(data);
      return store.find(type, id);
    });

  }

  _getUrl(store, type, id, options) {

    type = type.replace(/\_/g, '-');


    let params = [];
    let url = id ? `${this._base}/${type}/${id}` : `${this._base}/${type}`;

    if (options) {

      if (options.fields) {
        Object.keys(options.fields).forEach(field => {
          options[`fields[${field}]`] = options.fields[field];
        });
        delete options.fields;
      }

      if (options.filter) {
        Object.keys(options.filter).forEach(field => {
          options[`filter[${field}]`] = options.filter[field];
        });
        delete options.filter;
      }

      params = Object.keys(options).map(key => {
        return key + '=' + encodeURIComponent(options[key]);
      }).sort();

      if (params.length) {
        url = `${url}?${params.join('&')}`;
      }

    }

    return url;

  }

}

module.exports = FetchAdapter;
