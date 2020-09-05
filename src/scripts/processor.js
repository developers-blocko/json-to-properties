var files = require('./files');
var parser = require('./parser');
var merger = require('./merger');

/**
 * Executes the conversion process. Depending on the given config, .json files are deflated into .properties  or
 * .propeties file are inflated into .json files. These processes are executed on each file identified within the src
 * directory identified by the src attribute of the provided options.config, and outputs the resultant file of each
 * input file within the destination directory identified by the dist attribute.
 *
 * @param options A json file having the following attributes:
 *  - config : An object having a src and dist attribute, identifying the source and destination directory
 *     respectively. Defaults to the current path if not provided.
 *  - reverse : A flag denoting if the reverse process, ie. converting properties to json should be done, and
 *     timestamp. Defaults to false.
 *  - timestamp: A flag identifying if a timestamp is to be prepended to the resultant files. Defaults to false.
 */
exports.processOptions = function (options) {
    var config = options.config;
    // Create a merger object to register items to
    var _merger = new merger.Merger();

    if (!options.reverse) {
        var jsonFiles = files.getJsonFiles(config.src); // Get all the json file names in the src directory
        if (jsonFiles) {
            jsonFiles.forEach(function (file) {
                var data = files.getFileDataAsString(config.src, file); // Read the file data as utf8 encoded string
                var entries = parser.deflate(JSON.parse(data)); // Convert the JSON structure into an array of strings
                // files.writeAsProperties(config.dist, file, entries); // Writes the parsed result to the dist directory

                // Register the file and its deflated entries to the merger.
                _merger.addCollection(file, entries);
            });
        }

        // If the option to merge is specified, proceed with the merging process.
        if (options.merge) {
            _merger.merge(config.dist, options.merge);
        }
    } else {
        var propertiesFiles = files.getPropertiesFiles(config.src);
        if (propertiesFiles) {
            propertiesFiles.forEach(function (file) {
                // Do not convert the source merge file to json
                if (options.merge === file) {
                    return;
                }

                var promise = files.getFileDataAsLines(config.src, file);
                promise.then(function (lines) {
                    var inflated = parser.inflate(lines);
                    files.writeAsJson(config.dist, file, JSON.stringify(inflated, null, options.spaces));
                });
            });
        }

        // Reverse any merged files in their own json files
        if (options.merge) {
            _merger.reverse(config.src, config.dist, options.merge, options.spaces);
        }
    }
};

/**
 * Consumes the provided options object and merges it with the default options. The conversion process is triggered
 * upon the resultant options object.
 *
 * @param options A json file having the following attributes:
 *  - config : An object having a src and dist attribute, identifying the source and destination directory
 *     respectively. Defaults to the current path if not provided.
 *  - reverse : A flag denoting if the reverse process, ie. converting properties to json should be done, and
 *     timestamp. Defaults to false.
 *  - timestamp: A flag identifying if a timestamp is to be prepended to the resultant files. Defaults to false.
 */
exports.process = function (options) {
    // Identify the current path
    var path = process.cwd();

    // The default options
    var _options = {
        config: { src: path, dist: path },
        reverse: false,
        spaces: 4,
        merge: '' // Defaults to no merge
    };

    for (var key in options) {
        if (options.hasOwnProperty(key) && options[ key ]) {
            _options[ key ] = options[ key ];
        }
    }

    exports.processOptions(_options);
};