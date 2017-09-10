# DBF Parser

[![Greenkeeper badge](https://badges.greenkeeper.io/Bonuspunkt/dbfParser.svg)](https://greenkeeper.io/)
DBF = dBase File
find more info in the `DBFstruct.htm` or [where it was grabbed](http://ulisse.elettra.trieste.it/services/doc/dbase/DBFstruct.htm) and [this](http://msdn.microsoft.com/en-us/library/aa975386) seems also to match.

will not work with [dBASE Version 7 Table File](http://www.dbase.com/Knowledgebase/INT/db7_file_fmt.htm)

## usage
```javascript
var parser = require('fs').createReadStream('file.dbf').pipe(new require('dbfparser')());
parser.on('header', function(header) {
  // here you can do stuff like renaming property names
  header.fieldDescriptors[0].name = 'newName';
  // do you custom conversions
  header.fieldDescriptors[0].parse = function(chunk) {
    return chuck.toString('utf8').replace('\s+$', '');
  };
});
parser.on('record', function(record) {
  // yay a record
});
```

## installation
```
npm install dbfparser
```