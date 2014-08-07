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

    export class PagedSource<T extends $data.Entity, TItem> {
        //reanonly
        totalCount: KnockoutObservable<number>;
        currentPageIndex: KnockoutObservable<number>;
        //readonly
        pagesCount: KnockoutComputed<number>;
        itemsCountOnePage: KnockoutObservable<number>;
        items: KnockoutObservableArray<TItem>;

        //for any operation that will use the action such as ajax, should use it to konw if the action is finished or not
        asyncPromise: $data.IPromise<any>;

        //if the Queryable<T> (source) doesn't ok for items, then assign this property to provide additional process
        processItems: (rawItems: T[]) => $data.IPromise<TItem[]>;

        onError: (source: PagedSourceErrors, error) => void;

        dbDatePropertyInformations: DbDatePropertyInformations;

        constructor(public source: $data.Queryable<T>) {
            var self = this;
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
            this.asyncPromise = undefined;

            this.currentPageIndex.subscribe((newValue: number) => {
                self.asyncPromise = self.fetchDataOfPage(newValue, false, false);
            });
            this.itemsCountOnePage.subscribe((newValue: number) => {
                self.asyncPromise = self.fetchDataOfPage(undefined, false, false);
            });
        }

        fetchDataOfPage(newPageIndex?: number, updateTotalCount?: boolean, updateCurrentPageIndex?: boolean): $data.IPromise<TItem[]> {
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
                    this.currentPageIndex(newPageIndex); //will trigger the fetchDataOfPage again
                    return this.asyncPromise;
                }
            } else {
                if (newPageIndex != this.currentPageIndex()) {
                    throw "newPageIndex is not same as current page index but updateCurrentPageIndex is false";
                }
            }
            var tempResult = ko.observableArray([]);

            var result: $data.IPromise<any> = undefined;
            if (updateTotalCount) {
                result = this.source.length()
                    .then((count: number) => self.totalCount(count))
                    .fail(() => { throw "get count failed" });
            }

            var query = this.source
                .skip(newPageIndex * this.itemsCountOnePage())
                .take(this.itemsCountOnePage())
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
                                if (typeof (d) !== "undefined") {
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
                self.items(tempResult());
            }

            this.asyncPromise = result;
            return <any>result;
        }
    }
}
