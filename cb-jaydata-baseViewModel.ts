module ODataSettings {
    var _oDataUrl: string;
    export function oDataUrl(): string {
        return _oDataUrl;
    }

    export function setODataUrl(url: string): void {
        _oDataUrl = url;
    }
}

module $CB.MVVM {
    export class BaseViewModel implements $CB.Navigation.IViewModel {

        constructor() {
        }


        onActive(continueCallback: () => void): $data.IPromise<any> {
            continueCallback();
            return $.Deferred().resolve();
        }

        onInactive(continueCallback: () => void): void {
            continueCallback();
        }
    }

    export module JayData {
        export var dbDatePropertyInformations: $CB.Data.JayData.DbDatePropertyInformations = new $CB.Data.JayData.DbDatePropertyInformations();

        export class BaseViewModelWithDbContext<TDbContext extends $data.EntityContext> extends BaseViewModel {
            database: TDbContext;
            databasePromise: $data.IPromise<any>;

            constructor() {
                super();
                var self = this;
                this.databasePromise = $data.initService(this.getODataServiceOption()).then((dbContext: TDbContext) => {
                    self.database = dbContext;
                    self.initDbContext(dbContext);
                });
            }

            getODataServiceOption(): Object {
                return {
                    url: ODataSettings.oDataUrl()
                };
            }

            initDbContext(dbContext: $data.EntityContext): void {
                (<$data.ODataProviderConfiguration>(dbContext.storageProvider.providerConfiguration)).disableBatch = true;
                $CB.Data.JayData.OData.JayDataODataHack(dbContext, dbDatePropertyInformations);
            }
        }

        export class BaseViewModelWithPagedData<TDbContext extends $data.EntityContext, T extends $data.Entity, TItem> extends BaseViewModelWithDbContext<TDbContext> {
            oDataItems: $CB.Data.JayData.PagedSource<T, TItem>;
            orders: KnockoutObservableArray<$CB.Data.Common.IOrderFieldInfo>;
            alwaysFetchAfterSave: boolean; //true, will do a fetch even the save fail, false will do a fetch only after save successfully default is false

            constructor() {
                super();
                var self = this;
                this.oDataItems = new $CB.Data.JayData.PagedSource<T, TItem>(null);
                this.oDataItems.dbDatePropertyInformations = dbDatePropertyInformations;
                this.oDataItems.processItems = rawItems => this.processItems.call(self, rawItems);
                this.orders = ko.observableArray([]);
                this.orders.subscribe(newValue => self.updateODataItemsSource.call(self, 0));
                this.alwaysFetchAfterSave = false;
            }

            processItems(rawItems: T[]): $data.IPromise<any[]> {
                var self = this;
                return this.databasePromise.then(() => self.database.stateManager.reset()).then(() => {
                    //make sure the fetched items are attached, so that the changes can be tracked
                    for (var i = 0; i < rawItems.length; i++) {
                        self.database.attach(rawItems[i]);
                    }
                    var deferred = $.Deferred();
                    var p = deferred.promise();
                    deferred.resolve(rawItems);
                    return p;
                });
            }

            getODataSource(): $data.Queryable<T> {
                throw "Not Implemented";
            }

            getEntityKeyPropertyName(): string {
                return "Id";
            }

            updateODataItemsSource(newPageIndex?: number): $data.IPromise<$data.Queryable<T>> {
                var baseSource = this.getODataSource();
                var o = this.orders();
                for (var i = 0; i < o.length; i++) {
                    baseSource = baseSource.order((o[i].asc ? "" : "-") + o[i].field);
                }
                this.oDataItems.source = baseSource;
                var pageIndex = this.oDataItems.currentPageIndex();
                if (typeof (newPageIndex) !== "undefined") {
                    pageIndex = newPageIndex;
                }
                if (pageIndex < 0) {
                    pageIndex = 0;
                }
                return this.oDataItems.fetchDataOfPage(pageIndex, true, true).then(() => baseSource);
            }

            newItem(): TItem {
                throw "Not Implemented";
            }

            hasChangedItem(): boolean {
                var allItems = this.oDataItems.items();
                var hasChanged = false;
                for (var i = 0; i < allItems.length; i++) {
                    if (ko.bindingHandlers.tableCRUD.modelStatus(allItems[i]) !== ko.bindingHandlers.tableCRUD.modelStatusConsts.Normal) {
                        hasChanged = true;
                        break;
                    }
                }
                return hasChanged;
            }

            onDataChanged(changeAction: string, item: TItem): void {
                if (changeAction == ko.bindingHandlers.tableCRUD.crudActionTypes['delete']) {
                    if (ko.bindingHandlers.tableCRUD.modelStatus(item) === ko.bindingHandlers.tableCRUD.modelStatusConsts.New) {
                        //when a new item is delete, the status is New but the action is delete
                        //then it will be removed from the items souce, so it should not be tracked
                        //so we check and remove it from tracked items
                        var check: any = item;
                        if ((<any>item).getEntity) {
                            check = (<any>item).getEntity();
                        }
                        var found = false;
                        var track = this.database.stateManager.trackedEntities;
                        for (var i = 0; i < track.length; i++) {
                            if (track[i].data === check) {
                                //if we have several items, some saved successfully, and some failed, then for the default, won't do a new fetch
                                //and the saved successfully item will change them status to unchanged, but the item will reamin as New
                                //and if user delete it from table UI, these item should be remove in database so that they can be deleted from database(because they have already saved)
                                if (track[i].data.entityState === $data.EntityState.Unchanged) {
                                    this.database.remove(<any>item);
                                } else {
                                    track.splice(i, 1);
                                }
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            throw "Make sure you set tableCRUD binding autoConvertNewItemAsKoObservable to false";
                        }

                    } else {
                        this.database.remove(<any>item);
                    }
                }
            }

            saveChanges(): $data.IPromise<number> {
                var self = this;
                var promise = $.Deferred();
                //dely 300ms, it seems that jaydata can't catch the changes to the entity if we user table inline edit and click save button without make the editor disappear first
                setTimeout(() => { promise.resolve() }, 300);
                var promiseResult = promise
                    .then(() => self.databasePromise)
                    .then(() => self.database.saveChanges());
                if (self.alwaysFetchAfterSave) {
                    promiseResult = promiseResult.always(() => self.oDataItems.fetchDataOfPage(undefined, true, false));
                } else {
                    promiseResult = <any> promiseResult.then(() => self.oDataItems.fetchDataOfPage(undefined, true, false));
                }
                return promiseResult;
            }

            beforeOrder(orderField, th): boolean {
                return true;
            }

            dataItemVerify(dataItem: TItem, action: string, editorContent?, editorModalDialog?, dataItemProperty?: string): boolean {
                return true;
            }

            onActive(continueCallback: () => void): $data.IPromise<any> {
                var self = this;
                return this.databasePromise
                    .then(() => {
                        var result: $data.IPromise<any>;
                        if (self.oDataItems.source == null) {
                            result = self.updateODataItemsSource(0);
                        } else {
                            result = self.oDataItems.fetchDataOfPage(undefined, true, false);
                        }
                        return result;
                    })
                    .then(() => super.onActive(continueCallback));
            }
        }
    }
}