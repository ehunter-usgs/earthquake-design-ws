'use strict';

var extend = require('extend'),
    fs = require('fs'),
    stream = require('stream');

/**
 * Create a new Readable stream from a URL.
 *
 * @param options {Object}
 *
 * @return {stream.Readable}
 *.        a readable stream of data from given URL.
 */
var TransfromDataStream = function(options) {
  var _this, _initialize;

  _this = new stream.Transform();

  _initialize = function(options) {
    _this.buff = [];
    _this.data = [];
    _this.options = extend(true, {}, options);

    // select format from regions.json, and column data from data loader
    const format = options.file.format;
    _this.csvColumns = options.formats[format].csvColumns;
    _this.dataColumns = options.formats[format].dataColumns;
    _this.saValues = options.formats[format].saValues;
  };

  /**
   * Close any active request and free resources.
   */
  _this.destroy = function() {
    if (_this === null) {
      return;
    }

    _this = null;
  };

  /**
   * Implement stream.Transform
   *
   * @param chunk <Buffer> | <string> | <any>
   *    The Buffer to be transformed,
   *    converted from the string passed to stream.write().
   *    If the stream's decodeStrings option is false or the
   *    stream is operating in object mode, the chunk will
   *    not be converted & will be whatever was passed to
   *    stream.write().
   * @param encoding <string>
   *    If the chunk is a string, then this is the encoding
   *    type. If chunk is a buffer, then this is the special
   *    value - 'buffer', ignore it in this case.
   * @param callback <Function>
   *    A callback function (optionally with an error argument
   *    and data) to be called after the supplied chunk has been
   *    processed.
   */
  _this._transform = function(chunk, encoding, callback) {
    // build buffer
    if (Buffer.isBuffer(chunk)) {
      chunk = chunk.toString();
    } 
    _this.buff.push(chunk);

    // done
    callback();
  };

  /**
   * Implement stream.Flush
   * 
   * @param callback <Function>
   * A callback function (optionally with an error argument and
   * data) to be called when remaining data has been flushed.
   */  
  _this._flush = function(callback) {
    // transform and push
    const data = _this.parseFile(_this.buff.join(''));
    fs.writeFileSync('/tmp/datadump.sql', data);
    _this.push(data);

    // destroy
    _this.destroy();

    // done
    callback();
  };

  /**
   * Transforms csv file into newly formatted csv string
   *
   * @param file string
   *    csv file represented as a string
   * 
   * @return string
   *    transformed values
   */
  _this.parseFile = function(file) {
    const result = [];
    const lines = file.split('\n');

    // build file data
    for (let i = 0, len = lines.length; i < len; i++) {
      result.push(this.parseLine(lines[i]));
    }

    return result.join('\n');
  };

  /**
   * Transforms each row of the csv file into the appropriate
   * format to be inserted into a temp table format. 
   *
   * @param line <string>
   *    one csv row
   */
  _this.parseLine = function(line) {
    // check data columns
    const values = line.split(',');
    let data = [];

    if (values.length === 1) {
      return;
    }

    for (let i = 0, len = _this.csvColumns.length; i < len; i++) {
      if (!_this.saValues.includes(_this.csvColumns[i])) {
        data.push(values[i]);
      }
    }
    data.push(this.parseSpectalPeriodArray(line));

    return data.join(',');
  };

  /**
   * Formats the spectral values into a csv like array
   * 
   * @param line <string>
   *    one csv row
   */
  _this.parseSpectalPeriodArray = function(line) {
    const values = line.split(',');
    let data = [];

    for (let i = 0, len = _this.saValues.length; i < len; i++) {
      const position = _this.csvColumns.indexOf(_this.saValues[i]);
      data.push(values[position]);
    }

    return '"{' + data.join(',') + '}"';
  };

  this.get;

  _initialize(options);
  options = null;
  return _this;
};

module.exports = TransfromDataStream;
