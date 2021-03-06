﻿declare module OData {
    export function request();

    export var defaultHttpClient: {
        callbackParameterName: string;
        formatQueryString: string;
        enableJsonpCallback: boolean;
        request(request: { headers: any }, success, error): any;
    };
}

import OR = OData.request;
import OD = OData.defaultHttpClient;

module $CB.Data.JayData.OData {
    export function ODataHack(prepareRequest: (request: { headers: any }) => void) {
        if (OD) {
            var oldODRequest = OD.request;
            OD.request = (request: { headers: any }, success, error) => {
                if (prepareRequest) {
                    prepareRequest(request);
                }
                return oldODRequest(request, success, error);
            };
        }
    }

    export function JayDataODataHack(dbContext: $data.EntityContext, dbDatePropertyInformations: $CB.Data.JayData.DbDatePropertyInformations) {
        var hacker = new ODataProviderHack(dbContext, dbDatePropertyInformations);
        var oDataProvider = <$data.ODataStorageProvider>dbContext.storageProvider;
        oDataProvider.saveChanges = (callBack, changedItems) => {
            hacker.saveChanges(callBack, changedItems);
        };
        var _oldcompile = oDataProvider._compile;
        oDataProvider._compile = (queryable, params) => {
            var result = _oldcompile(queryable, params);
            var qt: string = result.queryText;
            if (qt.indexOf("?") < 0) {
                qt = qt + "?";
            }
            if (qt.lastIndexOf("?") !== (qt.length - 1)) {
                qt = qt + "&";
            }
            var rStr = Math.random().toString(10).replace(".", "a");
            qt = qt + "_=" + rStr;
            result.queryText = qt;
            return result;
        };
    }

    function toLocalISOString(date: Date): string {
        if (!(date instanceof Date)) {
            throw "Please call on Date object";
        }

        function twoDigit(number) {
            if (number >= 10) {
                return number;
            }
            return "0" + number.toString();
        }

        function threeDigit(number) {
            if (number >= 100) {
                return number;
            }
            if (number >= 10) {
                return "0" + number.toString();
            }
            return "00" + number.toString();
        }

        var str = date.getFullYear() + "-" + twoDigit(date.getMonth() + 1) + "-" + twoDigit(date.getDate()) +
            "T" + twoDigit(date.getHours()) + ":" + twoDigit(date.getMinutes()) + ":" + twoDigit(date.getSeconds());
        if (date.getMilliseconds() > 0) {
            str = str + "." + threeDigit(date.getMilliseconds());
        }
        return str;
    }

    export class ODataProviderHack {
        constructor(public dbContext: $data.EntityContext, public dbDatePropertyInformations: $CB.Data.JayData.DbDatePropertyInformations) {

        }

        oDataStorageProvider() {
            return <$data.ODataStorageProvider>this.dbContext.storageProvider;
        }

        save_getInitData(item: $data.TrackedEntity, convertedItems: any): Object {
            var self = this;
            var physicalData = (<any>this.dbContext)._storageModel.getStorageModel(item.data.getType()).PhysicalType.convertTo(item.data, convertedItems);
            var serializableObject = {}
            physicalData.getType().memberDefinitions.asArray().forEach(function (memdef) {
                if (memdef.kind == $data.MemberTypes.navProperty || memdef.kind == $data.MemberTypes.complexProperty || (memdef.kind == $data.MemberTypes.property && !memdef.notMapped)) {
                    if (typeof memdef.concurrencyMode === 'undefined') {
                        var typeName = $data.Container.resolveName(memdef.type);
                        var converter = (<any>self.dbContext.storageProvider).fieldConverter.toDb[typeName];
                        serializableObject[memdef.name] = converter ? converter(physicalData[memdef.name]) : physicalData[memdef.name];
                    }
                }
            }, this);
            return serializableObject;
        }

        //convert entity type item to plain json object, so that it can be post to OData server
        refineItem(dbContext: $data.EntityContext, item: $data.TrackedEntity): Object {
            var plainItem: Object = this.save_getInitData(item, []);
            var itemType = item.data.getType();
            if (this.dbDatePropertyInformations) {
                var properties = this.dbDatePropertyInformations.getRegistedDateProperties((<any>itemType).name);
                for (var pIndex = 0; pIndex < properties.length; pIndex++) {
                    if (properties[pIndex].asLocal && typeof (plainItem[properties[pIndex].name]) !== "undefined" && plainItem[properties[pIndex].name] != null) {
                        var d = new Date(Date.parse(plainItem[properties[pIndex].name]));
                        var d2 = new Date();
                        d2.setUTCFullYear(d.getFullYear());
                        d2.setUTCMonth(d.getMonth());
                        d2.setUTCDate(d.getDate());
                        d2.setUTCHours(d.getHours());
                        d2.setUTCMinutes(d.getMinutes());
                        d2.setUTCSeconds(d.getSeconds());
                        d2.setUTCMilliseconds(d.getMilliseconds());
                        plainItem[properties[pIndex].name] = toLocalISOString(d2);
                    }
                }
            }
            //for navigation property, save_getInitData only convert them to a object that contains some key information
            //but currently, our odata server can't process this
            //so we check each navigation property, if it is array, then we create an array that contains the origianl full data of each navigated items
            var sModel = (<any>dbContext)._storageModel.getStorageModel(itemType);
            for (var i = 0; i < sModel._Associations.length; i++) {
                var nav = sModel._Associations[i];
                //must have data and is array
                if (typeof (plainItem[nav._FromPropertyName]) === "undefined" || plainItem[nav._FromPropertyName] == null || !$.isArray(plainItem[nav._FromPropertyName])) {
                    continue;
                }
                var tmpNavValues = [];
                for (var j = 0; j < plainItem[nav._FromPropertyName].length; j++) {
                    tmpNavValues.push(item.data.initData[nav._FromPropertyName][j].initData);
                }
                plainItem[nav._FromPropertyName] = tmpNavValues;
            }
            return plainItem;
        }

        _saveRest(item: $data.TrackedEntity) {
            var self = this;
            var request;
            var originalProvider: any = this.oDataStorageProvider();
            request = {
                requestUri: originalProvider.providerConfiguration.oDataServiceHost + '/',
                headers: {
                    MaxDataServiceVersion: originalProvider.providerConfiguration.maxDataServiceVersion
                }
            };
            if (originalProvider.providerConfiguration.dataServiceVersion) {
                request.headers.DataServiceVersion = originalProvider.providerConfiguration.dataServiceVersion;
            }
            if (typeof originalProvider.providerConfiguration.useJsonLight !== 'undefined') {
                request.useJsonLight = originalProvider.providerConfiguration.useJsonLight;
            }
            var planItem: Object = undefined;
            if (item.data.entityState !== $data.EntityState.Deleted) {
                planItem = this.refineItem(this.dbContext, item);
            }

            switch (item.data.entityState) {
                case $data.EntityState.Unchanged:
                    break;
                case $data.EntityState.Added:
                    request.method = "POST";
                    request.requestUri += item.entitySet.tableName;
                    request.data = planItem;
                    break;
                case $data.EntityState.Modified:
                    request.method = "PUT";
                    request.requestUri += item.entitySet.tableName;
                    request.requestUri += "(" + originalProvider.getEntityKeysValue(item) + ")";
                    originalProvider.save_addConcurrencyHeader(item, request.headers);
                    request.data = planItem;
                    break;
                case $data.EntityState.Deleted:
                    request.method = "DELETE";
                    request.requestUri += item.entitySet.tableName;
                    request.requestUri += "(" + originalProvider.getEntityKeysValue(item) + ")";
                    originalProvider.save_addConcurrencyHeader(item, request.headers);
                    break;
                default:
                    Guard.raise(new Exception("Not supported Entity state"));
            }
            //batchRequests.push(request);
            var that = originalProvider;
            var deferred = $.Deferred();
            var promise = deferred.promise();

            var requestData = [
                request, function (data, response) {
                    if (response.statusCode >= 200 && response.statusCode < 300) {
                        var reloadedItem = item.data;
                        if (response.statusCode == 204) {
                            if (response.headers.ETag || response.headers.Etag || response.headers.etag) {
                                var property = reloadedItem.getType().memberDefinitions.getPublicMappedProperties().filter(memDef => memDef.concurrencyMode === $data.ConcurrencyMode.Fixed);
                                if (property && property[0]) {
                                    reloadedItem[property[0].name] = response.headers.ETag || response.headers.Etag || response.headers.etag;
                                }
                            }
                        } else {
                            (<any>self.dbContext.storageProvider).reload_fromResponse(reloadedItem, data, response);
                        }

                        if (item.data.entityState == $data.EntityState.Deleted) {
                            item.entitySet.detach(item.data);
                        } else {
                            item.data.entityState = $data.EntityState.Unchanged;
                        }

                        deferred.resolve(1);
                    } else {
                        deferred.reject(that.parseError(response));
                    }

                }, function (e) {
                    deferred.reject(that.parseError(e));
                }
            ];

            originalProvider.appendBasicAuth(requestData[0], originalProvider.providerConfiguration.user, originalProvider.providerConfiguration.password, originalProvider.providerConfiguration.withCredentials);

            originalProvider.context.prepareRequest.call(originalProvider, requestData);
            OR.apply(originalProvider, requestData);
            return promise;
        }

        saveChanges(callBack, changedItems): void {
            if (changedItems.length > 0) {
                var self = this;
                var entities = this.dbContext.stateManager.trackedEntities;
                var deferred = $.Deferred();
                var promise = deferred.promise();
                deferred.resolve();
                for (var i = 0; i < entities.length; i++) {
                    (function () {
                        var item = entities[i];
                        if (item.data.entityState == $data.EntityState.Unchanged) {
                            return;
                        }
                        if (item.data.entityState != $data.EntityState.Deleted) { //for deleted, _changedProperties is undefined, but we need save it
                            var item_data: any = item.data;
                            if ((!item_data._changedProperties) || item_data._changedProperties.length <= 0 || (item_data._changedProperties.length == 1 && item_data._changedProperties[0].name == "ValidationErrors")) {
                                //not changed, so return
                                return;
                            }
                        }
                        promise = promise.then(() => self._saveRest(item));
                    })();
                }
                promise
                    .done(() => {
                    callBack.success(entities.length);
                    self.dbContext.stateManager.reset();
                })
                    .fail((...args) => {
                    callBack.error.apply(this, args);
                });
            } else {
                callBack.success(0);
            }
        }
    }
} 