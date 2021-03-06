// Copyright 2012 YDN Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Database schema.
 *
 * This data structure is immutable.
 */



goog.provide('ydn.db.schema.Database');
goog.require('ydn.db.Key');
goog.require('ydn.db.schema.Store');



/**
 *
 * @param {DatabaseSchema|number|string=} opt_version version, if string,
 * it must be parse to int.
 * @param {!Array.<!ydn.db.schema.Store>=} opt_stores store schemas.
 * @constructor
 * @struct
 */
ydn.db.schema.Database = function(opt_version, opt_stores) {

  /**
   * @type {number|undefined}
   */
  var ver;
  var stores = opt_stores;
  if (goog.isObject(opt_version)) {
    /**
     * @type {DatabaseSchema}
     */
    var json = opt_version;
    if (goog.DEBUG) {
      var fields = ['version', 'stores'];
      for (var key in json) {
        if (json.hasOwnProperty(key) && goog.array.indexOf(fields, key) == -1) {
          throw new ydn.debug.error.ArgumentException('Unknown field: ' + key +
              ' in schema.');
        }
      }
    }
    ver = json['version'];
    stores = [];
    var stores_json = json.stores || [];
    if (goog.DEBUG && !goog.isArray(stores_json)) {
      throw new ydn.debug.error.ArgumentException('stores must be array');
    }
    for (var i = 0; i < stores_json.length; i++) {
      var store = ydn.db.schema.Store.fromJSON(stores_json[i]);
      if (goog.DEBUG) {
        var idx = goog.array.findIndex(stores, function(x) {
          return x.name == store.name;
        });
        if (idx != -1) {
          throw new ydn.debug.error.ArgumentException('duplicate store name "' +
              store.name + '".');
        }

      }
      stores.push(store);
    }
  } else if (goog.isString(opt_version)) {
    ver = opt_version.length == 0 ?
        undefined : parseFloat(opt_version);
  } else if (goog.isNumber(opt_version)) {
    ver = opt_version;
  }


  if (goog.isDef(ver)) {
    if (!goog.isNumber(ver) || ver < 0) {
      throw new ydn.debug.error.ArgumentException('Invalid version: ' +
          ver + ' (' + opt_version + ')');
    }
    if (isNaN(ver)) {
      ver = undefined;
    }
  }
  if (goog.isDef(opt_stores) && (!goog.isArray(opt_stores) ||
      opt_stores.length > 0 && !(opt_stores[0] instanceof ydn.db.schema.Store)))
  {
    throw new ydn.debug.error.ArgumentException('stores');
  }

  /**
   * @type {number|undefined}
   */
  this.version = ver;

  this.is_auto_version_ = !goog.isDef(this.version);

  /**
   * @final
   * @type {!Array.<!ydn.db.schema.Store>}
   */
  this.stores = stores || [];

};


/**
 * @override
 * @return {!DatabaseSchema} database schema in json.
 */
ydn.db.schema.Database.prototype.toJSON = function() {

  var stores = goog.array.map(this.stores, function(x) {return x.toJSON()});

  var sch = /** @type {DatabaseSchema} */ ({});
  sch.stores = stores;
  if (goog.isDef(this.version)) {
    sch.version = this.version;
  }
  return sch;
};


/**
 *
 * @type {boolean} auto version status.
 * @private
 */
ydn.db.schema.Database.prototype.is_auto_version_ = false;


/**
 * Current database version.
 * @type {number|undefined}
 */
ydn.db.schema.Database.prototype.version;


/**
 * Get schema version.
 * @return {number|undefined} version.
 */
ydn.db.schema.Database.prototype.getVersion = function() {
  return this.version;
};


/**
 * Update database schema for auto schema mode.
 * @param {number} version must be number type.
 */
ydn.db.schema.Database.prototype.setVersion = function(version) {
  goog.asserts.assert(this.is_auto_version_,
      'autoversion schema cannot set a version');
  goog.asserts.assertNumber(version, 'version must be a number');
  this.version = version;
};


/**
 *
 * @return {boolean} true if auto version.
 */
ydn.db.schema.Database.prototype.isAutoVersion = function() {
  return this.is_auto_version_;
};


/**
 *
 * @return {boolean} true if auto schema.
 */
ydn.db.schema.Database.prototype.isAutoSchema = function() {
  return false;
};


/**
 *
 * @return {!Array.<string>} list of store names.
 */
ydn.db.schema.Database.prototype.getStoreNames = function() {
  return goog.array.map(this.stores, function(x) {return x.name;});
};


/**
 *
 * @param {number} idx index of stores.
 * @return {ydn.db.schema.Store} store schema at the index.
 */
ydn.db.schema.Database.prototype.store = function(idx) {
  return this.stores[idx] || null;
};


/**
 *
 * @return {number} number of store.
 */
ydn.db.schema.Database.prototype.count = function() {
  return this.stores.length;
};


/**
 *
 * @param {string} name store name.
 * @return {ydn.db.schema.Store} store if found.
 */
ydn.db.schema.Database.prototype.getStore = function(name) {
  return /** @type {ydn.db.schema.Store} */ (goog.array.find(this.stores,
      function(x) {
        return x.name == name;
      }));
};


/**
 * Get index of store.
 * @param {string} name store name.
 * @return {number} index of store -1 if not found.
 */
ydn.db.schema.Database.prototype.getIndexOf = function(name) {
  return goog.array.indexOf(this.stores,
      function(x) {
        return x.name == name;
      });
};


/**
 *
 * @param {string} name store name.
 * @return {boolean} return true if name found in stores.
 */
ydn.db.schema.Database.prototype.hasStore = function(name) {

  return goog.array.some(this.stores, function(x) {
    return x.name == name;
  });
};


/**
 * Return an explination what is different between the schemas.
 * @param {ydn.db.schema.Database} schema schema from sniffing.
 * @param {boolean=} opt_hint hint the give schema.
 * @return {string} return empty string if the two are similar.
 */
ydn.db.schema.Database.prototype.difference = function(schema, opt_hint) {
  if (!schema || this.stores.length != schema.stores.length) {
    return 'Number of store: ' + this.stores.length + ' vs ' +
        schema.stores.length;
  }
  for (var i = 0; i < this.stores.length; i++) {
    var store = schema.getStore(this.stores[i].name);
    // hint to sniffed schema, so that some lost info are recovered.
    var hinted_store = (!!store && !!opt_hint) ?
        store.hint(this.stores[i]) : store;
    var msg = this.stores[i].difference(hinted_store);
    if (msg.length > 0) {
      return 'store: "' + this.stores[i].name + '" ' + msg;
    }
  }

  return '';
};


/**
 *
 * @param {ydn.db.schema.Database} schema schema.
 * @return {boolean} true if given schema is similar to this schema.
 */
ydn.db.schema.Database.prototype.similar = function(schema) {
  return this.difference(schema).length == 0;
};


/**
 *
 * @return {!Array.<string>} Return list of store names.
 */
ydn.db.schema.Database.prototype.listStores = function() {
  if (!this.store_names) {
    /**
     * @final
     * @type {!Array.<string>}
     */
    this.store_names = goog.array.map(this.stores, function(x) {
      return x.name;
    });
  }
  return this.store_names;
};
