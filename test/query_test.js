
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.Storage');
goog.require('goog.testing.PropertyReplacer');


var reachedFinalContinuation, schema, db, debug_console;
var db_name = 'test_q_17';
var store_name = 'st';


var setUp = function() {
  if (!debug_console) {
    debug_console = new goog.debug.Console();
    debug_console.setCapturing(true);
    goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.WARNING);
    //goog.debug.Logger.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
    goog.debug.Logger.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINE);
    goog.debug.Logger.getLogger('ydn.db.con').setLevel(goog.debug.Logger.Level.FINEST);
    goog.debug.Logger.getLogger('ydn.db.req').setLevel(goog.debug.Logger.Level.FINEST);
  }

  var indexSchema = new ydn.db.IndexSchema('value', ydn.db.DataType.TEXT, true);
  var store_schema = new ydn.db.StoreSchema(store_name, 'id', false,
    ydn.db.DataType.INTEGER, [indexSchema]);
  schema = new ydn.db.DatabaseSchema(1, [store_schema]);
  db = new ydn.db.Storage(db_name, schema, options);

  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
  });
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};



var objs = [
  {id: -3, value: 'a0', type: 'a', remark: 'test ' + Math.random()},
  {id: 0, value: 'a2', type: 'a', remark: 'test ' + Math.random()},
  {id: 1, value: 'ba', type: 'b', remark: 'test ' + Math.random()},
  {id: 3, value: 'bc', type: 'b', remark: 'test ' + Math.random()},
  {id: 10, value: 'c', type: 'c', remark: 'test ' + Math.random()},
  {id: 11, value: 'c1', type: 'c', remark: 'test ' + Math.random()},
  {id: 20, value: 'ca', type: 'c', remark: 'test ' + Math.random()}
];



var test_1_query_constructor = function() {
  // test query constructor
  var lower = 1;
  var upper = 5;
  var q = new ydn.db.Cursor(store_name, 'next', 'id', lower, upper, false, true);
  assertEquals('store', store_name, q.store_name);
  assertEquals('index', 'id', q.index);
  assertEquals('direction', 'next', q.direction);
  assertNotNull(q.keyRange);
  assertEquals('lower', lower, q.keyRange.lower);
  assertEquals('upper', upper, q.keyRange.upper);
  assertFalse('lowerOpen', q.keyRange.lowerOpen);
  assertTrue('upperOpen', q.keyRange.upperOpen);

  var key_range = new ydn.db.KeyRange(lower, upper, false, true);
  q = new ydn.db.Cursor(store_name, 'next', 'id', key_range);
  assertNotNull(q.keyRange);
  assertEquals('lower', lower, q.keyRange.lower);
  assertEquals('upper', upper, q.keyRange.upper);
  assertFalse('lowerOpen', q.keyRange.lowerOpen);
  assertTrue('upperOpen', q.keyRange.upperOpen);


  q = new ydn.db.Cursor(store_name, 'next', 'id', key_range.toJSON());
  assertNotNull(q.keyRange);
  assertEquals('lower', lower, q.keyRange.lower);
  assertEquals('upper', upper, q.keyRange.upper);
  assertFalse('lowerOpen', q.keyRange.lowerOpen);
  assertTrue('upperOpen', q.keyRange.upperOpen);


  reachedFinalContinuation = true;
};


var test_2_select = function() {

  var hasEventFired = false;
  var result;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertEquals('length', objs.length, result.length);
        for (var i = 0; i < objs.length; i++) {
          assertEquals('value ' + i, objs[i].value, result[i]);
        }
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout

  var q = db.query(store_name);
  q.select('value');
  db.fetch(q).addCallback(function (q_result) {
    //console.log('receiving query ' + JSON.stringify(q_result));
    result = q_result;
    hasEventFired = true;
  })

};


var test_3_count = function () {

  var hasEventFired = false;
  var put_value;

  waitForCondition(
    // Condition
    function () {
      return hasEventFired;
    },
    // Continuation
    function () {
      assertEquals('select query', objs.length, put_value);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
    },
    100, // interval
    2000); // maxTimeout

  var q = db.query(store_name);
  q.count();
  db.fetch(q).addCallback(function (q_result) {
    //console.log('receiving query ' + JSON.stringify(q_result));
    put_value = q_result;
    hasEventFired = true;
  })

};


var test_4_sum = function() {


  var total = objs.reduce(function(prev, x) {
    return prev + x.id;
  }, 0);

  var hasEventFired = false;
  var put_value;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertEquals('sum query', total, put_value);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


    var q = db.query(store_name);
    q.sum('id');
    db.fetch(q).addCallback(function(q_result) {
      //console.log('receiving query ' + JSON.stringify(q_result));
      put_value = q_result;
      hasEventFired = true;
    })

};



var test_4_average = function() {

  var total = objs.reduce(function(prev, x) {
    return prev + x.id;
  }, 0);
  var avg = total / objs.length;

  var hasEventFired = false;
  var put_value;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertRoughlyEquals('sum query', avg, put_value, 0.001);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout



    var q = db.query(store_name);
    q.average('id');
    db.fetch(q).addCallback(function(q_result) {
      //console.log('receiving query ' + JSON.stringify(q_result));
      put_value = q_result;
      hasEventFired = true;
    })

};


/**
 *
 * @param {ydn.db.io.Query} q
 * @param {Array} exp_result
 */
var where_test = function(q, exp_result) {

  var hasEventFired = false;
  var result;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertEquals('length: ' + JSON.stringify(result),
          exp_result.length, result.length);
        assertArrayEquals('when value = 1', exp_result, result);
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


    q.fetch().addCallback(function(q_result) {
      //console.log('receiving when query ' + JSON.stringify(q_result));
      result = q_result;
      hasEventFired = true;
    })

};


var test_51_where_eq = function () {

  var q = db.query(store_name);
  var idx = 2;
  q.where('id', '=', objs[idx].id);
  where_test(q, [objs[idx]]);
};

var test_52_where_gt = function () {

  var q = db.query(store_name);
  var value = 10;
  var result = objs.filter(function(x) {
    return x.id > value;
  });
  q.where('id', '>', value);
  where_test(q, result);
};

var test_53_where_gt_eq = function () {

  var q = db.query(store_name);
  var value = 10;
  var result = objs.filter(function(x) {
    return x.id >= value;
  });
  q.where('id', '>=', value);
  where_test(q, result);
};

var test_54_where_lt = function () {

  var q = db.query(store_name);
  var value = 10;
  var result = objs.filter(function(x) {
    return x.id < value;
  });
  q.where('id', '<', value);
  where_test(q, result);
};

var test_55_where_lt_eq = function () {

  var q = db.query(store_name);
  var value = 10;
  var result = objs.filter(function(x) {
    return x.id <= value;
  });
  q.where('id', '<=', value);
  where_test(q, result);
};

var test_56_where_gt_lt = function () {

  var q = db.query(store_name);
  var value = 10;
  var result = objs.filter(function(x) {
    return x.id > value && x.id < value;
  });
  q.where('id', '>', value, '<', value);
  where_test(q, result);
};



var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);


