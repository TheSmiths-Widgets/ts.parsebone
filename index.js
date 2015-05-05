/**
 * @class ParseBone
 * **ParseBone library** generates Titanium/Backbone model to be used with Parse's RestAPI.
 *
 * Generates config for Alloy.CFG and class name.
 * Overrides Backbone functions: initialize, fetch, parse, ...
 *
 * An embedded live example:
 *
 *     @example
 *     var ParseBone = require("libs/ParseBone");
 *     exports.definition = {
 *         config: ParseBone.getConfig("ChatMessage"),
 *         extendModel: function(Model) {
 *             _.extend(ParseBone.getModel(Model).prototype, {
 *                 defaults: {},
 *                 validate: function(attrs, options) {
 *                     if(!(attrs.message && attrs.message.length > 0)) {
 *                       return "message is empty";
 *                     }
 *                 },
 *                 getPointer: function() {
 *                     return {
 *                         __type: "Pointer",
 *                         className: "ChatMessage",
 *                         objectId: this.get("objectId")
 *                     };
 *                 }
 *             });
 *             return Model;
 *         },
 *         extendCollection: function(Collection) {
 *             return ParseBone.getCollection(Collection);
 *         }
 *     }
 *
 */
var Alloy = require("alloy"),
    log = require("libs/logController"),
    TAG = "ParseBone";

var ParseBone = module.exports = {
    /**
     * @property {Array} enumClasses
     * @readonly
     * A property listing Parse's built-in classes.
     */
    enumClasses: [
        "installations",
        "sessions",
        "roles",
        "users",
        "files",
        "events",
        "functions",
        "jobs",
        "push"
    ],
    /**
     * @method getConfig
     * Get generic Parse config for a specific class. Takes values from config.json (Alloy.CFG.parse).
     * @param {String} className Name of the class, can be in enumClasses
     * (one of Parse's pre-built classes) or a custom one.
     * @return {Object} Config object with properties:
     * @return {String} return.URL to Parse's rest API with class name
     * @return {Boolean} return.debug enable/disable restapi logs
     * @return {Array} return.adapter defines type and idAttribute
     * @return {Array} return.headers defines Parse's headers
     */
    getConfig: function(className) {
        if(!Alloy.CFG.parse) return log.error(TAG, "Alloy.CFG.parse missing, check your config.json");

        var baseURL = Alloy.CFG.parse["api-url"],
            urlPath = (_.contains(ParseBone.enumClasses, className)?"":"classes/") + className,
            config = {
                "URL": (baseURL.slice(-1)==='/'?baseURL:(baseURL+'/')) + urlPath,
                "debug": Alloy.CFG.parse.debug,
                "adapter": {
                    "type": "restapi",
                    "idAttribute": "objectId"
                },
                "headers": { // Parse headers
                    "X-Parse-Application-Id": Alloy.CFG.parse["app-id"],
                    "X-Parse-REST-API-Key"  : Alloy.CFG.parse["api-key"]
                }
            };
        return config;
    },
    /**
     * @method getModel
     * Get generic Parse model based on Titanium implementation of Backbone model.
     * @param {backbone: Model} Model Titanium's backbone model given in model/file.
     * @return {backbone: Model} Generic Model.
     */
    getModel: function(Model) {
        _.extend(Model.prototype, {
            // Usage: Alloy.createModel("User", { objectId: "kBFn1LLjid" })
            initialize: function( attrs, options ) {
                attrs = attrs || {};
                options = options || {};
                if( attrs.objectId ) {
                    log.info(TAG, "initialize with id", attrs.objectId );
                    this.set("objectId", attrs.objectId);
                } else {
                    log.debug(TAG, "initialized without id" );
                }
                if(attrs.owner) {
                    log.info(TAG, "initialize with owner", attrs.owner.objectId);
                    delete attrs.owner.className;
                    delete attrs.owner.__type;
                    attrs.owner = Alloy.createModel("User", attrs.owner);
                }
                if(attrs.from && attrs.to) {
                    delete attrs.from.className;
                    delete attrs.from.__type;
                    attrs.from = Alloy.createModel("User", attrs.from);
                    delete attrs.to.className;
                    delete attrs.to.__type;
                    attrs.to = Alloy.createModel("User", attrs.to);
                }
                this.set(attrs, options);
            },

            fetch: function( options ) {
                if ((options != null ? options.query : void 0) != null) {
                    options.data = {where: JSON.stringify(options.query)};
                    delete options.query;
                }
                Backbone.Model.prototype.fetch.apply(this, arguments);
            },

            parse : function( resp ) {
                if (resp.results) {
                    return _.first(resp.results);
                } else {
                    return resp;
                }
            },

            /* Used for Create or Update */
            toJSON: function() {
                var result;
                result = Backbone.Model.prototype.toJSON.apply(this, arguments);
                // delete result.createdAt;
                // delete result.updatedAt;
                return result;
            }
        });
        return Model;
    },
    /**
     * @method getCollection
     * Get generic Parse collection based on Titanium implementation of Backbone collection.
     * @param {backbone: Collection} Collection Titanium's backbone collection given in model/file.
     * @return {backbone: Collection} Generic Collection.
     */
    getCollection: function(Collection) {
        _.extend(Collection.prototype, {
            /*
                Replace the parse method of Backbone.Collection
                Backbone Collection expects to get a JSON array when fetching.
                Parse returns a JSON object with key "results" and value being the array.
            */
            parse : function( resp ) {
                if (resp.results) {
                    var models = resp.results;
                    _.each(models, this.setId);
                    return models;
                }
            },

            setId: function(model) {
                if(model && model.objectId) {
                    model.id = model.objectId;
                }
            }

        });
        return Collection;
    }
}
