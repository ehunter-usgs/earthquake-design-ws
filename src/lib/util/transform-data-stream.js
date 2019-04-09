'use strict';

var extend = require('extend'),
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
    _this.partialRow = '';
    _this.options = extend(true, {}, options);

    // select format from regions.json, and column data from data loader
    const format = options.file.format;
    _this.csvColumns = options.formats[format].csvColumns;
    _this.dataColumns = options.formats[format].dataColumns;
    _this.saValues = options.formats[format].saValues;
  };

  /**
   * Implement stream.Destroy
   *
   * Destroy the stream. After this call, the transform stream would
   * release any internal resources.
   */
  _this._destroy = function() {
    if (_this === null) {
      return;
    }

    _this = null;
  };

  /**
   * Implement stream.Flush
   *
   * Once all of the data has been read, flush the data
   *
   * @param callback <Function>
   *    A callback function (optionally with an error argument
   *    and data) to be called after the supplied chunk has been
   *    processed.
   */
  _this._flush = function(callback) {
    _this.push(_this.parseLine(_this.partialRow));

    callback();
  };

  /**
   * Implement stream.Transform
   *
   * @param chunk <Buffer> | <string> | <any>
   *    The Buffer to be transformed
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

    // prefix partial row from previous chunk
    chunk = _this.partialRow + chunk;

    // transform chunk
    let data = _this.parseChunk(chunk);
    if (data !== '') {
      data += '\n';
    }
    _this.push(data);

    // done
    callback();
  };

  /**
   * Ensure that we have a parseable line of data
   * 
   * @param line <string>
   *     comma separated line of data
   *
   * @return <boolean>
   *     indicates parsable line of data
   */
  _this.isGoodLine = function(line) {
    return line && (line.indexOf(',') !== -1);
  };

  /**
   * Transforms csv chunk into newly formatted csv string
   *
   * @param chunk string
   *    csv file represented as a string
   * 
   * @return string
   *    transformed values
   */
  _this.parseChunk = function(chunk) {
    const lines = chunk.split('\n');

    this.partialRow = lines.splice(lines.length - 1, 1)[0];

    // filter out bad lines, parse each line int he chunk
    return lines.filter(_this.isGoodLine)
      .map(this.parseLine)
      .filter(item => !!item)
      .join('\n');
  };

  /**
   * Transforms each row of the csv file into the appropriate
   * format to be written to the transformed CSV format
   *
   * @param line <string>
   *    one csv row
   */
  _this.parseLine = function(line) {
    // check data columns
    try {
      const values = line.split(',');
      let data = [];

      if (values.length === 1) {
        return '';
      }

      // remove sa values from csv line
      for (let i = 0, len = _this.csvColumns.length; i < len; i++) {
        if (!_this.saValues.includes(_this.csvColumns[i])) {
          const value = values[i];
          if (value || value === 0) {
            data.push(value);
          } else {
            throw new Error(_this.csvColumns[i] + ' did not have a value. \n' + line);
          }
        }
      }
      // append sa values to end of CSV as an array
      data.push(_this.parseSpectalPeriodArray(line));
      return data.join(',');
    } catch (e) {
      process.stderr.write(e.stack);
      return '';
    }
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

    // determine the position of the sa values and parse them from the original csv
    for (let i = 0, len = _this.saValues.length; i < len; i++) {
      const position = _this.csvColumns.indexOf(_this.saValues[i]);
      const value = values[position];
      if (value || value === 0) {
        data.push(value);
      } else {
        throw new Error(_this.saValues[i] + ' did not have a value. \n' + line);
      }
    }

    // build csv array of sa values
    return '"{' + data.join(',') + '}"';
  };

  _initialize(options);
  options = null;
  return _this;
};

module.exports = TransfromDataStream;
