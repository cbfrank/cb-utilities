module $CB.Data.JayData {
    export class DatePropertyInformation {
        name: string;
        asLocal: boolean;
    }

    export class DbDatePropertyInformations {
        private _datePropertyDict: any;

        constructor() {
            this._datePropertyDict = {};
        }

        registerDateProperty(entitySetName: string, information: DatePropertyInformation) {
            var properties: DatePropertyInformation[] = this._datePropertyDict[entitySetName];
            if (typeof (properties) === "undefined") {
                properties = this._datePropertyDict[entitySetName] = [];
            }
            for (var i = 0; i < properties.length; i++) {
                if (properties[i].name === information.name) {
                    properties[i] = $.extend(properties[i], information);
                    return;
                }
            }
            properties.push(information);
        }

        getRegistedDateProperties(entitySetName: string): DatePropertyInformation[] {
            var properties: DatePropertyInformation[] = this._datePropertyDict[entitySetName];
            if (typeof (properties) === "undefined") {
                return [];
            }
            return properties;
        }
    }

    export enum PagedSourceErrors {
        FetchDataError
    }

    export interface IPagedSourceOption {
        onBeforeFetch?: () => JQueryPromise<boolean>;
    }

    export class PagedSource<T extends $data.Entity, TItem> {
        //reanonly
        totalCount: KnockoutObservable<number>;
        currentPageIndex: KnockoutObservable<number>;
        //readonly
        pagesCount: KnockoutComputed<number>;
        itemsCountOnePage: KnockoutObservable<number>;
        items: KnockoutObservableArray<TItem>;

        //for any operation that will cause observable changed and will use the action such as ajax, should use it to konw if the action is finished or not
        //change to only update asyncPromiseForObservableNotify when there is async in observable notify. for the function such as fetchDataOfPage or updateTotalCount, they won't update asyncPromiseForObservableNotify, they just return promise
        asyncPromiseForObservableNotify: $data.IPromise<any>;
        private stopFetchWhenPageIndexCountChanged: boolean;

        //if the Queryable<T> (source) doesn't ok for items, then assign this property to provide additional process
        processItems: (rawItems: T[]) => $data.IPromise<TItem[]>;

        onError: (source: PagedSourceErrors, error) => void;

        dbDatePropertyInformations: DbDatePropertyInformations;
        option: IPagedSourceOption;

        constructor(public source: $data.Queryable<T>, option?: IPagedSourceOption) {
            var self = this;
            this.option = option;
            this.stopFetchWhenPageIndexCountChanged = false;
            this.dbDatePropertyInformations = new DbDatePropertyInformations();
            this.totalCount = ko.observable(0);
            this.currentPageIndex = ko.observable(-1);
            this.itemsCountOnePage = ko.observable(20);
            this.pagesCount = ko.computed(() => {
                if (self.itemsCountOnePage() <= 0) {
                    return 0;
                }
                return Math.ceil(self.totalCount() / self.itemsCountOnePage());
            }, this);
            this.items = ko.observableArray([]);
            this.asyncPromiseForObservableNotify = undefined;

            this.currentPageIndex.subscribe((newValue: number) => {
                if (self.stopFetchWhenPageIndexCountChanged) {
                    return;
                }
                self.asyncPromiseForObservableNotify = self.fetchDataOfPage(newValue, false, false);
            });
            this.itemsCountOnePage.subscribe((newValue: number) => {
                if (self.stopFetchWhenPageIndexCountChanged) {
                    return;
                }
                self.asyncPromiseForObservableNotify = self.fetchDataOfPage(undefined, false, false);
            });
        }

        private updateTotalPageCount(): $data.IPromise<number> {
            if (typeof (this.source) === "undefined" || !this.source) {
                var d = $.Deferred();
                d.resolve(0);
                return d.promise();
            }
            var self = this;
            return this.source.length()
                .then((count: number) => self.totalCount(count))
                .fail(() => { throw "get count failed" });
        }

        fetchDataOfPage(newPageIndex?: number, updateTotalCount?: boolean, updateCurrentPageIndex?: boolean): $data.IPromise<TItem[]> {
            var self = this;
            if (this.option && this.option.onBeforeFetch) {
                var result = this.option.onBeforeFetch();
                if (typeof (result) == "undefined" || result == null || (typeof (result) === "boolean" && result)) {
                    return this._fetchDataOfPage(newPageIndex, updateTotalCount, updateCurrentPageIndex);
                } else {
                    return result.then((stillContinue: boolean) => {
                        if (stillContinue) {
                            return self._fetchDataOfPage(newPageIndex, updateTotalCount, updateCurrentPageIndex);
                        } else {
                            var d = $.Deferred();
                            d.resolve([]);
                            return d.promise();
                        }
                    });
                }
            } else {
                return this._fetchDataOfPage(newPageIndex, updateTotalCount, updateCurrentPageIndex);
            }
        }

        private _fetchDataOfPage(newPageIndex?: number, updateTotalCount?: boolean, updateCurrentPageIndex?: boolean): $data.IPromise<TItem[]> {
            if (typeof (this.source) === "undefined" || !this.source) {
                var d = $.Deferred();
                d.resolve([]);
                return d.promise();
            }
            var self = this;
            if (typeof (updateCurrentPageIndex) === "undefined") {
                updateCurrentPageIndex = true;
            }
            if (typeof (newPageIndex) === "undefined") {
                newPageIndex = this.currentPageIndex();
            }
            if (typeof (newPageIndex) !== "number") {
                throw "newPageIndex should be number";
            }
            if (updateCurrentPageIndex) {
                if (newPageIndex != this.currentPageIndex()) {
                    if (updateTotalCount) {
                        return this.updateTotalPageCount()
                            .then(() => {
                                self.stopFetchWhenPageIndexCountChanged = true;
                                self.currentPageIndex(newPageIndex);
                                self.stopFetchWhenPageIndexCountChanged = false;
                                return self.fetchDataOfPage(newPageIndex, false, false);
                            });
                    } else {
                        self.stopFetchWhenPageIndexCountChanged = true;
                        this.currentPageIndex(newPageIndex);
                        self.stopFetchWhenPageIndexCountChanged = false;
                        return self.fetchDataOfPage(newPageIndex, false, false);
                    }
                }
            } else {
                if (newPageIndex != this.currentPageIndex()) {
                    throw "newPageIndex is not same as current page index but updateCurrentPageIndex is false";
                }
            }
            var tempResult = ko.observableArray([]);

            var result: $data.IPromise<any> = undefined;
            if (updateTotalCount) {
                result = this.updateTotalPageCount();
            }

            var tempSource = this.source;
            if (this.itemsCountOnePage() > 0) {
                tempSource = tempSource
                    .skip(newPageIndex * this.itemsCountOnePage())
                    .take(this.itemsCountOnePage());
            }
            var query = tempSource
                .toArray(tempResult)
                .fail((error) => {
                    if (self.onError) {
                        self.onError(PagedSourceErrors.FetchDataError, error)
                    }
                });
            if (result) {
                result = result.then(() => query);
            } else {
                result = query;
            }
            if (self.dbDatePropertyInformations) {
                result = result.then(() => {
                    var allData = tempResult();
                    var registedProperies: DatePropertyInformation[] = undefined;
                    for (var i = 0; i < allData.length; i++) {
                        var item: $data.EntityWrapper = allData[i];
                        if (typeof (registedProperies) === "undefined") {
                            var entitySetName: string = (<any>item.getEntity().getType()).name;
                            registedProperies = self.dbDatePropertyInformations.getRegistedDateProperties(entitySetName);
                            if (typeof (registedProperies) === "undefined") {
                                registedProperies = [];
                            }
                        }
                        for (var j = 0; j < registedProperies.length; j++) {
                            var p = registedProperies[j];
                            if (p.asLocal) {
                                var d: Date = ko.unwrap(item[p.name]);
                                if (typeof (d) !== "undefined" && d != null) {
                                    item[p.name](new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()));
                                }
                            }
                        }
                    }
                });
            }
            if (typeof (self.processItems) !== "undefined") {
                result = result
                    .then(() => {
                        return self.processItems(tempResult());
                    })
                    .then((items: TItem[]) => {
                        self.items(items);
                    });
            } else {
                result = result
                    .then(() => {
                        self.items(tempResult());
                        return self.items();
                    });
            }

            //this.asyncPromiseForObservableNotify = result;
            return <any>result;
        }
    }
}
