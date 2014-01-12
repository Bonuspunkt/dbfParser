var Writable = require('stream').Writable;
var util = require('util');

function DbfParser(options) {
  Writable.call(this, options);
}

util.inherits(DbfParser, Writable);

DbfParser.prototype._write = function(chunk, encoding, callback) {
  var position = 0;
  if (!this.header) {
    this.header = parseHeader(chunk);
    this.emit('header', this.header);

    position = this.header.headerLength + 1;
  }

  if (this.leftover) {
    var newChunk = new Buffer(chunk.length + this.leftover.length);
    this.leftover.copy(newChunk, 0);
    chunk.copy(newChunk, this.leftover.length, 0, chunk.length);
    chunk = newChunk;
    this.leftover = 0;
  }

  var recordLength = this.header.recordLength;
  while (position + recordLength - 1 <= chunk.length) {
    var recordChunk = chunk.slice(position, position + recordLength);
    var record = parseRecord(recordChunk, this.header);

    this.emit('record', record);

    position += (recordLength - 1);
  }

  if (position + 1 < chunk.length) {
    this.leftover = chunk.slice(position + 1, chunk.length);
  }

  callback();
};


function parseHeader(chunk) {

  var fieldDescriptors = (function() {
    var result = [];
    var i = 32;
    
    while(chunk[i] !== 0x0D) {
      var field = chunk.slice(i, i + 31);

      result.push(parseFileDescriptor(field));
      i += 32;
    }
    return result;
  }());

  return {
    dbfType: chunk[0],
    lastUpdate: [chunk[1], chunk[2], chunk[3]],
    recordCount: chunk.readInt32LE(4),
    headerLength: chunk.readInt16LE(8),
    recordLength: chunk.readInt16LE(10),
    // 12-13 reseverd filled with zeros
    incompleteTransaction: chunk[14],
    encryptionFlag: chunk[15],
    // 16-27 reserved for multi-user processing
    tableFlags: chunk[28],
    codePageMark: chunk[29],
    // 30-31 reseverd filled with zeros,
    fieldDescriptors: fieldDescriptors
  };
}

function parseFileDescriptor(chunk) {
  var column = {
    name: chunk.toString('ascii', 0, 10).replace(/\u0000+$/, ''),
    type: chunk.toString('ascii', 11, 12),
    // 12-15 displacement 
    length: chunk[16],
    decimalPlaces: chunk[17],
    fieldFlags: chunk[18],
    autoincNextValue: chunk.readInt32LE(19),
    autoincStepValue: chunk[23]
    // 24-31 reserved
  };

  column.parse = getParser(column);
  return column;
}

function getParser(column) {
  switch (column.type) {
    case 'D': // Date
      return function(chunk) {
        var value = chunk.toString('ascii');
        return new Date(value.substr(0,4), value.substr(4,2), value.substr(6))
      }

    case 'N': // Numeric
      return function(chunk) {
        return Number(chunk.toString('ascii'));
      }

    case 'C': // Character
      return function(chunk) {
        return chunk.toString('ascii').replace(/\s+$/, '');
      }

    default:
      console.error('datatype "' + column.type + '" not supported, please fork and add it');
      return function(chunk) {
        return chunk.toString('ascii');
      }
  }
}

function parseRecord(chunk, header) {
  var position = 0;
  var record = {}
  header.fieldDescriptors.forEach(function(column, index) {
    var value = chunk.slice(position, position + column.length);
    position += column.length;

    record[column.name] = column.parse(value);
  });

  return record;
}

module.exports = DbfParser;